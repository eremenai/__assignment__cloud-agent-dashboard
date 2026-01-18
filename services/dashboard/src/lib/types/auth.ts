/**
 * Authentication and authorization types.
 */

import type { UserRole } from "./domain";

// ============================================================================
// JWT Claims
// ============================================================================

export interface JWTClaims {
  sub: string; // userId
  email: string;
  name: string;
  org_id: string | null; // primary organization (null for global roles)
  role: UserRole;
  iat: number; // issued at
  exp: number; // expiration
}

// ============================================================================
// Permissions
// ============================================================================

export type Permission =
  | "view_own_sessions"
  | "view_org_sessions"
  | "view_session_details"
  | "view_org_aggregates"
  | "view_users_list"
  | "view_user_details"
  | "export_data"
  | "switch_org_context"
  | "view_global_overview";

/**
 * Permission matrix by role.
 * Each role has a set of permissions it grants.
 * Note: roles use lowercase to match database storage.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  member: [
    "view_own_sessions",
    "view_session_details", // own only
    "view_org_aggregates",
    "view_user_details", // own only
  ],
  manager: [
    "view_own_sessions",
    "view_org_sessions",
    "view_session_details",
    "view_org_aggregates",
    "view_users_list",
    "view_user_details",
    "export_data",
  ],
  admin: [
    "view_own_sessions",
    "view_org_sessions",
    "view_session_details",
    "view_org_aggregates",
    "view_users_list",
    "view_user_details",
    "export_data",
  ],
  support: [
    "view_own_sessions",
    "view_org_sessions",
    "view_session_details",
    "view_org_aggregates",
    "view_users_list",
    "view_user_details",
    "export_data",
    "switch_org_context",
  ],
  super_admin: [
    "view_own_sessions",
    "view_org_sessions",
    "view_session_details",
    "view_org_aggregates",
    "view_users_list",
    "view_user_details",
    "export_data",
    "switch_org_context",
    "view_global_overview",
  ],
};

// ============================================================================
// Auth Context Types
// ============================================================================

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: string | null;
  avatarUrl?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  /** Current org being viewed. May differ from user's org for support/super_admin. null = global view */
  currentOrgId: string | null;
  /** Set the current org context (support/super_admin only) */
  setCurrentOrgId: (orgId: string | null) => void;
  /** Check if user has a specific permission */
  can: (permission: Permission) => boolean;
  /** Check if user can view a specific resource */
  canViewSession: (sessionCreatedByUserId: string) => boolean;
  canViewUser: (targetUserId: string) => boolean;
  /** Refresh user from JWT after user switch (dev mode only) */
  switchUser: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a role can switch org context.
 * Only global roles (support, super_admin) can switch between orgs.
 */
export function canSwitchOrg(role: UserRole): boolean {
  return role === "support" || role === "super_admin";
}

/**
 * Check if a role can view global overview.
 */
export function canViewGlobal(role: UserRole): boolean {
  return role === "super_admin";
}

/**
 * Check if a role can view all org data (not just own).
 */
export function canViewAllOrgData(role: UserRole): boolean {
  return role !== "member";
}

/**
 * Check if a role is a global (non-org-scoped) role.
 */
export function isGlobalRole(role: UserRole): boolean {
  return role === "support" || role === "super_admin";
}

/**
 * Get display label for a role.
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    member: "Member",
    manager: "Manager",
    admin: "Admin",
    support: "Support",
    super_admin: "Super Admin",
  };
  return labels[role];
}

/**
 * Get badge color variant for a role.
 */
export function getRoleBadgeVariant(role: UserRole): "default" | "secondary" | "outline" {
  switch (role) {
    case "super_admin":
    case "admin":
      return "default";
    case "support":
    case "manager":
      return "secondary";
    default:
      return "outline";
  }
}
