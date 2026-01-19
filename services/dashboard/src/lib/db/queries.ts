/**
 * Database queries for the dashboard.
 *
 * These functions replace the mock API with real database queries.
 * Use USE_REAL_DB=true environment variable to enable.
 */

import { getDb, schema } from "@repo/shared/db";
import { and, asc, desc, eq, gte, lte, sql, sum } from "drizzle-orm";

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
  avgActiveTimeMs: number;
  avgLifespanMs: number;
}

export async function getOrgMetricsFromDb(
  orgId: string,
  fromDate: Date,
  toDate: Date
): Promise<OrgMetricsResult> {
  const db = getDb();

  // Get aggregated daily stats
  const dailyStatsResult = await db
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

  // Get session-level averages (avg active time and avg lifespan)
  // Filter sessions that were active during the time range
  const sessionAvgsResult = await db
    .select({
      avgActiveTimeMs: sql<number>`AVG(${sessionStats.active_agent_time_ms})`,
      avgLifespanMs: sql<number>`AVG(EXTRACT(EPOCH FROM (${sessionStats.last_event_at} - ${sessionStats.first_message_at})) * 1000)`,
    })
    .from(sessionStats)
    .where(
      and(
        eq(sessionStats.org_id, orgId),
        gte(sessionStats.first_message_at, fromDate),
        lte(sessionStats.first_message_at, toDate)
      )
    );

  const row = dailyStatsResult[0];
  const sessionRow = sessionAvgsResult[0];

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
    avgActiveTimeMs: Number(sessionRow?.avgActiveTimeMs ?? 0),
    avgLifespanMs: Number(sessionRow?.avgLifespanMs ?? 0),
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
  inputTokens: number;
  outputTokens: number;
  successRuns: number;
  failedRuns: number;
  errorsTool: number;
  errorsModel: number;
  errorsTimeout: number;
  errorsOther: number;
  sessionsWithHandoff: number;
  sessionsWithPostHandoff: number;
}

export async function getOrgTrendsFromDb(
  orgId: string,
  fromDate: Date,
  toDate: Date
): Promise<OrgDailyTrend[]> {
  const db = getDb();

  // Get org stats
  const orgResults = await db
    .select({
      day: orgStatsDaily.day,
      runs: orgStatsDaily.runs_count,
      sessions: orgStatsDaily.sessions_count,
      cost: orgStatsDaily.total_cost,
      successRuns: orgStatsDaily.success_runs,
      failedRuns: orgStatsDaily.failed_runs,
      activeUsers: orgStatsDaily.active_users_count,
      inputTokens: orgStatsDaily.total_input_tokens,
      outputTokens: orgStatsDaily.total_output_tokens,
      errorsTool: orgStatsDaily.errors_tool,
      errorsModel: orgStatsDaily.errors_model,
      errorsTimeout: orgStatsDaily.errors_timeout,
      errorsOther: orgStatsDaily.errors_other,
      sessionsWithHandoff: orgStatsDaily.sessions_with_handoff,
      sessionsWithPostHandoff: orgStatsDaily.sessions_with_post_handoff,
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

  // Get active users count per day from user_stats_daily (distinct users with activity)
  const activeUsersResults = await db
    .select({
      day: userStatsDaily.day,
      activeUsers: sql<number>`count(DISTINCT ${userStatsDaily.user_id})`,
    })
    .from(userStatsDaily)
    .where(
      and(
        eq(userStatsDaily.org_id, orgId),
        gte(userStatsDaily.day, fromDate.toISOString().split("T")[0]),
        lte(userStatsDaily.day, toDate.toISOString().split("T")[0])
      )
    )
    .groupBy(userStatsDaily.day);

  // Create a map for quick lookup
  const activeUsersMap = new Map<string, number>();
  for (const row of activeUsersResults) {
    activeUsersMap.set(String(row.day), Number(row.activeUsers ?? 0));
  }

  return orgResults.map((row) => {
    const totalRuns = Number(row.runs ?? 0);
    const successRuns = Number(row.successRuns ?? 0);
    const dayStr = String(row.day);
    return {
      day: dayStr,
      runs: totalRuns,
      sessions: Number(row.sessions ?? 0),
      cost: Number(row.cost ?? 0),
      successRate: totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0,
      activeUsers: activeUsersMap.get(dayStr) ?? Number(row.activeUsers ?? 0),
      inputTokens: Number(row.inputTokens ?? 0),
      outputTokens: Number(row.outputTokens ?? 0),
      successRuns,
      failedRuns: Number(row.failedRuns ?? 0),
      errorsTool: Number(row.errorsTool ?? 0),
      errorsModel: Number(row.errorsModel ?? 0),
      errorsTimeout: Number(row.errorsTimeout ?? 0),
      errorsOther: Number(row.errorsOther ?? 0),
      sessionsWithHandoff: Number(row.sessionsWithHandoff ?? 0),
      sessionsWithPostHandoff: Number(row.sessionsWithPostHandoff ?? 0),
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
  userEmail: string | null;
  userName: string | null;
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

export interface SessionsListOptions {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: string;
  durationRange?: string;
  costRange?: string;
  hasHandoff?: string;
  hasPostHandoffIteration?: string;
  userIds?: string[];
}

export async function getSessionsListFromDb(
  orgId: string,
  fromDate: Date,
  toDate: Date,
  limit: number,
  offset: number,
  options?: SessionsListOptions
): Promise<SessionsListResult> {
  const db = getDb();
  const {
    sortBy = "first_message_at",
    sortOrder = "desc",
    search,
    status,
    durationRange,
    costRange,
    hasHandoff,
    hasPostHandoffIteration,
  } = options ?? {};

  // Build where conditions
  const conditions = [
    eq(sessionStats.org_id, orgId),
    gte(sessionStats.first_message_at, fromDate),
    lte(sessionStats.first_message_at, toDate),
  ];

  // Add search filter (searches session_id)
  if (search) {
    conditions.push(sql`${sessionStats.session_id} ILIKE ${`%${search}%`}`);
  }

  // Add status filter
  if (status === "has_failures") {
    conditions.push(sql`${sessionStats.failed_runs} > 0`);
  } else if (status === "all_succeeded") {
    conditions.push(sql`${sessionStats.failed_runs} = 0 AND ${sessionStats.runs_count} > 0`);
  }

  // Add duration range filter (lifespan = last_event_at - first_message_at)
  if (durationRange && durationRange !== "any") {
    const lifespanMs = sql`EXTRACT(EPOCH FROM (${sessionStats.last_event_at} - ${sessionStats.first_message_at})) * 1000`;
    switch (durationRange) {
      case "<5m":
        conditions.push(sql`${lifespanMs} < ${5 * 60 * 1000}`);
        break;
      case "5m-30m":
        conditions.push(sql`${lifespanMs} >= ${5 * 60 * 1000} AND ${lifespanMs} < ${30 * 60 * 1000}`);
        break;
      case "30m-1h":
        conditions.push(sql`${lifespanMs} >= ${30 * 60 * 1000} AND ${lifespanMs} < ${60 * 60 * 1000}`);
        break;
      case ">1h":
        conditions.push(sql`${lifespanMs} >= ${60 * 60 * 1000}`);
        break;
    }
  }

  // Add cost range filter (cost is in decimal dollars, convert to cents for comparison)
  if (costRange && costRange !== "any") {
    switch (costRange) {
      case "<10":
        conditions.push(sql`${sessionStats.cost_total} < ${10}`);
        break;
      case "10-50":
        conditions.push(sql`${sessionStats.cost_total} >= ${10} AND ${sessionStats.cost_total} < ${50}`);
        break;
      case "50-100":
        conditions.push(sql`${sessionStats.cost_total} >= ${50} AND ${sessionStats.cost_total} < ${100}`);
        break;
      case ">100":
        conditions.push(sql`${sessionStats.cost_total} >= ${100}`);
        break;
    }
  }

  // Add handoff filter
  if (hasHandoff === "yes") {
    conditions.push(sql`${sessionStats.handoffs_count} > 0`);
  } else if (hasHandoff === "no") {
    conditions.push(sql`${sessionStats.handoffs_count} = 0`);
  }

  // Add post-handoff iteration filter
  if (hasPostHandoffIteration === "yes") {
    conditions.push(sql`${sessionStats.has_post_handoff_iteration} = true`);
  } else if (hasPostHandoffIteration === "no") {
    conditions.push(sql`${sessionStats.has_post_handoff_iteration} = false`);
  }

  // Add user IDs filter
  const userIds = options?.userIds;
  if (userIds && userIds.length > 0) {
    conditions.push(sql`${sessionStats.user_id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
  }

  const whereClause = and(...conditions);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessionStats)
    .where(whereClause);

  const total = Number(countResult[0]?.count ?? 0);

  // Build order by clause
  const orderByColumn = getSessionSortColumn(sortBy);
  const orderByDir = sortOrder === "asc" ? asc : desc;

  // Get paginated results with user info
  const results = await db
    .select({
      sessionStats: sessionStats,
      userEmail: users.email,
      userName: users.display_name,
    })
    .from(sessionStats)
    .leftJoin(users, eq(sessionStats.user_id, users.user_id))
    .where(whereClause)
    .orderBy(orderByDir(orderByColumn))
    .limit(limit)
    .offset(offset);

  const sessions: SessionListItem[] = results.map((row) => ({
    orgId: row.sessionStats.org_id,
    sessionId: row.sessionStats.session_id,
    userId: row.sessionStats.user_id,
    userEmail: row.userEmail,
    userName: row.userName,
    firstMessageAt: row.sessionStats.first_message_at,
    lastEventAt: row.sessionStats.last_event_at,
    runsCount: row.sessionStats.runs_count ?? 0,
    successRuns: row.sessionStats.success_runs ?? 0,
    failedRuns: row.sessionStats.failed_runs ?? 0,
    activeAgentTimeMs: row.sessionStats.active_agent_time_ms ?? 0,
    handoffsCount: row.sessionStats.handoffs_count ?? 0,
    hasPostHandoffIteration: row.sessionStats.has_post_handoff_iteration,
    costTotal: Number(row.sessionStats.cost_total ?? 0),
    inputTokensTotal: row.sessionStats.input_tokens_total ?? 0,
    outputTokensTotal: row.sessionStats.output_tokens_total ?? 0,
  }));

  return { sessions, total };
}

function getSessionSortColumn(sortBy: string) {
  switch (sortBy) {
    case "createdAt":
    case "first_message_at":
      return sessionStats.first_message_at;
    case "lifespanMs":
      return sql`EXTRACT(EPOCH FROM (${sessionStats.last_event_at} - ${sessionStats.first_message_at})) * 1000`;
    case "activeTimeMs":
    case "active_agent_time_ms":
      return sessionStats.active_agent_time_ms;
    case "runCount":
    case "runs_count":
      return sessionStats.runs_count;
    case "localHandoffCount":
    case "handoffs_count":
      return sessionStats.handoffs_count;
    case "successRate":
      return sql`CASE WHEN ${sessionStats.runs_count} > 0 THEN ${sessionStats.success_runs}::float / ${sessionStats.runs_count} ELSE 0 END`;
    case "totalTokens":
      return sql`${sessionStats.input_tokens_total} + ${sessionStats.output_tokens_total}`;
    case "totalCostCents":
    case "cost_total":
      return sessionStats.cost_total;
    default:
      return sessionStats.first_message_at;
  }
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
    userId: string;
    runId: string | null;
    payload: Record<string, unknown>;
  }>;
}

export async function getSessionDetailFromDb(
  orgId: string,
  sessionId: string
): Promise<SessionDetail | null> {
  const db = getDb();

  // Get session stats with user info
  const sessionResults = await db
    .select({
      sessionStats: sessionStats,
      userEmail: users.email,
      userName: users.display_name,
    })
    .from(sessionStats)
    .leftJoin(users, eq(sessionStats.user_id, users.user_id))
    .where(and(eq(sessionStats.org_id, orgId), eq(sessionStats.session_id, sessionId)))
    .limit(1);

  if (sessionResults.length === 0) {
    return null;
  }

  const result = sessionResults[0];
  const row = result.sessionStats;
  const session: SessionListItem = {
    orgId: row.org_id,
    sessionId: row.session_id,
    userId: row.user_id,
    userEmail: result.userEmail,
    userName: result.userName,
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
    .orderBy(asc(runFacts.started_at));

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
      userId: eventsRaw.user_id,
      runId: eventsRaw.run_id,
      payload: eventsRaw.payload,
    })
    .from(eventsRaw)
    .where(and(eq(eventsRaw.org_id, orgId), eq(eventsRaw.session_id, sessionId)))
    .orderBy(eventsRaw.occurred_at);

  const events = eventResults.map((e) => ({
    eventId: e.eventId,
    eventType: e.eventType,
    occurredAt: e.occurredAt,
    userId: e.userId,
    runId: e.runId,
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
  totalLifespanMs: number;
  sessionsWithHandoff: number;
  sessionsWithPostHandoff: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface UsersListResult {
  users: UserListItem[];
  total: number;
}

export interface UsersListOptions {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export async function getUsersListFromDb(
  orgId: string,
  fromDate: Date,
  toDate: Date,
  limit: number,
  offset: number,
  options?: UsersListOptions
): Promise<UsersListResult> {
  const db = getDb();
  const { sortBy = "runsCount", sortOrder = "desc", search } = options ?? {};

  // Build where conditions for user_stats_daily
  const conditions = [
    eq(userStatsDaily.org_id, orgId),
    gte(userStatsDaily.day, fromDate.toISOString().split("T")[0]),
    lte(userStatsDaily.day, toDate.toISOString().split("T")[0]),
  ];

  // Add search filter (searches user email or display name)
  if (search) {
    conditions.push(
      sql`(${users.email} ILIKE ${`%${search}%`} OR ${users.display_name} ILIKE ${`%${search}%`})`
    );
  }

  const whereClause = and(...conditions);

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
      totalInputTokens: sum(userStatsDaily.total_input_tokens),
      totalOutputTokens: sum(userStatsDaily.total_output_tokens),
    })
    .from(userStatsDaily)
    .leftJoin(users, eq(userStatsDaily.user_id, users.user_id))
    .where(whereClause)
    .groupBy(userStatsDaily.user_id, users.email, users.display_name)
    .orderBy(sortOrder === "asc" ? asc(getUserSortColumn(sortBy)) : desc(getUserSortColumn(sortBy)))
    .limit(limit)
    .offset(offset);

  // Get user IDs to fetch lifespan and active time data from session_stats
  const userIds = results.map((r) => r.userId);

  // Get lifespan and active time per user from session_stats (using consistent date filtering)
  // This ensures both metrics use the same sessions, avoiding the issue where
  // run durations (from user_stats_daily) can exceed lifespan (from session_stats)
  const sessionMetricsResults = userIds.length > 0
    ? await db
        .select({
          userId: sessionStats.user_id,
          totalLifespanMs: sql<number>`SUM(EXTRACT(EPOCH FROM (${sessionStats.last_event_at} - ${sessionStats.first_message_at})) * 1000)`,
          totalActiveTimeMs: sum(sessionStats.active_agent_time_ms),
          sessionsCount: sql<number>`COUNT(*)`,
        })
        .from(sessionStats)
        .where(
          and(
            eq(sessionStats.org_id, orgId),
            gte(sessionStats.first_message_at, fromDate),
            lte(sessionStats.first_message_at, toDate),
            sql`${sessionStats.user_id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`
          )
        )
        .groupBy(sessionStats.user_id)
    : [];

  const sessionMetricsMap = new Map(sessionMetricsResults.map((r) => [
    r.userId,
    {
      lifespan: Number(r.totalLifespanMs ?? 0),
      activeTime: Number(r.totalActiveTimeMs ?? 0),
      sessions: Number(r.sessionsCount ?? 0),
    }
  ]));

  const usersList: UserListItem[] = results.map((row) => {
    // Use session_stats metrics for active time, lifespan, and session count to ensure consistency
    // This avoids issues where user_stats_daily session counts don't match session_stats
    const sessionMetrics = sessionMetricsMap.get(row.userId);
    return {
      userId: row.userId,
      email: row.email,
      displayName: row.displayName,
      // Use session count from session_stats for consistency with lifespan/active time calculations
      sessionsCount: sessionMetrics?.sessions ?? Number(row.sessionsCount ?? 0),
      runsCount: Number(row.runsCount ?? 0),
      successRuns: Number(row.successRuns ?? 0),
      failedRuns: Number(row.failedRuns ?? 0),
      totalCost: Number(row.totalCost ?? 0),
      // Use active time from session_stats to match lifespan date filtering
      totalDurationMs: sessionMetrics?.activeTime ?? 0,
      totalLifespanMs: sessionMetrics?.lifespan ?? 0,
      sessionsWithHandoff: Number(row.sessionsWithHandoff ?? 0),
      sessionsWithPostHandoff: Number(row.sessionsWithPostHandoff ?? 0),
      totalInputTokens: Number(row.totalInputTokens ?? 0),
      totalOutputTokens: Number(row.totalOutputTokens ?? 0),
    };
  });

  // Get total distinct users (for pagination)
  const countResult = await db
    .select({ count: sql<number>`count(DISTINCT ${userStatsDaily.user_id})` })
    .from(userStatsDaily)
    .leftJoin(users, eq(userStatsDaily.user_id, users.user_id))
    .where(whereClause);

  const total = Number(countResult[0]?.count ?? 0);

  return { users: usersList, total };
}

function getUserSortColumn(sortBy: string) {
  switch (sortBy) {
    case "sessionCount":
    case "sessions_count":
      return sum(userStatsDaily.sessions_count);
    case "runCount":
    case "runs_count":
      return sum(userStatsDaily.runs_count);
    case "totalCostCents":
    case "total_cost":
      return sum(userStatsDaily.total_cost);
    case "totalTokens":
      return sql`${sum(userStatsDaily.total_input_tokens)} + ${sum(userStatsDaily.total_output_tokens)}`;
    case "avgRunsPerSession":
      return sql`CASE WHEN ${sum(userStatsDaily.sessions_count)} > 0 THEN ${sum(userStatsDaily.runs_count)}::float / ${sum(userStatsDaily.sessions_count)} ELSE 0 END`;
    case "avgActiveTimeMs":
    case "total_duration_ms":
      return sum(userStatsDaily.total_duration_ms);
    case "successRate":
      return sql`CASE WHEN ${sum(userStatsDaily.runs_count)} > 0 THEN ${sum(userStatsDaily.success_runs)}::float / ${sum(userStatsDaily.runs_count)} ELSE 0 END`;
    case "localHandoffRate":
    case "handoffRate":
      return sql`CASE WHEN ${sum(userStatsDaily.sessions_count)} > 0 THEN ${sum(userStatsDaily.sessions_with_handoff)}::float / ${sum(userStatsDaily.sessions_count)} ELSE 0 END`;
    case "postHandoffIterationRate":
      return sql`CASE WHEN ${sum(userStatsDaily.sessions_with_handoff)} > 0 THEN ${sum(userStatsDaily.sessions_with_post_handoff)}::float / ${sum(userStatsDaily.sessions_with_handoff)} ELSE 0 END`;
    case "costPerRun":
      return sql`CASE WHEN ${sum(userStatsDaily.runs_count)} > 0 THEN ${sum(userStatsDaily.total_cost)}::float / ${sum(userStatsDaily.runs_count)} ELSE 0 END`;
    default:
      return sum(userStatsDaily.runs_count);
  }
}

// ============================================================================
// User Trends (Daily)
// ============================================================================

export interface UserDailyTrend {
  day: string;
  runs: number;
  sessions: number;
  cost: number;
  successRuns: number;
  failedRuns: number;
  sessionsWithHandoff: number;
  sessionsWithPostHandoff: number;
}

export async function getUserTrendsFromDb(
  orgId: string,
  userId: string,
  fromDate: Date,
  toDate: Date
): Promise<UserDailyTrend[]> {
  const db = getDb();

  const results = await db
    .select({
      day: userStatsDaily.day,
      runs: userStatsDaily.runs_count,
      sessions: userStatsDaily.sessions_count,
      cost: userStatsDaily.total_cost,
      successRuns: userStatsDaily.success_runs,
      failedRuns: userStatsDaily.failed_runs,
      sessionsWithHandoff: userStatsDaily.sessions_with_handoff,
      sessionsWithPostHandoff: userStatsDaily.sessions_with_post_handoff,
    })
    .from(userStatsDaily)
    .where(
      and(
        eq(userStatsDaily.org_id, orgId),
        eq(userStatsDaily.user_id, userId),
        gte(userStatsDaily.day, fromDate.toISOString().split("T")[0]),
        lte(userStatsDaily.day, toDate.toISOString().split("T")[0])
      )
    )
    .orderBy(userStatsDaily.day);

  return results.map((row) => ({
    day: String(row.day),
    runs: Number(row.runs ?? 0),
    sessions: Number(row.sessions ?? 0),
    cost: Number(row.cost ?? 0),
    successRuns: Number(row.successRuns ?? 0),
    failedRuns: Number(row.failedRuns ?? 0),
    sessionsWithHandoff: Number(row.sessionsWithHandoff ?? 0),
    sessionsWithPostHandoff: Number(row.sessionsWithPostHandoff ?? 0),
  }));
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
      AND completed_at >= ${fromDate.toISOString()}
      AND completed_at <= ${toDate.toISOString()}
      AND duration_ms IS NOT NULL
  `);

  const rows = result as unknown as { p95: number }[];
  return Number(rows[0]?.p95 ?? 0);
}
