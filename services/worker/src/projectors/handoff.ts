/**
 * Projector for local_handoff events.
 *
 * Updates:
 * - session_stats: handoffs_count, last_handoff_at, last_event_at, has_post_handoff_iteration
 * - org_stats_daily: sessions_with_handoff (on first handoff for session)
 * - user_stats_daily: sessions_with_handoff (on first handoff for session)
 */

import { orgStatsDaily, runFacts, sessionStats, userStatsDaily, type eventsRaw } from "@repo/shared/db/schema";
import { POST_HANDOFF_WINDOW_MS } from "@repo/shared/types";
import { and, eq, gt, lte, sql } from "drizzle-orm";
import type { DbTransaction } from "./types.js";

export async function projectLocalHandoff(
  tx: DbTransaction,
  event: typeof eventsRaw.$inferSelect
): Promise<void> {
  const occurredAt = event.occurred_at;

  // Get current session stats to check if this is the first handoff
  const currentStats = await tx.execute(sql`
    SELECT handoffs_count, first_message_at, user_id
    FROM session_stats
    WHERE org_id = ${event.org_id} AND session_id = ${event.session_id}
  `);

  const rows = currentStats as unknown as { handoffs_count: number; first_message_at: Date | null; user_id: string | null }[];
  const isFirstHandoff = rows.length === 0 || rows[0].handoffs_count === 0;
  const sessionDay = rows[0]?.first_message_at
    ? (rows[0].first_message_at instanceof Date
        ? rows[0].first_message_at
        : new Date(rows[0].first_message_at)
      ).toISOString().split("T")[0]
    : occurredAt.toISOString().split("T")[0];
  const userId = rows[0]?.user_id ?? event.user_id;

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
        last_event_at: sql`GREATEST(${sessionStats.last_event_at}, ${occurredAt})`,
        last_handoff_at: sql`GREATEST(${sessionStats.last_handoff_at}, ${occurredAt})`,
        handoffs_count: sql`${sessionStats.handoffs_count} + 1`,
      },
    });

  // Check for post-handoff iteration (retroactive)
  // Look for runs that completed after this handoff within the window
  await checkRetroactivePostHandoff(tx, event.org_id, event.session_id, occurredAt);

  // Update daily aggregates on first handoff
  if (isFirstHandoff) {
    // Update org_stats_daily
    await tx
      .insert(orgStatsDaily)
      .values({
        org_id: event.org_id,
        day: sessionDay,
        sessions_with_handoff: 1,
      })
      .onConflictDoUpdate({
        target: [orgStatsDaily.org_id, orgStatsDaily.day],
        set: {
          sessions_with_handoff: sql`${orgStatsDaily.sessions_with_handoff} + 1`,
        },
      });

    // Update user_stats_daily (if user_id is present)
    if (userId) {
      await tx
        .insert(userStatsDaily)
        .values({
          org_id: event.org_id,
          user_id: userId,
          day: sessionDay,
          sessions_with_handoff: 1,
        })
        .onConflictDoUpdate({
          target: [userStatsDaily.org_id, userStatsDaily.user_id, userStatsDaily.day],
          set: {
            sessions_with_handoff: sql`${userStatsDaily.sessions_with_handoff} + 1`,
          },
        });
    }
  }
}

/**
 * Check if any runs completed after the handoff within the post-handoff window.
 * If so, mark the session as having post-handoff iteration.
 */
async function checkRetroactivePostHandoff(
  tx: DbTransaction,
  orgId: string,
  sessionId: string,
  handoffAt: Date
): Promise<void> {
  const windowEnd = new Date(handoffAt.getTime() + POST_HANDOFF_WINDOW_MS);

  // Check if any runs completed in the window after this handoff
  const runs = await tx
    .select({ run_id: runFacts.run_id })
    .from(runFacts)
    .where(
      and(
        eq(runFacts.org_id, orgId),
        eq(runFacts.session_id, sessionId),
        gt(runFacts.completed_at, handoffAt),
        lte(runFacts.completed_at, windowEnd)
      )
    )
    .limit(1);

  if (runs.length > 0) {
    await tx.execute(sql`
      UPDATE session_stats
      SET has_post_handoff_iteration = true
      WHERE org_id = ${orgId} AND session_id = ${sessionId}
    `);
  }
}
