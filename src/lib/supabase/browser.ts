import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv } from "@/lib/config/public";

export const supabaseBrowser = () => {
  const { url, key } = getPublicSupabaseEnv();
  return createClient(url, key);
};
