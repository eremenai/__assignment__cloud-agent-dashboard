/**
 * Batch Event Processor
 *
 * Processes events in batches, grouping by user_id for better concurrency.
 * Each user's events are processed in a separate transaction to reduce
 * lock contention and allow parallel processing across users.
 *
 * Flow:
 * 1. Claim batch - single transaction with FOR UPDATE SKIP LOCKED
 * 2. Group claimed events by user_id in memory
 * 3. For each user group (separate transaction):
 *    - Lock org_stats_daily, user_stats_daily for relevant days
 *    - Lock session_stats for all sessions in the event list
 *    - Process events (batch updates where possible)
 *    - Mark events as processed
 *    - Commit
 *
 * Lock scope per transaction (user + session + org):
 * - org_stats_daily: locked by (org_id, day) - HOTKEY, see note below
 * - user_stats_daily: locked by (org_id, user_id, day)
 * - session_stats: locked by (org_id, session_id) - sessions belong to one user
 * - run_facts: locked by (org_id, run_id)
 *
 * NOTE: org_stats_daily is a hotkey (high contention) since all users in an org
 * compete for the same daily row. Future optimization options:
 * - Buffer org stats in memory, flush periodically
 * - Use advisory locks with retry
 * - Partition by hour instead of day
 * - Move to a separate aggregation job
 * See TRADEOFFS_FUTURE_STEPS.md for details.
 */

import type { getDb } from "@repo/shared/db/client";
import { eventsRaw } from "@repo/shared/db/schema";
import type { EventType } from "@repo/shared/types";
import { sql } from "drizzle-orm";
import { projectLocalHandoff } from "./projectors/handoff.js";
import { projectMessageCreated } from "./projectors/message.js";
import { projectRunCompleted, projectRunStarted } from "./projectors/run.js";
import type { DbTransaction } from "./projectors/types.js";

/** Full event data returned from claim query */
interface ClaimedEvent {
  org_id: string;
  event_id: string;
  event_type: string;
  session_id: string;
  user_id: string | null;
  run_id: string | null;
  occurred_at: Date | string;
  payload: Record<string, unknown>;
}

interface ProcessResult {
  orgId: string;
  eventId: string;
  status: "processed" | "failed";
  error?: string;
}

type Db = ReturnType<typeof getDb>;

/** Group of claimed events by user_id for per-user transaction processing */
interface UserEventGroup {
  userId: string | null;
  events: ClaimedEvent[];
}

/** Lock key types for aggregate tables */
interface OrgDayKey {
  orgId: string;
  day: string;
}

interface UserDayKey {
  orgId: string;
  userId: string;
  day: string;
}

interface SessionKey {
  orgId: string;
  sessionId: string;
}

interface RunKey {
  orgId: string;
  runId: string;
}

export class BatchProcessor {
  private db: Db;
  private batchSize: number;

  constructor(db: Db, batchSize: number) {
    this.db = db;
    this.batchSize = batchSize;
  }

  /**
   * Process the next batch of events from the queue.
   * Returns the number of events successfully processed.
   */
  async processNextBatch(): Promise<{ processed: number; failed: number }> {
    // PHASE 1: CLAIM - Single transaction to claim batch with full event data
    const claimedEvents = await this.claimBatch();

    if (claimedEvents.length === 0) {
      return { processed: 0, failed: 0 };
    }

    // PHASE 2: GROUP BY USER - Group claimed events by user_id in memory
    const userGroups = this.groupEventsByUser(claimedEvents);

    // PHASE 3: PROCESS - One transaction per user group
    let processed = 0;
    let failed = 0;

    for (const group of userGroups) {
      const result = await this.processUserGroup(group);
      processed += result.processed;
      failed += result.failed;
    }

    // Log remaining events in queue
    await this.logRemainingEvents();

    return { processed, failed };
  }

  /**
   * Claim a batch of unprocessed events with full event data.
   * Single transaction: SELECT FOR UPDATE SKIP LOCKED, increment attempts, return full data.
   * After commit, the claim is persisted (attempts incremented) even though locks are released.
   */
  private async claimBatch(): Promise<ClaimedEvent[]> {
    const result = await this.db.execute(sql`
      WITH claimed AS (
        SELECT eq.org_id, eq.event_id
        FROM events_queue eq
        WHERE eq.processed_at IS NULL
        ORDER BY eq.inserted_at
        LIMIT ${this.batchSize}
        FOR UPDATE SKIP LOCKED
      ),
      updated AS (
        UPDATE events_queue eq
        SET attempts = attempts + 1
        FROM claimed c
        WHERE eq.org_id = c.org_id AND eq.event_id = c.event_id
        RETURNING eq.event_id
      )
      SELECT
        er.org_id,
        er.event_id,
        er.event_type,
        er.session_id,
        er.user_id,
        er.run_id,
        er.occurred_at,
        er.payload
      FROM events_raw er
      INNER JOIN updated u ON er.event_id = u.event_id
    `);

    return result as unknown as ClaimedEvent[];
  }

  /**
   * Group claimed events by user_id.
   * Events without user_id go into a separate group (null key).
   */
  private groupEventsByUser(events: ClaimedEvent[]): UserEventGroup[] {
    const groups = new Map<string | null, ClaimedEvent[]>();

    for (const event of events) {
      const key = event.user_id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    }

    return Array.from(groups.entries()).map(([userId, events]) => ({
      userId,
      events,
    }));
  }

  /**
   * Process all events for a single user in one transaction.
   * Locks aggregate tables, processes events, marks as processed, commits.
   */
  private async processUserGroup(group: UserEventGroup): Promise<{ processed: number; failed: number }> {
    const results: ProcessResult[] = [];

    try {
      await this.db.transaction(async (tx) => {
        // 1. Lock aggregate tables for this user's events
        await this.lockAggregateTables(tx, group.events);

        // 2. Process each event
        for (const event of group.events) {
          const result = await this.processEventWithSavepoint(tx, event);
          results.push(result);
        }

        // 3. Mark processed events in queue (inside transaction)
        const processed = results.filter((r) => r.status === "processed");
        if (processed.length > 0) {
          await this.markEventsProcessed(tx, processed);
        }

        // 4. Record errors for failed events (inside transaction)
        const failed = results.filter((r) => r.status === "failed");
        if (failed.length > 0) {
          await this.recordEventErrors(tx, failed);
        }
      });
    } catch (error) {
      // Transaction failed - mark all events as failed outside transaction
      console.error(
        `[BatchProcessor] Transaction failed for user ${group.userId ?? "null"}:`,
        error
      );
      const message = error instanceof Error ? error.message : String(error);

      // Record failures for events not already in results
      const failedEvents = group.events
        .filter((e) => !results.some((r) => r.eventId === e.event_id))
        .map((e) => ({
          orgId: e.org_id,
          eventId: e.event_id,
          status: "failed" as const,
          error: message,
        }));

      if (failedEvents.length > 0) {
        try {
          await this.recordEventErrorsOutsideTx(failedEvents);
        } catch (err) {
          console.error("[BatchProcessor] Failed to record errors:", err);
        }
      }

      return {
        processed: 0,
        failed: group.events.length,
      };
    }

    return {
      processed: results.filter((r) => r.status === "processed").length,
      failed: results.filter((r) => r.status === "failed").length,
    };
  }

  /**
   * Lock aggregate tables in consistent order to prevent deadlocks.
   * Lock order: org_stats_daily → user_stats_daily → session_stats → run_facts
   */
  private async lockAggregateTables(tx: DbTransaction, events: ClaimedEvent[]): Promise<void> {
    // Extract unique keys for each aggregate table
    const orgDayMap = new Map<string, OrgDayKey>();
    const userDayMap = new Map<string, UserDayKey>();
    const sessionMap = new Map<string, SessionKey>();
    const runMap = new Map<string, RunKey>();

    for (const event of events) {
      const occurredAt =
        event.occurred_at instanceof Date ? event.occurred_at : new Date(event.occurred_at);
      const day = occurredAt.toISOString().split("T")[0];

      // org_stats_daily - HOTKEY
      const orgDayKey = `${event.org_id}|${day}`;
      if (!orgDayMap.has(orgDayKey)) {
        orgDayMap.set(orgDayKey, { orgId: event.org_id, day });
      }

      // user_stats_daily (if user_id exists)
      if (event.user_id) {
        const userDayKey = `${event.org_id}|${event.user_id}|${day}`;
        if (!userDayMap.has(userDayKey)) {
          userDayMap.set(userDayKey, { orgId: event.org_id, userId: event.user_id, day });
        }
      }

      // session_stats
      const sessionKey = `${event.org_id}|${event.session_id}`;
      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, { orgId: event.org_id, sessionId: event.session_id });
      }

      // run_facts (if run_id exists)
      if (event.run_id) {
        const runKey = `${event.org_id}|${event.run_id}`;
        if (!runMap.has(runKey)) {
          runMap.set(runKey, { orgId: event.org_id, runId: event.run_id });
        }
      }
    }

    // 1. Lock org_stats_daily rows (sorted)
    const orgDays = [...orgDayMap.values()].sort((a, b) =>
      a.orgId.localeCompare(b.orgId) || a.day.localeCompare(b.day)
    );
    if (orgDays.length > 0) {
      const orgDayValues = orgDays.map((k) => sql`(${k.orgId}, ${k.day}::date)`);
      await tx.execute(sql`
        SELECT 1 FROM org_stats_daily
        WHERE (org_id, day) IN (${sql.join(orgDayValues, sql`, `)})
        ORDER BY org_id, day
        FOR UPDATE
      `);
    }

    // 2. Lock user_stats_daily rows (sorted)
    const userDays = [...userDayMap.values()].sort((a, b) =>
      a.orgId.localeCompare(b.orgId) || a.userId.localeCompare(b.userId) || a.day.localeCompare(b.day)
    );
    if (userDays.length > 0) {
      const userDayValues = userDays.map((k) => sql`(${k.orgId}, ${k.userId}, ${k.day}::date)`);
      await tx.execute(sql`
        SELECT 1 FROM user_stats_daily
        WHERE (org_id, user_id, day) IN (${sql.join(userDayValues, sql`, `)})
        ORDER BY org_id, user_id, day
        FOR UPDATE
      `);
    }

    // 3. Lock session_stats rows (sorted)
    const sessions = [...sessionMap.values()].sort((a, b) =>
      a.orgId.localeCompare(b.orgId) || a.sessionId.localeCompare(b.sessionId)
    );
    if (sessions.length > 0) {
      const sessionValues = sessions.map((k) => sql`(${k.orgId}, ${k.sessionId})`);
      await tx.execute(sql`
        SELECT 1 FROM session_stats
        WHERE (org_id, session_id) IN (${sql.join(sessionValues, sql`, `)})
        ORDER BY org_id, session_id
        FOR UPDATE
      `);
    }

    // 4. Lock run_facts rows (sorted)
    const runs = [...runMap.values()].sort((a, b) =>
      a.orgId.localeCompare(b.orgId) || a.runId.localeCompare(b.runId)
    );
    if (runs.length > 0) {
      const runValues = runs.map((k) => sql`(${k.orgId}, ${k.runId})`);
      await tx.execute(sql`
        SELECT 1 FROM run_facts
        WHERE (org_id, run_id) IN (${sql.join(runValues, sql`, `)})
        ORDER BY org_id, run_id
        FOR UPDATE
      `);
    }
  }

  /**
   * Process a single event within a SAVEPOINT.
   */
  private async processEventWithSavepoint(tx: DbTransaction, event: ClaimedEvent): Promise<ProcessResult> {
    const savepointName = `sp_${event.event_id.replace(/[^a-zA-Z0-9]/g, "_")}`;

    try {
      await tx.execute(sql.raw(`SAVEPOINT ${savepointName}`));
      await this.applyProjection(tx, event);
      await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepointName}`));

      return { orgId: event.org_id, eventId: event.event_id, status: "processed" };
    } catch (error) {
      try {
        await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${savepointName}`));
      } catch {
        // Savepoint might not exist if error happened during creation
      }

      const message = error instanceof Error ? error.message : String(error);
      console.error(`[BatchProcessor] Error processing ${event.org_id}/${event.event_id}:`, message);

      return { orgId: event.org_id, eventId: event.event_id, status: "failed", error: message };
    }
  }

  /**
   * Apply the appropriate projection based on event type.
   */
  private async applyProjection(tx: DbTransaction, event: ClaimedEvent): Promise<void> {
    const eventType = event.event_type as EventType;
    const eventRecord = event as unknown as typeof eventsRaw.$inferSelect;

    switch (eventType) {
      case "message_created":
        await projectMessageCreated(tx, eventRecord);
        break;
      case "run_started":
        await projectRunStarted(tx, eventRecord);
        break;
      case "run_completed":
        await projectRunCompleted(tx, eventRecord);
        break;
      case "local_handoff":
        await projectLocalHandoff(tx, eventRecord);
        break;
      default:
        console.warn(`[BatchProcessor] Unknown event type: ${eventType}`);
    }
  }

  /**
   * Mark events as processed (inside transaction).
   */
  private async markEventsProcessed(tx: DbTransaction, results: ProcessResult[]): Promise<void> {
    const pairs = results.map((r) => sql`(${r.orgId}, ${r.eventId})`);
    await tx.execute(sql`
      UPDATE events_queue eq
      SET processed_at = NOW()
      FROM (VALUES ${sql.join(pairs, sql`, `)}) AS v(org_id, event_id)
      WHERE eq.org_id = v.org_id AND eq.event_id = v.event_id
    `);
  }

  /**
   * Record errors for failed events (inside transaction).
   */
  private async recordEventErrors(tx: DbTransaction, results: ProcessResult[]): Promise<void> {
    const values = results.map((r) => sql`(${r.orgId}, ${r.eventId}, ${r.error ?? "Unknown error"})`);
    await tx.execute(sql`
      UPDATE events_queue eq
      SET last_error = v.error_msg
      FROM (VALUES ${sql.join(values, sql`, `)}) AS v(org_id, event_id, error_msg)
      WHERE eq.org_id = v.org_id AND eq.event_id = v.event_id
    `);
  }

  /**
   * Record errors for failed events (outside transaction, for transaction failures).
   */
  private async recordEventErrorsOutsideTx(results: ProcessResult[]): Promise<void> {
    const values = results.map((r) => sql`(${r.orgId}, ${r.eventId}, ${r.error ?? "Unknown error"})`);
    await this.db.execute(sql`
      UPDATE events_queue eq
      SET last_error = v.error_msg
      FROM (VALUES ${sql.join(values, sql`, `)}) AS v(org_id, event_id, error_msg)
      WHERE eq.org_id = v.org_id AND eq.event_id = v.event_id
    `);
  }

  /**
   * Log the number of remaining unprocessed events in the queue.
   */
  private async logRemainingEvents(): Promise<void> {
    const result = await this.db.execute(sql`
      SELECT COUNT(*) as remaining
      FROM events_queue
      WHERE processed_at IS NULL
    `);
    const remaining = (result as unknown as Array<{ remaining: string }>)[0]?.remaining ?? "0";
    console.log(`[BatchProcessor] Events remaining in queue: ${remaining}`);
  }
}
