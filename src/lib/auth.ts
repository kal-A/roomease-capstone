import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { getAppRoleFromEmail, normalizeEmail } from "@/lib/userRole";

const UW_DOMAIN = "@uwaterloo.ca";

export const ADMIN_EMAIL = "fvalli@uwaterloo.ca";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
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
        token.role = getAppRoleFromEmail(String(token.email));
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) ?? session.user.email ?? null;
        session.user.name = (token.name as string) ?? session.user.name ?? null;
        const role = (token.role as ReturnType<typeof getAppRoleFromEmail>) ?? getAppRoleFromEmail(session.user.email);
        session.user.role = role;
        session.user.isAdmin = normalizeEmail(session.user.email) === normalizeEmail(ADMIN_EMAIL);
      }
      return session;
    },
  },
};
