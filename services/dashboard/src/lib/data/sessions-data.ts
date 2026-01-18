"use server";

/**
 * Server actions for session-level data.
 */

import type {
  PaginationParams,
  SessionDetailResponse,
  SessionsListResponse,
  SortParams,
  TimeRangeParams,
} from "@/lib/types/api";
import type { Run, SessionWithMetrics, Event, LocalHandoffEvent } from "@/lib/types/domain";
import {
  getSessionsListFromDb,
  getSessionDetailFromDb,
  type SessionListItem,
  type SessionDetail,
} from "../db/queries";

/**
 * Get paginated sessions list.
 */
export async function fetchSessionsList(
  orgId: string,
  timeRange: TimeRangeParams,
  pagination: PaginationParams,
  _sort: SortParams
): Promise<SessionsListResponse> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);
  const offset = (pagination.page - 1) * pagination.pageSize;

  const result = await getSessionsListFromDb(orgId, fromDate, toDate, pagination.pageSize, offset);

  const sessions = result.sessions.map(transformSessionListItem);

  // Calculate summary stats
  const totalRuns = sessions.reduce((sum, s) => sum + s.runCount, 0);
  const totalSessions = sessions.length;
  const avgRunsPerSession = totalSessions > 0 ? totalRuns / totalSessions : 0;
  const avgActiveTimeMs =
    totalSessions > 0 ? sessions.reduce((sum, s) => sum + s.activeTimeMs, 0) / totalSessions : 0;
  const avgLifespanMs =
    totalSessions > 0 ? sessions.reduce((sum, s) => sum + s.lifespanMs, 0) / totalSessions : 0;
  const sessionsWithHandoff = sessions.filter((s) => (s.handoffCount ?? 0) > 0).length;
  const handoffRate = totalSessions > 0 ? (sessionsWithHandoff / totalSessions) * 100 : 0;

  return {
    data: sessions,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / pagination.pageSize),
      hasNextPage: pagination.page * pagination.pageSize < result.total,
      hasPrevPage: pagination.page > 1,
    },
    summary: {
      totalSessions: result.total,
      avgRunsPerSession: Math.round(avgRunsPerSession * 10) / 10,
      avgActiveTimeMs: Math.round(avgActiveTimeMs),
      avgLifespanMs: Math.round(avgLifespanMs),
      handoffRate: Math.round(handoffRate * 10) / 10,
    },
  };
}

/**
 * Get session detail with runs and events.
 */
export async function fetchSessionDetail(
  orgId: string,
  sessionId: string
): Promise<SessionDetailResponse | null> {
  const detail = await getSessionDetailFromDb(orgId, sessionId);

  if (!detail) {
    return null;
  }

  return transformSessionDetail(detail);
}

// ============================================================================
// Transform Functions
// ============================================================================

function transformSessionListItem(item: SessionListItem): SessionWithMetrics {
  const lifespanMs =
    item.lastEventAt && item.firstMessageAt
      ? item.lastEventAt.getTime() - item.firstMessageAt.getTime()
      : 0;

  return {
    sessionId: item.sessionId,
    userId: item.userId ?? "unknown",
    orgId: item.orgId,
    createdAt: item.firstMessageAt ?? new Date(),
    firstMessageAt: item.firstMessageAt ?? new Date(),
    lastMessageAt: item.lastEventAt ?? new Date(),
    lifespanMs,
    activeTimeMs: item.activeAgentTimeMs,
    runCount: item.runsCount,
    successfulRuns: item.successRuns,
    failedRuns: item.failedRuns,
    handoffCount: item.handoffsCount,
    hasPostHandoffIteration: item.hasPostHandoffIteration,
    totalCostCents: Math.round(item.costTotal * 100),
    inputTokens: item.inputTokensTotal,
    outputTokens: item.outputTokensTotal,
    totalTokens: item.inputTokensTotal + item.outputTokensTotal,
  };
}

function transformSessionDetail(detail: SessionDetail): SessionDetailResponse {
  const session = transformSessionListItem(detail.session);

  const runs: Run[] = detail.runs.map((r) => ({
    runId: r.runId,
    sessionId: r.sessionId,
    userId: r.userId ?? "unknown",
    startedAt: r.startedAt ?? new Date(),
    endedAt: r.completedAt ?? new Date(),
    status: mapRunStatus(r.status),
    executionMs: r.durationMs ?? 0,
    costCents: r.cost ? Math.round(r.cost * 100) : 0,
    inputTokens: r.inputTokens ?? 0,
    outputTokens: r.outputTokens ?? 0,
    totalTokens: (r.inputTokens ?? 0) + (r.outputTokens ?? 0),
    errorType: r.errorType as Run["errorType"] | undefined,
  }));

  // Transform events
  const events: Event[] = detail.events.map((e) => ({
    eventId: e.eventId,
    eventType: e.eventType as Event["eventType"],
    timestamp: e.occurredAt,
    sessionId: session.sessionId,
  }));

  // Extract handoffs from events
  const handoffs: LocalHandoffEvent[] = detail.events
    .filter((e) => e.eventType === "local_handoff")
    .map((e) => ({
      eventId: e.eventId,
      eventType: "local_handoff" as const,
      timestamp: e.occurredAt,
      sessionId: session.sessionId,
      method: (e.payload as { method?: string })?.method ?? "other",
    }));

  return {
    session,
    runs,
    events,
    handoffs,
    artifacts: {
      totalFilesChanged: 0,
      totalLinesAdded: 0,
      totalLinesDeleted: 0,
      files: [],
    },
  };
}

function mapRunStatus(status: string | null): Run["status"] {
  switch (status) {
    case "success":
      return "success";
    case "fail":
      return "fail";
    case "timeout":
      return "timeout";
    case "cancelled":
      return "cancelled";
    default:
      return "fail";
  }
}
