"use server";

/**
 * Server actions for global (super_admin) data.
 */

import type {
  GlobalMetricsResponse,
  GlobalOrgsResponse,
  PaginationParams,
  SortParams,
  TimeRangeParams,
} from "@/lib/types/api";
import type { GlobalKPIs, OrgWithMetrics } from "@/lib/types/domain";
import {
  getGlobalMetricsFromDb,
  getTopOrgsFromDb,
  type GlobalMetricsResult,
  type TopOrgItem,
} from "../db/queries";

/**
 * Get global metrics (platform-wide KPIs).
 */
export async function fetchGlobalMetrics(
  timeRange: TimeRangeParams
): Promise<GlobalMetricsResponse> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);

  const metrics = await getGlobalMetricsFromDb(fromDate, toDate);

  return {
    kpis: transformGlobalMetrics(metrics),
  };
}

/**
 * Get list of orgs with metrics for super_admin view.
 */
export async function fetchGlobalOrgs(
  timeRange: TimeRangeParams,
  pagination: PaginationParams,
  _sort: SortParams
): Promise<GlobalOrgsResponse> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);

  // Get top orgs (limited by pagination)
  const topOrgs = await getTopOrgsFromDb(fromDate, toDate, pagination.pageSize);

  const orgs = topOrgs.map(transformOrgWithMetrics);

  return {
    data: orgs,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: topOrgs.length, // Would need count query for accurate total
      totalPages: 1, // Simplified for now
      hasNextPage: false,
      hasPrevPage: pagination.page > 1,
    },
  };
}

// ============================================================================
// Transform Functions
// ============================================================================

function transformGlobalMetrics(metrics: GlobalMetricsResult): GlobalKPIs {
  return {
    totalOrgs: {
      current: metrics.totalOrgs,
      previous: 0,
      changePercent: 0,
      isPositive: true,
    },
    totalUsers: {
      current: 0, // Would need users count query
      previous: 0,
      changePercent: 0,
      isPositive: true,
    },
    totalSessions: {
      current: 0, // Would need sessions count query
      previous: 0,
      changePercent: 0,
      isPositive: true,
    },
    totalRuns: {
      current: metrics.totalRuns,
      previous: 0,
      changePercent: 0,
      isPositive: true,
    },
    successRate: {
      current: Math.round(metrics.successRate * 10) / 10,
      previous: 0,
      changePercent: 0,
      isPositive: true,
    },
    p95DurationMs: {
      current: 0, // Would need p95 calculation
      previous: 0,
      changePercent: 0,
      isPositive: false, // Lower is better
    },
    platformSuccessRate: {
      current: Math.round(metrics.successRate * 10) / 10,
      previous: 0,
      changePercent: 0,
      isPositive: true,
    },
    totalCostCents: {
      current: Math.round(metrics.totalCost * 100),
      previous: 0,
      changePercent: 0,
      isPositive: false, // Lower is better
    },
    totalTokens: {
      current: metrics.totalTokens,
      previous: 0,
      changePercent: 0,
      isPositive: true,
    },
    platformHandoffRate: {
      current: 0, // Would need handoff aggregation
      previous: 0,
      changePercent: 0,
      isPositive: false, // Lower is better
    },
  };
}

function transformOrgWithMetrics(org: TopOrgItem): OrgWithMetrics {
  return {
    orgId: org.orgId,
    name: org.name,
    createdAt: new Date(), // Would need org created_at
    userCount: 0, // Would need user count per org
    sessionCount: org.sessionsCount,
    runCount: org.runsCount,
    successRate: Math.round(org.successRate * 10) / 10,
    totalCostCents: Math.round(org.totalCost * 100),
    avgRunsPerSession:
      org.sessionsCount > 0 ? Math.round((org.runsCount / org.sessionsCount) * 10) / 10 : 0,
    handoffRate: 0, // Would need handoff data
    healthTrend: "stable", // Would need historical comparison
  };
}
