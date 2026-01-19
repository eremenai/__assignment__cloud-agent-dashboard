/**
 * Tests for the batch event processor.
 *
 * These tests verify:
 * - Batch claiming with full event data in single query
 * - Event grouping by user_id in memory
 * - Per-user transaction processing with lock acquisition
 * - SAVEPOINT creation and rollback on failure
 * - Queue status updates inside transactions
 * - Remaining events logging after each batch
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
      // Claim returns empty
      mockExecute.mockResolvedValueOnce([]);

      const result = await processor.processNextBatch();

      expect(result).toEqual({ processed: 0, failed: 0 });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("processes events grouped by user in separate transactions", async () => {
      // 1. Claim batch with full event data
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
        createEvent("org-1", "evt-2", "user-1", "run_started", "run-1"),
      ]);

      // 2. Transaction processes events
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTx();
        return fn(mockTx);
      });

      // 3. Log remaining events
      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await processor.processNextBatch();

      // Single user = single transaction
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(result.processed).toBe(2);
    });

    it("creates separate transactions for different users", async () => {
      // Claim batch - two different users
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
        createEvent("org-1", "evt-2", "user-2", "message_created"),
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTx();
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await processor.processNextBatch();

      // Two users = two transactions
      expect(mockTransaction).toHaveBeenCalledTimes(2);
      expect(result.processed).toBe(2);
    });

    it("uses FOR UPDATE SKIP LOCKED for claiming", async () => {
      mockExecute.mockResolvedValueOnce([]);

      await processor.processNextBatch();

      const sqlCall = mockExecute.mock.calls[0][0];
      expect(sqlCall.strings.join("")).toContain("FOR UPDATE SKIP LOCKED");
    });

    it("increments attempts counter when claiming", async () => {
      mockExecute.mockResolvedValueOnce([]);

      await processor.processNextBatch();

      const sqlCall = mockExecute.mock.calls[0][0];
      expect(sqlCall.strings.join("")).toContain("attempts = attempts + 1");
    });

    it("logs remaining events after processing", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTx();
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "42" }]);

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Events remaining in queue: 42"));
    });
  });

  describe("claim batch query", () => {
    it("joins events_queue with events_raw to get full event data", async () => {
      mockExecute.mockResolvedValueOnce([]);

      await processor.processNextBatch();

      const sqlCall = mockExecute.mock.calls[0][0];
      const query = sqlCall.strings.join("");
      expect(query).toContain("events_queue");
      expect(query).toContain("events_raw");
      expect(query).toContain("INNER JOIN");
    });

    it("returns full event data including payload", async () => {
      const eventWithPayload = createEvent("org-1", "evt-1", "user-1", "run_completed", "run-1");
      eventWithPayload.payload = { status: "success", duration_ms: 1000, cost: 0.01, input_tokens: 100, output_tokens: 50 };

      mockExecute.mockResolvedValueOnce([eventWithPayload]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTx();
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      const { projectRunCompleted } = await import("../projectors/run.js");
      const mockProjectRunCompleted = projectRunCompleted as ReturnType<typeof vi.fn>;

      await processor.processNextBatch();

      expect(mockProjectRunCompleted).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ payload: { status: "success", cost: 0.01 } })
      );
    });
  });

  describe("SAVEPOINT handling", () => {
    it("creates SAVEPOINT before processing each event", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
      ]);

      const savepointCalls: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithSavepointTracking(savepointCalls);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      expect(savepointCalls.some((c) => c.includes("SAVEPOINT"))).toBe(true);
    });

    it("releases SAVEPOINT on success", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
      ]);

      const savepointCalls: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithSavepointTracking(savepointCalls);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      expect(savepointCalls.some((c) => c.includes("RELEASE SAVEPOINT"))).toBe(true);
    });

    it("rolls back SAVEPOINT on failure and continues with other events", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
        createEvent("org-1", "evt-2", "user-1", "message_created"),
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
        const mockTx = createMockTxWithSavepointTracking(savepointCalls);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await processor.processNextBatch();

      expect(savepointCalls.some((c) => c.includes("ROLLBACK TO SAVEPOINT"))).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe("lock acquisition", () => {
    it("acquires locks on aggregate tables for user's data", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
      ]);

      const lockQueries: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithLockTracking(lockQueries);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      expect(lockQueries.some((q) => q.includes("org_stats_daily"))).toBe(true);
      expect(lockQueries.some((q) => q.includes("session_stats"))).toBe(true);
      expect(lockQueries.some((q) => q.includes("user_stats_daily"))).toBe(true);
    });

    it("acquires locks on run_facts when events have run_id", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "run_started", "run-1"),
      ]);

      const lockQueries: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithLockTracking(lockQueries);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      expect(lockQueries.some((q) => q.includes("run_facts"))).toBe(true);
    });

    it("acquires locks in consistent order to prevent deadlocks", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "run_completed", "run-1"),
      ]);

      const lockQueries: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithLockTracking(lockQueries);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      // Lock order: org_stats_daily → user_stats_daily → session_stats → run_facts
      const orgIndex = lockQueries.findIndex((q) => q.includes("org_stats_daily"));
      const userIndex = lockQueries.findIndex((q) => q.includes("user_stats_daily"));
      const sessionIndex = lockQueries.findIndex((q) => q.includes("session_stats"));
      const runIndex = lockQueries.findIndex((q) => q.includes("run_facts"));

      expect(orgIndex).toBeLessThan(userIndex);
      expect(userIndex).toBeLessThan(sessionIndex);
      expect(sessionIndex).toBeLessThan(runIndex);
    });
  });

  describe("queue status updates", () => {
    it("marks processed events inside transaction", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
      ]);

      const txQueries: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithQueryTracking(txQueries);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      expect(txQueries.some((q) => q.includes("UPDATE events_queue") && q.includes("processed_at"))).toBe(true);
    });

    it("records errors for failed events inside transaction", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
      ]);

      const { projectMessageCreated } = await import("../projectors/message.js");
      (projectMessageCreated as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Test error"));

      const txQueries: string[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTxWithQueryTracking(txQueries);
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      expect(txQueries.some((q) => q.includes("last_error"))).toBe(true);
    });
  });

  describe("event routing", () => {
    it("routes message_created to message projector", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTx();
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      const { projectMessageCreated } = await import("../projectors/message.js");
      expect(projectMessageCreated).toHaveBeenCalled();
    });

    it("routes run_started to run projector", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "run_started", "run-1"),
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTx();
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      const { projectRunStarted } = await import("../projectors/run.js");
      expect(projectRunStarted).toHaveBeenCalled();
    });

    it("routes run_completed to run projector", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "run_completed", "run-1"),
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTx();
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      const { projectRunCompleted } = await import("../projectors/run.js");
      expect(projectRunCompleted).toHaveBeenCalled();
    });

    it("routes local_handoff to handoff projector", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "local_handoff"),
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTx();
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      const { projectLocalHandoff } = await import("../projectors/handoff.js");
      expect(projectLocalHandoff).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("recovers from complete transaction failure", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
      ]);

      mockTransaction.mockRejectedValueOnce(new Error("Connection lost"));

      // Error recording outside tx + remaining events log
      mockExecute.mockResolvedValue([{ remaining: "0" }]);

      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await processor.processNextBatch();

      expect(result).toEqual({ processed: 0, failed: 1 });
    });

    it("records transaction failures outside transaction", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
      ]);

      mockTransaction.mockRejectedValueOnce(new Error("Connection lost"));

      mockExecute.mockResolvedValue([{ remaining: "0" }]);

      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      // Should have error recording call outside transaction
      const errorUpdateCalls = mockExecute.mock.calls.filter((call) =>
        call[0]?.strings?.join("").includes("last_error")
      );
      expect(errorUpdateCalls.length).toBeGreaterThan(0);
    });
  });

  describe("multi-org handling", () => {
    it("processes events from multiple orgs in same batch", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-1", "message_created"),
        createEvent("org-2", "evt-2", "user-2", "run_started", "run-1"),
        createEvent("org-1", "evt-3", "user-1", "message_created"),
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTx();
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await processor.processNextBatch();

      // Two users (user-1 and user-2) = two transactions
      expect(mockTransaction).toHaveBeenCalledTimes(2);
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
    });
  });

  describe("user grouping", () => {
    it("groups events by user_id for separate transactions", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-a", "message_created"),
        createEvent("org-1", "evt-2", "user-b", "message_created"),
        createEvent("org-1", "evt-3", "user-a", "message_created"),
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTx();
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      // Two users = two transactions
      expect(mockTransaction).toHaveBeenCalledTimes(2);
    });

    it("handles events with null user_id in separate group", async () => {
      mockExecute.mockResolvedValueOnce([
        createEvent("org-1", "evt-1", "user-a", "message_created"),
        createEvent("org-1", "evt-2", null, "message_created"),
      ]);

      mockTransaction.mockImplementation(async (fn) => {
        const mockTx = createMockTx();
        return fn(mockTx);
      });

      mockExecute.mockResolvedValueOnce([{ remaining: "0" }]);

      vi.spyOn(console, "log").mockImplementation(() => {});

      await processor.processNextBatch();

      // Two groups: user-a and null
      expect(mockTransaction).toHaveBeenCalledTimes(2);
    });
  });
});

// Helper functions to create mock data

function createEvent(
  orgId: string,
  eventId: string,
  userId: string | null,
  eventType: string,
  runId?: string
) {
  return {
    org_id: orgId,
    event_id: eventId,
    event_type: eventType,
    session_id: `sess-${userId ?? "anon"}`,
    user_id: userId,
    run_id: runId ?? null,
    occurred_at: new Date(),
    payload: eventType === "run_completed"
      ? { status: "success", duration_ms: 1000, cost: 0.01, input_tokens: 100, output_tokens: 50 }
      : {},
  };
}

function createMockTx() {
  return {
    execute: vi.fn().mockResolvedValue([]),
  };
}

function createMockTxWithSavepointTracking(savepointCalls: string[]) {
  return {
    execute: vi.fn().mockImplementation((sql) => {
      const sqlStr = sql?.raw ?? sql?.strings?.join("") ?? "";
      if (sqlStr.includes("SAVEPOINT") || sqlStr.includes("RELEASE") || sqlStr.includes("ROLLBACK")) {
        savepointCalls.push(sqlStr);
      }
      return Promise.resolve([]);
    }),
  };
}

function createMockTxWithLockTracking(lockQueries: string[]) {
  return {
    execute: vi.fn().mockImplementation((sql) => {
      const sqlStr = sql?.strings?.join("") ?? sql?.raw ?? "";
      if (sqlStr.includes("FOR UPDATE") && !sqlStr.includes("SKIP LOCKED")) {
        lockQueries.push(sqlStr);
      }
      return Promise.resolve([]);
    }),
  };
}

function createMockTxWithQueryTracking(queries: string[]) {
  return {
    execute: vi.fn().mockImplementation((sql) => {
      const sqlStr = sql?.strings?.join("") ?? sql?.raw ?? "";
      queries.push(sqlStr);
      return Promise.resolve([]);
    }),
  };
}
