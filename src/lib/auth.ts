import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import type { AppRole } from "@/lib/userRole";
import { normalizeEmail } from "@/lib/userRole";
import { getIdentityServerEnv } from "@/lib/config/server";

const UW_DOMAIN = "@uwaterloo.ca";

export function isAdminEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  return getIdentityServerEnv().adminEmails.includes(normalized);
}

export function getServerAppRole(email: string | null | undefined): AppRole {
  const normalized = normalizeEmail(email);
  if (isAdminEmail(normalized)) return "admin";

  const { executiveEmails, demo } = getIdentityServerEnv();
  if (executiveEmails.includes(normalized)) return "executive";
  if (demo.enabled && normalized === demo.executiveEmail) return "executive";
  return "member";
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID?.trim() ?? "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET?.trim() ?? "",
      tenantId: process.env.AZURE_AD_TENANT_ID?.trim() ?? "",
      authorization: { params: { scope: "openid profile email" } },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    signIn({ user }) {
      const email = user?.email?.trim().toLowerCase();
      if (!email || !email.endsWith(UW_DOMAIN)) {
        return false;
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }
      if (user?.name) {
        token.name = user.name;
      }
      if (token.email) {
        token.role = getServerAppRole(String(token.email));
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) ?? session.user.email ?? null;
        session.user.name = (token.name as string) ?? session.user.name ?? null;
        const role = (token.role as AppRole | undefined) ?? getServerAppRole(session.user.email);
        session.user.role = role;
        session.user.isAdmin = isAdminEmail(session.user.email);
        session.user.demoMode = getIdentityServerEnv().demo.enabled;
      }
      return session;
    },
  },
};
