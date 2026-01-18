/**
 * Tests for the event processor.
 *
 * These tests verify:
 * - Batch claiming with FOR UPDATE SKIP LOCKED
 * - Per-event SELECT FOR UPDATE SKIP LOCKED during processing
 * - Event processing pipeline
 * - Error handling and recording (missing events not marked as processed)
 * - Transaction boundaries
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Processor } from "../processor.js";

// Note: Processor now receives db as constructor parameter, not via getDb()

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

// Mock SQL
vi.mock("drizzle-orm", () => ({
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
  and: vi.fn((...args) => ({ type: "and", args })),
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
}));

// Create mock database
const mockExecute = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();

const mockDb = {
  execute: mockExecute,
  select: mockSelect,
  transaction: mockTransaction,
  update: mockUpdate,
};

describe("Processor", () => {
  let processor: Processor;

  beforeEach(() => {
    vi.clearAllMocks();
    // Processor now receives db as constructor parameter
    processor = new Processor(mockDb as unknown as ConstructorParameters<typeof Processor>[0], 10);

    // Default mock implementations
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  describe("processNextBatch", () => {
    it("returns 0 when queue is empty", async () => {
      // No events in queue
      mockExecute.mockResolvedValueOnce([]);

      const processed = await processor.processNextBatch();

      expect(processed).toBe(0);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it("claims and processes events from queue", async () => {
      // Mock claimed events
      mockExecute.mockResolvedValueOnce([
        { org_id: "org-1", event_id: "evt-1" },
        { org_id: "org-1", event_id: "evt-2" },
      ]);

      // Mock transaction for processing - now includes SELECT FOR UPDATE inside
      let txExecuteCallCount = 0;
      mockTransaction.mockImplementation(async (fn) => {
        const txExecute = vi.fn().mockImplementation(() => {
          txExecuteCallCount++;
          // First call: SELECT FOR UPDATE returns the event
          // This simulates finding the event with FOR UPDATE SKIP LOCKED
          if (txExecuteCallCount === 1) {
            return Promise.resolve([
              {
                org_id: "org-1",
                event_id: "evt-1",
                event_type: "message_created",
                occurred_at: new Date(),
                session_id: "sess-1",
                user_id: "user-1",
                run_id: null,
                payload: {},
              },
            ]);
          } else if (txExecuteCallCount === 2) {
            return Promise.resolve([
              {
                org_id: "org-1",
                event_id: "evt-2",
                event_type: "run_started",
                occurred_at: new Date(),
                session_id: "sess-1",
                user_id: "user-1",
                run_id: "run-1",
                payload: {},
              },
            ]);
          }
          return Promise.resolve([]);
        });

        return fn({
          execute: txExecute,
          update: mockUpdate,
        });
      });

      const processed = await processor.processNextBatch();

      expect(processed).toBe(2);
    });

    it("uses FOR UPDATE SKIP LOCKED for claiming", async () => {
      mockExecute.mockResolvedValueOnce([]);

      await processor.processNextBatch();

      // Check that execute was called with SQL containing FOR UPDATE SKIP LOCKED
      expect(mockExecute).toHaveBeenCalled();
      const sqlCall = mockExecute.mock.calls[0][0];
      expect(sqlCall.strings.join("")).toContain("FOR UPDATE SKIP LOCKED");
    });

    it("increments attempts counter when claiming", async () => {
      mockExecute.mockResolvedValueOnce([]);

      await processor.processNextBatch();

      // Check that execute was called with SQL containing attempts increment
      expect(mockExecute).toHaveBeenCalled();
      const sqlCall = mockExecute.mock.calls[0][0];
      expect(sqlCall.strings.join("")).toContain("attempts = attempts + 1");
    });

    it("respects batch size limit", async () => {
      const smallProcessor = new Processor(mockDb as unknown as ConstructorParameters<typeof Processor>[0], 5);
      mockExecute.mockResolvedValueOnce([]);

      await smallProcessor.processNextBatch();

      // Check that LIMIT is set to batch size
      expect(mockExecute).toHaveBeenCalled();
      const sqlCall = mockExecute.mock.calls[0][0];
      expect(sqlCall.values).toContain(5);
    });
  });

  describe("event routing", () => {
    // Helper to create mock transaction that returns event via execute
    const createMockTxWithEvent = (event: Record<string, unknown>) => {
      return async (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const txExecute = vi.fn().mockResolvedValueOnce([event]);
        return fn({
          execute: txExecute,
          update: mockUpdate,
        });
      };
    };

    it("routes message_created to message projector", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);

      mockTransaction.mockImplementation(
        createMockTxWithEvent({
          org_id: "org-1",
          event_id: "evt-1",
          event_type: "message_created",
          occurred_at: new Date(),
          session_id: "sess-1",
          user_id: "user-1",
          run_id: null,
          payload: {},
        })
      );

      await processor.processNextBatch();

      const { projectMessageCreated } = await import("../projectors/message.js");
      expect(projectMessageCreated).toHaveBeenCalled();
    });

    it("routes run_started to run projector", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);

      mockTransaction.mockImplementation(
        createMockTxWithEvent({
          org_id: "org-1",
          event_id: "evt-1",
          event_type: "run_started",
          occurred_at: new Date(),
          session_id: "sess-1",
          user_id: "user-1",
          run_id: "run-1",
          payload: {},
        })
      );

      await processor.processNextBatch();

      const { projectRunStarted } = await import("../projectors/run.js");
      expect(projectRunStarted).toHaveBeenCalled();
    });

    it("routes run_completed to run projector", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);

      mockTransaction.mockImplementation(
        createMockTxWithEvent({
          org_id: "org-1",
          event_id: "evt-1",
          event_type: "run_completed",
          occurred_at: new Date(),
          session_id: "sess-1",
          user_id: "user-1",
          run_id: "run-1",
          payload: {
            status: "success",
            duration_ms: 1000,
            cost: 0.01,
            input_tokens: 100,
            output_tokens: 50,
          },
        })
      );

      await processor.processNextBatch();

      const { projectRunCompleted } = await import("../projectors/run.js");
      expect(projectRunCompleted).toHaveBeenCalled();
    });

    it("routes local_handoff to handoff projector", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);

      mockTransaction.mockImplementation(
        createMockTxWithEvent({
          org_id: "org-1",
          event_id: "evt-1",
          event_type: "local_handoff",
          occurred_at: new Date(),
          session_id: "sess-1",
          user_id: "user-1",
          run_id: null,
          payload: { method: "teleport" },
        })
      );

      await processor.processNextBatch();

      const { projectLocalHandoff } = await import("../projectors/handoff.js");
      expect(projectLocalHandoff).toHaveBeenCalled();
    });

    it("logs warning for unknown event types", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);

      mockTransaction.mockImplementation(
        createMockTxWithEvent({
          org_id: "org-1",
          event_id: "evt-1",
          event_type: "unknown_type",
          occurred_at: new Date(),
          session_id: "sess-1",
          user_id: "user-1",
          run_id: null,
          payload: {},
        })
      );

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await processor.processNextBatch();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Unknown event type"));
      warnSpy.mockRestore();
    });
  });

  describe("error handling", () => {
    it("records error when projection fails", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);

      // Make transaction throw
      mockTransaction.mockRejectedValueOnce(new Error("Projection failed"));

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const processed = await processor.processNextBatch();

      expect(processed).toBe(0);
      expect(errorSpy).toHaveBeenCalled();

      // Should record error via update
      expect(mockUpdate).toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it("does NOT mark event as processed when event not found in events_raw", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);

      // Mock transaction where event is not found
      mockTransaction.mockImplementation(async (fn) => {
        const txExecute = vi.fn()
          // First call: SELECT FOR UPDATE returns empty (event not found or locked)
          .mockResolvedValueOnce([])
          // Second call: existence check also returns empty (event genuinely doesn't exist)
          .mockResolvedValueOnce([]);

        return fn({
          execute: txExecute,
          update: mockUpdate,
        });
      });

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const processed = await processor.processNextBatch();

      // Does NOT count as processed - this is an error condition
      expect(processed).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("Event not found in events_raw"));

      // Should record error via update
      expect(mockUpdate).toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it("skips event if already locked by another worker", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);

      // Mock transaction where event is locked by another worker
      mockTransaction.mockImplementation(async (fn) => {
        const txExecute = vi.fn()
          // First call: SELECT FOR UPDATE returns empty (locked by another worker)
          .mockResolvedValueOnce([])
          // Second call: existence check returns row (event exists but is locked)
          .mockResolvedValueOnce([{ "1": 1 }]);

        return fn({
          execute: txExecute,
          update: mockUpdate,
        });
      });

      const processed = await processor.processNextBatch();

      // Does NOT count as processed - but also not an error (just skipped)
      expect(processed).toBe(0);

      // Should NOT record error for skipped events
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("continues processing remaining events after one fails", async () => {
      mockExecute.mockResolvedValueOnce([
        { org_id: "org-1", event_id: "evt-1" },
        { org_id: "org-1", event_id: "evt-2" },
      ]);

      let txCallCount = 0;
      // First event fails (transaction throws), second succeeds
      mockTransaction.mockImplementation(async (fn) => {
        txCallCount++;
        if (txCallCount === 1) {
          throw new Error("First event failed");
        }
        // Second event succeeds
        const txExecute = vi.fn().mockResolvedValueOnce([
          {
            org_id: "org-1",
            event_id: "evt-2",
            event_type: "message_created",
            occurred_at: new Date(),
            session_id: "sess-1",
            user_id: "user-1",
            run_id: null,
            payload: {},
          },
        ]);
        return fn({
          execute: txExecute,
          update: mockUpdate,
        });
      });

      vi.spyOn(console, "error").mockImplementation(() => {});

      const processed = await processor.processNextBatch();

      // Only the second event should be counted as processed
      expect(processed).toBe(1);
    });
  });

  describe("transaction boundaries", () => {
    it("uses separate transactions for claim vs process", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);

      mockTransaction.mockImplementation(async (fn) => {
        const txExecute = vi.fn().mockResolvedValueOnce([
          {
            org_id: "org-1",
            event_id: "evt-1",
            event_type: "message_created",
            occurred_at: new Date(),
            session_id: "sess-1",
            user_id: "user-1",
            run_id: null,
            payload: {},
          },
        ]);
        return fn({
          execute: txExecute,
          update: mockUpdate,
        });
      });

      await processor.processNextBatch();

      // execute for claim, transaction for process
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it("marks event as processed within transaction", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);

      let txUpdate: ReturnType<typeof vi.fn> | null = null;
      mockTransaction.mockImplementation(async (fn) => {
        const txExecute = vi.fn().mockResolvedValueOnce([
          {
            org_id: "org-1",
            event_id: "evt-1",
            event_type: "message_created",
            occurred_at: new Date(),
            session_id: "sess-1",
            user_id: "user-1",
            run_id: null,
            payload: {},
          },
        ]);
        const txMockUpdate = vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        });
        txUpdate = txMockUpdate;
        return fn({
          execute: txExecute,
          update: txMockUpdate,
        });
      });

      await processor.processNextBatch();

      // Update should be called within transaction
      expect(txUpdate).toHaveBeenCalled();
    });

    it("uses SELECT FOR UPDATE SKIP LOCKED inside per-event transaction", async () => {
      mockExecute.mockResolvedValueOnce([{ org_id: "org-1", event_id: "evt-1" }]);

      const txExecuteCalls: unknown[] = [];
      mockTransaction.mockImplementation(async (fn) => {
        const txExecute = vi.fn().mockImplementation((sqlArg) => {
          txExecuteCalls.push(sqlArg);
          return Promise.resolve([
            {
              org_id: "org-1",
              event_id: "evt-1",
              event_type: "message_created",
              occurred_at: new Date(),
              session_id: "sess-1",
              user_id: "user-1",
              run_id: null,
              payload: {},
            },
          ]);
        });
        return fn({
          execute: txExecute,
          update: mockUpdate,
        });
      });

      await processor.processNextBatch();

      // Verify that execute was called with SQL containing FOR UPDATE SKIP LOCKED
      expect(txExecuteCalls.length).toBeGreaterThan(0);
      const firstCall = txExecuteCalls[0] as { strings: string[] };
      expect(firstCall.strings.join("")).toContain("FOR UPDATE SKIP LOCKED");
    });
  });
});
