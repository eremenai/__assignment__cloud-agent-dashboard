/**
 * Users route - lists users available for dev authentication.
 * Uses the simplified users table with role and org_id columns.
 */

import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { users, orgs } from "@repo/shared/db/schema";
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

export async function usersRoute(fastify: FastifyInstance) {
  /**
   * GET /users - List all users with their org info
   */
  fastify.get("/users", async () => {
    const db = (fastify as unknown as { db: ReturnType<typeof import("@repo/shared/db/client").getDb> }).db;

    // Get all users (role and org_id are now directly on users table)
    const allUsers = await db.select().from(users);

    // Get all orgs for name lookup
    const allOrgs = await db.select().from(orgs);
    const orgMap = new Map(allOrgs.map((o) => [o.org_id, o.name]));

    // Build user list with org info
    const usersWithOrgs: UserWithOrg[] = allUsers.map((user) => {
      const orgName = user.org_id ? (orgMap.get(user.org_id) || null) : null;

      return {
        userId: user.user_id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
        orgId: user.org_id,
        orgName,
        role: user.role as UserRole,
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

    // Get org name if user has an org
    let orgName: string | null = null;
    if (user.org_id) {
      const [org] = await db.select().from(orgs).where(eq(orgs.org_id, user.org_id));
      orgName = org?.name || null;
    }

    return {
      userId: user.user_id,
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at,
      orgId: user.org_id,
      orgName,
      role: user.role as UserRole,
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
