export type PublicSupabaseEnv = {
  url: string;
  key: string;
};

/**
 * Read browser-safe Supabase configuration without forcing Supabase to be
 * configured for pages that do not use it.
 */
export function readPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !key) return null;
  return { url, key };
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const env = readPublicSupabaseEnv();
  if (!env) {
    throw new Error(
      "Missing Supabase public configuration. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }
  return env;
}
