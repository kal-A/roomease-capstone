import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerEnv } from "@/lib/config/server";

/**
 * Server-only Supabase client using SERVICE ROLE key.
 * Bypasses RLS. Use only in server route handlers / server components.
 * Do NOT expose this client or the service role key to the client.
 */
export function supabaseServer() {
  const { url, serviceRoleKey } = getSupabaseServerEnv();
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
