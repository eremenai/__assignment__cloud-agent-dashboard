/**
 * Mock API functions that compute metrics from raw mock data.
 * These simulate what real API endpoints would return.
 */

import type {
  GlobalMetricsResponse,
  GlobalOrgsResponse,
  OrgMetricsResponse,
  OrgTrendsResponse,
  PaginationParams,
  SessionDetailResponse,
  SessionFilters,
  SessionsListResponse,
  SortParams,
  TimeRangeParams,
  UserDetailResponse,
  UserFilters,
  UsersListResponse,
} from "@/lib/types/api";
import type {
  FailureCategory,
  FailureCategoryCount,
  OrgWithMetrics,
  Run,
  Session,
  SessionWithMetrics,
  TrendData,
  UserWithMetrics,
} from "@/lib/types/domain";

import { generateTimeSeries } from "./generator";
import { getAllOrganizations } from "./mock-data/organizations";
import {
  getHandoffsForOrg,
  getOrgData,
  getRunsForOrg,
  getSessionData,
  getSessionsForOrg,
  getSessionsForUser,
} from "./mock-data/sessions";
import { getAllUsers, getUser, getUsersForOrg } from "./mock-data/users";

// ============================================================================
// Helper Functions
// ============================================================================

function filterByTimeRange<T extends { createdAt?: Date; startedAt?: Date }>(items: T[], from: Date, to: Date): T[] {
  return items.filter((item) => {
    const date = item.createdAt || item.startedAt;
    if (!date) return false;
    return date >= from && date <= to;
  });
}

function computeTrendData(current: number, previous: number): TrendData {
  const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
  return {
    current,
    previous,
    changePercent: Math.round(change * 10) / 10,
    isPositive: change >= 0,
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ============================================================================
// Session Metrics Computation
// ============================================================================

function computeSessionMetrics(session: Session, runs: Run[], handoffs: { sessionId: string }[]): SessionWithMetrics {
  const sessionRuns = runs.filter((r) => r.sessionId === session.sessionId);
  const sessionHandoffs = handoffs.filter((h) => h.sessionId === session.sessionId);

  const lifespanMs = session.lastMessageAt.getTime() - session.firstMessageAt.getTime();
  const activeTimeMs = sessionRuns.reduce((sum, r) => sum + r.executionMs, 0);
  const successfulRuns = sessionRuns.filter((r) => r.status === "success").length;
  const failedRuns = sessionRuns.filter((r) => r.status !== "success").length;
  const totalCostCents = sessionRuns.reduce((sum, r) => sum + r.costCents, 0);
  const inputTokens = sessionRuns.reduce((sum, r) => sum + r.inputTokens, 0);
  const outputTokens = sessionRuns.reduce((sum, r) => sum + r.outputTokens, 0);
  const totalTokens = sessionRuns.reduce((sum, r) => sum + r.totalTokens, 0);

  // Check for post-handoff iteration
  const hasPostHandoffIteration =
    sessionHandoffs.length > 0 &&
    sessionRuns.some((run) => {
      const lastHandoff = sessionHandoffs[sessionHandoffs.length - 1];
      return "timestamp" in lastHandoff && run.startedAt > (lastHandoff as { timestamp: Date }).timestamp;
    });

  const user = getUser(session.createdByUserId);

  return {
    ...session,
    createdByUser: user
      ? { userId: user.userId, name: user.name, email: user.email }
      : { userId: session.createdByUserId, name: "Unknown", email: "" },
    lifespanMs,
    activeTimeMs,
    runCount: sessionRuns.length,
    successfulRunCount: successfulRuns,
    failedRunCount: failedRuns,
    localHandoffCount: sessionHandoffs.length,
    hasPostHandoffIteration,
    successRate: sessionRuns.length > 0 ? (successfulRuns / sessionRuns.length) * 100 : 0,
    totalCostCents,
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

// ============================================================================
// User Metrics Computation
// ============================================================================

function computeUserMetrics(
  userId: string,
  sessions: Session[],
  runs: Run[],
  handoffs: { sessionId: string }[],
): Partial<UserWithMetrics> {
  const userSessions = sessions.filter((s) => s.createdByUserId === userId);
  const userSessionIds = new Set(userSessions.map((s) => s.sessionId));
  const userRuns = runs.filter((r) => userSessionIds.has(r.sessionId));
  const userHandoffs = handoffs.filter((h) => userSessionIds.has(h.sessionId));

  const sessionCount = userSessions.length;
  const runCount = userRuns.length;
  const avgRunsPerSession = sessionCount > 0 ? runCount / sessionCount : 0;

  const lifespans = userSessions.map((s) => s.lastMessageAt.getTime() - s.firstMessageAt.getTime());
  const activeTimes = userSessions.map((s) => {
    const sessionRuns = userRuns.filter((r) => r.sessionId === s.sessionId);
    return sessionRuns.reduce((sum, r) => sum + r.executionMs, 0);
  });

  const avgActiveTimeMs = average(activeTimes);
  const avgLifespanMs = average(lifespans);

  const sessionsWithHandoff = new Set(userHandoffs.map((h) => h.sessionId)).size;
  const localHandoffRate = sessionCount > 0 ? (sessionsWithHandoff / sessionCount) * 100 : 0;

  // Post-handoff iteration rate (simplified)
  const postHandoffIterationRate = localHandoffRate * 0.3; // ~30% of handoffs lead to iteration

  const successfulRuns = userRuns.filter((r) => r.status === "success").length;
  const successRate = runCount > 0 ? (successfulRuns / runCount) * 100 : 0;

  const totalCostCents = userRuns.reduce((sum, r) => sum + r.costCents, 0);
  const totalTokens = userRuns.reduce((sum, r) => sum + r.totalTokens, 0);
  const costPerRun = runCount > 0 ? totalCostCents / runCount : 0;

  return {
    sessionCount,
    runCount,
    avgRunsPerSession: Math.round(avgRunsPerSession * 10) / 10,
    avgActiveTimeMs: Math.round(avgActiveTimeMs),
    avgLifespanMs: Math.round(avgLifespanMs),
    localHandoffRate: Math.round(localHandoffRate * 10) / 10,
    postHandoffIterationRate: Math.round(postHandoffIterationRate * 10) / 10,
    successRate: Math.round(successRate * 10) / 10,
    totalCostCents,
    totalTokens,
    costPerRun: Math.round(costPerRun),
  };
}

// ============================================================================
// Org Metrics API
// ============================================================================

export function getOrgMetrics(orgId: string, timeRange: TimeRangeParams): OrgMetricsResponse {
  const from = new Date(timeRange.from);
  const to = new Date(timeRange.to);

  // Get previous period for comparison
  const periodMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - periodMs);
  const prevTo = new Date(from.getTime() - 1);

  const allRuns = getRunsForOrg(orgId);
  const allSessions = getSessionsForOrg(orgId);
  const allHandoffs = getHandoffsForOrg(orgId);

  const currentRuns = filterByTimeRange(allRuns, from, to);
  const prevRuns = filterByTimeRange(allRuns, prevFrom, prevTo);

  const currentSessions = filterByTimeRange(allSessions, from, to);
  const prevSessions = filterByTimeRange(allSessions, prevFrom, prevTo);

  // Platform KPIs
  const totalRuns = computeTrendData(currentRuns.length, prevRuns.length);

  const currentSuccess = currentRuns.filter((r) => r.status === "success").length;
  const prevSuccess = prevRuns.filter((r) => r.status === "success").length;
  const currentSuccessRate = currentRuns.length > 0 ? (currentSuccess / currentRuns.length) * 100 : 0;
  const prevSuccessRate = prevRuns.length > 0 ? (prevSuccess / prevRuns.length) * 100 : 0;
  const successRate = computeTrendData(currentSuccessRate, prevSuccessRate);

  const currentDurations = currentRuns.map((r) => r.executionMs);
  const prevDurations = prevRuns.map((r) => r.executionMs);
  const p95DurationMs = computeTrendData(percentile(currentDurations, 95), percentile(prevDurations, 95));

  const currentCost = currentRuns.reduce((sum, r) => sum + r.costCents, 0);
  const prevCost = prevRuns.reduce((sum, r) => sum + r.costCents, 0);
  const totalCostCents = computeTrendData(currentCost, prevCost);

  const currentTokens = currentRuns.reduce((sum, r) => sum + r.totalTokens, 0);
  const prevTokens = prevRuns.reduce((sum, r) => sum + r.totalTokens, 0);
  const totalTokens = computeTrendData(currentTokens, prevTokens);

  // Friction KPIs
  const currentAvgRuns = currentSessions.length > 0 ? currentRuns.length / currentSessions.length : 0;
  const prevAvgRuns = prevSessions.length > 0 ? prevRuns.length / prevSessions.length : 0;
  const avgRunsPerSession = computeTrendData(currentAvgRuns, prevAvgRuns);

  const currentActiveTimes = currentSessions.map((s) => {
    const sessionRuns = currentRuns.filter((r) => r.sessionId === s.sessionId);
    return sessionRuns.reduce((sum, r) => sum + r.executionMs, 0);
  });
  const prevActiveTimes = prevSessions.map((s) => {
    const sessionRuns = prevRuns.filter((r) => r.sessionId === s.sessionId);
    return sessionRuns.reduce((sum, r) => sum + r.executionMs, 0);
  });
  const avgActiveTimeMs = computeTrendData(average(currentActiveTimes), average(prevActiveTimes));

  const currentLifespans = currentSessions.map((s) => s.lastMessageAt.getTime() - s.firstMessageAt.getTime());
  const prevLifespans = prevSessions.map((s) => s.lastMessageAt.getTime() - s.firstMessageAt.getTime());
  const avgLifespanMs = computeTrendData(average(currentLifespans), average(prevLifespans));

  const currentSessionIds = new Set(currentSessions.map((s) => s.sessionId));
  const currentHandoffSessions = new Set(
    allHandoffs.filter((h) => currentSessionIds.has(h.sessionId)).map((h) => h.sessionId),
  ).size;
  const currentHandoffRate = currentSessions.length > 0 ? (currentHandoffSessions / currentSessions.length) * 100 : 0;

  const prevSessionIds = new Set(prevSessions.map((s) => s.sessionId));
  const prevHandoffSessions = new Set(
    allHandoffs.filter((h) => prevSessionIds.has(h.sessionId)).map((h) => h.sessionId),
  ).size;
  const prevHandoffRate = prevSessions.length > 0 ? (prevHandoffSessions / prevSessions.length) * 100 : 0;

  const localHandoffRate = computeTrendData(currentHandoffRate, prevHandoffRate);

  // Post-handoff iteration (simplified estimate)
  const postHandoffIterationRate = computeTrendData(currentHandoffRate * 0.3, prevHandoffRate * 0.3);

  return {
    platform: {
      totalRuns,
      successRate,
      p95DurationMs,
      totalCostCents,
      totalTokens,
    },
    friction: {
      avgRunsPerSession,
      avgActiveTimeMs,
      avgLifespanMs,
      localHandoffRate,
      postHandoffIterationRate,
    },
  };
}

// ============================================================================
// Org Trends API
// ============================================================================

export function getOrgTrends(orgId: string, timeRange: TimeRangeParams): OrgTrendsResponse {
  const from = new Date(timeRange.from);
  const to = new Date(timeRange.to);

  const runs = getRunsForOrg(orgId);
  const avgDailyRuns = runs.length / 90; // Approximate

  return {
    usage: generateTimeSeries({
      startDate: from,
      endDate: to,
      baseValue: avgDailyRuns,
      variance: 0.3,
      trend: 0.1,
    }),
    sessions: generateTimeSeries({
      startDate: from,
      endDate: to,
      baseValue: avgDailyRuns * 0.6,
      variance: 0.3,
      trend: 0.05,
    }),
    activeUsers: generateTimeSeries({
      startDate: from,
      endDate: to,
      baseValue: 5,
      variance: 0.2,
      trend: 0.02,
    }),
    cost: generateTimeSeries({
      startDate: from,
      endDate: to,
      baseValue: avgDailyRuns * 500, // ~$5 per run
      variance: 0.25,
      trend: 0.1,
    }),
    costPerRun: generateTimeSeries({
      startDate: from,
      endDate: to,
      baseValue: 500,
      variance: 0.15,
      trend: -0.02,
    }),
    tokens: generateTimeSeries({
      startDate: from,
      endDate: to,
      baseValue: avgDailyRuns * 30000,
      variance: 0.3,
      trend: 0.05,
    }),
    friction: generateTimeSeries({
      startDate: from,
      endDate: to,
      baseValue: 2.3,
      variance: 0.2,
    }).map((p) => ({
      date: p.date,
      avgRunsPerSession: p.value,
      handoffRate: Math.round(35 + (Math.random() - 0.5) * 20),
      postHandoffRate: Math.round(12 + (Math.random() - 0.5) * 8),
    })),
    reliability: generateTimeSeries({
      startDate: from,
      endDate: to,
      baseValue: 92,
      variance: 0.05,
      trend: 0.01,
    }),
    reliabilityBreakdown: generateTimeSeries({
      startDate: from,
      endDate: to,
      baseValue: avgDailyRuns * 0.08, // ~8% failure rate
      variance: 0.4,
    }).map((p) => {
      // Distribute failures across categories
      const totalFailures = Math.max(0, Math.round(p.value));
      const errors = Math.round(totalFailures * 0.4);
      const timeouts = Math.round(totalFailures * 0.35);
      const cancels = totalFailures - errors - timeouts;
      return {
        date: p.date,
        errors,
        timeouts,
        cancels,
      };
    }),
  };
}

// ============================================================================
// Sessions List API
// ============================================================================

export function getSessionsList(
  orgId: string,
  filters: SessionFilters,
  pagination: PaginationParams,
  sort: SortParams,
): SessionsListResponse {
  const from = new Date(filters.from);
  const to = new Date(filters.to);

  const orgData = getOrgData(orgId);
  const allRuns = orgData.flatMap((d) => d.runs);
  const allHandoffs = orgData.flatMap((d) => d.handoffs);

  // Compute metrics for all sessions
  let sessionsWithMetrics = orgData.map((d) => computeSessionMetrics(d.session, allRuns, allHandoffs));

  // Apply time filter
  sessionsWithMetrics = sessionsWithMetrics.filter((s) => s.createdAt >= from && s.createdAt <= to);

  // Apply search filter
  if (filters.search) {
    const search = filters.search.toLowerCase();
    sessionsWithMetrics = sessionsWithMetrics.filter(
      (s) => s.sessionId.toLowerCase().includes(search) || (s.createdByUser?.email ?? "").toLowerCase().includes(search),
    );
  }

  // Apply status filter
  if (filters.status === "has_failures") {
    sessionsWithMetrics = sessionsWithMetrics.filter((s) => (s.failedRunCount ?? s.failedRuns ?? 0) > 0);
  } else if (filters.status === "all_succeeded") {
    sessionsWithMetrics = sessionsWithMetrics.filter((s) => (s.failedRunCount ?? s.failedRuns ?? 0) === 0);
  }

  // Apply handoff filter
  if (filters.hasHandoff === "yes") {
    sessionsWithMetrics = sessionsWithMetrics.filter((s) => (s.localHandoffCount ?? s.handoffCount ?? 0) > 0);
  } else if (filters.hasHandoff === "no") {
    sessionsWithMetrics = sessionsWithMetrics.filter((s) => (s.localHandoffCount ?? s.handoffCount ?? 0) === 0);
  }

  // Compute summary from filtered sessions
  const summary = {
    totalSessions: sessionsWithMetrics.length,
    avgRunsPerSession:
      sessionsWithMetrics.length > 0
        ? Math.round((sessionsWithMetrics.reduce((sum, s) => sum + s.runCount, 0) / sessionsWithMetrics.length) * 10) /
          10
        : 0,
    avgActiveTimeMs:
      sessionsWithMetrics.length > 0
        ? Math.round(sessionsWithMetrics.reduce((sum, s) => sum + s.activeTimeMs, 0) / sessionsWithMetrics.length)
        : 0,
    avgLifespanMs:
      sessionsWithMetrics.length > 0
        ? Math.round(sessionsWithMetrics.reduce((sum, s) => sum + s.lifespanMs, 0) / sessionsWithMetrics.length)
        : 0,
    handoffRate:
      sessionsWithMetrics.length > 0
        ? Math.round(
            (sessionsWithMetrics.filter((s) => (s.localHandoffCount ?? s.handoffCount ?? 0) > 0).length / sessionsWithMetrics.length) * 100 * 10,
          ) / 10
        : 0,
  };

  // Sort
  sessionsWithMetrics.sort((a, b) => {
    const aVal = a[sort.sortBy as keyof SessionWithMetrics] as number | Date;
    const bVal = b[sort.sortBy as keyof SessionWithMetrics] as number | Date;
    const aNum = aVal instanceof Date ? aVal.getTime() : aVal;
    const bNum = bVal instanceof Date ? bVal.getTime() : bVal;
    return sort.sortOrder === "asc" ? aNum - bNum : bNum - aNum;
  });

  // Paginate
  const totalItems = sessionsWithMetrics.length;
  const totalPages = Math.ceil(totalItems / pagination.pageSize);
  const startIdx = (pagination.page - 1) * pagination.pageSize;
  const pageData = sessionsWithMetrics.slice(startIdx, startIdx + pagination.pageSize);

  return {
    data: pageData,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
    },
    summary,
  };
}

// ============================================================================
// Session Detail API
// ============================================================================

export function getSessionDetail(sessionId: string): SessionDetailResponse | null {
  const data = getSessionData(sessionId);
  if (!data) return null;

  const { session, runs, events, handoffs } = data;
  const sessionMetrics = computeSessionMetrics(session, runs, handoffs);

  // Compute artifact totals
  const artifacts = {
    totalFilesChanged: 0,
    totalLinesAdded: 0,
    totalLinesDeleted: 0,
    files: [] as Array<{
      path: string;
      linesAdded: number;
      linesDeleted: number;
    }>,
  };

  for (const run of runs) {
    if (run.artifactSummary) {
      artifacts.totalFilesChanged += run.artifactSummary.filesChanged;
      artifacts.totalLinesAdded += run.artifactSummary.linesAdded;
      artifacts.totalLinesDeleted += run.artifactSummary.linesDeleted;
    }
  }

  // Generate fake file list
  const fileNames = [
    "src/auth/login.ts",
    "src/api/endpoints.ts",
    "src/utils/helpers.ts",
    "tests/auth.test.ts",
    "README.md",
  ];
  artifacts.files = fileNames.slice(0, artifacts.totalFilesChanged || 3).map((path) => ({
    path,
    linesAdded: Math.floor(Math.random() * 50) + 5,
    linesDeleted: Math.floor(Math.random() * 20),
  }));

  return {
    session: sessionMetrics,
    runs,
    events,
    handoffs,
    artifacts,
  };
}

// ============================================================================
// Users List API
// ============================================================================

export function getUsersList(
  orgId: string,
  filters: UserFilters,
  pagination: PaginationParams,
  sort: SortParams,
): UsersListResponse {
  const from = new Date(filters.from);
  const to = new Date(filters.to);

  const users = getUsersForOrg(orgId);
  const orgData = getOrgData(orgId);
  const allSessions = orgData.map((d) => d.session);
  const allRuns = orgData.flatMap((d) => d.runs);
  const allHandoffs = orgData.flatMap((d) => d.handoffs);

  // Filter sessions by time range
  const filteredSessions = filterByTimeRange(allSessions, from, to);
  const filteredSessionIds = new Set(filteredSessions.map((s) => s.sessionId));
  const filteredRuns = allRuns.filter((r) => filteredSessionIds.has(r.sessionId));
  const filteredHandoffs = allHandoffs.filter((h) => filteredSessionIds.has(h.sessionId));

  // Compute metrics for each user
  let usersWithMetrics: UserWithMetrics[] = users.map((user) => ({
    ...user,
    ...computeUserMetrics(user.userId, filteredSessions, filteredRuns, filteredHandoffs),
  })) as UserWithMetrics[];

  // Apply search filter
  if (filters.search) {
    const search = filters.search.toLowerCase();
    usersWithMetrics = usersWithMetrics.filter(
      (u) => (u.name ?? u.displayName ?? "").toLowerCase().includes(search) || u.email.toLowerCase().includes(search),
    );
  }

  // Compute summary
  const summary = {
    totalUsers: usersWithMetrics.length,
    totalSessions: filteredSessions.length,
    totalCostCents: usersWithMetrics.reduce((sum, u) => sum + u.totalCostCents, 0),
    avgHandoffRate:
      usersWithMetrics.length > 0
        ? Math.round(
            (usersWithMetrics.reduce((sum, u) => sum + (u.localHandoffRate ?? u.handoffRate ?? 0), 0) / usersWithMetrics.length) * 10,
          ) / 10
        : 0,
  };

  // Sort
  usersWithMetrics.sort((a, b) => {
    const aVal = a[sort.sortBy as keyof UserWithMetrics] as number | Date;
    const bVal = b[sort.sortBy as keyof UserWithMetrics] as number | Date;
    const aNum = aVal instanceof Date ? aVal.getTime() : aVal;
    const bNum = bVal instanceof Date ? bVal.getTime() : bVal;
    return sort.sortOrder === "asc" ? aNum - bNum : bNum - aNum;
  });

  // Paginate
  const totalItems = usersWithMetrics.length;
  const totalPages = Math.ceil(totalItems / pagination.pageSize);
  const startIdx = (pagination.page - 1) * pagination.pageSize;
  const pageData = usersWithMetrics.slice(startIdx, startIdx + pagination.pageSize);

  return {
    data: pageData,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
    },
    summary,
  };
}

// ============================================================================
// User Detail API
// ============================================================================

export function getUserDetail(userId: string, timeRange: TimeRangeParams): UserDetailResponse | null {
  const user = getUser(userId);
  if (!user || !user.orgId) return null;

  const from = new Date(timeRange.from);
  const to = new Date(timeRange.to);

  const orgData = getOrgData(user.orgId);
  const allSessions = orgData.map((d) => d.session);
  const allRuns = orgData.flatMap((d) => d.runs);
  const allHandoffs = orgData.flatMap((d) => d.handoffs);

  const filteredSessions = filterByTimeRange(allSessions, from, to);
  const filteredSessionIds = new Set(filteredSessions.map((s) => s.sessionId));
  const filteredRuns = allRuns.filter((r) => filteredSessionIds.has(r.sessionId));
  const filteredHandoffs = allHandoffs.filter((h) => filteredSessionIds.has(h.sessionId));

  const metrics = computeUserMetrics(userId, filteredSessions, filteredRuns, filteredHandoffs);

  const userWithMetrics: UserWithMetrics = {
    ...user,
    ...metrics,
  } as UserWithMetrics;

  // Generate trends
  const userSessions = filteredSessions.filter((s) => s.createdByUserId === userId);
  const avgDailyRuns = userSessions.length > 0 ? (metrics.runCount ?? 0) / 30 : 0;

  return {
    user: userWithMetrics,
    trends: {
      activity: generateTimeSeries({
        startDate: from,
        endDate: to,
        baseValue: Math.max(1, avgDailyRuns),
        variance: 0.4,
      }).map((p) => ({
        date: p.date,
        runs: p.value,
        sessions: Math.round(p.value * 0.6),
      })),
      cost: generateTimeSeries({
        startDate: from,
        endDate: to,
        baseValue: Math.max(100, avgDailyRuns * 500),
        variance: 0.3,
      }),
      friction: generateTimeSeries({
        startDate: from,
        endDate: to,
        baseValue: metrics.avgRunsPerSession || 2,
        variance: 0.25,
      }).map((p) => ({
        date: p.date,
        avgRunsPerSession: p.value,
        handoffRate: metrics.localHandoffRate || 30,
      })),
    },
  };
}

// ============================================================================
// User Sessions API
// ============================================================================

export function getUserSessions(userId: string, timeRange: TimeRangeParams): SessionWithMetrics[] {
  const from = new Date(timeRange.from);
  const to = new Date(timeRange.to);

  const sessions = getSessionsForUser(userId);
  const filteredSessions = filterByTimeRange(sessions, from, to);

  // Get all runs and handoffs for computing metrics
  const user = getUser(userId);
  if (!user || !user.orgId) return [];

  const orgData = getOrgData(user.orgId);
  const allRuns = orgData.flatMap((d) => d.runs);
  const allHandoffs = orgData.flatMap((d) => d.handoffs);

  return filteredSessions.map((session) => computeSessionMetrics(session, allRuns, allHandoffs));
}

// ============================================================================
// Global APIs (SUPER_ADMIN)
// ============================================================================

export function getGlobalMetrics(_timeRange: TimeRangeParams): GlobalMetricsResponse {
  const orgs = getAllOrganizations();
  let totalRuns = 0;
  let totalSuccess = 0;
  let totalCost = 0;
  let totalTokens = 0;

  for (const org of orgs) {
    const runs = getRunsForOrg(org.orgId);
    totalRuns += runs.length;
    totalSuccess += runs.filter((r) => r.status === "success").length;
    totalCost += runs.reduce((sum, r) => sum + r.costCents, 0);
    totalTokens += runs.reduce((sum, r) => sum + r.totalTokens, 0);
  }

  const activeUsers = getAllUsers().length;

  return {
    kpis: {
      totalOrgs: orgs.length,
      totalRuns: computeTrendData(totalRuns, totalRuns * 0.92),
      successRate: computeTrendData(totalRuns > 0 ? (totalSuccess / totalRuns) * 100 : 0, 93),
      p95DurationMs: computeTrendData(180000, 175000),
      totalCostCents: computeTrendData(totalCost, totalCost * 0.88),
      totalTokens: computeTrendData(totalTokens, totalTokens * 0.9),
      activeUsers: computeTrendData(activeUsers, activeUsers - 2),
    },
  };
}

export function getGlobalOrgs(_pagination: PaginationParams, sort: SortParams): GlobalOrgsResponse {
  const orgs = getAllOrganizations();

  const orgsWithMetrics: OrgWithMetrics[] = orgs.map((org) => {
    const runs = getRunsForOrg(org.orgId);
    const sessions = getSessionsForOrg(org.orgId);
    const users = getUsersForOrg(org.orgId);
    const handoffs = getHandoffsForOrg(org.orgId);

    const successfulRuns = runs.filter((r) => r.status === "success").length;
    const sessionsWithHandoff = new Set(handoffs.map((h) => h.sessionId)).size;

    return {
      ...org,
      activeUserCount: users.length,
      sessionCount: sessions.length,
      runCount: runs.length,
      successRate: runs.length > 0 ? (successfulRuns / runs.length) * 100 : 0,
      avgRunsPerSession: sessions.length > 0 ? runs.length / sessions.length : 0,
      localHandoffRate: sessions.length > 0 ? (sessionsWithHandoff / sessions.length) * 100 : 0,
      totalCostCents: runs.reduce((sum, r) => sum + r.costCents, 0),
      trend: Math.random() > 0.6 ? "improving" : Math.random() > 0.5 ? "stable" : "declining",
    };
  });

  // Sort
  orgsWithMetrics.sort((a, b) => {
    const aVal = a[sort.sortBy as keyof OrgWithMetrics] as number;
    const bVal = b[sort.sortBy as keyof OrgWithMetrics] as number;
    return sort.sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  return {
    data: orgsWithMetrics,
    pagination: {
      page: 1,
      pageSize: orgsWithMetrics.length,
      totalItems: orgsWithMetrics.length,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
}

// ============================================================================
// Failure Categories API
// ============================================================================

export function getOrgFailures(
  orgId: string,
  timeRange: TimeRangeParams,
): { categories: FailureCategoryCount[]; totalFailures: number } {
  const from = new Date(timeRange.from);
  const to = new Date(timeRange.to);

  const runs = getRunsForOrg(orgId);
  const filteredRuns = filterByTimeRange(runs, from, to);
  const failedRuns = filteredRuns.filter((r) => r.status !== "success");

  const categoryCounts = new Map<FailureCategory, number>();
  for (const run of failedRuns) {
    if (run.failureCategory) {
      categoryCounts.set(run.failureCategory, (categoryCounts.get(run.failureCategory) || 0) + 1);
    }
  }

  const totalFailures = failedRuns.length;
  const categories: FailureCategoryCount[] = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalFailures > 0 ? (count / totalFailures) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return { categories, totalFailures };
}
