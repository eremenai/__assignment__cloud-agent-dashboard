/**
 * Projector for message_created events.
 *
 * Updates:
 * - session_stats: first_message_at, last_event_at, user_id
 * - org_stats_daily: sessions_count (on first event for session)
 * - user_stats_daily: sessions_count (on first event for session)
 */

import { sessionStats, type eventsRaw } from "@repo/shared/db/schema";
import { sql } from "drizzle-orm";
import { updateDailyStats } from "./daily-stats.js";
import { type DbTransaction, ensureDate, toIsoString } from "./types.js";

export async function projectMessageCreated(
  tx: DbTransaction,
  event: typeof eventsRaw.$inferSelect
): Promise<void> {
  const occurredAt = ensureDate(event.occurred_at);

  // Check if this is a new session (no existing row in session_stats)
  const existingSession = await tx.execute(sql`
    SELECT first_message_at
    FROM session_stats
    WHERE org_id = ${event.org_id} AND session_id = ${event.session_id}
  `);

  const existingRows = existingSession as unknown as { first_message_at: Date | null }[];
  const isNewSession = existingRows.length === 0;

  // Upsert session_stats
  await tx
    .insert(sessionStats)
    .values({
      org_id: event.org_id,
      session_id: event.session_id,
      user_id: event.user_id,
      first_message_at: occurredAt,
      last_event_at: occurredAt,
    })
    .onConflictDoUpdate({
      target: [sessionStats.org_id, sessionStats.session_id],
      set: {
        // Use LEAST for first_message_at (keep earliest)
        first_message_at: sql`LEAST(${sessionStats.first_message_at}, ${toIsoString(occurredAt)}::timestamp)`,
        // Use GREATEST for last_event_at (keep latest)
        last_event_at: sql`GREATEST(${sessionStats.last_event_at}, ${toIsoString(occurredAt)}::timestamp)`,
        // Set user_id if not already set
        user_id: sql`COALESCE(${sessionStats.user_id}, ${event.user_id})`,
      },
    });

  // If this is a new session, increment sessions_count in daily aggregates
  // Attribute session to the day of first_message_at
  if (isNewSession) {
    const day = occurredAt.toISOString().split("T")[0]; // YYYY-MM-DD
    await updateDailyStats(tx, event.org_id, event.user_id, day, {
      sessions_count: 1,
    });
  }
}
