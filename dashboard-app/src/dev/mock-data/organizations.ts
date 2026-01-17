/**
 * Mock organization data.
 */

import type { Organization } from "@/lib/types/domain";

export const MOCK_ORGANIZATIONS: Organization[] = [
	{
		orgId: "org-acme",
		name: "Acme Corp",
		createdAt: new Date("2024-01-15"),
	},
	{
		orgId: "org-globex",
		name: "Globex Inc",
		createdAt: new Date("2024-02-01"),
	},
	{
		orgId: "org-initech",
		name: "Initech",
		createdAt: new Date("2024-03-10"),
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
