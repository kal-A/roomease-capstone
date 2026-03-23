import type { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/userRole";

declare module "next-auth" {
  interface Session {
    user: {
      email: string | null;
      name: string | null;
      isAdmin: boolean;
      role: AppRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
  }
}

