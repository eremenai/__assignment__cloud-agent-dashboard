/**
 * Mock user data for each organization.
 * These match the users seeded in scripts/seed-orgs-users.sql.
 */

import type { User } from "@/lib/types/domain";

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);

// Small Startup users
const SMALL_USERS: User[] = [
  {
    userId: "user_small_1",
    orgId: "org_small",
    email: "alice@smallstartup.com",
    name: "Alice Chen",
    role: "ORG_ADMIN",
    createdAt: daysAgo(150),
    lastActiveAt: hoursAgo(2),
  },
  {
    userId: "user_small_2",
    orgId: "org_small",
    email: "bob@smallstartup.com",
    name: "Bob Smith",
    role: "MEMBER",
    createdAt: daysAgo(120),
    lastActiveAt: hoursAgo(5),
  },
];

// Medium Team users
const MEDIUM_USERS: User[] = [
  {
    userId: "user_med_1",
    orgId: "org_medium",
    email: "charlie@mediumteam.com",
    name: "Charlie Brown",
    role: "ORG_ADMIN",
    createdAt: daysAgo(300),
    lastActiveAt: hoursAgo(1),
  },
  {
    userId: "user_med_2",
    orgId: "org_medium",
    email: "diana@mediumteam.com",
    name: "Diana Ross",
    role: "MANAGER",
    createdAt: daysAgo(280),
    lastActiveAt: hoursAgo(4),
  },
  {
    userId: "user_med_3",
    orgId: "org_medium",
    email: "evan@mediumteam.com",
    name: "Evan Wright",
    role: "MEMBER",
    createdAt: daysAgo(250),
    lastActiveAt: hoursAgo(3),
  },
  {
    userId: "user_med_4",
    orgId: "org_medium",
    email: "fiona@mediumteam.com",
    name: "Fiona Green",
    role: "MEMBER",
    createdAt: daysAgo(200),
    lastActiveAt: hoursAgo(6),
  },
  {
    userId: "user_med_5",
    orgId: "org_medium",
    email: "george@mediumteam.com",
    name: "George Liu",
    role: "MEMBER",
    createdAt: daysAgo(180),
    lastActiveAt: hoursAgo(8),
  },
];

// Large Corp users
const LARGE_USERS: User[] = [
  {
    userId: "user_large_1",
    orgId: "org_large",
    email: "henry@largecorp.com",
    name: "Henry Adams",
    role: "ORG_ADMIN",
    createdAt: daysAgo(700),
    lastActiveAt: hoursAgo(1),
  },
  {
    userId: "user_large_2",
    orgId: "org_large",
    email: "iris@largecorp.com",
    name: "Iris Baker",
    role: "MANAGER",
    createdAt: daysAgo(650),
    lastActiveAt: hoursAgo(2),
  },
  {
    userId: "user_large_3",
    orgId: "org_large",
    email: "jack@largecorp.com",
    name: "Jack Cooper",
    role: "MEMBER",
    createdAt: daysAgo(600),
    lastActiveAt: hoursAgo(4),
  },
  {
    userId: "user_large_4",
    orgId: "org_large",
    email: "kate@largecorp.com",
    name: "Kate Davis",
    role: "MEMBER",
    createdAt: daysAgo(550),
    lastActiveAt: hoursAgo(3),
  },
  {
    userId: "user_large_5",
    orgId: "org_large",
    email: "leo@largecorp.com",
    name: "Leo Evans",
    role: "MEMBER",
    createdAt: daysAgo(500),
    lastActiveAt: hoursAgo(5),
  },
  {
    userId: "user_large_6",
    orgId: "org_large",
    email: "maya@largecorp.com",
    name: "Maya Foster",
    role: "MEMBER",
    createdAt: daysAgo(450),
    lastActiveAt: hoursAgo(6),
  },
  {
    userId: "user_large_7",
    orgId: "org_large",
    email: "noah@largecorp.com",
    name: "Noah Garcia",
    role: "MEMBER",
    createdAt: daysAgo(400),
    lastActiveAt: hoursAgo(7),
  },
  {
    userId: "user_large_8",
    orgId: "org_large",
    email: "olivia@largecorp.com",
    name: "Olivia Hill",
    role: "MEMBER",
    createdAt: daysAgo(350),
    lastActiveAt: hoursAgo(8),
  },
  {
    userId: "user_large_9",
    orgId: "org_large",
    email: "peter@largecorp.com",
    name: "Peter Irving",
    role: "MEMBER",
    createdAt: daysAgo(300),
    lastActiveAt: hoursAgo(12),
  },
  {
    userId: "user_large_10",
    orgId: "org_large",
    email: "quinn@largecorp.com",
    name: "Quinn Jones",
    role: "MEMBER",
    createdAt: daysAgo(250),
    lastActiveAt: daysAgo(1),
  },
];

// Platform users (not members of any org)
const PLATFORM_USERS: User[] = [
  {
    userId: "user_support_1",
    orgId: null,
    email: "eve.support@platform.com",
    name: "Eve Support",
    role: "SUPPORT",
    createdAt: daysAgo(365),
    lastActiveAt: hoursAgo(1),
  },
  {
    userId: "user_admin_1",
    orgId: null,
    email: "frank.admin@platform.com",
    name: "Frank Super",
    role: "SUPER_ADMIN",
    createdAt: daysAgo(730),
    lastActiveAt: hoursAgo(1),
  },
];

export const MOCK_USERS: User[] = [...SMALL_USERS, ...MEDIUM_USERS, ...LARGE_USERS, ...PLATFORM_USERS];

/**
 * Get all users for an organization.
 */
export function getUsersForOrg(orgId: string): User[] {
  return MOCK_USERS.filter((u) => u.orgId === orgId);
}

/**
 * Get a user by ID.
 */
export function getUser(userId: string): User | undefined {
  return MOCK_USERS.find((u) => u.userId === userId);
}

/**
 * Get all users.
 */
export function getAllUsers(): User[] {
  return MOCK_USERS;
}
