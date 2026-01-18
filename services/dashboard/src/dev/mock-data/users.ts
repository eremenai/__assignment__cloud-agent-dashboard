/**
 * Mock user data for each organization.
 */

import type { User } from "@/lib/types/domain";

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);

// Acme Corp users
const ACME_USERS: User[] = [
  {
    userId: "acme-user-1",
    orgId: "org-acme",
    email: "alice@acme.com",
    name: "Alice Johnson",
    role: "MEMBER",
    createdAt: daysAgo(180),
    lastActiveAt: hoursAgo(2),
  },
  {
    userId: "acme-user-2",
    orgId: "org-acme",
    email: "bob@acme.com",
    name: "Bob Smith",
    role: "MEMBER",
    createdAt: daysAgo(150),
    lastActiveAt: hoursAgo(5),
  },
  {
    userId: "acme-user-3",
    orgId: "org-acme",
    email: "carol@acme.com",
    name: "Carol Williams",
    role: "MANAGER",
    createdAt: daysAgo(200),
    lastActiveAt: hoursAgo(1),
  },
  {
    userId: "acme-user-4",
    orgId: "org-acme",
    email: "david@acme.com",
    name: "David Brown",
    role: "MEMBER",
    createdAt: daysAgo(90),
    lastActiveAt: hoursAgo(8),
  },
  {
    userId: "acme-user-5",
    orgId: "org-acme",
    email: "emma@acme.com",
    name: "Emma Davis",
    role: "MEMBER",
    createdAt: daysAgo(60),
    lastActiveAt: hoursAgo(12),
  },
  {
    userId: "acme-user-6",
    orgId: "org-acme",
    email: "frank@acme.com",
    name: "Frank Miller",
    role: "MEMBER",
    createdAt: daysAgo(45),
    lastActiveAt: daysAgo(2),
  },
  {
    userId: "acme-user-7",
    orgId: "org-acme",
    email: "grace@acme.com",
    name: "Grace Wilson",
    role: "MANAGER",
    createdAt: daysAgo(120),
    lastActiveAt: hoursAgo(3),
  },
  {
    userId: "acme-user-8",
    orgId: "org-acme",
    email: "henry@acme.com",
    name: "Henry Taylor",
    role: "ORG_ADMIN",
    createdAt: daysAgo(365),
    lastActiveAt: hoursAgo(1),
  },
  {
    userId: "acme-user-9",
    orgId: "org-acme",
    email: "ivy@acme.com",
    name: "Ivy Anderson",
    role: "MEMBER",
    createdAt: daysAgo(30),
    lastActiveAt: hoursAgo(6),
  },
  {
    userId: "acme-user-10",
    orgId: "org-acme",
    email: "jack@acme.com",
    name: "Jack Thomas",
    role: "MEMBER",
    createdAt: daysAgo(15),
    lastActiveAt: hoursAgo(24),
  },
];

// Globex Inc users
const GLOBEX_USERS: User[] = [
  {
    userId: "globex-user-1",
    orgId: "org-globex",
    email: "kate@globex.com",
    name: "Kate Martinez",
    role: "ORG_ADMIN",
    createdAt: daysAgo(300),
    lastActiveAt: hoursAgo(2),
  },
  {
    userId: "globex-user-2",
    orgId: "org-globex",
    email: "leo@globex.com",
    name: "Leo Garcia",
    role: "MANAGER",
    createdAt: daysAgo(250),
    lastActiveAt: hoursAgo(4),
  },
  {
    userId: "globex-user-3",
    orgId: "org-globex",
    email: "mia@globex.com",
    name: "Mia Rodriguez",
    role: "MEMBER",
    createdAt: daysAgo(180),
    lastActiveAt: hoursAgo(1),
  },
  {
    userId: "globex-user-4",
    orgId: "org-globex",
    email: "noah@globex.com",
    name: "Noah Lee",
    role: "MEMBER",
    createdAt: daysAgo(120),
    lastActiveAt: hoursAgo(6),
  },
  {
    userId: "globex-user-5",
    orgId: "org-globex",
    email: "olivia@globex.com",
    name: "Olivia Chen",
    role: "MEMBER",
    createdAt: daysAgo(90),
    lastActiveAt: hoursAgo(3),
  },
  {
    userId: "globex-user-6",
    orgId: "org-globex",
    email: "peter@globex.com",
    name: "Peter Kim",
    role: "MEMBER",
    createdAt: daysAgo(60),
    lastActiveAt: hoursAgo(8),
  },
  {
    userId: "globex-user-7",
    orgId: "org-globex",
    email: "quinn@globex.com",
    name: "Quinn Patel",
    role: "MEMBER",
    createdAt: daysAgo(45),
    lastActiveAt: daysAgo(1),
  },
  {
    userId: "globex-user-8",
    orgId: "org-globex",
    email: "rachel@globex.com",
    name: "Rachel Singh",
    role: "MEMBER",
    createdAt: daysAgo(30),
    lastActiveAt: hoursAgo(12),
  },
];

// Initech users
const INITECH_USERS: User[] = [
  {
    userId: "initech-user-1",
    orgId: "org-initech",
    email: "sam@initech.com",
    name: "Sam Walker",
    role: "ORG_ADMIN",
    createdAt: daysAgo(200),
    lastActiveAt: hoursAgo(1),
  },
  {
    userId: "initech-user-2",
    orgId: "org-initech",
    email: "tina@initech.com",
    name: "Tina Hall",
    role: "MANAGER",
    createdAt: daysAgo(150),
    lastActiveAt: hoursAgo(3),
  },
  {
    userId: "initech-user-3",
    orgId: "org-initech",
    email: "uma@initech.com",
    name: "Uma Allen",
    role: "MEMBER",
    createdAt: daysAgo(100),
    lastActiveAt: hoursAgo(5),
  },
  {
    userId: "initech-user-4",
    orgId: "org-initech",
    email: "victor@initech.com",
    name: "Victor Young",
    role: "MEMBER",
    createdAt: daysAgo(80),
    lastActiveAt: hoursAgo(2),
  },
  {
    userId: "initech-user-5",
    orgId: "org-initech",
    email: "wendy@initech.com",
    name: "Wendy King",
    role: "MEMBER",
    createdAt: daysAgo(60),
    lastActiveAt: hoursAgo(10),
  },
  {
    userId: "initech-user-6",
    orgId: "org-initech",
    email: "xavier@initech.com",
    name: "Xavier Scott",
    role: "MEMBER",
    createdAt: daysAgo(40),
    lastActiveAt: daysAgo(2),
  },
];

export const MOCK_USERS: User[] = [...ACME_USERS, ...GLOBEX_USERS, ...INITECH_USERS];

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
