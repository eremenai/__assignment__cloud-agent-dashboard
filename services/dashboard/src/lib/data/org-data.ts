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
 * Get org metrics (KPIs) for a date range with comparison to previous period.
 */
export async function fetchOrgMetrics(
  orgId: string,
  timeRange: TimeRangeParams
): Promise<OrgMetricsResponse> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);

  // Calculate previous period (same duration before the current period)
  const periodMs = toDate.getTime() - fromDate.getTime();
  const prevFromDate = new Date(fromDate.getTime() - periodMs);
  const prevToDate = new Date(fromDate.getTime() - 1); // End 1ms before current period starts

  const [metrics, p95Duration, prevMetrics, prevP95Duration] = await Promise.all([
    getOrgMetricsFromDb(orgId, fromDate, toDate),
    getP95DurationFromDb(orgId, fromDate, toDate),
    getOrgMetricsFromDb(orgId, prevFromDate, prevToDate),
    getP95DurationFromDb(orgId, prevFromDate, prevToDate),
  ]);

  return transformOrgMetrics(metrics, p95Duration, prevMetrics, prevP95Duration);
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

/**
 * Calculate percentage change between current and previous values.
 */
function calcChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

function transformOrgMetrics(
  metrics: OrgMetricsResult,
  p95Duration: number,
  prevMetrics: OrgMetricsResult,
  prevP95Duration: number
): OrgMetricsResponse {
  // Current period calculations
  const totalRuns = metrics.totalRuns;
  const successRate = totalRuns > 0 ? (metrics.successRuns / totalRuns) * 100 : 0;
  const avgDurationMs = totalRuns > 0 ? metrics.totalDurationMs / totalRuns : 0;
  const totalTokens = metrics.totalInputTokens + metrics.totalOutputTokens;
  const sessionsCount = metrics.sessionsCount;
  const avgRunsPerSession = sessionsCount > 0 ? totalRuns / sessionsCount : 0;
  const handoffRate = sessionsCount > 0 ? (metrics.sessionsWithHandoff / sessionsCount) * 100 : 0;
  const postHandoffRate =
    metrics.sessionsWithHandoff > 0
      ? (metrics.sessionsWithPostHandoff / metrics.sessionsWithHandoff) * 100
      : 0;
  const avgActiveTimeMs = metrics.avgActiveTimeMs;
  const avgLifespanMs = metrics.avgLifespanMs;

  // Previous period calculations
  const prevTotalRuns = prevMetrics.totalRuns;
  const prevSuccessRate = prevTotalRuns > 0 ? (prevMetrics.successRuns / prevTotalRuns) * 100 : 0;
  const prevAvgDurationMs = prevTotalRuns > 0 ? prevMetrics.totalDurationMs / prevTotalRuns : 0;
  const prevTotalTokens = prevMetrics.totalInputTokens + prevMetrics.totalOutputTokens;
  const prevSessionsCount = prevMetrics.sessionsCount;
  const prevAvgRunsPerSession = prevSessionsCount > 0 ? prevTotalRuns / prevSessionsCount : 0;
  const prevHandoffRate = prevSessionsCount > 0 ? (prevMetrics.sessionsWithHandoff / prevSessionsCount) * 100 : 0;
  const prevPostHandoffRate =
    prevMetrics.sessionsWithHandoff > 0
      ? (prevMetrics.sessionsWithPostHandoff / prevMetrics.sessionsWithHandoff) * 100
      : 0;
  const prevAvgActiveTimeMs = prevMetrics.avgActiveTimeMs;
  const prevAvgLifespanMs = prevMetrics.avgLifespanMs;

  return {
    platform: {
      sessions: {
        current: sessionsCount,
        previous: prevSessionsCount,
        changePercent: calcChangePercent(sessionsCount, prevSessionsCount),
        isPositive: sessionsCount >= prevSessionsCount,
      },
      runs: {
        current: totalRuns,
        previous: prevTotalRuns,
        changePercent: calcChangePercent(totalRuns, prevTotalRuns),
        isPositive: totalRuns >= prevTotalRuns,
      },
      totalRuns: {
        current: totalRuns,
        previous: prevTotalRuns,
        changePercent: calcChangePercent(totalRuns, prevTotalRuns),
        isPositive: totalRuns >= prevTotalRuns,
      },
      successRate: {
        current: Math.round(successRate * 10) / 10,
        previous: Math.round(prevSuccessRate * 10) / 10,
        changePercent: calcChangePercent(successRate, prevSuccessRate),
        isPositive: successRate >= prevSuccessRate,
      },
      avgRunDurationMs: {
        current: Math.round(avgDurationMs),
        previous: Math.round(prevAvgDurationMs),
        changePercent: calcChangePercent(avgDurationMs, prevAvgDurationMs),
        isPositive: avgDurationMs <= prevAvgDurationMs, // Faster is better
      },
      p95DurationMs: {
        current: Math.round(p95Duration),
        previous: Math.round(prevP95Duration),
        changePercent: calcChangePercent(p95Duration, prevP95Duration),
        isPositive: p95Duration <= prevP95Duration, // Faster is better
      },
      totalCostCents: {
        current: Math.round(metrics.totalCost * 100),
        previous: Math.round(prevMetrics.totalCost * 100),
        changePercent: calcChangePercent(metrics.totalCost, prevMetrics.totalCost),
        isPositive: metrics.totalCost <= prevMetrics.totalCost, // Lower cost is better
      },
      totalTokens: {
        current: totalTokens,
        previous: prevTotalTokens,
        changePercent: calcChangePercent(totalTokens, prevTotalTokens),
        isPositive: true, // Neutral - just informational
      },
    },
    friction: {
      avgRunsPerSession: {
        current: Math.round(avgRunsPerSession * 10) / 10,
        previous: Math.round(prevAvgRunsPerSession * 10) / 10,
        changePercent: calcChangePercent(avgRunsPerSession, prevAvgRunsPerSession),
        isPositive: avgRunsPerSession <= prevAvgRunsPerSession, // Fewer runs is better
      },
      avgActiveTimeMs: {
        current: Math.round(avgActiveTimeMs),
        previous: Math.round(prevAvgActiveTimeMs),
        changePercent: calcChangePercent(avgActiveTimeMs, prevAvgActiveTimeMs),
        isPositive: true, // Neutral - just informational
      },
      avgLifespanMs: {
        current: Math.round(avgLifespanMs),
        previous: Math.round(prevAvgLifespanMs),
        changePercent: calcChangePercent(avgLifespanMs, prevAvgLifespanMs),
        isPositive: true, // Neutral - just informational
      },
      localHandoffRate: {
        current: Math.round(handoffRate * 10) / 10,
        previous: Math.round(prevHandoffRate * 10) / 10,
        changePercent: calcChangePercent(handoffRate, prevHandoffRate),
        isPositive: handoffRate <= prevHandoffRate, // Lower is better
      },
      postHandoffIterationRate: {
        current: Math.round(postHandoffRate * 10) / 10,
        previous: Math.round(prevPostHandoffRate * 10) / 10,
        changePercent: calcChangePercent(postHandoffRate, prevPostHandoffRate),
        isPositive: postHandoffRate <= prevPostHandoffRate, // Lower is better
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
    value: t.inputTokens + t.outputTokens,
  }));

  const friction: MultiSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    avgRunsPerSession: t.sessions > 0 ? Math.round((t.runs / t.sessions) * 10) / 10 : 0,
    handoffRate: t.sessions > 0 ? Math.round((t.sessionsWithHandoff / t.sessions) * 100 * 10) / 10 : 0,
    postHandoffRate: t.sessionsWithHandoff > 0 ? Math.round((t.sessionsWithPostHandoff / t.sessionsWithHandoff) * 100 * 10) / 10 : 0,
  }));

  const reliability: TimeSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    value: Math.round(t.successRate * 10) / 10,
  }));

  // Reliability breakdown with error categories for stacked bar chart
  // Categories match FailureCategory: tool_error, model_error, timeout, unknown
  const reliabilityBreakdown: MultiSeriesPoint[] = trends.map((t) => ({
    date: t.day,
    tool_error: t.errorsTool,
    model_error: t.errorsModel,
    timeout: t.errorsTimeout,
    unknown: t.errorsOther,
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
