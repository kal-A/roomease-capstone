export type AppRole = "admin" | "executive" | "member";

export function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? "").trim().toLowerCase();
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

export function getUserRoleInfo(role: AppRole | null | undefined) {
  const resolvedRole = role ?? "member";
  return {
    role: resolvedRole,
    displayLabel: roleDisplayLabel(resolvedRole),
    permissions: getPermissionsForRole(resolvedRole),
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
  const base = sessionRole ?? "member";
  // Admin remains admin-only regardless of portal mode.
  if (base === "admin") return "admin";
  return base;
}
