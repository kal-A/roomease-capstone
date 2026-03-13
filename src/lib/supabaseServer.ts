import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using SERVICE ROLE key.
 * Bypasses RLS. Use only in server route handlers / server components.
 * Do NOT expose this client or the service role key to the client.
 */
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
