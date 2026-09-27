import { getPublicSupabaseEnv } from "@/lib/config/public";

function requireServerEnv(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return normalized;
}

export function getSupabaseServerEnv() {
  const { url } = getPublicSupabaseEnv();
  return {
    url,
    serviceRoleKey: requireServerEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  };
}

export function getAuthServerEnv() {
  return {
    clientId: requireServerEnv("AZURE_AD_CLIENT_ID", process.env.AZURE_AD_CLIENT_ID),
    clientSecret: requireServerEnv(
      "AZURE_AD_CLIENT_SECRET",
      process.env.AZURE_AD_CLIENT_SECRET
    ),
    tenantId: requireServerEnv("AZURE_AD_TENANT_ID", process.env.AZURE_AD_TENANT_ID),
    nextAuthSecret: requireServerEnv("NEXTAUTH_SECRET", process.env.NEXTAUTH_SECRET),
  };
}
