/**
 * Auth route - handles token issuance and validation.
 * Uses the simplified users table with role and org_id columns.
 */

import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { users, orgs } from "@repo/shared/db/schema";
import type { UserRole } from "@repo/shared/types";

// JWT configuration - these must match the dashboard middleware
export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "mock-auth-jwt-secret-for-dev-only-do-not-use-in-production"
);
export const JWT_ISSUER = "mock-auth-dev";
export const JWT_AUDIENCE = "cloud-agent-dashboard";
export const JWT_EXPIRATION = "24h";
export const COOKIE_NAME = "auth_token";

interface JWTPayload {
  sub: string; // userId
  email: string;
  name: string;
  org_id: string | null;
  role: UserRole;
  [key: string]: unknown; // Index signature for jose compatibility
}

export async function authRoute(fastify: FastifyInstance) {
  /**
   * POST /auth/login - Authenticate as a specific user
   * Optionally accepts a callback URL to redirect to after login.
   */
  fastify.post<{ Body: { userId: string }; Querystring: { callback?: string } }>(
    "/auth/login",
    async (request, reply) => {
      const { userId } = request.body;
      const { callback } = request.query;
      const db = (fastify as unknown as { db: ReturnType<typeof import("@repo/shared/db/client").getDb> }).db;

      // Get user with role and org_id from users table directly
      const [user] = await db.select().from(users).where(eq(users.user_id, userId));

      if (!user) {
        reply.status(404).send({ error: "User not found" });
        return;
      }

      // Create JWT with role and org_id from users table
      const payload: JWTPayload = {
        sub: user.user_id,
        email: user.email || "",
        name: user.display_name || user.email || user.user_id,
        org_id: user.org_id,
        role: user.role as UserRole,
      };

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setExpirationTime(JWT_EXPIRATION)
        .sign(JWT_SECRET);

      // Set cookie
      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: false, // Allow client-side access for parsing user info
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      // If callback URL provided, redirect to it
      if (callback) {
        reply.redirect(callback);
        return;
      }

      return {
        success: true,
        user: {
          userId: user.user_id,
          email: user.email,
          name: user.display_name || user.email || user.user_id,
          orgId: user.org_id,
          role: user.role as UserRole,
        },
        token,
      };
    }
  );

  /**
   * GET /auth/login - Login via GET with user ID and callback
   * Used by DevAuthSwitcher to trigger login with redirect.
   */
  fastify.get<{ Querystring: { userId?: string; callback?: string } }>(
    "/auth/login",
    async (request, reply) => {
      const { userId, callback } = request.query;
      const db = (fastify as unknown as { db: ReturnType<typeof import("@repo/shared/db/client").getDb> }).db;

      // If no userId, return first user as default
      const [user] = userId
        ? await db.select().from(users).where(eq(users.user_id, userId))
        : await db.select().from(users).limit(1);

      if (!user) {
        reply.status(404).send({ error: "User not found" });
        return;
      }

      // Create JWT with role and org_id from users table
      const payload: JWTPayload = {
        sub: user.user_id,
        email: user.email || "",
        name: user.display_name || user.email || user.user_id,
        org_id: user.org_id,
        role: user.role as UserRole,
      };

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setExpirationTime(JWT_EXPIRATION)
        .sign(JWT_SECRET);

      // Set cookie
      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: false, // Allow client-side access for parsing user info
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      // If callback URL provided, redirect to it
      if (callback) {
        reply.redirect(callback);
        return;
      }

      return {
        success: true,
        user: {
          userId: user.user_id,
          email: user.email,
          name: user.display_name || user.email || user.user_id,
          orgId: user.org_id,
          role: user.role as UserRole,
        },
        token,
      };
    }
  );

  /**
   * POST /auth/logout - Clear auth cookie
   */
  fastify.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return { success: true };
  });

  /**
   * GET /auth/me - Get current authenticated user from token
   */
  fastify.get("/auth/me", async (request, reply) => {
    const token = request.cookies[COOKIE_NAME] || request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      reply.status(401).send({ error: "Not authenticated" });
      return;
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });

      return {
        user: {
          userId: payload.sub,
          email: payload.email,
          name: payload.name,
          orgId: payload.org_id,
          role: payload.role,
        },
      };
    } catch {
      reply.status(401).send({ error: "Invalid token" });
      return;
    }
  });

  /**
   * POST /auth/verify - Verify a token and return claims
   */
  fastify.post<{ Body: { token: string } }>("/auth/verify", async (request, reply) => {
    const { token } = request.body;

    if (!token) {
      reply.status(400).send({ error: "Token required" });
      return;
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });

      return {
        valid: true,
        claims: {
          userId: payload.sub,
          email: payload.email,
          name: payload.name,
          orgId: payload.org_id,
          role: payload.role,
        },
      };
    } catch {
      return { valid: false, error: "Invalid or expired token" };
    }
  });

  /**
   * POST /auth/switch-org - Switch org context (for support/super_admin)
   */
  fastify.post<{ Body: { orgId: string | null } }>("/auth/switch-org", async (request, reply) => {
    const { orgId } = request.body;
    const token = request.cookies[COOKIE_NAME] || request.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      reply.status(401).send({ error: "Not authenticated" });
      return;
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });

      const role = payload.role as UserRole;

      // Only support and super_admin can switch orgs
      if (role !== "support" && role !== "super_admin") {
        reply.status(403).send({ error: "Not authorized to switch org context" });
        return;
      }

      // Validate orgId if provided
      if (orgId !== null) {
        const db = (fastify as unknown as { db: ReturnType<typeof import("@repo/shared/db/client").getDb> }).db;
        const [org] = await db.select().from(orgs).where(eq(orgs.org_id, orgId));

        if (!org) {
          reply.status(404).send({ error: "Organization not found" });
          return;
        }
      }

      return {
        success: true,
        currentOrgId: orgId,
      };
    } catch {
      reply.status(401).send({ error: "Invalid token" });
      return;
    }
  });
}
