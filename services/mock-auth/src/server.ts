/**
 * Mock Auth Server
 *
 * Development-only service that provides authentication for the dashboard.
 * - Lists users from the database
 * - Issues JWT tokens for user switching
 * - Validates tokens
 */

import { closeDb, getDb } from "@repo/shared/db/client";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { usersRoute } from "./routes/users.js";
import { authRoute } from "./routes/auth.js";
import { healthRoute } from "./routes/health.js";

const PORT = Number(process.env.PORT) || 3002;
const HOST = process.env.HOST || "0.0.0.0";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Register cookie plugin
fastify.register(cookie, {
  secret: process.env.COOKIE_SECRET || "mock-auth-secret-for-dev-only",
});

// CORS for dev - allow dashboard to call us
fastify.addHook("onRequest", async (request, reply) => {
  const origin = request.headers.origin || "http://localhost:3000";
  reply.header("Access-Control-Allow-Origin", origin);
  reply.header("Access-Control-Allow-Credentials", "true");
  reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    reply.status(204).send();
  }
});

// Initialize db connection at startup and decorate fastify
const db = getDb();
fastify.decorate("db", db);

// Register routes
fastify.register(usersRoute);
fastify.register(authRoute);
fastify.register(healthRoute);

// Graceful shutdown
const shutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down...`);
  await fastify.close();
  await closeDb();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Start server
async function start() {
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Mock Auth API listening on ${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
