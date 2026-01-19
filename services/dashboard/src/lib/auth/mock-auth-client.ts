/**
 * Client for the mock-auth service.
 *
 * Used in development to authenticate users via the mock-auth service.
 * The login flow uses redirects to set cookies properly across origins.
 */

import type { AuthUser } from "@/lib/types/auth";
import type { UserRole } from "@/lib/types/domain";

// Default to localhost:3002 if not set (mock-auth service port)
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
 * Build the login URL for redirecting to mock-auth service.
 * The auth service will set the JWT cookie and redirect back to the callback URL.
 *
 * @param userId - The user ID to login as
 * @param callbackUrl - Optional URL to redirect to after login (defaults to current page)
 */
export function buildMockAuthLoginUrl(userId: string, callbackUrl?: string): string {
  const callback = callbackUrl || (typeof window !== "undefined" ? window.location.href : "/dashboard");
  return `${MOCK_AUTH_URL}/auth/login?userId=${encodeURIComponent(userId)}&callback=${encodeURIComponent(callback)}`;
}

/**
 * Get the mock-auth service base URL.
 */
export function getMockAuthUrl(): string {
  return MOCK_AUTH_URL;
}

/**
 * Login as a specific user via mock-auth service using redirect.
 * This triggers a full page redirect to the auth service which sets the cookie
 * and redirects back.
 *
 * @param userId - The user ID to login as
 * @param redirectAfterLogin - Optional URL to redirect to after login
 */
export function loginAsMockUser(userId: string, redirectAfterLogin?: string): void {
  const loginUrl = buildMockAuthLoginUrl(userId, redirectAfterLogin);
  window.location.href = loginUrl;
}

/**
 * Login as a specific user via mock-auth service using fetch (for background login).
 * This is useful when you want to login without redirecting.
 * Note: The cookie may not be set properly due to cross-origin restrictions.
 */
export async function loginAsMockUserFetch(userId: string): Promise<AuthUser> {
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
