/**
 * Projectors for run_started and run_completed events.
 *
 * run_started updates:
 * - run_facts: started_at, session_id, user_id
 * - session_stats: last_event_at
 *
 * run_completed updates:
 * - run_facts: completed_at, status, duration_ms, cost, tokens, error_type
 * - session_stats: runs_count, active_agent_time_ms, cost_total, tokens, success/failed runs
 * - org_stats_daily: runs, costs, tokens, error breakdown
 * - user_stats_daily: runs, costs, tokens, error breakdown
 */

import { runFacts, sessionStats, type eventsRaw } from "@repo/shared/db/schema";
import type { RunCompletedPayload, ErrorCategory } from "@repo/shared/types";
import { POST_HANDOFF_WINDOW_MS } from "@repo/shared/types";
import { sql } from "drizzle-orm";
import { updateDailyStats } from "./daily-stats.js";
import { type DbTransaction, ensureDate, toIsoString } from "./types.js";

export async function projectRunStarted(
  tx: DbTransaction,
  event: typeof eventsRaw.$inferSelect
): Promise<void> {
  const occurredAt = ensureDate(event.occurred_at);

  if (!event.run_id) {
    console.warn("[Projector] run_started event missing run_id");
    return;
  }

  // Upsert run_facts
  await tx
    .insert(runFacts)
    .values({
      org_id: event.org_id,
      run_id: event.run_id,
      session_id: event.session_id,
      user_id: event.user_id,
      started_at: occurredAt,
    })
    .onConflictDoUpdate({
      target: [runFacts.org_id, runFacts.run_id],
      set: {
        started_at: sql`LEAST(${runFacts.started_at}, ${toIsoString(occurredAt)}::timestamp)`,
        session_id: sql`COALESCE(${runFacts.session_id}, ${event.session_id})`,
        user_id: sql`COALESCE(${runFacts.user_id}, ${event.user_id})`,
      },
    });

  // Update session_stats last_event_at
  await tx
    .insert(sessionStats)
    .values({
      org_id: event.org_id,
      session_id: event.session_id,
      user_id: event.user_id,
      last_event_at: occurredAt,
    })
    .onConflictDoUpdate({
      target: [sessionStats.org_id, sessionStats.session_id],
      set: {
        last_event_at: sql`GREATEST(${sessionStats.last_event_at}, ${toIsoString(occurredAt)}::timestamp)`,
      },
    });
}

export async function projectRunCompleted(
  tx: DbTransaction,
  event: typeof eventsRaw.$inferSelect
): Promise<void> {
  const occurredAt = ensureDate(event.occurred_at);
  const payload = event.payload as RunCompletedPayload;

  if (!event.run_id) {
    console.warn("[Projector] run_completed event missing run_id");
    return;
  }

  const isSuccess = payload.status === "success";
  const day = occurredAt.toISOString().split("T")[0]; // YYYY-MM-DD

  // 1. Update run_facts
  await tx
    .insert(runFacts)
    .values({
      org_id: event.org_id,
      run_id: event.run_id,
      session_id: event.session_id,
      user_id: event.user_id,
      completed_at: occurredAt,
      status: payload.status,
      duration_ms: payload.duration_ms,
      cost: String(payload.cost),
      input_tokens: payload.input_tokens,
      output_tokens: payload.output_tokens,
      error_type: payload.error_type ?? null,
    })
    .onConflictDoUpdate({
      target: [runFacts.org_id, runFacts.run_id],
      set: {
        completed_at: sql`GREATEST(${runFacts.completed_at}, ${toIsoString(occurredAt)}::timestamp)`,
        status: payload.status,
        duration_ms: payload.duration_ms,
        cost: String(payload.cost),
        input_tokens: payload.input_tokens,
        output_tokens: payload.output_tokens,
        error_type: payload.error_type ?? null,
      },
    });

  // 2. Update session_stats
  await tx
    .insert(sessionStats)
    .values({
      org_id: event.org_id,
      session_id: event.session_id,
      user_id: event.user_id,
      last_event_at: occurredAt,
      runs_count: 1,
      active_agent_time_ms: payload.duration_ms,
      success_runs: isSuccess ? 1 : 0,
      failed_runs: isSuccess ? 0 : 1,
      cost_total: String(payload.cost),
      input_tokens_total: payload.input_tokens,
      output_tokens_total: payload.output_tokens,
    })
    .onConflictDoUpdate({
      target: [sessionStats.org_id, sessionStats.session_id],
      set: {
        last_event_at: sql`GREATEST(${sessionStats.last_event_at}, ${toIsoString(occurredAt)}::timestamp)`,
        runs_count: sql`${sessionStats.runs_count} + 1`,
        active_agent_time_ms: sql`${sessionStats.active_agent_time_ms} + ${payload.duration_ms}`,
        success_runs: sql`${sessionStats.success_runs} + ${isSuccess ? 1 : 0}`,
        failed_runs: sql`${sessionStats.failed_runs} + ${isSuccess ? 0 : 1}`,
        cost_total: sql`${sessionStats.cost_total}::numeric + ${payload.cost}`,
        input_tokens_total: sql`${sessionStats.input_tokens_total} + ${payload.input_tokens}`,
        output_tokens_total: sql`${sessionStats.output_tokens_total} + ${payload.output_tokens}`,
      },
    });

  // Check for post-handoff iteration
  await checkPostHandoffIteration(tx, event.org_id, event.session_id, event.user_id, occurredAt);

  // 3. Update daily stats (org and user)
  const errorIncrements = getErrorIncrements(isSuccess, payload.error_type);

  await updateDailyStats(tx, event.org_id, event.user_id, day, {
    runs_count: 1,
    success_runs: isSuccess ? 1 : 0,
    failed_runs: isSuccess ? 0 : 1,
    total_duration_ms: payload.duration_ms,
    total_cost: payload.cost,
    total_input_tokens: payload.input_tokens,
    total_output_tokens: payload.output_tokens,
    ...errorIncrements,
  });
}

/**
 * Check if this run completes within the post-handoff iteration window.
 * If so, mark the session and update daily aggregates.
 */
async function checkPostHandoffIteration(
  tx: DbTransaction,
  orgId: string,
  sessionId: string,
  userId: string,
  completedAt: Date | string
): Promise<void> {
  const completedAtDate = ensureDate(completedAt);

  // Get session stats to check last_handoff_at and current flag state
  const result = await tx.execute(sql`
    SELECT last_handoff_at, has_post_handoff_iteration, first_message_at
    FROM session_stats
    WHERE org_id = ${orgId} AND session_id = ${sessionId}
  `);

  const rows = result as unknown as { last_handoff_at: Date | string | null; has_post_handoff_iteration: boolean; first_message_at: Date | string | null }[];
  if (rows.length === 0 || !rows[0].last_handoff_at) {
    return;
  }

  // If flag is already set, no need to update
  if (rows[0].has_post_handoff_iteration) {
    return;
  }

  const lastHandoff = rows[0].last_handoff_at;
  const handoffTime = ensureDate(lastHandoff).getTime();
  const completedTime = completedAtDate.getTime();

  // Check if completed within window after handoff
  if (completedTime > handoffTime && completedTime <= handoffTime + POST_HANDOFF_WINDOW_MS) {
    // Update session_stats
    await tx.execute(sql`
      UPDATE session_stats
      SET has_post_handoff_iteration = true
      WHERE org_id = ${orgId} AND session_id = ${sessionId}
    `);

    // Update daily aggregates for sessions_with_post_handoff
    // Attribute to the day of first_message_at
    const sessionDay = rows[0].first_message_at
      ? ensureDate(rows[0].first_message_at).toISOString().split("T")[0]
      : completedAtDate.toISOString().split("T")[0];

    await updateDailyStats(tx, orgId, userId, sessionDay, {
      sessions_with_post_handoff: 1,
    });
  }
}

/**
 * Get error category increments based on status and error_type.
 */
function getErrorIncrements(
  isSuccess: boolean,
  errorType?: ErrorCategory
): {
  errors_tool: number;
  errors_model: number;
  errors_timeout: number;
  errors_other: number;
} {
  if (isSuccess) {
    return { errors_tool: 0, errors_model: 0, errors_timeout: 0, errors_other: 0 };
  }

  switch (errorType) {
    case "tool_error":
      return { errors_tool: 1, errors_model: 0, errors_timeout: 0, errors_other: 0 };
    case "model_error":
      return { errors_tool: 0, errors_model: 1, errors_timeout: 0, errors_other: 0 };
    case "timeout":
      return { errors_tool: 0, errors_model: 0, errors_timeout: 1, errors_other: 0 };
    default:
      return { errors_tool: 0, errors_model: 0, errors_timeout: 0, errors_other: 1 };
  }
}
