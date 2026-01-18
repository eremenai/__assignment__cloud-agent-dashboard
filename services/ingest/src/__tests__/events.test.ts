/**
 * Tests for the ingest events endpoint.
 *
 * These tests verify:
 * - Valid event ingestion
 * - Request validation
 * - Batch size enforcement
 * - Error responses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import { eventsRoute } from "../routes/events.js";
import type { IngestResponse } from "@repo/shared/schemas";

// Mock database instance
const mockInsert = vi.fn();
const mockTransaction = vi.fn();

const mockDb = {
  insert: mockInsert,
  transaction: mockTransaction,
};

describe("POST /events", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mock implementations
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    });

    mockTransaction.mockImplementation(async (fn) => {
      await fn({
        insert: mockInsert,
      });
    });

    app = Fastify({ logger: false });
    // Decorate fastify with mock db (as done in server.ts)
    app.decorate("db", mockDb);
    await app.register(eventsRoute);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ============================================================================
  // Valid Events
  // ============================================================================

  describe("valid events", () => {
    it("accepts a single message_created event", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-1",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "message_created",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: null,
              payload: { content: "Hello" },
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.accepted).toBe(1);
      expect(body.event_ids).toEqual(["evt-1"]);
      expect(body.errors).toBeUndefined();
    });

    it("accepts a run_started event with required run_id", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-2",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "run_started",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: "run-1",
              payload: {},
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.accepted).toBe(1);
    });

    it("accepts a run_completed event with full payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-3",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "run_completed",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: "run-1",
              payload: {
                status: "success",
                duration_ms: 5000,
                cost: 0.05,
                input_tokens: 1000,
                output_tokens: 500,
              },
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.accepted).toBe(1);
    });

    it("accepts a local_handoff event", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-4",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "local_handoff",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: null,
              payload: { method: "teleport" },
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.accepted).toBe(1);
    });

    it("accepts multiple events in a batch", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-1",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "message_created",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: null,
              payload: {},
            },
            {
              event_id: "evt-2",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:01:00Z",
              event_type: "run_started",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: "run-1",
              payload: {},
            },
            {
              event_id: "evt-3",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:02:00Z",
              event_type: "run_completed",
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
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.accepted).toBe(3);
      expect(body.event_ids).toEqual(["evt-1", "evt-2", "evt-3"]);
    });
  });

  // ============================================================================
  // Validation Errors
  // ============================================================================

  describe("validation errors", () => {
    it("rejects empty events array", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: { events: [] },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(400);
      expect(body.accepted).toBe(0);
      expect(body.errors).toBeDefined();
    });

    it("rejects missing required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-1",
              // missing org_id
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "message_created",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: null,
              payload: {},
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(400);
      expect(body.accepted).toBe(0);
    });

    it("rejects invalid event_type", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-1",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "invalid_type",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: null,
              payload: {},
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(400);
      expect(body.accepted).toBe(0);
    });

    it("rejects invalid occurred_at format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-1",
              org_id: "org-1",
              occurred_at: "not-a-date",
              event_type: "message_created",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: null,
              payload: {},
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(400);
      expect(body.accepted).toBe(0);
    });

    it("rejects run_started without run_id", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-1",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "run_started",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: null, // run_id is required for run_started
              payload: {},
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(400);
    });

    it("rejects run_completed with invalid status", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-1",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "run_completed",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: "run-1",
              payload: {
                status: "invalid_status",
                duration_ms: 1000,
                cost: 0.01,
                input_tokens: 100,
                output_tokens: 50,
              },
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(400);
    });

    it("rejects negative duration_ms", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-1",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "run_completed",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: "run-1",
              payload: {
                status: "success",
                duration_ms: -100,
                cost: 0.01,
                input_tokens: 100,
                output_tokens: 50,
              },
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(400);
    });

    it("rejects invalid handoff method", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-1",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "local_handoff",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: null,
              payload: { method: "invalid_method" },
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================================
  // Batch Size Limits
  // ============================================================================

  describe("batch size limits", () => {
    it("accepts maximum batch size (100 events)", async () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        event_id: `evt-${i}`,
        org_id: "org-1",
        occurred_at: "2024-01-15T10:00:00Z",
        event_type: "message_created" as const,
        session_id: "sess-1",
        user_id: "user-1",
        run_id: null,
        payload: {},
      }));

      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: { events },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.accepted).toBe(100);
    });

    it("rejects batch exceeding maximum size (101 events)", async () => {
      const events = Array.from({ length: 101 }, (_, i) => ({
        event_id: `evt-${i}`,
        org_id: "org-1",
        occurred_at: "2024-01-15T10:00:00Z",
        event_type: "message_created" as const,
        session_id: "sess-1",
        user_id: "user-1",
        run_id: null,
        payload: {},
      }));

      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: { events },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(400);
      expect(body.accepted).toBe(0);
      // Zod schema validation rejects before the route handler's batch size check
      expect(body.errors?.[0]?.message).toContain("100");
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe("error handling", () => {
    it("returns 500 on transaction failure", async () => {
      mockTransaction.mockRejectedValueOnce(new Error("Database connection lost"));

      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-1",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "message_created",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: null,
              payload: {},
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(500);
      expect(body.accepted).toBe(0);
      expect(body.errors?.[0]?.message).toContain("Database connection lost");
    });
  });

  // ============================================================================
  // Error Categories
  // ============================================================================

  describe("error categories", () => {
    it("accepts run_completed with tool_error category", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/events",
        payload: {
          events: [
            {
              event_id: "evt-1",
              org_id: "org-1",
              occurred_at: "2024-01-15T10:00:00Z",
              event_type: "run_completed",
              session_id: "sess-1",
              user_id: "user-1",
              run_id: "run-1",
              payload: {
                status: "fail",
                duration_ms: 1000,
                cost: 0.01,
                input_tokens: 100,
                output_tokens: 50,
                error_type: "tool_error",
              },
            },
          ],
        },
      });

      const body: IngestResponse = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.accepted).toBe(1);
    });

    it("accepts all valid error categories", async () => {
      const errorTypes = ["tool_error", "model_error", "timeout", "unknown"];

      for (const errorType of errorTypes) {
        const response = await app.inject({
          method: "POST",
          url: "/events",
          payload: {
            events: [
              {
                event_id: `evt-${errorType}`,
                org_id: "org-1",
                occurred_at: "2024-01-15T10:00:00Z",
                event_type: "run_completed",
                session_id: "sess-1",
                user_id: "user-1",
                run_id: `run-${errorType}`,
                payload: {
                  status: "fail",
                  duration_ms: 1000,
                  cost: 0.01,
                  input_tokens: 100,
                  output_tokens: 50,
                  error_type: errorType,
                },
              },
            ],
          },
        });

        const body: IngestResponse = response.json();
        expect(response.statusCode).toBe(200);
        expect(body.accepted).toBe(1);
      }
    });
  });
});
