/**
 * Database queries for the dashboard.
 *
 * These functions replace the mock API with real database queries.
 * Use USE_REAL_DB=true environment variable to enable.
 */

import { getDb, schema } from "@repo/shared/db";
import { and, desc, eq, gte, lte, sql, sum } from "drizzle-orm";

const { orgStatsDaily, userStatsDaily, sessionStats, runFacts, eventsRaw, users, orgs } = schema;

// ============================================================================
// Org Metrics
// ============================================================================

export interface OrgMetricsResult {
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  totalDurationMs: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  sessionsCount: number;
  sessionsWithHandoff: number;
  sessionsWithPostHandoff: number;
  errorsTool: number;
  errorsModel: number;
  errorsTimeout: number;
  errorsOther: number;
}

export async function getOrgMetricsFromDb(
  orgId: string,
  fromDate: Date,
  toDate: Date
): Promise<OrgMetricsResult> {
  const db = getDb();

  const result = await db
    .select({
      totalRuns: sum(orgStatsDaily.runs_count),
      successRuns: sum(orgStatsDaily.success_runs),
      failedRuns: sum(orgStatsDaily.failed_runs),
      totalDurationMs: sum(orgStatsDaily.total_duration_ms),
      totalCost: sum(orgStatsDaily.total_cost),
      totalInputTokens: sum(orgStatsDaily.total_input_tokens),
      totalOutputTokens: sum(orgStatsDaily.total_output_tokens),
      sessionsCount: sum(orgStatsDaily.sessions_count),
      sessionsWithHandoff: sum(orgStatsDaily.sessions_with_handoff),
      sessionsWithPostHandoff: sum(orgStatsDaily.sessions_with_post_handoff),
      errorsTool: sum(orgStatsDaily.errors_tool),
      errorsModel: sum(orgStatsDaily.errors_model),
      errorsTimeout: sum(orgStatsDaily.errors_timeout),
      errorsOther: sum(orgStatsDaily.errors_other),
    })
    .from(orgStatsDaily)
    .where(
      and(
        eq(orgStatsDaily.org_id, orgId),
        gte(orgStatsDaily.day, fromDate.toISOString().split("T")[0]),
        lte(orgStatsDaily.day, toDate.toISOString().split("T")[0])
      )
    );

  const row = result[0];
  return {
    totalRuns: Number(row?.totalRuns ?? 0),
    successRuns: Number(row?.successRuns ?? 0),
    failedRuns: Number(row?.failedRuns ?? 0),
    totalDurationMs: Number(row?.totalDurationMs ?? 0),
    totalCost: Number(row?.totalCost ?? 0),
    totalInputTokens: Number(row?.totalInputTokens ?? 0),
    totalOutputTokens: Number(row?.totalOutputTokens ?? 0),
    sessionsCount: Number(row?.sessionsCount ?? 0),
    sessionsWithHandoff: Number(row?.sessionsWithHandoff ?? 0),
    sessionsWithPostHandoff: Number(row?.sessionsWithPostHandoff ?? 0),
    errorsTool: Number(row?.errorsTool ?? 0),
    errorsModel: Number(row?.errorsModel ?? 0),
    errorsTimeout: Number(row?.errorsTimeout ?? 0),
    errorsOther: Number(row?.errorsOther ?? 0),
  };
}

// ============================================================================
// Org Trends (Daily)
// ============================================================================

export interface OrgDailyTrend {
  day: string;
  runs: number;
  sessions: number;
  cost: number;
  successRate: number;
  activeUsers: number;
}

export async function getOrgTrendsFromDb(
  orgId: string,
  fromDate: Date,
  toDate: Date
): Promise<OrgDailyTrend[]> {
  const db = getDb();

  const results = await db
    .select({
      day: orgStatsDaily.day,
      runs: orgStatsDaily.runs_count,
      sessions: orgStatsDaily.sessions_count,
      cost: orgStatsDaily.total_cost,
      successRuns: orgStatsDaily.success_runs,
      failedRuns: orgStatsDaily.failed_runs,
      activeUsers: orgStatsDaily.active_users_count,
    })
    .from(orgStatsDaily)
    .where(
      and(
        eq(orgStatsDaily.org_id, orgId),
        gte(orgStatsDaily.day, fromDate.toISOString().split("T")[0]),
        lte(orgStatsDaily.day, toDate.toISOString().split("T")[0])
      )
    )
    .orderBy(orgStatsDaily.day);

  return results.map((row) => {
    const totalRuns = Number(row.runs ?? 0);
    const successRuns = Number(row.successRuns ?? 0);
    return {
      day: String(row.day),
      runs: totalRuns,
      sessions: Number(row.sessions ?? 0),
      cost: Number(row.cost ?? 0),
      successRate: totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0,
      activeUsers: Number(row.activeUsers ?? 0),
    };
  });
}

// ============================================================================
// Sessions List
// ============================================================================

export interface SessionListItem {
  orgId: string;
  sessionId: string;
  userId: string | null;
  firstMessageAt: Date | null;
  lastEventAt: Date | null;
  runsCount: number;
  successRuns: number;
  failedRuns: number;
  activeAgentTimeMs: number;
  handoffsCount: number;
  hasPostHandoffIteration: boolean;
  costTotal: number;
  inputTokensTotal: number;
  outputTokensTotal: number;
}

export interface SessionsListResult {
  sessions: SessionListItem[];
  total: number;
}

export async function getSessionsListFromDb(
  orgId: string,
  fromDate: Date,
  toDate: Date,
  limit: number,
  offset: number
): Promise<SessionsListResult> {
  const db = getDb();

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessionStats)
    .where(
      and(
        eq(sessionStats.org_id, orgId),
        gte(sessionStats.last_event_at, fromDate),
        lte(sessionStats.first_message_at, toDate)
      )
    );

  const total = Number(countResult[0]?.count ?? 0);

  // Get paginated results
  const results = await db
    .select()
    .from(sessionStats)
    .where(
      and(
        eq(sessionStats.org_id, orgId),
        gte(sessionStats.last_event_at, fromDate),
        lte(sessionStats.first_message_at, toDate)
      )
    )
    .orderBy(desc(sessionStats.last_event_at))
    .limit(limit)
    .offset(offset);

  const sessions: SessionListItem[] = results.map((row) => ({
    orgId: row.org_id,
    sessionId: row.session_id,
    userId: row.user_id,
    firstMessageAt: row.first_message_at,
    lastEventAt: row.last_event_at,
    runsCount: row.runs_count ?? 0,
    successRuns: row.success_runs ?? 0,
    failedRuns: row.failed_runs ?? 0,
    activeAgentTimeMs: row.active_agent_time_ms ?? 0,
    handoffsCount: row.handoffs_count ?? 0,
    hasPostHandoffIteration: row.has_post_handoff_iteration,
    costTotal: Number(row.cost_total ?? 0),
    inputTokensTotal: row.input_tokens_total ?? 0,
    outputTokensTotal: row.output_tokens_total ?? 0,
  }));

  return { sessions, total };
}

// ============================================================================
// Session Detail
// ============================================================================

export interface SessionDetail {
  session: SessionListItem;
  runs: Array<{
    runId: string;
    sessionId: string;
    userId: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    status: string | null;
    durationMs: number | null;
    cost: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    errorType: string | null;
  }>;
  events: Array<{
    eventId: string;
    eventType: string;
    occurredAt: Date;
    payload: Record<string, unknown>;
  }>;
}

export async function getSessionDetailFromDb(
  orgId: string,
  sessionId: string
): Promise<SessionDetail | null> {
  const db = getDb();

  // Get session stats
  const sessionResults = await db
    .select()
    .from(sessionStats)
    .where(and(eq(sessionStats.org_id, orgId), eq(sessionStats.session_id, sessionId)))
    .limit(1);

  if (sessionResults.length === 0) {
    return null;
  }

  const row = sessionResults[0];
  const session: SessionListItem = {
    orgId: row.org_id,
    sessionId: row.session_id,
    userId: row.user_id,
    firstMessageAt: row.first_message_at,
    lastEventAt: row.last_event_at,
    runsCount: row.runs_count ?? 0,
    successRuns: row.success_runs ?? 0,
    failedRuns: row.failed_runs ?? 0,
    activeAgentTimeMs: row.active_agent_time_ms ?? 0,
    handoffsCount: row.handoffs_count ?? 0,
    hasPostHandoffIteration: row.has_post_handoff_iteration,
    costTotal: Number(row.cost_total ?? 0),
    inputTokensTotal: row.input_tokens_total ?? 0,
    outputTokensTotal: row.output_tokens_total ?? 0,
  };

  // Get runs
  const runResults = await db
    .select()
    .from(runFacts)
    .where(and(eq(runFacts.org_id, orgId), eq(runFacts.session_id, sessionId)))
    .orderBy(runFacts.completed_at);

  const runs = runResults.map((r) => ({
    runId: r.run_id,
    sessionId: r.session_id,
    userId: r.user_id,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    status: r.status,
    durationMs: r.duration_ms,
    cost: r.cost ? Number(r.cost) : null,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    errorType: r.error_type,
  }));

  // Get events
  const eventResults = await db
    .select({
      eventId: eventsRaw.event_id,
      eventType: eventsRaw.event_type,
      occurredAt: eventsRaw.occurred_at,
      payload: eventsRaw.payload,
    })
    .from(eventsRaw)
    .where(and(eq(eventsRaw.org_id, orgId), eq(eventsRaw.session_id, sessionId)))
    .orderBy(eventsRaw.occurred_at);

  const events = eventResults.map((e) => ({
    eventId: e.eventId,
    eventType: e.eventType,
    occurredAt: e.occurredAt,
    payload: e.payload as Record<string, unknown>,
  }));

  return { session, runs, events };
}

// ============================================================================
// Users List
// ============================================================================

export interface UserListItem {
  userId: string;
  email: string | null;
  displayName: string | null;
  sessionsCount: number;
  runsCount: number;
  successRuns: number;
  failedRuns: number;
  totalCost: number;
  totalDurationMs: number;
  sessionsWithHandoff: number;
  sessionsWithPostHandoff: number;
}

export interface UsersListResult {
  users: UserListItem[];
  total: number;
}

export async function getUsersListFromDb(
  orgId: string,
  fromDate: Date,
  toDate: Date,
  limit: number,
  offset: number
): Promise<UsersListResult> {
  const db = getDb();

  // Aggregate user stats for the date range
  const results = await db
    .select({
      userId: userStatsDaily.user_id,
      email: users.email,
      displayName: users.display_name,
      sessionsCount: sum(userStatsDaily.sessions_count),
      runsCount: sum(userStatsDaily.runs_count),
      successRuns: sum(userStatsDaily.success_runs),
      failedRuns: sum(userStatsDaily.failed_runs),
      totalCost: sum(userStatsDaily.total_cost),
      totalDurationMs: sum(userStatsDaily.total_duration_ms),
      sessionsWithHandoff: sum(userStatsDaily.sessions_with_handoff),
      sessionsWithPostHandoff: sum(userStatsDaily.sessions_with_post_handoff),
    })
    .from(userStatsDaily)
    .leftJoin(users, eq(userStatsDaily.user_id, users.user_id))
    .where(
      and(
        eq(userStatsDaily.org_id, orgId),
        gte(userStatsDaily.day, fromDate.toISOString().split("T")[0]),
        lte(userStatsDaily.day, toDate.toISOString().split("T")[0])
      )
    )
    .groupBy(userStatsDaily.user_id, users.email, users.display_name)
    .orderBy(desc(sum(userStatsDaily.runs_count)))
    .limit(limit)
    .offset(offset);

  const usersList: UserListItem[] = results.map((row) => ({
    userId: row.userId,
    email: row.email,
    displayName: row.displayName,
    sessionsCount: Number(row.sessionsCount ?? 0),
    runsCount: Number(row.runsCount ?? 0),
    successRuns: Number(row.successRuns ?? 0),
    failedRuns: Number(row.failedRuns ?? 0),
    totalCost: Number(row.totalCost ?? 0),
    totalDurationMs: Number(row.totalDurationMs ?? 0),
    sessionsWithHandoff: Number(row.sessionsWithHandoff ?? 0),
    sessionsWithPostHandoff: Number(row.sessionsWithPostHandoff ?? 0),
  }));

  // Get total distinct users (for pagination)
  const countResult = await db
    .select({ count: sql<number>`count(DISTINCT user_id)` })
    .from(userStatsDaily)
    .where(
      and(
        eq(userStatsDaily.org_id, orgId),
        gte(userStatsDaily.day, fromDate.toISOString().split("T")[0]),
        lte(userStatsDaily.day, toDate.toISOString().split("T")[0])
      )
    );

  const total = Number(countResult[0]?.count ?? 0);

  return { users: usersList, total };
}

// ============================================================================
// Global Metrics (SUPER_ADMIN)
// ============================================================================

export interface GlobalMetricsResult {
  totalOrgs: number;
  totalRuns: number;
  totalCost: number;
  totalTokens: number;
  successRate: number;
}

export async function getGlobalMetricsFromDb(
  fromDate: Date,
  toDate: Date
): Promise<GlobalMetricsResult> {
  const db = getDb();

  // Count orgs
  const orgsResult = await db.select({ count: sql<number>`count(*)` }).from(orgs);
  const totalOrgs = Number(orgsResult[0]?.count ?? 0);

  // Aggregate metrics across all orgs
  const metricsResult = await db
    .select({
      totalRuns: sum(orgStatsDaily.runs_count),
      successRuns: sum(orgStatsDaily.success_runs),
      totalCost: sum(orgStatsDaily.total_cost),
      totalInputTokens: sum(orgStatsDaily.total_input_tokens),
      totalOutputTokens: sum(orgStatsDaily.total_output_tokens),
    })
    .from(orgStatsDaily)
    .where(
      and(
        gte(orgStatsDaily.day, fromDate.toISOString().split("T")[0]),
        lte(orgStatsDaily.day, toDate.toISOString().split("T")[0])
      )
    );

  const row = metricsResult[0];
  const totalRuns = Number(row?.totalRuns ?? 0);
  const successRuns = Number(row?.successRuns ?? 0);

  return {
    totalOrgs,
    totalRuns,
    totalCost: Number(row?.totalCost ?? 0),
    totalTokens: Number(row?.totalInputTokens ?? 0) + Number(row?.totalOutputTokens ?? 0),
    successRate: totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0,
  };
}

// ============================================================================
// Top Orgs (SUPER_ADMIN)
// ============================================================================

export interface TopOrgItem {
  orgId: string;
  name: string;
  runsCount: number;
  sessionsCount: number;
  totalCost: number;
  successRate: number;
}

export async function getTopOrgsFromDb(
  fromDate: Date,
  toDate: Date,
  limit: number
): Promise<TopOrgItem[]> {
  const db = getDb();

  const results = await db
    .select({
      orgId: orgStatsDaily.org_id,
      name: orgs.name,
      runsCount: sum(orgStatsDaily.runs_count),
      successRuns: sum(orgStatsDaily.success_runs),
      sessionsCount: sum(orgStatsDaily.sessions_count),
      totalCost: sum(orgStatsDaily.total_cost),
    })
    .from(orgStatsDaily)
    .leftJoin(orgs, eq(orgStatsDaily.org_id, orgs.org_id))
    .where(
      and(
        gte(orgStatsDaily.day, fromDate.toISOString().split("T")[0]),
        lte(orgStatsDaily.day, toDate.toISOString().split("T")[0])
      )
    )
    .groupBy(orgStatsDaily.org_id, orgs.name)
    .orderBy(desc(sum(orgStatsDaily.runs_count)))
    .limit(limit);

  return results.map((row) => {
    const runsCount = Number(row.runsCount ?? 0);
    const successRuns = Number(row.successRuns ?? 0);
    return {
      orgId: row.orgId,
      name: row.name ?? "Unknown",
      runsCount,
      sessionsCount: Number(row.sessionsCount ?? 0),
      totalCost: Number(row.totalCost ?? 0),
      successRate: runsCount > 0 ? (successRuns / runsCount) * 100 : 0,
    };
  });
}

// ============================================================================
// P95 Duration (computed at query time)
// ============================================================================

export async function getP95DurationFromDb(
  orgId: string,
  fromDate: Date,
  toDate: Date
): Promise<number> {
  const db = getDb();

  const result = await db.execute(sql`
    SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95
    FROM run_facts
    WHERE org_id = ${orgId}
      AND completed_at >= ${fromDate}
      AND completed_at <= ${toDate}
      AND duration_ms IS NOT NULL
  `);

  const rows = result as unknown as { p95: number }[];
  return Number(rows[0]?.p95 ?? 0);
}
