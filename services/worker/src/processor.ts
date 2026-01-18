/**
 * Event Processor
 *
 * Claims events from the queue and processes them through projectors.
 * Uses separate transactions for claim vs process to ensure failure-safety.
 */

import { getDb } from "@repo/shared/db/client";
import { eventsQueue, eventsRaw } from "@repo/shared/db/schema";
import type { EventType } from "@repo/shared/types";
import { and, eq, sql } from "drizzle-orm";
import { projectLocalHandoff } from "./projectors/handoff.js";
import { projectMessageCreated } from "./projectors/message.js";
import { projectRunCompleted, projectRunStarted } from "./projectors/run.js";

interface ClaimedEvent {
  org_id: string;
  event_id: string;
}

export class Processor {
  private batchSize: number;

  constructor(batchSize: number) {
    this.batchSize = batchSize;
  }

  /**
   * Process the next batch of events from the queue.
   * Returns the number of events processed.
   */
  async processNextBatch(): Promise<number> {
    const db = getDb();

    // PHASE 1: CLAIM - Separate transaction to persist attempts
    const claimed = await this.claimEvents(db);

    if (claimed.length === 0) {
      return 0;
    }

    // PHASE 2: PROCESS - One transaction per event
    let processed = 0;
    for (const event of claimed) {
      const success = await this.processEvent(db, event);
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
  private async claimEvents(db: ReturnType<typeof getDb>): Promise<ClaimedEvent[]> {
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
   */
  private async processEvent(db: ReturnType<typeof getDb>, claimed: ClaimedEvent): Promise<boolean> {
    try {
      // Fetch the full event
      const events = await db
        .select()
        .from(eventsRaw)
        .where(and(eq(eventsRaw.org_id, claimed.org_id), eq(eventsRaw.event_id, claimed.event_id)))
        .limit(1);

      if (events.length === 0) {
        console.warn(`[Processor] Event not found: ${claimed.org_id}/${claimed.event_id}`);
        await this.markProcessed(db, claimed);
        return true;
      }

      const event = events[0];

      // Apply projection based on event type
      await db.transaction(async (tx) => {
        await this.applyProjection(tx, event);

        // Mark as processed
        await tx
          .update(eventsQueue)
          .set({ processed_at: new Date() })
          .where(and(eq(eventsQueue.org_id, claimed.org_id), eq(eventsQueue.event_id, claimed.event_id)));
      });

      return true;
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
    tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
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
   * Mark an event as processed without applying projections.
   */
  private async markProcessed(db: ReturnType<typeof getDb>, claimed: ClaimedEvent): Promise<void> {
    await db
      .update(eventsQueue)
      .set({ processed_at: new Date() })
      .where(and(eq(eventsQueue.org_id, claimed.org_id), eq(eventsQueue.event_id, claimed.event_id)));
  }

  /**
   * Record an error for a failed event.
   */
  private async recordError(
    db: ReturnType<typeof getDb>,
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
