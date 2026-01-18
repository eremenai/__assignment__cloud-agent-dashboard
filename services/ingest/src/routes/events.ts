/**
 * Events ingestion endpoint.
 *
 * POST /events
 * Receives a batch of events and stores them in events_raw + events_queue.
 */

import type { getDb } from "@repo/shared/db/client";
import { eventsQueue, eventsRaw } from "@repo/shared/db/schema";
import { ingestRequestSchema, type IngestError, type IngestResponse } from "@repo/shared/schemas";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

// Type augmentation for Fastify db decorator
declare module "fastify" {
  interface FastifyInstance {
    db: ReturnType<typeof getDb>;
  }
}

const MAX_BATCH_SIZE = 100;

export async function eventsRoute(fastify: FastifyInstance) {
  fastify.post("/events", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();

    // Parse and validate request body
    const parseResult = ingestRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      const errors: IngestError[] = parseResult.error.issues.map((issue, index) => ({
        index,
        message: `${issue.path.join(".")}: ${issue.message}`,
      }));

      const response: IngestResponse = {
        accepted: 0,
        event_ids: [],
        errors,
      };

      return reply.status(400).send(response);
    }

    const { events } = parseResult.data;

    // Enforce batch size limit
    if (events.length > MAX_BATCH_SIZE) {
      return reply.status(400).send({
        accepted: 0,
        event_ids: [],
        errors: [
          {
            index: 0,
            message: `Batch size ${events.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
          },
        ],
      } satisfies IngestResponse);
    }

    const db = fastify.db;

    // Prepare batch data
    const rawValues = events.map((event) => ({
      org_id: event.org_id,
      event_id: event.event_id,
      occurred_at: new Date(event.occurred_at),
      event_type: event.event_type,
      session_id: event.session_id,
      user_id: event.user_id,
      run_id: event.run_id,
      payload: event.payload as Record<string, unknown>,
    }));

    const queueValues = events.map((event) => ({
      org_id: event.org_id,
      event_id: event.event_id,
    }));

    // Batch insert in a transaction: first events_raw, then events_queue
    try {
      await db.transaction(async (tx) => {
        await tx.insert(eventsRaw).values(rawValues).onConflictDoNothing();
        await tx.insert(eventsQueue).values(queueValues).onConflictDoNothing();
      });
    } catch (error) {
      fastify.log.error(error, "Transaction failed");
      return reply.status(500).send({
        accepted: 0,
        event_ids: [],
        errors: [
          {
            index: 0,
            message: error instanceof Error ? error.message : "Transaction failed",
          },
        ],
      } satisfies IngestResponse);
    }

    const acceptedIds = events.map((e) => e.event_id);

    const duration = Date.now() - startTime;
    fastify.log.info(
      {
        accepted: acceptedIds.length,
        total: events.length,
        duration_ms: duration,
      },
      "Ingested events batch"
    );

    const response: IngestResponse = {
      accepted: acceptedIds.length,
      event_ids: acceptedIds,
    };

    return reply.send(response);
  });
}
