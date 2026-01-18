/**
 * Ingest API Server
 *
 * Internal service that receives events from the drop-copy producer
 * and stores them in events_raw + events_queue.
 */

import { closeDb, getDb } from "@repo/shared/db/client";
import Fastify from "fastify";
import { eventsRoute } from "./routes/events.js";
import { healthRoute } from "./routes/health.js";

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || "0.0.0.0";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// Initialize db connection at startup and decorate fastify
const db = getDb();
fastify.decorate("db", db);

// Register routes
fastify.register(eventsRoute);
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
    fastify.log.info(`Ingest API listening on ${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
