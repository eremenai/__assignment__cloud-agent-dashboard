/**
 * Tests for the batch event processor.
 *
 * These tests verify:
 * - Batch processing with per-user transactions
 * - Event grouping by user_id
 * - Fetch and lock events INSIDE transaction
 * - SAVEPOINT creation and rollback on failure
 * - Lock acquisition per user group
 * - Batch status updates outside transactions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { BatchProcessor } from "../batch-processor.js";

// Mock projectors
vi.mock("../projectors/message.js", () => ({
  projectMessageCreated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../projectors/run.js", () => ({
  projectRunStarted: vi.fn().mockResolvedValue(undefined),
  projectRunCompleted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../projectors/handoff.js", () => ({
  projectLocalHandoff: vi.fn().mockResolvedValue(undefined),
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
      getSQL: () => ({ strings, values }),
    })),
    {
      raw: vi.fn((str: string) => ({ raw: str, strings: [str], values: [] })),
      join: vi.fn((items: unknown[], separator: unknown) => ({ items, separator })),
    }
  ),
}));

// Create mock database
const mockExecute = vi.fn();
const mockTransaction = vi.fn();

const mockDb = {
  execute: mockExecute,
  transaction: mockTransaction,
};

describe("BatchProcessor", () => {
  let processor: BatchProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new BatchProcessor(mockDb as unknown as ConstructorParameters<typeof BatchProcessor>[0], 10);
  });

  describe("processNextBatch", () => {
    it("returns zeros when queue is empty", async () => {
      mockExecute.mockResolvedValueOnce([]);

      const result = await processor.processNextBatch();

      expect(result).toEqual({ processed: 0, failed: 0 });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("processes events grouped by user in separate transactions", async () => {
      // 1. Claim events
      mockExecute.mockResolvedValueOnce([
        { org_id: "org-1", event_id: "evt-1" },
        { org_id: "org-1", event_id: "evt-2" },
      ]);

      // 2. Fetch user_ids for grouping
      mockExecute.mockResolvedValueOnce([
        { event_id: "evt-1", org_id: "org-1", user_id: "user-1" },
        { event_id: "evt-2", org_id: "org-1", user_id: "user-1" },
      ]);

      // 3. Transaction fetches and processes
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithEvents([
          createEvent("evt-1", "message_created"),
          createEvent("evt-2", "run_started", "run-1"),
        ]);
        return fn(mockTx);
      });

      // 4. Status update
      mockExecute.mockResolvedValueOnce([]);

      const result = await processor.processNextBatch();

      // Single user = single transaction
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(result.processed).toBe(2);
    });

    it("creates separate transactions for different users", async () => {
      // 1. Claim events
      mockExecute.mockResolvedValueOnce([
        { org_id: "org-1", event_id: "evt-1" },
        { org_id: "org-1", event_id: "evt-2" },
      ]);

      // 2. Fetch user_ids - two different users
      mockExecute.mockResolvedValueOnce([
        { event_id: "evt-1", org_id: "org-1", user_id: "user-1" },
        { event_id: "evt-2", org_id: "org-1", user_id: "user-2" },
      ]);

      // 3. Transactions for each user
      let txCallCount = 0;
      mockTransaction.mockImplementation(async (fn) => {
        txCallCount++;
        const event = txCallCount === 1
          ? createEventWithUser("org-1", "evt-1", "user-1", "message_created")
          : createEventWithUser("org-1", "evt-2", "user-2", "message_created");
        const mockTx = createMockTxWithEvents([event]);
        return fn(mockTx);
      });

      // 4. Status update
      mockExecute.mockResolvedValue([]);

      const result = await processor.processNextBatch();

      // Two users = two transactions
      expect(mockTransaction).toHaveBeenCalledTimes(2);
      expect(result.processed).toBe(2);
    });

    it("uses FOR UPDATE SKIP LOCKED for claiming", async () => {
      mockExecute.mockResolvedValueOnce([]);

      await processor.processNextBatch();

      expect(mockExecute).toHaveBeenCalled();
      const sqlCall = mockExecute.mock.calls[0][0];
      expect(sqlCall.strings.join("")).toContain("FOR UPDATE SKIP LOCKED");
    });

    it("increments attempts counter when claiming", async () => {
      mockExecute.mockResolvedValueOnce([]);

      await processor.processNextBatch();

      const sqlCall = mockExecute.mock.calls[0][0];
      expect(sqlCall.strings.join("")).toContain("attempts = attempts + 1");
    });
  });

  describe("fetch inside transaction", () => {
    it("fetches and locks events inside transaction with FOR UPDATE SKIP LOCKED", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      mockExecute.mockResolvedValueOnce([{ event_id: "evt-1", org_id: "org-1", user_id: "user-1" }]);

      const txExecuteCalls: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          execute: vi.fn().mockImplementation((sql) => {
            const sqlStr = sql?.strings?.join("") ?? sql?.raw ?? "";
            txExecuteCalls.push(sqlStr);
            // First call in tx is fetch events
            if (sqlStr.includes("SELECT *") && sqlStr.includes("event_id IN")) {
              return Promise.resolve([createEvent("evt-1", "message_created")]);
            }
            return Promise.resolve([]);
          }),
        };
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      await processor.processNextBatch();

      // Transaction should have fetch with FOR UPDATE SKIP LOCKED
      expect(txExecuteCalls.some((q) => q.includes("FOR UPDATE SKIP LOCKED"))).toBe(true);
    });

    it("skips processing when all events are locked by another worker", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      mockExecute.mockResolvedValueOnce([{ event_id: "evt-1", org_id: "org-1", user_id: "user-1" }]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          execute: vi.fn().mockResolvedValue([]), // No events - all locked
        };
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      const result = await processor.processNextBatch();

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe("SAVEPOINT handling", () => {
    it("creates SAVEPOINT before processing each event", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      mockExecute.mockResolvedValueOnce([{ event_id: "evt-1", org_id: "org-1", user_id: "user-1" }]);

      const savepointCalls: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithSavepointTracking([createEvent("evt-1", "message_created")], savepointCalls);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      await processor.processNextBatch();

      expect(savepointCalls.some((c) => c.includes("SAVEPOINT"))).toBe(true);
    });

    it("releases SAVEPOINT on success", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      mockExecute.mockResolvedValueOnce([{ event_id: "evt-1", org_id: "org-1", user_id: "user-1" }]);

      const savepointCalls: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithSavepointTracking([createEvent("evt-1", "message_created")], savepointCalls);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      await processor.processNextBatch();

      expect(savepointCalls.some((c) => c.includes("RELEASE SAVEPOINT"))).toBe(true);
    });

    it("rolls back SAVEPOINT on failure and continues with other events", async () => {
      mockExecute.mockResolvedValueOnce([
        { org_id: "org-1", event_id: "evt-1" },
        { org_id: "org-1", event_id: "evt-2" },
      ]);
      mockExecute.mockResolvedValueOnce([
        { event_id: "evt-1", org_id: "org-1", user_id: "user-1" },
        { event_id: "evt-2", org_id: "org-1", user_id: "user-1" },
      ]);

      const { projectMessageCreated } = await import("../projectors/message.js");
      const mockProjectMessage = projectMessageCreated as ReturnType<typeof vi.fn>;

      // First event fails, second succeeds
      let callCount = 0;
      mockProjectMessage.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Projection failed");
        }
      });

      const savepointCalls: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithSavepointTracking(
          [createEvent("evt-1", "message_created"), createEvent("evt-2", "message_created")],
          savepointCalls
        );
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await processor.processNextBatch();

      expect(savepointCalls.some((c) => c.includes("ROLLBACK TO SAVEPOINT"))).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe("lock acquisition per user group", () => {
    it("acquires locks on aggregate tables for user's data", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      mockExecute.mockResolvedValueOnce([{ event_id: "evt-1", org_id: "org-1", user_id: "user-1" }]);

      const lockQueries: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          execute: vi.fn().mockImplementation((sql) => {
            const sqlStr = sql?.strings?.join("") ?? sql?.raw ?? "";
            // First call is fetch events
            if (sqlStr.includes("SELECT *") && sqlStr.includes("event_id IN")) {
              return Promise.resolve([createEvent("evt-1", "message_created")]);
            }
            // Track lock queries
            if (sqlStr.includes("FOR UPDATE") && !sqlStr.includes("SKIP LOCKED")) {
              lockQueries.push(sqlStr);
            }
            return Promise.resolve([]);
          }),
        };
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      await processor.processNextBatch();

      expect(lockQueries.some((q) => q.includes("org_stats_daily"))).toBe(true);
      expect(lockQueries.some((q) => q.includes("session_stats"))).toBe(true);
      expect(lockQueries.some((q) => q.includes("user_stats_daily"))).toBe(true);
    });

    it("acquires locks on run_facts when events have run_id", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      mockExecute.mockResolvedValueOnce([{ event_id: "evt-1", org_id: "org-1", user_id: "user-1" }]);

      const lockQueries: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = {
          execute: vi.fn().mockImplementation((sql) => {
            const sqlStr = sql?.strings?.join("") ?? sql?.raw ?? "";
            if (sqlStr.includes("SELECT *") && sqlStr.includes("event_id IN")) {
              return Promise.resolve([createEvent("evt-1", "run_started", "run-1")]);
            }
            if (sqlStr.includes("FOR UPDATE") && !sqlStr.includes("SKIP LOCKED")) {
              lockQueries.push(sqlStr);
            }
            return Promise.resolve([]);
          }),
        };
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      await processor.processNextBatch();

      expect(lockQueries.some((q) => q.includes("run_facts"))).toBe(true);
    });
  });

  describe("batch status updates", () => {
    it("marks processed events in batch outside transaction", async () => {
      mockExecute.mockResolvedValueOnce([
        { org_id: "org-1", event_id: "evt-1" },
        { org_id: "org-1", event_id: "evt-2" },
      ]);
      mockExecute.mockResolvedValueOnce([
        { event_id: "evt-1", org_id: "org-1", user_id: "user-1" },
        { event_id: "evt-2", org_id: "org-1", user_id: "user-1" },
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithEvents([
          createEvent("evt-1", "message_created"),
          createEvent("evt-2", "message_created"),
        ]);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      await processor.processNextBatch();

      // Third execute call should be the status update
      expect(mockExecute).toHaveBeenCalledTimes(3);
      const updateCall = mockExecute.mock.calls[2][0];
      expect(updateCall.strings.join("")).toContain("UPDATE events_queue");
      expect(updateCall.strings.join("")).toContain("processed_at");
    });

    it("records errors for failed events", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      mockExecute.mockResolvedValueOnce([{ event_id: "evt-1", org_id: "org-1", user_id: "user-1" }]);

      const { projectMessageCreated } = await import("../projectors/message.js");
      (projectMessageCreated as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Test error"));

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithEvents([createEvent("evt-1", "message_created")]);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      vi.spyOn(console, "error").mockImplementation(() => {});

      await processor.processNextBatch();

      // Should have an update call with last_error
      const updateCalls = mockExecute.mock.calls.filter((call) =>
        call[0]?.strings?.join("").includes("last_error")
      );
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });

  describe("event routing", () => {
    it("routes message_created to message projector", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      mockExecute.mockResolvedValueOnce([{ event_id: "evt-1", org_id: "org-1", user_id: "user-1" }]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithEvents([createEvent("evt-1", "message_created")]);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      await processor.processNextBatch();

      const { projectMessageCreated } = await import("../projectors/message.js");
      expect(projectMessageCreated).toHaveBeenCalled();
    });

    it("routes run_completed to run projector", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      mockExecute.mockResolvedValueOnce([{ event_id: "evt-1", org_id: "org-1", user_id: "user-1" }]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithEvents([createEvent("evt-1", "run_completed", "run-1")]);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      await processor.processNextBatch();

      const { projectRunCompleted } = await import("../projectors/run.js");
      expect(projectRunCompleted).toHaveBeenCalled();
    });

    it("routes local_handoff to handoff projector", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      mockExecute.mockResolvedValueOnce([{ event_id: "evt-1", org_id: "org-1", user_id: "user-1" }]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithEvents([createEvent("evt-1", "local_handoff")]);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      await processor.processNextBatch();

      const { projectLocalHandoff } = await import("../projectors/handoff.js");
      expect(projectLocalHandoff).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("recovers from complete transaction failure", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      mockExecute.mockResolvedValueOnce([{ event_id: "evt-1", org_id: "org-1", user_id: "user-1" }]);

      mockTransaction.mockRejectedValueOnce(new Error("Connection lost"));

      mockExecute.mockResolvedValue([]);

      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await processor.processNextBatch();

      expect(result).toEqual({ processed: 0, failed: 1 });
    });

    it("handles events not found in events_raw", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);
      // No events returned from user_id fetch
      mockExecute.mockResolvedValueOnce([]);

      const result = await processor.processNextBatch();

      // No user groups = nothing to process
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  describe("multi-org handling", () => {
    it("processes events from multiple orgs in same batch", async () => {
      mockExecute.mockResolvedValueOnce([
        { org_id: "org-1", event_id: "evt-1" },
        { org_id: "org-2", event_id: "evt-2" },
        { org_id: "org-1", event_id: "evt-3" },
      ]);
      mockExecute.mockResolvedValueOnce([
        { event_id: "evt-1", org_id: "org-1", user_id: "user-1" },
        { event_id: "evt-2", org_id: "org-2", user_id: "user-2" },
        { event_id: "evt-3", org_id: "org-1", user_id: "user-1" },
      ]);

      let txCallCount = 0;
      mockTransaction.mockImplementation(async (fn) => {
        txCallCount++;
        const events = txCallCount === 1
          ? [createEventWithOrg("org-1", "evt-1", "message_created"), createEventWithOrg("org-1", "evt-3", "message_created")]
          : [createEventWithOrg("org-2", "evt-2", "run_started", "run-1")];
        const mockTx = createMockTxWithEvents(events);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      const result = await processor.processNextBatch();

      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
    });
  });

  describe("user grouping", () => {
    it("groups events by user_id for separate transactions", async () => {
      mockExecute.mockResolvedValueOnce([
        { org_id: "org-1", event_id: "evt-1" },
        { org_id: "org-1", event_id: "evt-2" },
        { org_id: "org-1", event_id: "evt-3" },
      ]);
      mockExecute.mockResolvedValueOnce([
        { event_id: "evt-1", org_id: "org-1", user_id: "user-a" },
        { event_id: "evt-2", org_id: "org-1", user_id: "user-b" },
        { event_id: "evt-3", org_id: "org-1", user_id: "user-a" },
      ]);

      let txCallCount = 0;
      mockTransaction.mockImplementation(async (fn) => {
        txCallCount++;
        const events = txCallCount === 1
          ? [createEventWithUser("org-1", "evt-1", "user-a", "message_created"), createEventWithUser("org-1", "evt-3", "user-a", "message_created")]
          : [createEventWithUser("org-1", "evt-2", "user-b", "message_created")];
        const mockTx = createMockTxWithEvents(events);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      await processor.processNextBatch();

      // Two users = two transactions
      expect(mockTransaction).toHaveBeenCalledTimes(2);
    });

    it("handles events with null user_id in separate group", async () => {
      mockExecute.mockResolvedValueOnce([
        { org_id: "org-1", event_id: "evt-1" },
        { org_id: "org-1", event_id: "evt-2" },
      ]);
      mockExecute.mockResolvedValueOnce([
        { event_id: "evt-1", org_id: "org-1", user_id: "user-a" },
        { event_id: "evt-2", org_id: "org-1", user_id: null },
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithEvents([createEvent("evt-1", "message_created")]);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValue([]);

      await processor.processNextBatch();

      // Two groups: user-a and null
      expect(mockTransaction).toHaveBeenCalledTimes(2);
    });
  });
});

// Helper functions to create mock data

function createEvent(eventId: string, eventType: string, runId?: string) {
  return createEventWithOrg("org-1", eventId, eventType, runId);
}

function createEventWithOrg(orgId: string, eventId: string, eventType: string, runId?: string) {
  return {
    org_id: orgId,
    event_id: eventId,
    event_type: eventType,
    session_id: `sess-${orgId}`,
    user_id: `user-${orgId}`,
    run_id: runId ?? null,
    occurred_at: new Date(),
    payload: eventType === "run_completed" ? { status: "success", duration_ms: 1000, cost: 0.01, input_tokens: 100, output_tokens: 50 } : {},
  };
}

function createEventWithUser(orgId: string, eventId: string, userId: string, eventType: string, runId?: string) {
  return {
    org_id: orgId,
    event_id: eventId,
    event_type: eventType,
    session_id: `sess-${userId}`,
    user_id: userId,
    run_id: runId ?? null,
    occurred_at: new Date(),
    payload: eventType === "run_completed" ? { status: "success", duration_ms: 1000, cost: 0.01, input_tokens: 100, output_tokens: 50 } : {},
  };
}

function createMockTxWithEvents(events: ReturnType<typeof createEvent>[]) {
  let fetchCalled = false;
  return {
    execute: vi.fn().mockImplementation((sql) => {
      const sqlStr = sql?.strings?.join("") ?? sql?.raw ?? "";
      // First call with SELECT * is fetch events
      if (!fetchCalled && sqlStr.includes("SELECT *") && sqlStr.includes("event_id IN")) {
        fetchCalled = true;
        return Promise.resolve(events);
      }
      return Promise.resolve([]);
    }),
  };
}

function createMockTxWithSavepointTracking(events: ReturnType<typeof createEvent>[], savepointCalls: string[]) {
  let fetchCalled = false;
  return {
    execute: vi.fn().mockImplementation((sql) => {
      const sqlStr = sql?.raw ?? sql?.strings?.join("") ?? "";
      if (sqlStr.includes("SAVEPOINT") || sqlStr.includes("RELEASE") || sqlStr.includes("ROLLBACK")) {
        savepointCalls.push(sqlStr);
      }
      // First call with SELECT * is fetch events
      if (!fetchCalled && sqlStr.includes("SELECT *") && sqlStr.includes("event_id IN")) {
        fetchCalled = true;
        return Promise.resolve(events);
      }
      return Promise.resolve([]);
    }),
  };
}
