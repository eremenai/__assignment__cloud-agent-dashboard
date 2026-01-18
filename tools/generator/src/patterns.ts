/**
 * Org-specific patterns for event generation.
 */

import type { AnalyticsEvent, RunStatus, HandoffMethod, ErrorCategory } from "@repo/shared/types";

export interface OrgPattern {
  orgId: string;
  name: string;
  users: string[];
  minDailySessions: number;
  maxDailySessions: number;
  successRate: number; // 0-1
  handoffRate: number; // 0-1
}

/**
 * Test organizations with different usage patterns.
 */
export const ORG_PATTERNS: OrgPattern[] = [
  {
    orgId: "org_small",
    name: "Small Startup",
    users: ["user_small_1", "user_small_2"],
    minDailySessions: 1,
    maxDailySessions: 3,
    successRate: 0.9,
    handoffRate: 0.2,
  },
  {
    orgId: "org_medium",
    name: "Medium Team",
    users: ["user_med_1", "user_med_2", "user_med_3", "user_med_4", "user_med_5"],
    minDailySessions: 5,
    maxDailySessions: 12,
    successRate: 0.8,
    handoffRate: 0.35,
  },
  {
    orgId: "org_large",
    name: "Large Corp",
    users: [
      "user_large_1",
      "user_large_2",
      "user_large_3",
      "user_large_4",
      "user_large_5",
      "user_large_6",
      "user_large_7",
      "user_large_8",
      "user_large_9",
      "user_large_10",
    ],
    minDailySessions: 15,
    maxDailySessions: 35,
    successRate: 0.75,
    handoffRate: 0.4,
  },
];

export interface SessionParams {
  orgId: string;
  userId: string;
  date: Date;
  successRate: number;
  handoffRate: number;
  isWeekend: boolean;
}

/**
 * Generate a complete session with realistic event sequence.
 */
export function generateSession(params: SessionParams): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  const sessionId = `sess_${randomId()}`;

  // Session start time (during working hours, later on weekends)
  const startHour = params.isWeekend ? 10 + Math.random() * 8 : 8 + Math.random() * 12;
  const sessionStart = new Date(params.date);
  sessionStart.setHours(Math.floor(startHour), Math.floor(Math.random() * 60), 0, 0);

  let currentTime = sessionStart.getTime();

  // First message
  events.push(createEvent({
    orgId: params.orgId,
    sessionId,
    userId: params.userId,
    occurredAt: new Date(currentTime),
    eventType: "message_created",
    payload: {},
  }));
  currentTime += 1000 + Math.random() * 5000;

  // Generate 1-15 runs (weighted toward 2-5)
  const runCount = weightedRandom([1, 2, 3, 4, 5, 6, 7, 8, 10, 15], [5, 20, 25, 20, 15, 8, 4, 2, 1, 0.5]);

  for (let i = 0; i < runCount; i++) {
    const runId = `run_${randomId()}`;

    // Run started
    events.push(createEvent({
      orgId: params.orgId,
      sessionId,
      userId: params.userId,
      runId,
      occurredAt: new Date(currentTime),
      eventType: "run_started",
      payload: {},
    }));

    // Run duration: 5s - 5min (p50 ~30s)
    const durationMs = Math.round(
      5000 + Math.random() * Math.random() * 295000 // Skewed toward shorter
    );
    currentTime += durationMs;

    // Determine status
    const isSuccess = Math.random() < params.successRate;
    const status: RunStatus = isSuccess
      ? "success"
      : weightedRandom(["fail", "timeout", "cancelled"], [60, 30, 10]);

    // Cost: $0.001 - $0.50 (p50 ~$0.02)
    const cost = 0.001 + Math.random() * Math.random() * 0.5;

    // Tokens: 100 - 50,000
    const inputTokens = Math.round(100 + Math.random() * 25000);
    const outputTokens = Math.round(50 + Math.random() * 25000);

    // Error type for failures
    const errorType: ErrorCategory | undefined = isSuccess
      ? undefined
      : weightedRandom(["tool_error", "model_error", "timeout", "unknown"], [40, 30, 20, 10]);

    // Run completed
    events.push(createEvent({
      orgId: params.orgId,
      sessionId,
      userId: params.userId,
      runId,
      occurredAt: new Date(currentTime),
      eventType: "run_completed",
      payload: {
        status,
        duration_ms: durationMs,
        cost,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        error_type: errorType,
      },
    }));

    // Time between runs
    currentTime += 2000 + Math.random() * 30000;
  }

  // Maybe add a handoff
  if (Math.random() < params.handoffRate) {
    const method: HandoffMethod = weightedRandom(
      ["teleport", "download", "copy_patch", "other"],
      [50, 25, 20, 5]
    );

    events.push(createEvent({
      orgId: params.orgId,
      sessionId,
      userId: params.userId,
      occurredAt: new Date(currentTime),
      eventType: "local_handoff",
      payload: { method },
    }));

    // ~30% chance of post-handoff iteration
    if (Math.random() < 0.3) {
      currentTime += 60000 + Math.random() * 3600000; // 1min to 1hr later

      const postRunId = `run_${randomId()}`;
      const postDurationMs = Math.round(5000 + Math.random() * 60000);

      events.push(createEvent({
        orgId: params.orgId,
        sessionId,
        userId: params.userId,
        runId: postRunId,
        occurredAt: new Date(currentTime),
        eventType: "run_started",
        payload: {},
      }));

      currentTime += postDurationMs;

      events.push(createEvent({
        orgId: params.orgId,
        sessionId,
        userId: params.userId,
        runId: postRunId,
        occurredAt: new Date(currentTime),
        eventType: "run_completed",
        payload: {
          status: "success",
          duration_ms: postDurationMs,
          cost: 0.01 + Math.random() * 0.05,
          input_tokens: Math.round(500 + Math.random() * 5000),
          output_tokens: Math.round(200 + Math.random() * 5000),
        },
      }));
    }
  }

  return events;
}

interface CreateEventParams {
  orgId: string;
  sessionId: string;
  userId: string;
  runId?: string;
  occurredAt: Date;
  eventType: AnalyticsEvent["event_type"];
  payload: Record<string, unknown>;
}

function createEvent(params: CreateEventParams): AnalyticsEvent {
  return {
    event_id: `evt_${randomId()}`,
    org_id: params.orgId,
    session_id: params.sessionId,
    user_id: params.userId,
    run_id: params.runId ?? null,
    occurred_at: params.occurredAt.toISOString(),
    event_type: params.eventType,
    payload: params.payload,
  } as AnalyticsEvent;
}

function randomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}
