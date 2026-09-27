import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { readPublicSupabaseEnv } from "@/lib/config/public";

/**
 * Refresh Supabase auth cookies (if any) on every request.
 * This does not replace NextAuth; it only keeps Supabase sessions in sync when used.
 */
export function updateSupabaseSession(request: NextRequest): NextResponse {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const env = readPublicSupabaseEnv();
  if (!env) {
    return supabaseResponse;
  }

  createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  return supabaseResponse;
}

