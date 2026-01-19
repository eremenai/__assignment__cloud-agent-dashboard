"use server";

/**
 * Server actions for user-level data.
 */

import type {
  PaginationParams,
  SortParams,
  TimeRangeParams,
  UsersListResponse,
  UserDetailResponse,
} from "@/lib/types/api";
import type { UserWithMetrics, MultiSeriesPoint, TimeSeriesPoint } from "@/lib/types/domain";
import {
  getUsersListFromDb,
  getUserTrendsFromDb,
  type UserListItem,
  type UsersListOptions,
} from "../db/queries";

export interface UsersListFilters {
  search?: string;
}

/**
 * Simple user info for dropdown filters.
 */
export interface UserOption {
  userId: string;
  name: string;
  email: string;
}

/**
 * Get simple list of users for dropdown filters.
 * Returns users with sessions in the given time range.
 */
export async function fetchUsersForFilter(
  orgId: string,
  timeRange: TimeRangeParams
): Promise<UserOption[]> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);

  // Fetch all users with activity in the time range
  const result = await getUsersListFromDb(orgId, fromDate, toDate, 1000, 0);

  return result.users.map((u) => ({
    userId: u.userId,
    name: u.displayName ?? u.email ?? u.userId,
    email: u.email ?? "",
  }));
}

/**
 * Get paginated users list.
 */
export async function fetchUsersList(
  orgId: string,
  timeRange: TimeRangeParams,
  pagination: PaginationParams,
  sort: SortParams,
  filters?: UsersListFilters
): Promise<UsersListResponse> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);
  const offset = (pagination.page - 1) * pagination.pageSize;

  const options: UsersListOptions = {
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
    search: filters?.search,
  };

  const result = await getUsersListFromDb(orgId, fromDate, toDate, pagination.pageSize, offset, options);

  const users = result.users.map(transformUserListItem);

  // Calculate summary
  const totalSessions = users.reduce((sum, u) => sum + u.sessionCount, 0);
  const totalCostCents = users.reduce((sum, u) => sum + u.totalCostCents, 0);
  const avgHandoffRate =
    users.length > 0 ? users.reduce((sum, u) => sum + (u.handoffRate ?? 0), 0) / users.length : 0;

  return {
    data: users,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / pagination.pageSize),
      hasNextPage: pagination.page * pagination.pageSize < result.total,
      hasPrevPage: pagination.page > 1,
    },
    summary: {
      totalUsers: result.total,
      totalSessions,
      totalCostCents,
      avgHandoffRate: Math.round(avgHandoffRate * 10) / 10,
    },
  };
}

/**
 * Get user detail with trends.
 */
export async function fetchUserDetail(
  orgId: string,
  userId: string,
  timeRange: TimeRangeParams
): Promise<UserDetailResponse | null> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);

  // Fetch user metrics and trends in parallel
  const [userResult, trendsResult] = await Promise.all([
    getUsersListFromDb(orgId, fromDate, toDate, 1000, 0),
    getUserTrendsFromDb(orgId, userId, fromDate, toDate),
  ]);

  const userItem = userResult.users.find((u) => u.userId === userId);

  if (!userItem) {
    return null;
  }

  const user = transformUserListItem(userItem);

  // Transform trends data for charts
  const activity: MultiSeriesPoint[] = trendsResult.map((t) => ({
    date: t.day,
    runs: t.runs,
    sessions: t.sessions,
  }));

  const cost: TimeSeriesPoint[] = trendsResult.map((t) => ({
    date: t.day,
    value: t.cost,
  }));

  const friction: MultiSeriesPoint[] = trendsResult.map((t) => {
    const avgRunsPerSession = t.sessions > 0 ? t.runs / t.sessions : 0;
    const handoffRate = t.sessions > 0 ? (t.sessionsWithHandoff / t.sessions) * 100 : 0;
    const postHandoffRate = t.sessionsWithHandoff > 0
      ? (t.sessionsWithPostHandoff / t.sessionsWithHandoff) * 100
      : 0;
    return {
      date: t.day,
      avgRunsPerSession: Math.round(avgRunsPerSession * 10) / 10,
      handoffRate: Math.round(handoffRate * 10) / 10,
      postHandoffRate: Math.round(postHandoffRate * 10) / 10,
    };
  });

  return { user, trends: { activity, cost, friction } };
}

// ============================================================================
// Transform Functions
// ============================================================================

function transformUserListItem(item: UserListItem): UserWithMetrics {
  const totalRuns = item.runsCount;
  const successRate = totalRuns > 0 ? (item.successRuns / totalRuns) * 100 : 0;
  const avgRunsPerSession = item.sessionsCount > 0 ? totalRuns / item.sessionsCount : 0;
  const handoffRate =
    item.sessionsCount > 0 ? (item.sessionsWithHandoff / item.sessionsCount) * 100 : 0;
  const postHandoffRate =
    item.sessionsWithHandoff > 0
      ? (item.sessionsWithPostHandoff / item.sessionsWithHandoff) * 100
      : 0;
  const avgActiveTimeMs = item.sessionsCount > 0 ? item.totalDurationMs / item.sessionsCount : 0;
  const avgLifespanMs = item.sessionsCount > 0 ? item.totalLifespanMs / item.sessionsCount : 0;
  const totalTokens = item.totalInputTokens + item.totalOutputTokens;
  const totalCostCents = Math.round(item.totalCost * 100);
  const costPerRun = totalRuns > 0 ? totalCostCents / totalRuns : 0;

  return {
    userId: item.userId,
    name: item.displayName ?? item.userId,
    email: item.email ?? `${item.userId}@example.com`,
    displayName: item.displayName ?? item.userId,
    role: "member", // Default role - actual role should come from users table
    orgId: "", // Set by caller if needed
    createdAt: new Date(), // Would need user created_at
    lastActiveAt: new Date(), // Would need last activity
    sessionCount: item.sessionsCount,
    runCount: totalRuns,
    successfulRuns: item.successRuns,
    failedRuns: item.failedRuns,
    avgRunsPerSession: Math.round(avgRunsPerSession * 10) / 10,
    avgActiveTimeMs: Math.round(avgActiveTimeMs),
    avgLifespanMs: Math.round(avgLifespanMs),
    localHandoffRate: Math.round(handoffRate * 10) / 10,
    handoffRate: Math.round(handoffRate * 10) / 10,
    postHandoffIterationRate: Math.round(postHandoffRate * 10) / 10,
    successRate: Math.round(successRate * 10) / 10,
    totalCostCents,
    totalTokens,
    costPerRun: Math.round(costPerRun),
  };
}
