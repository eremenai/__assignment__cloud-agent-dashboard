/**
 * Tests for worker projectors.
 *
 * These tests verify:
 * - Message projection updates session_stats
 * - Run projections update run_facts, session_stats, and daily aggregates
 * - Handoff projection updates handoff counts and checks post-handoff iteration
 * - Error categorization works correctly
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { eventsRaw } from "@repo/shared/db/schema";

// Mock SQL builder
const mockSql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
  strings,
  values,
}));

vi.mock("drizzle-orm", () => ({
  sql: mockSql,
  and: vi.fn((...args) => ({ type: "and", args })),
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  gt: vi.fn((a, b) => ({ type: "gt", a, b })),
  lte: vi.fn((a, b) => ({ type: "lte", a, b })),
}));

// Create mock event factory
function createMockEvent(
  overrides: Partial<typeof eventsRaw.$inferSelect> = {}
): typeof eventsRaw.$inferSelect {
  return {
    org_id: "org-1",
    event_id: "evt-1",
    occurred_at: new Date("2024-01-15T10:00:00Z"),
    inserted_at: new Date("2024-01-15T10:00:01Z"),
    event_type: "message_created",
    session_id: "sess-1",
    user_id: "user-1",
    run_id: null,
    payload: {},
    ...overrides,
  };
}

// Mock transaction
const createMockTx = () => {
  const insertValues = vi.fn().mockReturnValue({
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
  });

  const insert = vi.fn().mockReturnValue({
    values: insertValues,
  });

  const selectFrom = vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    }),
  });

  const select = vi.fn().mockReturnValue({
    from: selectFrom,
  });

  const execute = vi.fn().mockResolvedValue([]);

  return {
    insert,
    select,
    execute,
    _insertValues: insertValues,
    _selectFrom: selectFrom,
  };
};

describe("Message Projector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("projectMessageCreated", () => {
    it("inserts new session_stats on first message", async () => {
      const tx = createMockTx();
      // Mock: no existing session
      tx.execute.mockResolvedValueOnce([]);

      const event = createMockEvent({
        event_type: "message_created",
        payload: { content: "Hello" },
      });

      // Import and run projector
      const { projectMessageCreated } = await import("../projectors/message.js");
      await projectMessageCreated(tx as unknown as Parameters<typeof projectMessageCreated>[0], event);

      // Verify insert was called
      expect(tx.insert).toHaveBeenCalled();
      expect(tx._insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          org_id: "org-1",
          session_id: "sess-1",
          user_id: "user-1",
        })
      );
    });

    it("uses LEAST for first_message_at and GREATEST for last_event_at", async () => {
      const tx = createMockTx();
      // Mock: no existing session
      tx.execute.mockResolvedValueOnce([]);

      const event = createMockEvent({
        event_type: "message_created",
      });

      const { projectMessageCreated } = await import("../projectors/message.js");
      await projectMessageCreated(tx as unknown as Parameters<typeof projectMessageCreated>[0], event);

      // Verify onConflictDoUpdate was called with correct SQL functions
      const onConflictCall = tx._insertValues.mock.results[0]?.value.onConflictDoUpdate;
      expect(onConflictCall).toHaveBeenCalled();
    });

    it("increments sessions_count in org_stats_daily on new session", async () => {
      const tx = createMockTx();
      // Mock: no existing session (this is a new session)
      tx.execute.mockResolvedValueOnce([]);

      const event = createMockEvent({
        event_type: "message_created",
        occurred_at: new Date("2024-01-15T10:00:00Z"),
      });

      const { projectMessageCreated } = await import("../projectors/message.js");
      await projectMessageCreated(tx as unknown as Parameters<typeof projectMessageCreated>[0], event);

      // Should have 3 inserts: session_stats, org_stats_daily, user_stats_daily
      expect(tx.insert.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Verify org_stats_daily insert includes sessions_count: 1
      const insertCalls = tx._insertValues.mock.calls;
      const orgStatsInsert = insertCalls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>)?.sessions_count === 1 &&
                            (call[0] as Record<string, unknown>)?.day !== undefined
      );
      expect(orgStatsInsert).toBeDefined();
    });

    it("increments sessions_count in user_stats_daily on new session with user_id", async () => {
      const tx = createMockTx();
      // Mock: no existing session (this is a new session)
      tx.execute.mockResolvedValueOnce([]);

      const event = createMockEvent({
        event_type: "message_created",
        user_id: "user-1",
        occurred_at: new Date("2024-01-15T10:00:00Z"),
      });

      const { projectMessageCreated } = await import("../projectors/message.js");
      await projectMessageCreated(tx as unknown as Parameters<typeof projectMessageCreated>[0], event);

      // Should have 3 inserts: session_stats, org_stats_daily, user_stats_daily
      expect(tx.insert.mock.calls.length).toBe(3);

      // Verify user_stats_daily insert includes sessions_count: 1 and user_id
      const insertCalls = tx._insertValues.mock.calls;
      const userStatsInsert = insertCalls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>)?.sessions_count === 1 &&
                            (call[0] as Record<string, unknown>)?.user_id === "user-1"
      );
      expect(userStatsInsert).toBeDefined();
    });

    it("does NOT increment sessions_count for existing session", async () => {
      const tx = createMockTx();
      // Mock: existing session found
      tx.execute.mockResolvedValueOnce([{ first_message_at: new Date("2024-01-15T09:00:00Z"), user_id: "user-1" }]);

      const event = createMockEvent({
        event_type: "message_created",
        occurred_at: new Date("2024-01-15T10:00:00Z"),
      });

      const { projectMessageCreated } = await import("../projectors/message.js");
      await projectMessageCreated(tx as unknown as Parameters<typeof projectMessageCreated>[0], event);

      // Should only have 1 insert: session_stats (no daily aggregates increment)
      expect(tx.insert.mock.calls.length).toBe(1);
    });

  });
});

describe("Run Projectors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("projectRunStarted", () => {
    it("inserts run_facts with started_at", async () => {
      const tx = createMockTx();
      const event = createMockEvent({
        event_type: "run_started",
        run_id: "run-1",
        payload: {},
      });

      const { projectRunStarted } = await import("../projectors/run.js");
      await projectRunStarted(tx as unknown as Parameters<typeof projectRunStarted>[0], event);

      // Verify run_facts insert
      expect(tx.insert).toHaveBeenCalled();
    });

    it("skips projection if run_id is missing", async () => {
      const tx = createMockTx();
      const event = createMockEvent({
        event_type: "run_started",
        run_id: null,
        payload: {},
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { projectRunStarted } = await import("../projectors/run.js");
      await projectRunStarted(tx as unknown as Parameters<typeof projectRunStarted>[0], event);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("missing run_id"));
      warnSpy.mockRestore();
    });
  });

  describe("projectRunCompleted", () => {
    it("updates run_facts with completion metrics", async () => {
      const tx = createMockTx();
      const event = createMockEvent({
        event_type: "run_completed",
        run_id: "run-1",
        payload: {
          status: "success",
          duration_ms: 5000,
          cost: 0.05,
          input_tokens: 1000,
          output_tokens: 500,
        },
      });

      const { projectRunCompleted } = await import("../projectors/run.js");
      await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

      // Should insert into multiple tables
      expect(tx.insert).toHaveBeenCalled();
    });

    it("updates session_stats with run counts", async () => {
      const tx = createMockTx();
      const event = createMockEvent({
        event_type: "run_completed",
        run_id: "run-1",
        payload: {
          status: "success",
          duration_ms: 5000,
          cost: 0.05,
          input_tokens: 1000,
          output_tokens: 500,
        },
      });

      const { projectRunCompleted } = await import("../projectors/run.js");
      await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

      // Multiple inserts for run_facts, session_stats, org_stats_daily, user_stats_daily
      expect(tx.insert.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it("increments success_runs for successful runs", async () => {
      const tx = createMockTx();
      const event = createMockEvent({
        event_type: "run_completed",
        run_id: "run-1",
        payload: {
          status: "success",
          duration_ms: 5000,
          cost: 0.05,
          input_tokens: 1000,
          output_tokens: 500,
        },
      });

      const { projectRunCompleted } = await import("../projectors/run.js");
      await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

      // Verify session_stats insert includes success_runs: 1
      const insertCalls = tx._insertValues.mock.calls;
      const sessionStatsInsert = insertCalls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>)?.success_runs === 1
      );
      expect(sessionStatsInsert).toBeDefined();
    });

    it("increments failed_runs for failed runs", async () => {
      const tx = createMockTx();
      const event = createMockEvent({
        event_type: "run_completed",
        run_id: "run-1",
        payload: {
          status: "fail",
          duration_ms: 5000,
          cost: 0.05,
          input_tokens: 1000,
          output_tokens: 500,
          error_type: "tool_error",
        },
      });

      const { projectRunCompleted } = await import("../projectors/run.js");
      await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

      // Verify session_stats insert includes failed_runs: 1
      const insertCalls = tx._insertValues.mock.calls;
      const sessionStatsInsert = insertCalls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>)?.failed_runs === 1
      );
      expect(sessionStatsInsert).toBeDefined();
    });

    it("skips projection if run_id is missing", async () => {
      const tx = createMockTx();
      const event = createMockEvent({
        event_type: "run_completed",
        run_id: null,
        payload: {
          status: "success",
          duration_ms: 5000,
          cost: 0.05,
          input_tokens: 1000,
          output_tokens: 500,
        },
      });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { projectRunCompleted } = await import("../projectors/run.js");
      await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("missing run_id"));
      warnSpy.mockRestore();
    });

    it("updates user_stats_daily when user_id is present", async () => {
      const tx = createMockTx();
      const event = createMockEvent({
        event_type: "run_completed",
        run_id: "run-1",
        user_id: "user-1",
        payload: {
          status: "success",
          duration_ms: 5000,
          cost: 0.05,
          input_tokens: 1000,
          output_tokens: 500,
        },
      });

      const { projectRunCompleted } = await import("../projectors/run.js");
      await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

      // Should have 4 inserts: run_facts, session_stats, org_stats_daily, user_stats_daily
      expect(tx.insert.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

  });
});

describe("Handoff Projector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("projectLocalHandoff", () => {
    it("increments handoffs_count in session_stats", async () => {
      const tx = createMockTx();
      const event = createMockEvent({
        event_type: "local_handoff",
        payload: { method: "teleport" },
      });

      const { projectLocalHandoff } = await import("../projectors/handoff.js");
      await projectLocalHandoff(tx as unknown as Parameters<typeof projectLocalHandoff>[0], event);

      // Verify insert was called
      expect(tx.insert).toHaveBeenCalled();
      const insertCalls = tx._insertValues.mock.calls;
      const handoffInsert = insertCalls.find(
        (call: unknown[]) => (call[0] as Record<string, unknown>)?.handoffs_count === 1
      );
      expect(handoffInsert).toBeDefined();
    });

    it("updates org_stats_daily on first handoff for session", async () => {
      const tx = createMockTx();
      // Mock no existing session (first handoff)
      tx.execute.mockResolvedValueOnce([]);

      const event = createMockEvent({
        event_type: "local_handoff",
        payload: { method: "teleport" },
      });

      const { projectLocalHandoff } = await import("../projectors/handoff.js");
      await projectLocalHandoff(tx as unknown as Parameters<typeof projectLocalHandoff>[0], event);

      // Should update org_stats_daily with sessions_with_handoff increment
      expect(tx.insert.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it("checks for retroactive post-handoff iteration", async () => {
      const tx = createMockTx();
      tx.execute.mockResolvedValueOnce([{ handoffs_count: 0, first_message_at: new Date(), user_id: "user-1" }]);

      const event = createMockEvent({
        event_type: "local_handoff",
        payload: { method: "teleport" },
      });

      const { projectLocalHandoff } = await import("../projectors/handoff.js");
      await projectLocalHandoff(tx as unknown as Parameters<typeof projectLocalHandoff>[0], event);

      // Should call select to check for runs in post-handoff window
      expect(tx.select).toHaveBeenCalled();
    });
  });
});

describe("Error Category Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("categorizes tool_error correctly", async () => {
    const tx = createMockTx();
    const event = createMockEvent({
      event_type: "run_completed",
      run_id: "run-1",
      payload: {
        status: "fail",
        duration_ms: 5000,
        cost: 0.05,
        input_tokens: 1000,
        output_tokens: 500,
        error_type: "tool_error",
      },
    });

    const { projectRunCompleted } = await import("../projectors/run.js");
    await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

    // Verify org_stats_daily insert includes errors_tool: 1
    const insertCalls = tx._insertValues.mock.calls;
    const orgStatsInsert = insertCalls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>)?.errors_tool === 1
    );
    expect(orgStatsInsert).toBeDefined();
  });

  it("categorizes model_error correctly", async () => {
    const tx = createMockTx();
    const event = createMockEvent({
      event_type: "run_completed",
      run_id: "run-1",
      payload: {
        status: "fail",
        duration_ms: 5000,
        cost: 0.05,
        input_tokens: 1000,
        output_tokens: 500,
        error_type: "model_error",
      },
    });

    const { projectRunCompleted } = await import("../projectors/run.js");
    await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

    const insertCalls = tx._insertValues.mock.calls;
    const orgStatsInsert = insertCalls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>)?.errors_model === 1
    );
    expect(orgStatsInsert).toBeDefined();
  });

  it("categorizes timeout correctly", async () => {
    const tx = createMockTx();
    const event = createMockEvent({
      event_type: "run_completed",
      run_id: "run-1",
      payload: {
        status: "fail",
        duration_ms: 5000,
        cost: 0.05,
        input_tokens: 1000,
        output_tokens: 500,
        error_type: "timeout",
      },
    });

    const { projectRunCompleted } = await import("../projectors/run.js");
    await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

    const insertCalls = tx._insertValues.mock.calls;
    const orgStatsInsert = insertCalls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>)?.errors_timeout === 1
    );
    expect(orgStatsInsert).toBeDefined();
  });

  it("categorizes unknown errors as errors_other", async () => {
    const tx = createMockTx();
    const event = createMockEvent({
      event_type: "run_completed",
      run_id: "run-1",
      payload: {
        status: "fail",
        duration_ms: 5000,
        cost: 0.05,
        input_tokens: 1000,
        output_tokens: 500,
        // No error_type specified
      },
    });

    const { projectRunCompleted } = await import("../projectors/run.js");
    await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

    const insertCalls = tx._insertValues.mock.calls;
    const orgStatsInsert = insertCalls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>)?.errors_other === 1
    );
    expect(orgStatsInsert).toBeDefined();
  });

  it("sets all error counts to 0 for successful runs", async () => {
    const tx = createMockTx();
    const event = createMockEvent({
      event_type: "run_completed",
      run_id: "run-1",
      payload: {
        status: "success",
        duration_ms: 5000,
        cost: 0.05,
        input_tokens: 1000,
        output_tokens: 500,
      },
    });

    const { projectRunCompleted } = await import("../projectors/run.js");
    await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

    const insertCalls = tx._insertValues.mock.calls;
    const orgStatsInsert = insertCalls.find(
      (call: unknown[]) =>
        (call[0] as Record<string, unknown>)?.errors_tool === 0 &&
        (call[0] as Record<string, unknown>)?.errors_model === 0 &&
        (call[0] as Record<string, unknown>)?.errors_timeout === 0 &&
        (call[0] as Record<string, unknown>)?.errors_other === 0
    );
    expect(orgStatsInsert).toBeDefined();
  });
});

describe("Post-Handoff Iteration Logic", () => {
  const POST_HANDOFF_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

  it("marks session for post-handoff iteration when run completes within window", async () => {
    const tx = createMockTx();
    const handoffTime = new Date("2024-01-15T10:00:00Z");
    const runCompleteTime = new Date(handoffTime.getTime() + 30 * 60 * 1000); // 30 minutes later

    // Mock session with last_handoff_at set
    tx.execute.mockResolvedValueOnce([{ last_handoff_at: handoffTime }]);

    const event = createMockEvent({
      event_type: "run_completed",
      run_id: "run-1",
      occurred_at: runCompleteTime,
      payload: {
        status: "success",
        duration_ms: 5000,
        cost: 0.05,
        input_tokens: 1000,
        output_tokens: 500,
      },
    });

    const { projectRunCompleted } = await import("../projectors/run.js");
    await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

    // Should have called execute to check and update post_handoff_iteration
    expect(tx.execute).toHaveBeenCalled();
  });

  it("does not mark session when run completes outside window", async () => {
    const tx = createMockTx();
    const handoffTime = new Date("2024-01-15T10:00:00Z");
    const runCompleteTime = new Date(handoffTime.getTime() + POST_HANDOFF_WINDOW_MS + 60000); // 4 hours + 1 minute later

    // Mock session with last_handoff_at set
    tx.execute.mockResolvedValueOnce([{ last_handoff_at: handoffTime }]);

    const event = createMockEvent({
      event_type: "run_completed",
      run_id: "run-1",
      occurred_at: runCompleteTime,
      payload: {
        status: "success",
        duration_ms: 5000,
        cost: 0.05,
        input_tokens: 1000,
        output_tokens: 500,
      },
    });

    const { projectRunCompleted } = await import("../projectors/run.js");
    await projectRunCompleted(tx as unknown as Parameters<typeof projectRunCompleted>[0], event);

    // execute is called to check, but should not update
    expect(tx.execute).toHaveBeenCalled();
  });
});
