/**
 * Preset users for development mode user switching.
 * These users are used by the DevAuthSwitcher component.
 */

import type { AuthUser } from "@/lib/types/auth";

export interface DevUser extends AuthUser {
  description: string;
}

/**
 * Development preset users for testing different roles and scenarios.
 * Based on AUTH_AND_ROLES.md specification.
 */
export const DEV_USERS: DevUser[] = [
  {
    userId: "member-1",
    name: "Alice Member",
    email: "alice@acme.com",
    role: "MEMBER",
    orgId: "org-acme",
    description: "Regular member - sees own sessions only",
  },
  {
    userId: "manager-1",
    name: "Bob Manager",
    email: "bob@acme.com",
    role: "MANAGER",
    orgId: "org-acme",
    description: "Manager - sees all org data",
  },
  {
    userId: "admin-1",
    name: "Carol Admin",
    email: "carol@acme.com",
    role: "ORG_ADMIN",
    orgId: "org-acme",
    description: "Org admin at Acme Corp",
  },
  {
    userId: "admin-2",
    name: "Dan Admin",
    email: "dan@globex.com",
    role: "ORG_ADMIN",
    orgId: "org-globex",
    description: "Org admin at Globex Inc",
  },
  {
    userId: "support-1",
    name: "Eve Support",
    email: "eve@platform.com",
    role: "SUPPORT",
    orgId: null,
    description: "Support - can view any org",
  },
  {
    userId: "super-1",
    name: "Frank Super",
    email: "frank@platform.com",
    role: "SUPER_ADMIN",
    orgId: null,
    description: "Super admin - all orgs + global view",
  },
];

/**
 * Default user for development mode.
 */
export const DEFAULT_DEV_USER = DEV_USERS[2]; // Carol Admin at Acme

/**
 * Get a dev user by ID.
 */
export function getDevUser(userId: string): DevUser | undefined {
  return DEV_USERS.find((u) => u.userId === userId);
}

/**
 * Get all dev users for a specific org.
 */
export function getDevUsersForOrg(orgId: string): DevUser[] {
  return DEV_USERS.filter((u) => u.orgId === orgId);
}

/**
 * Get all platform-level dev users (SUPPORT, SUPER_ADMIN).
 */
export function getPlatformDevUsers(): DevUser[] {
  return DEV_USERS.filter((u) => u.orgId === null);
}
