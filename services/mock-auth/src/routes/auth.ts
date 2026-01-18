/**
 * Auth route - handles token issuance and validation.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { users, orgMembers, orgs, platformUsers } from "@repo/shared/db/schema";
import type { UserRole } from "@repo/shared/types";

// JWT configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "mock-auth-jwt-secret-for-dev-only-do-not-use-in-production"
);
const JWT_ISSUER = "mock-auth-dev";
const JWT_AUDIENCE = "cloud-agent-dashboard";
const JWT_EXPIRATION = "24h";
const COOKIE_NAME = "auth_token";

interface JWTPayload {
  sub: string; // userId
  email: string;
  name: string;
  org_id: string | null;
  role: UserRole;
  [key: string]: unknown; // Index signature for jose compatibility
}

// Map database org_members roles to UserRole enum
function mapDbRoleToUserRole(dbRole: string | null): UserRole {
  switch (dbRole?.toLowerCase()) {
    case "admin":
      return "ORG_ADMIN";
    case "member":
      return "MEMBER";
    case "viewer":
      return "MEMBER";
    case "manager":
      return "MANAGER";
    default:
      return "MEMBER";
  }
}

export async function authRoute(fastify: FastifyInstance) {
  /**
   * POST /auth/login - Authenticate as a specific user
   */
  fastify.post<{ Body: { userId: string } }>("/auth/login", async (request, reply) => {
    const { userId } = request.body;
    const db = (fastify as unknown as { db: ReturnType<typeof import("@repo/shared/db/client").getDb> }).db;

    // Get user
    const [user] = await db.select().from(users).where(eq(users.user_id, userId));

    if (!user) {
      reply.status(404).send({ error: "User not found" });
      return;
    }

    // Check if this is a platform-level user (SUPPORT or SUPER_ADMIN)
    const [platformUser] = await db.select().from(platformUsers).where(eq(platformUsers.user_id, userId));

    let role: UserRole;
    let orgId: string | null;

    if (platformUser) {
      // Platform user - role from platform_users table, no org membership
      role = platformUser.role as UserRole;
      orgId = null;
    } else {
      // Regular org user - get membership
      const [membership] = await db
        .select({
          orgId: orgMembers.org_id,
          role: orgMembers.role,
        })
        .from(orgMembers)
        .where(eq(orgMembers.user_id, userId));

      role = mapDbRoleToUserRole(membership?.role || null);
      orgId = membership?.orgId || null;
    }

    // Create JWT
    const payload: JWTPayload = {
      sub: user.user_id,
      email: user.email || "",
      name: user.display_name || user.email || user.user_id,
      org_id: orgId,
      role,
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
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return {
      success: true,
      user: {
        userId: user.user_id,
        email: user.email,
        name: user.display_name || user.email || user.user_id,
        orgId,
        role,
      },
      token,
    };
  });

  /**
   * POST /auth/logout - Clear auth cookie
   */
  fastify.post("/auth/logout", async (request, reply) => {
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
    } catch (err) {
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
    } catch (err) {
      return { valid: false, error: "Invalid or expired token" };
    }
  });

  /**
   * POST /auth/switch-org - Switch org context (for SUPPORT/SUPER_ADMIN)
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

      // Only SUPPORT and SUPER_ADMIN can switch orgs
      if (role !== "SUPPORT" && role !== "SUPER_ADMIN") {
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
    } catch (err) {
      reply.status(401).send({ error: "Invalid token" });
      return;
    }
  });
}
