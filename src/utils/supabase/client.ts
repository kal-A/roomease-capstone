import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./shared";

export const createClient = () => {
  const { url, key } = getSupabaseEnv();
  return createBrowserClient(url, key);
};

