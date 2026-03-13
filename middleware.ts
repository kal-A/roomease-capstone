import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

/** Routes that do not require authentication (Option B: "/" is protected) */
const PUBLIC_PATHS = [
  "/auth/signin",
  "/auth/error",
  "/learn-more/about",
] as const;

/** Paths that are always allowed (Next.js internals, NextAuth API) — matcher already skips /_next and /api/auth; we still allow them in logic for clarity */
function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number])) return true;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/auth")) return true;
  if (pathname === "/favicon.ico" || pathname === "/team.jpeg") return true;
  // Root-level static assets (e.g. /file.svg, /vercel.svg)
  if (/^\/[^/]+\.(ico|jpeg|jpg|png|svg|gif|webp|woff2?)$/i.test(pathname)) return true;
  return false;
}

const authMiddleware = withAuth({
  pages: {
    signIn: "/auth/signin",
  },
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  return (authMiddleware as (req: NextRequest, ev: NextFetchEvent) => ReturnType<typeof authMiddleware>)(request, event);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (Next.js internals)
     * - api/auth (NextAuth routes)
     * - static files with common extensions (handled in isPublicPath for pathname)
     */
    "/((?!_next/|api/auth).*)",
  ],
};
