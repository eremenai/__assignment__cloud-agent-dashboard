/**
 * Batch Event Processor
 *
 * Processes events in batches, grouping by user_id for better concurrency.
 * Each user's events are processed in a separate transaction to reduce
 * lock contention and allow parallel processing across users.
 *
 * Lock scope per transaction (user + session + org):
 * - session_stats: locked by (org_id, session_id) - sessions belong to one user
 * - user_stats_daily: locked by (org_id, user_id, day)
 * - run_facts: locked by (org_id, run_id)
 * - org_stats_daily: locked by (org_id, day) - HOTKEY, see note below
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

interface ClaimedEvent {
  org_id: string;
  event_id: string;
}

interface ClaimedEventWithUser {
  org_id: string;
  event_id: string;
  user_id: string | null;
}

interface EventRow {
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

/** Group of claimed event IDs by user_id for per-user transaction processing */
interface UserClaimedGroup {
  userId: string | null;
  eventIds: string[];
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
    // PHASE 1: CLAIM - Get batch of unprocessed events from queue
    const claimed = await this.claimEvents();

    if (claimed.length === 0) {
      return { processed: 0, failed: 0 };
    }

    // PHASE 2: GROUP BY USER - Group claimed event IDs by user_id
    // We need to fetch user_id from queue or use a pre-fetch to group
    // For now, we fetch minimal data to get user_id for grouping
    const claimedWithUser = await this.fetchUserIdsForClaimed(claimed);
    const userGroups = this.groupClaimedByUser(claimedWithUser);

    // PHASE 3: PROCESS - One transaction per user group
    // Fetch full event data INSIDE each transaction to maintain locks
    const allResults: ProcessResult[] = [];

    for (const group of userGroups) {
      const results = await this.processUserGroupInTransaction(group);
      allResults.push(...results);
    }

    // PHASE 4: UPDATE QUEUE - Mark processed/failed in single batch
    await this.updateEventStatusesBatch(allResults);

    const processed = allResults.filter((r) => r.status === "processed").length;
    const failed = allResults.filter((r) => r.status === "failed").length;

    return { processed, failed };
  }

  /**
   * Claim a batch of unprocessed events.
   * Increments attempts counter before returning.
   */
  private async claimEvents(): Promise<ClaimedEvent[]> {
    const result = await this.db.execute(sql`
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

    return result as unknown as ClaimedEvent[];
  }

  /**
   * Fetch user_id for claimed events (minimal data for grouping).
   * No locking needed - just reading to determine grouping.
   */
  private async fetchUserIdsForClaimed(claimed: ClaimedEvent[]): Promise<ClaimedEventWithUser[]> {
    if (claimed.length === 0) return [];

    const idList = claimed.map((c) => sql`${c.event_id}`);

    const result = await this.db.execute(sql`
      SELECT event_id, org_id, user_id
      FROM events_raw
      WHERE event_id IN (${sql.join(idList, sql`, `)})
    `);

    return result as unknown as ClaimedEventWithUser[];
  }

  /**
   * Group claimed events by user_id.
   * Events without user_id go into a separate group (null key).
   */
  private groupClaimedByUser(claimed: ClaimedEventWithUser[]): UserClaimedGroup[] {
    const groups = new Map<string | null, string[]>();

    for (const event of claimed) {
      const key = event.user_id;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event.event_id);
    }

    return Array.from(groups.entries()).map(([userId, eventIds]) => ({
      userId,
      eventIds,
    }));
  }

  /**
   * Fetch and lock events inside a transaction.
   * Uses FOR UPDATE SKIP LOCKED to skip events already locked by another worker.
   */
  private async fetchAndLockEventsInTx(tx: DbTransaction, eventIds: string[]): Promise<EventRow[]> {
    if (eventIds.length === 0) return [];

    const idList = eventIds.map((id) => sql`${id}`);

    const result = await tx.execute(sql`
      SELECT *
      FROM events_raw
      WHERE event_id IN (${sql.join(idList, sql`, `)})
      FOR UPDATE SKIP LOCKED
    `);

    return result as unknown as EventRow[];
  }

  /**
   * Process all events for a single user in one transaction.
   * Fetches and locks events INSIDE the transaction to maintain locks.
   */
  private async processUserGroupInTransaction(group: UserClaimedGroup): Promise<ProcessResult[]> {
    const results: ProcessResult[] = [];

    try {
      await this.db.transaction(async (tx) => {
        // Fetch and lock events inside transaction
        const events = await this.fetchAndLockEventsInTx(tx, group.eventIds);

        // If no events could be locked, nothing to process in this transaction
        if (events.length === 0) {
          return;
        }

        // Pre-acquire locks for aggregate tables
        await this.preAcquireUserLocks(tx, events);

        // Process each event with SAVEPOINT for individual failure handling
        for (const event of events) {
          const result = await this.processEventWithSavepoint(tx, event);
          results.push(result);
        }
      });
    } catch (error) {
      // Transaction failed - mark all claimed event IDs as failed
      console.error(
        `[BatchProcessor] Transaction failed for user ${group.userId ?? "null"}:`,
        error
      );
      const message = error instanceof Error ? error.message : String(error);
      for (const eventId of group.eventIds) {
        // Only add if not already in results (from savepoint handling)
        if (!results.some((r) => r.eventId === eventId)) {
          results.push({
            orgId: "unknown", // We don't have org_id for unfetched events
            eventId,
            status: "failed",
            error: message,
          });
        }
      }
    }

    return results;
  }

  /**
   * Pre-acquire locks for a user's data in consistent order.
   * Lock order: org_stats_daily → user_stats_daily → session_stats → run_facts
   *
   * NOTE: org_stats_daily is a hotkey - all users in an org compete for the same
   * daily row. This will be optimized in a future iteration.
   */
  private async preAcquireUserLocks(tx: DbTransaction, events: EventRow[]): Promise<void> {
    // Extract unique keys for each aggregate table using Maps for deduplication
    const orgDayMap = new Map<string, OrgDayKey>();
    const userDayMap = new Map<string, UserDayKey>();
    const sessionMap = new Map<string, SessionKey>();
    const runMap = new Map<string, RunKey>();

    for (const event of events) {
      const occurredAt =
        event.occurred_at instanceof Date ? event.occurred_at : new Date(event.occurred_at);
      const day = occurredAt.toISOString().split("T")[0];

      // org_stats_daily - HOTKEY: all users in org compete for this
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

      // session_stats - belongs to this user only
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

    // 1. Lock org_stats_daily rows (sorted) - HOTKEY
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
  private async processEventWithSavepoint(tx: DbTransaction, event: EventRow): Promise<ProcessResult> {
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
  private async applyProjection(tx: DbTransaction, event: EventRow): Promise<void> {
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
   * Update event queue statuses in a single batch operation.
   * Runs outside of user transactions to avoid extending lock duration.
   */
  private async updateEventStatusesBatch(results: ProcessResult[]): Promise<void> {
    const processed = results.filter((r) => r.status === "processed");
    const failed = results.filter((r) => r.status === "failed");

    // Mark processed events
    if (processed.length > 0) {
      const processedPairs = processed.map((p) => sql`(${p.orgId}, ${p.eventId})`);

      await this.db.execute(sql`
        UPDATE events_queue eq
        SET processed_at = NOW()
        FROM (VALUES ${sql.join(processedPairs, sql`, `)}) AS v(org_id, event_id)
        WHERE eq.org_id = v.org_id AND eq.event_id = v.event_id
      `);
    }

    // Record errors for failed events
    if (failed.length > 0) {
      const failedValues = failed.map(
        (f) => sql`(${f.orgId}, ${f.eventId}, ${f.error ?? "Unknown error"})`
      );

      await this.db.execute(sql`
        UPDATE events_queue eq
        SET last_error = v.error_msg
        FROM (VALUES ${sql.join(failedValues, sql`, `)}) AS v(org_id, event_id, error_msg)
        WHERE eq.org_id = v.org_id AND eq.event_id = v.event_id
      `);
    }
  }
}
