/**
 * Shared helper for updating daily aggregate statistics.
 *
 * Used by multiple projectors to update org_stats_daily and user_stats_daily tables.
 */

import { orgStatsDaily, userStatsDaily } from "@repo/shared/db/schema";
import { sql } from "drizzle-orm";
import type { DbTransaction } from "./types.js";

/**
 * Fields that can be incremented in daily stats tables.
 */
export interface DailyStatsIncrements {
  sessions_count?: number;
  sessions_with_handoff?: number;
  sessions_with_post_handoff?: number;
  runs_count?: number;
  success_runs?: number;
  failed_runs?: number;
  errors_tool?: number;
  errors_model?: number;
  errors_timeout?: number;
  errors_other?: number;
  total_duration_ms?: number;
  total_cost?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
}

/**
 * Update org_stats_daily with the given increments.
 * Uses upsert to create the row if it doesn't exist.
 */
export async function updateOrgStatsDaily(
  tx: DbTransaction,
  orgId: string,
  day: string,
  increments: DailyStatsIncrements
): Promise<void> {
  // Build insert values with defaults
  const insertValues: Record<string, unknown> = {
    org_id: orgId,
    day,
  };

  // Build update set clause
  const updateSet: Record<string, unknown> = {};

  // Add each increment field
  if (increments.sessions_count !== undefined) {
    insertValues.sessions_count = increments.sessions_count;
    updateSet.sessions_count = sql`${orgStatsDaily.sessions_count} + ${increments.sessions_count}`;
  }
  if (increments.sessions_with_handoff !== undefined) {
    insertValues.sessions_with_handoff = increments.sessions_with_handoff;
    updateSet.sessions_with_handoff = sql`${orgStatsDaily.sessions_with_handoff} + ${increments.sessions_with_handoff}`;
  }
  if (increments.sessions_with_post_handoff !== undefined) {
    insertValues.sessions_with_post_handoff = increments.sessions_with_post_handoff;
    updateSet.sessions_with_post_handoff = sql`${orgStatsDaily.sessions_with_post_handoff} + ${increments.sessions_with_post_handoff}`;
  }
  if (increments.runs_count !== undefined) {
    insertValues.runs_count = increments.runs_count;
    updateSet.runs_count = sql`${orgStatsDaily.runs_count} + ${increments.runs_count}`;
  }
  if (increments.success_runs !== undefined) {
    insertValues.success_runs = increments.success_runs;
    updateSet.success_runs = sql`${orgStatsDaily.success_runs} + ${increments.success_runs}`;
  }
  if (increments.failed_runs !== undefined) {
    insertValues.failed_runs = increments.failed_runs;
    updateSet.failed_runs = sql`${orgStatsDaily.failed_runs} + ${increments.failed_runs}`;
  }
  if (increments.errors_tool !== undefined) {
    insertValues.errors_tool = increments.errors_tool;
    updateSet.errors_tool = sql`${orgStatsDaily.errors_tool} + ${increments.errors_tool}`;
  }
  if (increments.errors_model !== undefined) {
    insertValues.errors_model = increments.errors_model;
    updateSet.errors_model = sql`${orgStatsDaily.errors_model} + ${increments.errors_model}`;
  }
  if (increments.errors_timeout !== undefined) {
    insertValues.errors_timeout = increments.errors_timeout;
    updateSet.errors_timeout = sql`${orgStatsDaily.errors_timeout} + ${increments.errors_timeout}`;
  }
  if (increments.errors_other !== undefined) {
    insertValues.errors_other = increments.errors_other;
    updateSet.errors_other = sql`${orgStatsDaily.errors_other} + ${increments.errors_other}`;
  }
  if (increments.total_duration_ms !== undefined) {
    insertValues.total_duration_ms = increments.total_duration_ms;
    updateSet.total_duration_ms = sql`${orgStatsDaily.total_duration_ms} + ${increments.total_duration_ms}`;
  }
  if (increments.total_cost !== undefined) {
    insertValues.total_cost = String(increments.total_cost);
    updateSet.total_cost = sql`${orgStatsDaily.total_cost}::numeric + ${increments.total_cost}`;
  }
  if (increments.total_input_tokens !== undefined) {
    insertValues.total_input_tokens = increments.total_input_tokens;
    updateSet.total_input_tokens = sql`${orgStatsDaily.total_input_tokens} + ${increments.total_input_tokens}`;
  }
  if (increments.total_output_tokens !== undefined) {
    insertValues.total_output_tokens = increments.total_output_tokens;
    updateSet.total_output_tokens = sql`${orgStatsDaily.total_output_tokens} + ${increments.total_output_tokens}`;
  }

  // Only execute if there's something to update
  if (Object.keys(updateSet).length === 0) {
    return;
  }

  await tx
    .insert(orgStatsDaily)
    .values(insertValues as typeof orgStatsDaily.$inferInsert)
    .onConflictDoUpdate({
      target: [orgStatsDaily.org_id, orgStatsDaily.day],
      set: updateSet,
    });
}

/**
 * Update user_stats_daily with the given increments.
 * Uses upsert to create the row if it doesn't exist.
 */
export async function updateUserStatsDaily(
  tx: DbTransaction,
  orgId: string,
  userId: string,
  day: string,
  increments: DailyStatsIncrements
): Promise<void> {
  // Build insert values with defaults
  const insertValues: Record<string, unknown> = {
    org_id: orgId,
    user_id: userId,
    day,
  };

  // Build update set clause
  const updateSet: Record<string, unknown> = {};

  // Add each increment field
  if (increments.sessions_count !== undefined) {
    insertValues.sessions_count = increments.sessions_count;
    updateSet.sessions_count = sql`${userStatsDaily.sessions_count} + ${increments.sessions_count}`;
  }
  if (increments.sessions_with_handoff !== undefined) {
    insertValues.sessions_with_handoff = increments.sessions_with_handoff;
    updateSet.sessions_with_handoff = sql`${userStatsDaily.sessions_with_handoff} + ${increments.sessions_with_handoff}`;
  }
  if (increments.sessions_with_post_handoff !== undefined) {
    insertValues.sessions_with_post_handoff = increments.sessions_with_post_handoff;
    updateSet.sessions_with_post_handoff = sql`${userStatsDaily.sessions_with_post_handoff} + ${increments.sessions_with_post_handoff}`;
  }
  if (increments.runs_count !== undefined) {
    insertValues.runs_count = increments.runs_count;
    updateSet.runs_count = sql`${userStatsDaily.runs_count} + ${increments.runs_count}`;
  }
  if (increments.success_runs !== undefined) {
    insertValues.success_runs = increments.success_runs;
    updateSet.success_runs = sql`${userStatsDaily.success_runs} + ${increments.success_runs}`;
  }
  if (increments.failed_runs !== undefined) {
    insertValues.failed_runs = increments.failed_runs;
    updateSet.failed_runs = sql`${userStatsDaily.failed_runs} + ${increments.failed_runs}`;
  }
  if (increments.errors_tool !== undefined) {
    insertValues.errors_tool = increments.errors_tool;
    updateSet.errors_tool = sql`${userStatsDaily.errors_tool} + ${increments.errors_tool}`;
  }
  if (increments.errors_model !== undefined) {
    insertValues.errors_model = increments.errors_model;
    updateSet.errors_model = sql`${userStatsDaily.errors_model} + ${increments.errors_model}`;
  }
  if (increments.errors_timeout !== undefined) {
    insertValues.errors_timeout = increments.errors_timeout;
    updateSet.errors_timeout = sql`${userStatsDaily.errors_timeout} + ${increments.errors_timeout}`;
  }
  if (increments.errors_other !== undefined) {
    insertValues.errors_other = increments.errors_other;
    updateSet.errors_other = sql`${userStatsDaily.errors_other} + ${increments.errors_other}`;
  }
  if (increments.total_duration_ms !== undefined) {
    insertValues.total_duration_ms = increments.total_duration_ms;
    updateSet.total_duration_ms = sql`${userStatsDaily.total_duration_ms} + ${increments.total_duration_ms}`;
  }
  if (increments.total_cost !== undefined) {
    insertValues.total_cost = String(increments.total_cost);
    updateSet.total_cost = sql`${userStatsDaily.total_cost}::numeric + ${increments.total_cost}`;
  }
  if (increments.total_input_tokens !== undefined) {
    insertValues.total_input_tokens = increments.total_input_tokens;
    updateSet.total_input_tokens = sql`${userStatsDaily.total_input_tokens} + ${increments.total_input_tokens}`;
  }
  if (increments.total_output_tokens !== undefined) {
    insertValues.total_output_tokens = increments.total_output_tokens;
    updateSet.total_output_tokens = sql`${userStatsDaily.total_output_tokens} + ${increments.total_output_tokens}`;
  }

  // Only execute if there's something to update
  if (Object.keys(updateSet).length === 0) {
    return;
  }

  await tx
    .insert(userStatsDaily)
    .values(insertValues as typeof userStatsDaily.$inferInsert)
    .onConflictDoUpdate({
      target: [userStatsDaily.org_id, userStatsDaily.user_id, userStatsDaily.day],
      set: updateSet,
    });
}

/**
 * Update both org and user daily stats with the same increments.
 * Convenience function for the common case where both need the same update.
 */
export async function updateDailyStats(
  tx: DbTransaction,
  orgId: string,
  userId: string,
  day: string,
  increments: DailyStatsIncrements
): Promise<void> {
  await updateOrgStatsDaily(tx, orgId, day, increments);
  await updateUserStatsDaily(tx, orgId, userId, day, increments);
}
