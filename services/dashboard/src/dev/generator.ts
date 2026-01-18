/**
 * Mock data generation utilities.
 * Generates realistic sessions, runs, events with proper relationships.
 */

import type {
  ActorType,
  ArtifactSummary,
  Event,
  EventPayload,
  FailureCategory,
  HandoffMethod,
  LocalHandoffEvent,
  Run,
  RunStatus,
  Session,
} from "@/lib/types/domain";

// ============================================================================
// Random Utilities
// ============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 10)}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

// ============================================================================
// Session Generation
// ============================================================================

export interface SessionGeneratorOptions {
  orgId: string;
  userIds: string[];
  startDate: Date;
  endDate: Date;
  count: number;
}

export function generateSessions(options: SessionGeneratorOptions): Session[] {
  const { orgId, userIds, startDate, endDate, count } = options;
  const sessions: Session[] = [];
  const timeRange = endDate.getTime() - startDate.getTime();

  for (let i = 0; i < count; i++) {
    const createdAt = new Date(startDate.getTime() + Math.random() * timeRange);
    const lifespanMinutes = randomInt(5, 180); // 5 min to 3 hours
    const lastMessageAt = addMinutes(createdAt, lifespanMinutes);

    sessions.push({
      sessionId: randomId("sess"),
      orgId,
      createdByUserId: randomChoice(userIds),
      createdAt,
      firstMessageAt: createdAt,
      lastMessageAt,
      repoId: `repo-${randomInt(1, 10)}`,
    });
  }

  return sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ============================================================================
// Run Generation
// ============================================================================

export interface RunGeneratorOptions {
  session: Session;
  runCount: number;
}

// Failure categories matching backend ErrorCategory type
const FAILURE_CATEGORIES: FailureCategory[] = ["tool_error", "model_error", "timeout", "unknown"];

export function generateRuns(options: RunGeneratorOptions): Run[] {
  const { session, runCount } = options;
  const runs: Run[] = [];

  let currentTime = session.firstMessageAt;
  const sessionDuration = session.lastMessageAt.getTime() - session.firstMessageAt.getTime();
  const avgGapMinutes = sessionDuration / (runCount + 1) / 60000;

  for (let i = 0; i < runCount; i++) {
    // Gap before run (thinking time)
    const gapMinutes = randomFloat(avgGapMinutes * 0.5, avgGapMinutes * 1.5);
    currentTime = addMinutes(currentTime, Math.max(1, gapMinutes));

    // Run duration (30 seconds to 15 minutes)
    const executionMs = randomInt(30000, 900000);
    const startedAt = currentTime;
    const completedAt = addSeconds(startedAt, executionMs / 1000);
    currentTime = completedAt;

    // Status - 85% success rate overall
    // Use lowercase values matching backend RunStatus type
    const isSuccess = Math.random() < 0.85;
    const status: RunStatus = isSuccess ? "success" : randomChoice(["fail", "timeout", "cancelled"]);

    // Tokens and cost
    const inputTokens = randomInt(5000, 50000);
    const outputTokens = randomInt(1000, 20000);
    const totalTokens = inputTokens + outputTokens;
    // Rough cost: $0.015 per 1K input, $0.075 per 1K output (Claude 3 Sonnet pricing)
    const costCents = Math.round((inputTokens / 1000) * 1.5 + (outputTokens / 1000) * 7.5);

    const run: Run = {
      runId: randomId("run"),
      sessionId: session.sessionId,
      orgId: session.orgId,
      startedAt,
      completedAt,
      status,
      queueWaitMs: randomInt(0, 5000),
      executionMs,
      inputTokens,
      outputTokens,
      totalTokens,
      costCents,
    };

    if (!isSuccess) {
      run.failureCategory = randomChoice(FAILURE_CATEGORIES);
    }

    if (isSuccess && Math.random() > 0.3) {
      run.artifactSummary = generateArtifactSummary();
    }

    runs.push(run);
  }

  return runs;
}

function generateArtifactSummary(): ArtifactSummary {
  const filesChanged = randomInt(1, 10);
  const linesAdded = randomInt(10, 500);
  const linesDeleted = randomInt(0, Math.floor(linesAdded * 0.5));
  const testsRun = randomInt(0, 50);
  const testsPassed = Math.floor(testsRun * randomFloat(0.8, 1.0));

  return {
    filesChanged,
    linesAdded,
    linesDeleted,
    testsRun,
    testsPassed,
  };
}

// ============================================================================
// Event Generation
// ============================================================================

const USER_MESSAGES = [
  "Fix the login bug in auth.ts",
  "Can you add error handling to the API endpoint?",
  "Refactor this function to be more readable",
  "Add unit tests for the payment module",
  "Update the README with installation instructions",
  "Optimize the database query - it's running slow",
  "Implement the new feature from the spec",
  "Debug why the tests are failing",
  "Clean up the unused imports",
  "Add TypeScript types to this module",
];

const AGENT_MESSAGES = [
  "I've identified the issue and fixed the bug in auth.ts.",
  "Done! I've added comprehensive error handling with proper status codes.",
  "I've refactored the function into smaller, more readable pieces.",
  "Added 15 unit tests covering the main scenarios.",
  "Updated the README with detailed installation steps.",
  "Optimized the query by adding an index and restructuring the joins.",
  "Implemented the feature according to the spec. Ready for review.",
  "Found the root cause - there was a race condition in the async code.",
  "Cleaned up all unused imports across 8 files.",
  "Added TypeScript interfaces and types throughout the module.",
];

export interface EventGeneratorOptions {
  session: Session;
  runs: Run[];
}

export function generateEvents(options: EventGeneratorOptions): Event[] {
  const { session, runs } = options;
  const events: Event[] = [];
  let runNumber = 0;

  // Initial user message
  events.push(
    createEvent(
      session.sessionId,
      session.firstMessageAt,
      "message_created",
      "user",
      createMessagePayload(randomChoice(USER_MESSAGES)),
    ),
  );

  // Events for each run
  for (const run of runs) {
    runNumber++;

    // Run start
    events.push(
      createEvent(session.sessionId, run.startedAt, "run_started", "system", {
        type: "run_started",
        runId: run.runId,
        runNumber,
      }),
    );

    // Run end
    const runEndTime = run.completedAt ?? run.endedAt ?? run.startedAt;
    events.push(
      createEvent(session.sessionId, runEndTime, "run_completed", "system", {
        type: "run_completed",
        runId: run.runId,
        runNumber,
        status: run.status,
        durationMs: run.executionMs,
        costCents: run.costCents,
        totalTokens: run.totalTokens,
        failureCategory: run.failureCategory,
      }),
    );

    // Agent message after successful runs
    if (run.status === "success") {
      events.push(
        createEvent(
          session.sessionId,
          addSeconds(runEndTime, randomInt(5, 30)),
          "message_created",
          "agent",
          createMessagePayload(randomChoice(AGENT_MESSAGES)),
        ),
      );
    }

    // User follow-up message (sometimes)
    if (runNumber < runs.length && Math.random() > 0.3) {
      events.push(
        createEvent(
          session.sessionId,
          addMinutes(runEndTime, randomInt(1, 5)),
          "message_created",
          "user",
          createMessagePayload(randomChoice(USER_MESSAGES)),
        ),
      );
    }
  }

  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function createEvent(
  sessionId: string,
  timestamp: Date,
  type: Event["type"],
  actorType: ActorType,
  payload: EventPayload,
): Event {
  return {
    eventId: randomId("evt"),
    sessionId,
    timestamp,
    type,
    actorType,
    payload,
  };
}

function createMessagePayload(content: string): EventPayload {
  return {
    type: "message_created",
    content,
    preview: content.length > 100 ? `${content.substring(0, 100)}...` : content,
  };
}

// ============================================================================
// Handoff Generation
// ============================================================================

// Handoff methods matching backend HandoffMethod type
const HANDOFF_METHODS: HandoffMethod[] = ["teleport", "download", "copy_patch", "other"];

export interface HandoffGeneratorOptions {
  session: Session;
  runs: Run[];
  probability: number; // 0-1, chance of having a handoff
}

export function generateHandoffs(options: HandoffGeneratorOptions): LocalHandoffEvent[] {
  const { session, runs, probability } = options;

  if (Math.random() > probability || runs.length === 0) {
    return [];
  }

  const handoffs: LocalHandoffEvent[] = [];
  const handoffCount = randomInt(1, Math.min(2, runs.length));

  // Pick random runs after which handoffs occur
  const runIndices = new Set<number>();
  while (runIndices.size < handoffCount) {
    runIndices.add(randomInt(0, runs.length - 1));
  }

  for (const idx of runIndices) {
    const run = runs[idx];
    const runEndTime = run.completedAt ?? run.endedAt ?? run.startedAt;
    handoffs.push({
      handoffId: randomId("ho"),
      sessionId: session.sessionId,
      orgId: session.orgId,
      userId: session.createdByUserId,
      timestamp: addMinutes(runEndTime, randomInt(1, 10)),
      method: randomChoice(HANDOFF_METHODS),
    });
  }

  return handoffs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// ============================================================================
// Time Series Generation
// ============================================================================

export interface TimeSeriesOptions {
  startDate: Date;
  endDate: Date;
  baseValue: number;
  variance: number; // 0-1, how much values can vary
  trend?: number; // positive = upward trend, negative = downward
}

export function generateTimeSeries(options: TimeSeriesOptions): Array<{ date: string; value: number }> {
  const { startDate, endDate, baseValue, variance, trend = 0 } = options;
  const points: Array<{ date: string; value: number }> = [];

  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / dayMs);

  for (let i = 0; i <= totalDays; i++) {
    const date = new Date(startDate.getTime() + i * dayMs);
    const dateStr = date.toISOString().split("T")[0];

    // Base value with trend
    const trendAdjustment = trend * (i / totalDays);
    const adjusted = baseValue * (1 + trendAdjustment);

    // Add random variance
    const randomVariance = 1 + (Math.random() - 0.5) * 2 * variance;
    const value = Math.max(0, Math.round(adjusted * randomVariance));

    points.push({ date: dateStr, value });
  }

  return points;
}
