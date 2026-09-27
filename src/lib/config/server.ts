import { getPublicSupabaseEnv } from "@/lib/config/public";

function requireServerEnv(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return normalized;
}

function normalizeEmail(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function parseEmailList(value: string | undefined): string[] {
  return Array.from(
    new Set(
      String(value ?? "")
        .split(",")
        .map(normalizeEmail)
        .filter(Boolean)
    )
  );
}

export type IdentityServerEnv = {
  adminEmails: string[];
  executiveEmails: string[];
  demo: {
    enabled: boolean;
    memberEmail: string | null;
    executiveEmail: string | null;
  };
};

export function getIdentityServerEnv(): IdentityServerEnv {
  const demoEnabled = process.env.ROOM_EASE_DEMO_MODE === "true";
  if (demoEnabled && process.env.NODE_ENV === "production") {
    throw new Error("ROOM_EASE_DEMO_MODE cannot be enabled in production.");
  }

  const memberEmail = normalizeEmail(process.env.ROOM_EASE_DEMO_MEMBER_EMAIL) || null;
  const executiveEmail = normalizeEmail(process.env.ROOM_EASE_DEMO_EXECUTIVE_EMAIL) || null;
  if (demoEnabled && (!memberEmail || !executiveEmail)) {
    throw new Error(
      "Demo mode requires ROOM_EASE_DEMO_MEMBER_EMAIL and ROOM_EASE_DEMO_EXECUTIVE_EMAIL."
    );
  }

  return {
    adminEmails: parseEmailList(process.env.ROOM_EASE_ADMIN_EMAILS),
    executiveEmails: parseEmailList(process.env.ROOM_EASE_EXECUTIVE_EMAILS),
    demo: {
      enabled: demoEnabled,
      memberEmail,
      executiveEmail,
    },
  };
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
