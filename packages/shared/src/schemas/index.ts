/**
 * Zod validation schemas for the Ingest API.
 * Used to validate incoming events before storing.
 */

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const runStatusSchema = z.enum(["success", "fail", "timeout", "cancelled"]);

export const eventTypeSchema = z.enum([
  "message_created",
  "run_started",
  "run_completed",
  "local_handoff",
]);

export const handoffMethodSchema = z.enum(["teleport", "download", "copy_patch", "other"]);

export const errorCategorySchema = z.enum(["tool_error", "model_error", "timeout", "unknown"]);

// ============================================================================
// Payload Schemas
// ============================================================================

export const messageCreatedPayloadSchema = z.object({
  content: z.string().optional(),
});

export const runStartedPayloadSchema = z.object({});

export const runCompletedPayloadSchema = z.object({
  status: runStatusSchema,
  duration_ms: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  error_type: errorCategorySchema.optional(),
});

export const localHandoffPayloadSchema = z.object({
  method: handoffMethodSchema,
});

// ============================================================================
// Event Envelope Schema
// ============================================================================

/**
 * Base event schema with type discrimination.
 */
const baseEventSchema = z.object({
  event_id: z.string().min(1),
  org_id: z.string().min(1),
  occurred_at: z.string().datetime({ message: "occurred_at must be RFC3339 format" }),
  session_id: z.string().min(1),
  user_id: z.string().nullable(),
  run_id: z.string().nullable(),
});

/**
 * Message created event.
 */
export const messageCreatedEventSchema = baseEventSchema.extend({
  event_type: z.literal("message_created"),
  payload: messageCreatedPayloadSchema,
});

/**
 * Run started event.
 */
export const runStartedEventSchema = baseEventSchema.extend({
  event_type: z.literal("run_started"),
  run_id: z.string().min(1), // Required for run events
  payload: runStartedPayloadSchema,
});

/**
 * Run completed event.
 */
export const runCompletedEventSchema = baseEventSchema.extend({
  event_type: z.literal("run_completed"),
  run_id: z.string().min(1), // Required for run events
  payload: runCompletedPayloadSchema,
});

/**
 * Local handoff event.
 */
export const localHandoffEventSchema = baseEventSchema.extend({
  event_type: z.literal("local_handoff"),
  payload: localHandoffPayloadSchema,
});

/**
 * Union of all event types.
 */
export const analyticsEventSchema = z.discriminatedUnion("event_type", [
  messageCreatedEventSchema,
  runStartedEventSchema,
  runCompletedEventSchema,
  localHandoffEventSchema,
]);

// ============================================================================
// Request/Response Schemas
// ============================================================================

/**
 * Ingest API request body.
 */
export const ingestRequestSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(100),
});

/**
 * Ingest API error item.
 */
export const ingestErrorSchema = z.object({
  event_id: z.string().optional(),
  index: z.number().int().nonnegative(),
  message: z.string(),
});

/**
 * Ingest API response.
 */
export const ingestResponseSchema = z.object({
  accepted: z.number().int().nonnegative(),
  event_ids: z.array(z.string()),
  errors: z.array(ingestErrorSchema).optional(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type RunStatus = z.infer<typeof runStatusSchema>;
export type EventType = z.infer<typeof eventTypeSchema>;
export type HandoffMethod = z.infer<typeof handoffMethodSchema>;
export type ErrorCategory = z.infer<typeof errorCategorySchema>;

export type MessageCreatedPayload = z.infer<typeof messageCreatedPayloadSchema>;
export type RunStartedPayload = z.infer<typeof runStartedPayloadSchema>;
export type RunCompletedPayload = z.infer<typeof runCompletedPayloadSchema>;
export type LocalHandoffPayload = z.infer<typeof localHandoffPayloadSchema>;

export type MessageCreatedEvent = z.infer<typeof messageCreatedEventSchema>;
export type RunStartedEvent = z.infer<typeof runStartedEventSchema>;
export type RunCompletedEvent = z.infer<typeof runCompletedEventSchema>;
export type LocalHandoffEvent = z.infer<typeof localHandoffEventSchema>;
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;

export type IngestRequest = z.infer<typeof ingestRequestSchema>;
export type IngestError = z.infer<typeof ingestErrorSchema>;
export type IngestResponse = z.infer<typeof ingestResponseSchema>;
