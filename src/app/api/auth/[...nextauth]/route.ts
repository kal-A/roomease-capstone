import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthServerEnv } from "@/lib/config/server";

const nextAuthHandler = NextAuth(authOptions);
const handler = (...args: Parameters<typeof nextAuthHandler>) => {
  getAuthServerEnv();
  return nextAuthHandler(...args);
};

export { handler as GET, handler as POST };
