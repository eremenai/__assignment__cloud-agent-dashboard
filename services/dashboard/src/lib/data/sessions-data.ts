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
  type SessionsListOptions,
} from "../db/queries";

export interface SessionsListFilters {
  search?: string;
  status?: string;
  durationRange?: string;
  costRange?: string;
  hasHandoff?: string;
  hasPostHandoffIteration?: string;
}

/**
 * Get paginated sessions list.
 */
export async function fetchSessionsList(
  orgId: string,
  timeRange: TimeRangeParams,
  pagination: PaginationParams,
  sort: SortParams,
  filters?: SessionsListFilters
): Promise<SessionsListResponse> {
  const fromDate = new Date(timeRange.from);
  const toDate = new Date(timeRange.to);
  const offset = (pagination.page - 1) * pagination.pageSize;

  const options: SessionsListOptions = {
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
    search: filters?.search,
    status: filters?.status,
    durationRange: filters?.durationRange,
    costRange: filters?.costRange,
    hasHandoff: filters?.hasHandoff,
    hasPostHandoffIteration: filters?.hasPostHandoffIteration,
  };

  const result = await getSessionsListFromDb(orgId, fromDate, toDate, pagination.pageSize, offset, options);

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

  // Calculate success rate from successful vs total runs
  const successRate = item.runsCount > 0 ? (item.successRuns / item.runsCount) * 100 : 0;

  return {
    sessionId: item.sessionId,
    userId: item.userId ?? "unknown",
    orgId: item.orgId,
    createdAt: item.firstMessageAt ?? new Date(),
    firstMessageAt: item.firstMessageAt ?? new Date(),
    lastMessageAt: item.lastEventAt ?? new Date(),
    createdByUser: item.userName || item.userEmail
      ? {
          userId: item.userId ?? "unknown",
          name: item.userName ?? item.userEmail ?? "Unknown",
          email: item.userEmail ?? "",
        }
      : undefined,
    lifespanMs,
    activeTimeMs: item.activeAgentTimeMs,
    runCount: item.runsCount,
    successfulRuns: item.successRuns,
    failedRuns: item.failedRuns,
    successRate: Math.round(successRate * 10) / 10,
    handoffCount: item.handoffsCount,
    hasPostHandoffIteration: item.hasPostHandoffIteration,
    totalCostCents: Math.round(item.costTotal * 100),
    inputTokens: item.inputTokensTotal,
    outputTokens: item.outputTokensTotal,
    totalTokens: item.inputTokensTotal + item.outputTokensTotal,
  };
}

function transformSessionDetail(detail: SessionDetail): SessionDetailResponse {
  // Transform runs first so we can compute accurate metrics
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

  // Compute metrics from actual runs (more accurate than session_stats)
  const runCount = runs.length;
  const successfulRuns = runs.filter((r) => r.status === "success").length;
  const failedRuns = runs.filter((r) => r.status === "fail").length;
  const activeTimeMs = runs.reduce((sum, r) => sum + r.executionMs, 0);
  const inputTokens = runs.reduce((sum, r) => sum + r.inputTokens, 0);
  const outputTokens = runs.reduce((sum, r) => sum + r.outputTokens, 0);
  const totalCostCents = runs.reduce((sum, r) => sum + r.costCents, 0);
  const successRate = runCount > 0 ? (successfulRuns / runCount) * 100 : 0;

  // Start with session list item and override with computed values
  const baseSession = transformSessionListItem(detail.session);
  const session = {
    ...baseSession,
    runCount,
    successfulRuns,
    failedRuns,
    activeTimeMs,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    totalCostCents,
    successRate: Math.round(successRate * 10) / 10,
  };

  // Build a map of runId -> runNumber based on the order of run_started events
  const runStartedEvents = detail.events.filter((e) => e.eventType === "run_started");
  const runNumberMap = new Map<string, number>();
  runStartedEvents.forEach((e, idx) => {
    if (e.runId) {
      runNumberMap.set(e.runId, idx + 1);
    }
  });

  // Build a map of runId -> Run for run details lookup
  const runMap = new Map<string, Run>();
  for (const run of runs) {
    runMap.set(run.runId, run);
  }

  // Transform events with enriched payloads
  // Using type assertion because we're building extended payloads that the timeline component handles dynamically
  const events = detail.events.map((e) => {
    const baseEvent = {
      eventId: e.eventId,
      eventType: e.eventType as Event["eventType"],
      type: e.eventType as Event["type"],
      timestamp: e.occurredAt,
      sessionId: session.sessionId,
    };

    // Enrich payload based on event type
    if (e.eventType === "message_created") {
      const msgPayload = e.payload as { content?: string } | undefined;
      const content = msgPayload?.content ?? "";
      // Create a preview (truncated version for timeline display)
      const preview = content.length > 200 ? content.slice(0, 200) + "..." : content;
      return {
        ...baseEvent,
        actorType: "user" as const, // Messages in this system are from users
        payload: {
          type: "message_created",
          content,
          preview,
        },
      };
    }

    if (e.eventType === "run_started") {
      const runNumber = e.runId ? runNumberMap.get(e.runId) ?? 0 : 0;
      return {
        ...baseEvent,
        actorType: "agent" as const,
        payload: {
          type: "run_started",
          runId: e.runId ?? "",
          runNumber,
        },
      };
    }

    if (e.eventType === "run_completed") {
      const runNumber = e.runId ? runNumberMap.get(e.runId) ?? 0 : 0;
      const run = e.runId ? runMap.get(e.runId) : undefined;
      const completedPayload = e.payload as { status?: string; duration_ms?: number; cost?: number; error_type?: string } | undefined;
      const status = (run?.status ?? completedPayload?.status ?? "fail") as Run["status"];
      return {
        ...baseEvent,
        actorType: "agent" as const,
        payload: {
          type: "run_completed" as const,
          runId: e.runId ?? "",
          runNumber,
          status,
          durationMs: run?.executionMs ?? completedPayload?.duration_ms ?? 0,
          costCents: run?.costCents ?? (completedPayload?.cost ? Math.round(completedPayload.cost * 100) : 0),
          totalTokens: run?.totalTokens ?? 0,
          failureCategory: run?.errorType ?? completedPayload?.error_type,
        },
      };
    }

    if (e.eventType === "local_handoff") {
      const handoffPayload = e.payload as { method?: string } | undefined;
      return {
        ...baseEvent,
        actorType: "user" as const,
        payload: {
          type: "local_handoff",
          handoffId: e.eventId,
          method: handoffPayload?.method ?? "other",
          userId: e.userId ?? "",
        },
      };
    }

    // Fallback for unknown event types
    return {
      ...baseEvent,
      payload: e.payload as unknown as Event["payload"],
    };
  }) as Event[];

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
