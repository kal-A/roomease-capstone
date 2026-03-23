/**
 * Demo + app role mapping from authenticated email.
 * Keep in sync with session (see auth callbacks).
 */

export type AppRole = "admin" | "executive" | "member";

const ADMIN_EMAIL = "fvalli@uwaterloo.ca";
const EXEC_EMAIL = "g5rai@uwaterloo.ca";
const MEMBER_EMAIL = "p37gupta@uwaterloo.ca";

const EMAIL_ROLE: Record<string, AppRole> = {
  [ADMIN_EMAIL]: "admin",
  [EXEC_EMAIL]: "executive",
  [MEMBER_EMAIL]: "member",
};

export function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
}

/**
 * Map known demo accounts; other @uwaterloo.ca users default to executive so
 * existing booking flows keep working outside the three demo personas.
 */
export function getAppRoleFromEmail(email: string | null | undefined): AppRole {
  const key = normalizeEmail(email);
  if (EMAIL_ROLE[key]) return EMAIL_ROLE[key];
  if (key.endsWith("@uwaterloo.ca")) return "executive";
  return "member";
}

export function roleDisplayLabel(role: AppRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "executive":
      return "Club Executive";
    case "member":
      return "Club Member";
    default:
      return "User";
  }
}

export interface RolePermissions {
  canCreateDirectBookings: boolean;
  canEditDeleteOwnBookings: boolean;
  canSubmitMemberRequests: boolean;
  canReviewMemberRequests: boolean;
  canAccessAdminPortal: boolean;
  /** Full analytics (global / operational) — admins only */
  canViewGlobalAnalytics: boolean;
}

export function getPermissionsForRole(role: AppRole): RolePermissions {
  const isAdmin = role === "admin";
  const isExec = role === "executive";
  return {
    canCreateDirectBookings: isExec || isAdmin,
    canEditDeleteOwnBookings: isExec || isAdmin,
    canSubmitMemberRequests: role === "member",
    canReviewMemberRequests: role === "executive",
    canAccessAdminPortal: isAdmin,
    canViewGlobalAnalytics: isAdmin,
  };
}

export function getUserRoleInfo(email: string | null | undefined) {
  const role = getAppRoleFromEmail(email);
  return {
    role,
    displayLabel: roleDisplayLabel(role),
    permissions: getPermissionsForRole(role),
  };
}

export type AdminPortalMode = "admin" | "user";

const ADMIN_MODE_KEY = "roomease.adminPortalMode";

export function readAdminPortalMode(): AdminPortalMode {
  if (typeof window === "undefined") return "admin";
  try {
    const v = localStorage.getItem(ADMIN_MODE_KEY);
    return v === "user" ? "user" : "admin";
  } catch {
    return "admin";
  }
}

export function writeAdminPortalMode(mode: AdminPortalMode) {
  try {
    localStorage.setItem(ADMIN_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/**
 * When admins choose "User view", the main app shell behaves like a club user
 * (executive-level booking UX) while /admin remains available.
 */
export function getEffectiveAppRole(
  sessionRole: AppRole | null | undefined,
  adminPortalMode: AdminPortalMode | null | undefined
): AppRole {
  const base = sessionRole ?? "executive";
  // Admin remains admin-only regardless of portal mode.
  if (base === "admin") return "admin";
  return base;
}
