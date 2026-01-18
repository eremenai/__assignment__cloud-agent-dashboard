/**
 * Event Processor
 *
 * Claims events from the queue and processes them through projectors.
 * Uses separate transactions for claim vs process to ensure failure-safety.
 */

import type { getDb } from "@repo/shared/db/client";
import { eventsQueue, type eventsRaw } from "@repo/shared/db/schema";
import type { EventType } from "@repo/shared/types";
import { and, eq, sql } from "drizzle-orm";
import { projectLocalHandoff } from "./projectors/handoff.js";
import { projectMessageCreated } from "./projectors/message.js";
import { projectRunCompleted, projectRunStarted } from "./projectors/run.js";

interface ClaimedEvent {
  org_id: string;
  event_id: string;
}

type Db = ReturnType<typeof getDb>;

export class Processor {
  private db: Db;
  private batchSize: number;

  constructor(db: Db, batchSize: number) {
    this.db = db;
    this.batchSize = batchSize;
  }

  /**
   * Process the next batch of events from the queue.
   * Returns the number of events processed.
   */
  async processNextBatch(): Promise<number> {
    // PHASE 1: CLAIM - Separate transaction to persist attempts
    const claimed = await this.claimEvents(this.db);

    if (claimed.length === 0) {
      return 0;
    }

    // PHASE 2: PROCESS - One transaction per event
    let processed = 0;
    for (const event of claimed) {
      const success = await this.processEvent(this.db, event);
      if (success) {
        processed++;
      }
    }

    return processed;
  }

  /**
   * Claim a batch of unprocessed events.
   * Increments attempts counter before returning.
   */
  private async claimEvents(db: Db): Promise<ClaimedEvent[]> {
    // Use raw SQL for FOR UPDATE SKIP LOCKED
    const result = await db.execute(sql`
      WITH claimed AS (
        SELECT org_id, event_id
        FROM events_queue
        WHERE processed_at IS NULL
        ORDER BY inserted_at
        LIMIT ${this.batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE events_queue eq
      SET attempts = attempts + 1
      FROM claimed c
      WHERE eq.org_id = c.org_id AND eq.event_id = c.event_id
      RETURNING eq.org_id, eq.event_id
    `);

    // The execute() returns an array-like RowList
    return result as unknown as ClaimedEvent[];
  }

  /**
   * Process a single event.
   * Returns true if successful, false otherwise.
   *
   * Uses a transaction with SELECT FOR UPDATE SKIP LOCKED to ensure:
   * 1. The event is locked for this processor instance
   * 2. If another worker already locked it, we skip it
   * 3. All operations (fetch, project, mark processed) are atomic
   */
  private async processEvent(db: Db, claimed: ClaimedEvent): Promise<boolean> {
    try {
      // Use a transaction that includes SELECT FOR UPDATE SKIP LOCKED for the event
      // This ensures atomicity and prevents race conditions with other workers
      const result = await db.transaction(async (tx) => {
        // Fetch and lock the event using FOR UPDATE SKIP LOCKED
        // If another worker already has this event locked, we skip it
        const events = await tx.execute(sql`
          SELECT *
          FROM events_raw
          WHERE org_id = ${claimed.org_id} AND event_id = ${claimed.event_id}
          FOR UPDATE SKIP LOCKED
        `);

        const eventRows = events as unknown as (typeof eventsRaw.$inferSelect)[];

        if (eventRows.length === 0) {
          // Event not found in events_raw OR already locked by another worker
          // Check if event actually exists (without lock) to distinguish these cases
          const existsCheck = await tx.execute(sql`
            SELECT 1 FROM events_raw
            WHERE org_id = ${claimed.org_id} AND event_id = ${claimed.event_id}
          `);

          if ((existsCheck as unknown[]).length === 0) {
            // Event genuinely doesn't exist - this is an error, don't mark as processed
            console.error(`[Processor] Event not found in events_raw: ${claimed.org_id}/${claimed.event_id}`);
            return { success: false, skipped: false, notFound: true };
          }

          // Event exists but is locked by another worker - skip it
          return { success: false, skipped: true, notFound: false };
        }

        const event = eventRows[0];

        // Apply projection based on event type
        await this.applyProjection(tx, event);

        // Mark as processed
        await tx
          .update(eventsQueue)
          .set({ processed_at: new Date() })
          .where(and(eq(eventsQueue.org_id, claimed.org_id), eq(eventsQueue.event_id, claimed.event_id)));

        return { success: true, skipped: false, notFound: false };
      });

      if (result.notFound) {
        // Record error for missing event
        await this.recordError(db, claimed, new Error("Event not found in events_raw"));
        return false;
      }

      if (result.skipped) {
        // Another worker has this event locked - don't count as failure
        return false;
      }

      return result.success;
    } catch (error) {
      // Record error (in separate transaction so it persists)
      console.error(`[Processor] Error processing ${claimed.org_id}/${claimed.event_id}:`, error);
      await this.recordError(db, claimed, error);
      return false;
    }
  }

  /**
   * Apply the appropriate projection based on event type.
   */
  private async applyProjection(
    tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
    event: typeof eventsRaw.$inferSelect
  ): Promise<void> {
    const eventType = event.event_type as EventType;

    switch (eventType) {
      case "message_created":
        await projectMessageCreated(tx, event);
        break;
      case "run_started":
        await projectRunStarted(tx, event);
        break;
      case "run_completed":
        await projectRunCompleted(tx, event);
        break;
      case "local_handoff":
        await projectLocalHandoff(tx, event);
        break;
      default:
        console.warn(`[Processor] Unknown event type: ${eventType}`);
    }
  }

  /**
   * Record an error for a failed event.
   */
  private async recordError(
    db: Db,
    claimed: ClaimedEvent,
    error: unknown
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(eventsQueue)
      .set({ last_error: message })
      .where(and(eq(eventsQueue.org_id, claimed.org_id), eq(eventsQueue.event_id, claimed.event_id)));
  }
}
