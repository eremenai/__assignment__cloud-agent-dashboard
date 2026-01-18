/**
 * Users route - lists users available for dev authentication.
 */

import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { users, orgMembers, orgs, platformUsers } from "@repo/shared/db/schema";
import type { UserRole } from "@repo/shared/types";

interface UserWithOrg {
  userId: string;
  email: string | null;
  displayName: string | null;
  createdAt: Date;
  orgId: string | null;
  orgName: string | null;
  role: UserRole;
}

// Map database org_members roles to UserRole enum
function mapDbRoleToUserRole(dbRole: string | null): UserRole {
  switch (dbRole?.toLowerCase()) {
    case "admin":
      return "ORG_ADMIN";
    case "member":
      return "MEMBER";
    case "viewer":
      return "MEMBER"; // Viewers are treated as members for now
    case "manager":
      return "MANAGER";
    default:
      return "MEMBER";
  }
}

export async function usersRoute(fastify: FastifyInstance) {
  /**
   * GET /users - List all users with their org memberships
   */
  fastify.get("/users", async () => {
    const db = (fastify as unknown as { db: ReturnType<typeof import("@repo/shared/db/client").getDb> }).db;

    // Get all users
    const allUsers = await db.select().from(users);

    // Get all org memberships
    const memberships = await db
      .select({
        userId: orgMembers.user_id,
        orgId: orgMembers.org_id,
        role: orgMembers.role,
      })
      .from(orgMembers);

    // Get all platform users (SUPPORT, SUPER_ADMIN)
    const platformUsersList = await db.select().from(platformUsers);
    const platformUserMap = new Map(platformUsersList.map((p) => [p.user_id, p.role as UserRole]));

    // Get all orgs for name lookup
    const allOrgs = await db.select().from(orgs);
    const orgMap = new Map(allOrgs.map((o) => [o.org_id, o.name]));

    // Build user list with org info
    const usersWithOrgs: UserWithOrg[] = allUsers.map((user) => {
      // Check if this is a platform-level user first
      const platformRole = platformUserMap.get(user.user_id);

      if (platformRole) {
        // Platform users don't have org memberships
        return {
          userId: user.user_id,
          email: user.email,
          displayName: user.display_name,
          createdAt: user.created_at,
          orgId: null,
          orgName: null,
          role: platformRole,
        };
      }

      // Regular org user
      const membership = memberships.find((m) => m.userId === user.user_id);
      const orgId = membership?.orgId || null;
      const orgName = orgId ? (orgMap.get(orgId) || null) : null;
      const role = mapDbRoleToUserRole(membership?.role || null);

      return {
        userId: user.user_id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
        orgId,
        orgName,
        role,
      };
    });

    return { users: usersWithOrgs };
  });

  /**
   * GET /users/:userId - Get a single user
   */
  fastify.get<{ Params: { userId: string } }>("/users/:userId", async (request, reply) => {
    const { userId } = request.params;
    const db = (fastify as unknown as { db: ReturnType<typeof import("@repo/shared/db/client").getDb> }).db;

    // Get user
    const [user] = await db.select().from(users).where(eq(users.user_id, userId));

    if (!user) {
      reply.status(404).send({ error: "User not found" });
      return;
    }

    // Check if this is a platform-level user
    const [platformUser] = await db.select().from(platformUsers).where(eq(platformUsers.user_id, userId));

    if (platformUser) {
      // Platform users don't have org memberships
      return {
        userId: user.user_id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
        orgId: null,
        orgName: null,
        role: platformUser.role as UserRole,
      };
    }

    // Get org membership for regular users
    const [membership] = await db
      .select({
        orgId: orgMembers.org_id,
        role: orgMembers.role,
      })
      .from(orgMembers)
      .where(eq(orgMembers.user_id, userId));

    // Get org name
    let orgName: string | null = null;
    if (membership?.orgId) {
      const [org] = await db.select().from(orgs).where(eq(orgs.org_id, membership.orgId));
      orgName = org?.name || null;
    }

    return {
      userId: user.user_id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
      orgId: membership?.orgId || null,
      orgName,
      role: mapDbRoleToUserRole(membership?.role || null),
    };
  });

  /**
   * GET /orgs - List all organizations
   */
  fastify.get("/orgs", async () => {
    const db = (fastify as unknown as { db: ReturnType<typeof import("@repo/shared/db/client").getDb> }).db;

    const allOrgs = await db.select().from(orgs);

    return {
      orgs: allOrgs.map((org) => ({
        orgId: org.org_id,
        name: org.name,
        createdAt: org.created_at,
      })),
    };
  });
}
