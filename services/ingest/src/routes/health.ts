/**
 * Health check endpoint.
 */

import { getDb } from "@repo/shared/db/client";
import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";

export async function healthRoute(fastify: FastifyInstance) {
  fastify.get("/health", async (_request, reply) => {
    try {
      // Check database connectivity
      const db = getDb();
      await db.execute(sql`SELECT 1`);

      return reply.send({
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error(error, "Health check failed");
      return reply.status(503).send({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
