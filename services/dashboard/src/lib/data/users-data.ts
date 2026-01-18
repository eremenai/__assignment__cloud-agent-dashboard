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
  type UserListItem,
} from "../db/queries";

/**
 * Get paginated users list.
 */
export async function fetchUsersList(
  orgId: string,
  timeRange: TimeRangeParams,
  pagination: PaginationParams,
  _sort: SortParams
): Promise<UsersListResponse> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);
  const offset = (pagination.page - 1) * pagination.pageSize;

  const result = await getUsersListFromDb(orgId, fromDate, toDate, pagination.pageSize, offset);

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

  const result = await getUsersListFromDb(orgId, fromDate, toDate, 1000, 0);
  const userItem = result.users.find((u) => u.userId === userId);

  if (!userItem) {
    return null;
  }

  const user = transformUserListItem(userItem);

  // Generate placeholder trends (would need real historical data)
  const trends = {
    activity: [] as MultiSeriesPoint[],
    cost: [] as TimeSeriesPoint[],
    friction: [] as MultiSeriesPoint[],
  };

  return { user, trends };
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

  return {
    userId: item.userId,
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
    handoffRate: Math.round(handoffRate * 10) / 10,
    postHandoffIterationRate: Math.round(postHandoffRate * 10) / 10,
    successRate: Math.round(successRate * 10) / 10,
    totalCostCents: Math.round(item.totalCost * 100),
    totalTokens: 0, // Would need token aggregation
  };
}
