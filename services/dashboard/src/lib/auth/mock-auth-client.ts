/**
 * Client for the mock-auth service.
 *
 * Used in development to authenticate users via the mock-auth service
 * instead of relying on hardcoded dev users.
 */

import type { AuthUser } from "@/lib/types/auth";
import type { UserRole } from "@/lib/types/domain";

// Default to localhost:3002 if not set
const MOCK_AUTH_URL = process.env.NEXT_PUBLIC_MOCK_AUTH_URL || "http://localhost:3002";

interface MockAuthUser {
  userId: string;
  email: string | null;
  name: string;
  orgId: string | null;
  role: UserRole;
}

interface UsersResponse {
  users: Array<{
    userId: string;
    email: string | null;
    displayName: string | null;
    orgId: string | null;
    orgName: string | null;
    role: UserRole;
  }>;
}

interface LoginResponse {
  success: boolean;
  user: MockAuthUser;
  token: string;
}

interface MeResponse {
  user: MockAuthUser;
}

interface OrgsResponse {
  orgs: Array<{
    orgId: string;
    name: string;
  }>;
}

/**
 * Check if mock-auth service is available.
 */
export async function isMockAuthAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${MOCK_AUTH_URL}/health`, {
      method: "GET",
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get all available users from mock-auth service.
 */
export async function fetchMockAuthUsers(): Promise<AuthUser[]> {
  const response = await fetch(`${MOCK_AUTH_URL}/users`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }

  const data: UsersResponse = await response.json();

  return data.users.map((u) => ({
    userId: u.userId,
    email: u.email || "",
    name: u.displayName || u.email || u.userId,
    orgId: u.orgId,
    role: u.role,
  }));
}

/**
 * Get all organizations from mock-auth service.
 */
export async function fetchMockAuthOrgs(): Promise<Array<{ orgId: string; name: string }>> {
  const response = await fetch(`${MOCK_AUTH_URL}/orgs`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch orgs: ${response.statusText}`);
  }

  const data: OrgsResponse = await response.json();
  return data.orgs;
}

/**
 * Login as a specific user via mock-auth service.
 * Sets an auth cookie.
 */
export async function loginAsMockUser(userId: string): Promise<AuthUser> {
  const response = await fetch(`${MOCK_AUTH_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to login: ${response.statusText}`);
  }

  const data: LoginResponse = await response.json();

  return {
    userId: data.user.userId,
    email: data.user.email || "",
    name: data.user.name,
    orgId: data.user.orgId,
    role: data.user.role,
  };
}

/**
 * Get current authenticated user from mock-auth service.
 * Returns null if not authenticated.
 */
export async function fetchCurrentMockUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${MOCK_AUTH_URL}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data: MeResponse = await response.json();

    return {
      userId: data.user.userId,
      email: data.user.email || "",
      name: data.user.name,
      orgId: data.user.orgId,
      role: data.user.role,
    };
  } catch {
    return null;
  }
}

/**
 * Logout from mock-auth service.
 */
export async function logoutMockUser(): Promise<void> {
  await fetch(`${MOCK_AUTH_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
