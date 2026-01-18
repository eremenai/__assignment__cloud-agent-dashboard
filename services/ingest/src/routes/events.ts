/**
 * Events ingestion endpoint.
 *
 * POST /events
 * Receives a batch of events and stores them in events_raw + events_queue.
 */

import { getDb } from "@repo/shared/db/client";
import { eventsQueue, eventsRaw } from "@repo/shared/db/schema";
import { ingestRequestSchema, type IngestError, type IngestResponse } from "@repo/shared/schemas";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

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

    const db = getDb();
    const acceptedIds: string[] = [];
    const errors: IngestError[] = [];

    // Insert events in a transaction
    try {
      await db.transaction(async (tx) => {
        for (let i = 0; i < events.length; i++) {
          const event = events[i];

          try {
            // Insert into events_raw
            await tx
              .insert(eventsRaw)
              .values({
                org_id: event.org_id,
                event_id: event.event_id,
                occurred_at: new Date(event.occurred_at),
                event_type: event.event_type,
                session_id: event.session_id,
                user_id: event.user_id,
                run_id: event.run_id,
                payload: event.payload as Record<string, unknown>,
              })
              .onConflictDoNothing();

            // Insert into events_queue
            await tx
              .insert(eventsQueue)
              .values({
                org_id: event.org_id,
                event_id: event.event_id,
              })
              .onConflictDoNothing();

            acceptedIds.push(event.event_id);
          } catch (error) {
            // Log individual event errors but continue processing
            fastify.log.warn({ event_id: event.event_id, error }, "Failed to insert event");
            errors.push({
              event_id: event.event_id,
              index: i,
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      });
    } catch (error) {
      // Transaction-level failure
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

    const duration = Date.now() - startTime;
    fastify.log.info(
      {
        accepted: acceptedIds.length,
        total: events.length,
        errors: errors.length,
        duration_ms: duration,
      },
      "Ingested events batch"
    );

    const response: IngestResponse = {
      accepted: acceptedIds.length,
      event_ids: acceptedIds,
      errors: errors.length > 0 ? errors : undefined,
    };

    return reply.send(response);
  });
}
