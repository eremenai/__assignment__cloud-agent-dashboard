/**
 * Projector for local_handoff events.
 *
 * Updates:
 * - session_stats: handoffs_count, last_handoff_at, last_event_at, has_post_handoff_iteration
 * - org_stats_daily: sessions_with_handoff (on first handoff for session)
 * - user_stats_daily: sessions_with_handoff (on first handoff for session)
 */

import { runFacts, sessionStats, type eventsRaw } from "@repo/shared/db/schema";
import { POST_HANDOFF_WINDOW_MS } from "@repo/shared/types";
import { and, eq, gt, lte, sql } from "drizzle-orm";
import { updateDailyStats } from "./daily-stats.js";
import { type DbTransaction, ensureDate, toIsoString } from "./types.js";

export async function projectLocalHandoff(
  tx: DbTransaction,
  event: typeof eventsRaw.$inferSelect
): Promise<void> {
  const occurredAt = ensureDate(event.occurred_at);

  // Get current session stats to check if this is the first handoff
  const currentStats = await tx.execute(sql`
    SELECT handoffs_count, first_message_at
    FROM session_stats
    WHERE org_id = ${event.org_id} AND session_id = ${event.session_id}
  `);

  const rows = currentStats as unknown as { handoffs_count: number; first_message_at: Date | string | null }[];
  const isFirstHandoff = rows.length === 0 || rows[0].handoffs_count === 0;
  const sessionDay = rows[0]?.first_message_at
    ? ensureDate(rows[0].first_message_at).toISOString().split("T")[0]
    : occurredAt.toISOString().split("T")[0];

  // Update session_stats
  await tx
    .insert(sessionStats)
    .values({
      org_id: event.org_id,
      session_id: event.session_id,
      user_id: event.user_id,
      last_event_at: occurredAt,
      last_handoff_at: occurredAt,
      handoffs_count: 1,
    })
    .onConflictDoUpdate({
      target: [sessionStats.org_id, sessionStats.session_id],
      set: {
        last_event_at: sql`GREATEST(${sessionStats.last_event_at}, ${toIsoString(occurredAt)}::timestamp)`,
        last_handoff_at: sql`GREATEST(${sessionStats.last_handoff_at}, ${toIsoString(occurredAt)}::timestamp)`,
        handoffs_count: sql`${sessionStats.handoffs_count} + 1`,
      },
    });

  // Check for post-handoff iteration (retroactive)
  // Look for runs that completed after this handoff within the window
  await checkRetroactivePostHandoff(tx, event.org_id, event.session_id, event.user_id, occurredAt);

  // Update daily aggregates on first handoff
  if (isFirstHandoff) {
    await updateDailyStats(tx, event.org_id, event.user_id, sessionDay, {
      sessions_with_handoff: 1,
    });
  }
}

/**
 * Check if any runs completed after the handoff within the post-handoff window.
 * If so, mark the session as having post-handoff iteration and update daily aggregates.
 */
async function checkRetroactivePostHandoff(
  tx: DbTransaction,
  orgId: string,
  sessionId: string,
  userId: string,
  handoffAt: Date | string
): Promise<void> {
  const handoffAtDate = ensureDate(handoffAt);
  const windowEnd = new Date(handoffAtDate.getTime() + POST_HANDOFF_WINDOW_MS);

  // First check if the flag is already set (to avoid double-counting in daily aggregates)
  const currentStats = await tx.execute(sql`
    SELECT has_post_handoff_iteration, first_message_at
    FROM session_stats
    WHERE org_id = ${orgId} AND session_id = ${sessionId}
  `);

  const statsRows = currentStats as unknown as { has_post_handoff_iteration: boolean; first_message_at: Date | string | null }[];
  if (statsRows.length > 0 && statsRows[0].has_post_handoff_iteration) {
    // Already set, nothing to do
    return;
  }

  // Check if any runs completed in the window after this handoff
  const runs = await tx
    .select({ run_id: runFacts.run_id })
    .from(runFacts)
    .where(
      and(
        eq(runFacts.org_id, orgId),
        eq(runFacts.session_id, sessionId),
        gt(runFacts.completed_at, handoffAtDate),
        lte(runFacts.completed_at, windowEnd)
      )
    )
    .limit(1);

  if (runs.length > 0) {
    // Update session_stats
    await tx.execute(sql`
      UPDATE session_stats
      SET has_post_handoff_iteration = true
      WHERE org_id = ${orgId} AND session_id = ${sessionId}
    `);

    // Update daily aggregates for sessions_with_post_handoff
    // Attribute to the day of first_message_at
    if (statsRows.length > 0) {
      const sessionDay = statsRows[0].first_message_at
        ? ensureDate(statsRows[0].first_message_at).toISOString().split("T")[0]
        : handoffAtDate.toISOString().split("T")[0];

      await updateDailyStats(tx, orgId, userId, sessionDay, {
        sessions_with_post_handoff: 1,
      });
    }
  }
}
