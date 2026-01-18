/**
 * Mock organization data.
 * These match the orgs seeded in scripts/seed-orgs-users.sql.
 */

import type { Organization } from "@/lib/types/domain";

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    orgId: "org_small",
    name: "Small Startup",
    createdAt: daysAgo(180),
  },
  {
    orgId: "org_medium",
    name: "Medium Team",
    createdAt: daysAgo(365),
  },
  {
    orgId: "org_large",
    name: "Large Corp",
    createdAt: daysAgo(730),
  },
];

/**
 * Get an organization by ID.
 */
export function getOrganization(orgId: string): Organization | undefined {
  return MOCK_ORGANIZATIONS.find((o) => o.orgId === orgId);
}

/**
 * Get all organizations.
 */
export function getAllOrganizations(): Organization[] {
  return MOCK_ORGANIZATIONS;
}
