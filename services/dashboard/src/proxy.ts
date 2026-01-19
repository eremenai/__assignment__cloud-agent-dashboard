/**
 * Next.js proxy for JWT authentication.
 *
 * Validates JWT token from cookie using the same secret as mock-auth service.
 * If token is invalid or missing, redirects to auth service with callback URL.
 *
 * Note: proxy.ts runs on Node.js runtime (not Edge), which is the recommended
 * approach in Next.js 16+.
 */

import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// JWT configuration - must match mock-auth service
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "mock-auth-jwt-secret-for-dev-only-do-not-use-in-production"
);
const JWT_ISSUER = "mock-auth-dev";
const JWT_AUDIENCE = "cloud-agent-dashboard";
const COOKIE_NAME = "auth_token";

// Auth service URL for redirecting unauthenticated users
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3002";

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  "/auth",
  "/_next",
  "/api",
  "/favicon.ico",
  "/icon.svg",
  "/static",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname.startsWith(path) || pathname === "/"
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Get JWT token from cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // No token - redirect to auth service with callback URL
    const callbackUrl = encodeURIComponent(request.url);
    const loginUrl = `${AUTH_SERVICE_URL}/auth/login?callback=${callbackUrl}`;
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify JWT token
    await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // Token is valid - proceed
    return NextResponse.next();
  } catch {
    // Token is invalid or expired - redirect to auth service
    const callbackUrl = encodeURIComponent(request.url);
    const loginUrl = `${AUTH_SERVICE_URL}/auth/login?callback=${callbackUrl}`;

    // Clear the invalid cookie
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  // Match all paths except static files and API routes
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|public).*)",
  ],
};
