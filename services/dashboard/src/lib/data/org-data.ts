"use server";

/**
 * Server actions for org-level data.
 *
 * These functions fetch data from the real database and transform it
 * to match the API response types used by the frontend.
 */

import type { OrgMetricsResponse, OrgTrendsResponse, TimeRangeParams } from "@/lib/types/api";
import type { FailureCategoryCount, MultiSeriesPoint, TimeSeriesPoint } from "@/lib/types/domain";
import {
  getOrgMetricsFromDb,
  getOrgTrendsFromDb,
  getP95DurationFromDb,
  type OrgMetricsResult,
  type OrgDailyTrend,
} from "../db/queries";

/**
 * Get org metrics (KPIs) for a date range.
 */
export async function fetchOrgMetrics(
  orgId: string,
  timeRange: TimeRangeParams
): Promise<OrgMetricsResponse> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);

  const [metrics, p95Duration] = await Promise.all([
    getOrgMetricsFromDb(orgId, fromDate, toDate),
    getP95DurationFromDb(orgId, fromDate, toDate),
  ]);

  return transformOrgMetrics(metrics, p95Duration);
}

/**
 * Get org trends (time series) for a date range.
 */
export async function fetchOrgTrends(
  orgId: string,
  timeRange: TimeRangeParams
): Promise<OrgTrendsResponse> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);

  const trends = await getOrgTrendsFromDb(orgId, fromDate, toDate);

  return transformOrgTrends(trends);
}

/**
 * Get org failure breakdown.
 */
export async function fetchOrgFailures(
  orgId: string,
  timeRange: TimeRangeParams
): Promise<{ categories: FailureCategoryCount[]; totalFailures: number }> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);

  const metrics = await getOrgMetricsFromDb(orgId, fromDate, toDate);

  const categories: FailureCategoryCount[] = [
    { category: "tool_error" as const, count: metrics.errorsTool, percentage: 0 },
    { category: "model_error" as const, count: metrics.errorsModel, percentage: 0 },
    { category: "timeout" as const, count: metrics.errorsTimeout, percentage: 0 },
    { category: "unknown" as const, count: metrics.errorsOther, percentage: 0 },
  ];

  const totalFailures = metrics.failedRuns;

  // Calculate percentages
  if (totalFailures > 0) {
    for (const cat of categories) {
      cat.percentage = Math.round((cat.count / totalFailures) * 100 * 10) / 10;
    }
  }

  return { categories, totalFailures };
}

// ============================================================================
// Transform Functions
// ============================================================================

function transformOrgMetrics(metrics: OrgMetricsResult, p95Duration: number): OrgMetricsResponse {
  const totalRuns = metrics.totalRuns;
  const successRate = totalRuns > 0 ? (metrics.successRuns / totalRuns) * 100 : 0;
  const avgDurationMs = totalRuns > 0 ? metrics.totalDurationMs / totalRuns : 0;
  const totalTokens = metrics.totalInputTokens + metrics.totalOutputTokens;

  // Calculate friction metrics
  const sessionsCount = metrics.sessionsCount;
  const avgRunsPerSession = sessionsCount > 0 ? totalRuns / sessionsCount : 0;
  const handoffRate = sessionsCount > 0 ? (metrics.sessionsWithHandoff / sessionsCount) * 100 : 0;
  const postHandoffRate =
    metrics.sessionsWithHandoff > 0
      ? (metrics.sessionsWithPostHandoff / metrics.sessionsWithHandoff) * 100
      : 0;

  return {
    platform: {
      sessions: {
        current: sessionsCount,
        previous: 0, // Would need historical comparison
        changePercent: 0,
        isPositive: true,
      },
      runs: {
        current: totalRuns,
        previous: 0,
        changePercent: 0,
        isPositive: true,
      },
      successRate: {
        current: Math.round(successRate * 10) / 10,
        previous: 0,
        changePercent: 0,
        isPositive: true,
      },
      avgRunDurationMs: {
        current: Math.round(avgDurationMs),
        previous: 0,
        changePercent: 0,
        isPositive: true,
      },
      p95DurationMs: {
        current: Math.round(p95Duration),
        previous: 0,
        changePercent: 0,
        isPositive: true,
      },
      totalCostCents: {
        current: Math.round(metrics.totalCost * 100), // Convert to cents
        previous: 0,
        changePercent: 0,
        isPositive: false, // Lower cost is better
      },
      totalTokens: {
        current: totalTokens,
        previous: 0,
        changePercent: 0,
        isPositive: true,
      },
    },
    friction: {
      avgRunsPerSession: {
        current: Math.round(avgRunsPerSession * 10) / 10,
        previous: 0,
        changePercent: 0,
        isPositive: false, // Fewer runs per session is better
      },
      localHandoffRate: {
        current: Math.round(handoffRate * 10) / 10,
        previous: 0,
        changePercent: 0,
        isPositive: false, // Lower handoff rate is better
      },
      postHandoffIterationRate: {
        current: Math.round(postHandoffRate * 10) / 10,
        previous: 0,
        changePercent: 0,
        isPositive: false, // Lower is better
      },
    },
  };
}

function transformOrgTrends(trends: OrgDailyTrend[]): OrgTrendsResponse {
  const usage: TimeSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    value: t.runs,
  }));

  const sessions: TimeSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    value: t.sessions,
  }));

  const activeUsers: TimeSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    value: t.activeUsers,
  }));

  const cost: TimeSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    value: Math.round(t.cost * 100), // Convert to cents
  }));

  const costPerRun: TimeSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    value: t.runs > 0 ? Math.round((t.cost * 100) / t.runs) : 0,
  }));

  const tokens: TimeSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    value: 0, // Would need token data in trends
  }));

  const friction: MultiSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    avgRunsPerSession: t.sessions > 0 ? Math.round((t.runs / t.sessions) * 10) / 10 : 0,
    handoffRate: 0, // Would need handoff data per day
    postHandoffRate: 0,
  }));

  const reliability: TimeSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    value: Math.round(t.successRate * 10) / 10,
  }));

  const reliabilityBreakdown: MultiSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    succeeded: t.runs > 0 ? Math.round((t.successRate / 100) * t.runs) : 0,
    failed: t.runs > 0 ? t.runs - Math.round((t.successRate / 100) * t.runs) : 0,
  }));

  return {
    usage,
    sessions,
    activeUsers,
    cost,
    costPerRun,
    tokens,
    friction,
    reliability,
    reliabilityBreakdown,
  };
}
