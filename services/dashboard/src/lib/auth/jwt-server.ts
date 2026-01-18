/**
 * Server-side JWT utilities for parsing auth token from cookies.
 * This runs during SSR to provide initial user state without client-side cookie access.
 */

import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import type { AuthUser } from "@/lib/types/auth";

const COOKIE_NAME = "auth_token";

/**
 * Parse JWT payload without verification.
 * Actual verification happens in middleware using jose.
 */
function parseJwtPayload(token: string): AuthUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode payload (second part) - base64url to base64
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));

    return {
      userId: payload.sub,
      email: payload.email || "",
      name: payload.name || payload.email || payload.sub,
      orgId: payload.org_id || null,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Get the authenticated user from cookies during server-side rendering.
 * Returns null if no valid auth token is present.
 *
 * Note: The token has already been verified by middleware at this point,
 * so we just need to decode the payload.
 */
export async function getAuthUser(cookieStore: ReadonlyRequestCookies): Promise<AuthUser | null> {
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return parseJwtPayload(token);
}
