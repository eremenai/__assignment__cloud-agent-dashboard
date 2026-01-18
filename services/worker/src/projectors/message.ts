/**
 * Projector for message_created events.
 *
 * Updates:
 * - session_stats: first_message_at, last_event_at, user_id
 */

import { sessionStats, type eventsRaw } from "@repo/shared/db/schema";
import { sql } from "drizzle-orm";
import type { DbTransaction } from "./types.js";

export async function projectMessageCreated(
  tx: DbTransaction,
  event: typeof eventsRaw.$inferSelect
): Promise<void> {
  const occurredAt = event.occurred_at;

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
        first_message_at: sql`LEAST(${sessionStats.first_message_at}, ${occurredAt})`,
        // Use GREATEST for last_event_at (keep latest)
        last_event_at: sql`GREATEST(${sessionStats.last_event_at}, ${occurredAt})`,
        // Set user_id if not already set
        user_id: sql`COALESCE(${sessionStats.user_id}, ${event.user_id})`,
      },
    });
}
