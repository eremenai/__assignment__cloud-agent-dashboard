/**
 * Shared types for the Agent Cloud Execution Monitoring Dashboard.
 * Used across all services: dashboard, ingest, worker, generator.
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

// Roles use lowercase to match database storage directly (no mapping needed)
// - 'admin', 'manager', 'member' are org-scoped roles (require org_id)
// - 'support', 'super_admin' are global roles (org_id must be null)
export type UserRole = "member" | "manager" | "admin" | "support" | "super_admin";

export type RunStatus = "success" | "fail" | "timeout" | "cancelled";

export type EventType = "message_created" | "run_started" | "run_completed" | "local_handoff";

export type HandoffMethod = "teleport" | "download" | "copy_patch" | "other";

export type ErrorCategory = "tool_error" | "model_error" | "timeout" | "unknown";

// ============================================================================
// Analytics Event Contract (Ingest API)
// ============================================================================

/**
 * Event envelope received by the Ingest API.
 * All events share this common structure.
 */
export interface AnalyticsEvent {
  event_id: string;
  org_id: string;
  occurred_at: string; // RFC3339
  event_type: EventType;
  session_id: string;
  user_id: string; // user_id is always required
  run_id: string | null;
  payload: EventPayload;
}

export type EventPayload =
  | MessageCreatedPayload
  | RunStartedPayload
  | RunCompletedPayload
  | LocalHandoffPayload;

export interface MessageCreatedPayload {
  content?: string;
}

export type RunStartedPayload = Record<string, never>;

export interface RunCompletedPayload {
  status: RunStatus;
  duration_ms: number;
  cost: number; // USD
  input_tokens: number;
  output_tokens: number;
  error_type?: ErrorCategory;
}

export interface LocalHandoffPayload {
  method: HandoffMethod;
}

// ============================================================================
// Ingest API Response Types
// ============================================================================

export interface IngestRequest {
  events: AnalyticsEvent[];
}

export interface IngestResponse {
  accepted: number;
  event_ids: string[];
  errors?: IngestError[];
}

export interface IngestError {
  event_id?: string;
  index: number;
  message: string;
}

// ============================================================================
// Database Entity Types (matching Drizzle schema)
// ============================================================================

export interface DbOrg {
  org_id: string;
  name: string;
  created_at: Date;
}

export interface DbUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: Date;
}

export interface DbOrgMember {
  org_id: string;
  user_id: string;
  role: string;
  created_at: Date;
}

export interface DbEventRaw {
  org_id: string;
  event_id: string;
  occurred_at: Date;
  inserted_at: Date;
  event_type: string;
  session_id: string;
  user_id: string; // user_id is always required
  run_id: string | null;
  payload: Record<string, unknown>;
}

export interface DbEventQueue {
  org_id: string;
  event_id: string;
  inserted_at: Date;
  processed_at: Date | null;
  attempts: number;
  last_error: string | null;
}

export interface DbRunFacts {
  org_id: string;
  run_id: string;
  session_id: string;
  user_id: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  status: string | null;
  duration_ms: number | null;
  cost: string | null; // numeric stored as string
  input_tokens: number | null;
  output_tokens: number | null;
  error_type: string | null;
}

export interface DbSessionStats {
  org_id: string;
  session_id: string;
  user_id: string | null;
  first_message_at: Date | null;
  last_event_at: Date | null;
  runs_count: number;
  active_agent_time_ms: number;
  handoffs_count: number;
  last_handoff_at: Date | null;
  has_post_handoff_iteration: boolean;
  success_runs: number;
  failed_runs: number;
  cost_total: string; // numeric stored as string
  input_tokens_total: number;
  output_tokens_total: number;
}

export interface DbOrgStatsDaily {
  org_id: string;
  day: string; // DATE as string
  sessions_count: number;
  sessions_with_handoff: number;
  sessions_with_post_handoff: number;
  runs_count: number;
  success_runs: number;
  failed_runs: number;
  errors_tool: number;
  errors_model: number;
  errors_timeout: number;
  errors_other: number;
  total_duration_ms: number;
  total_cost: string; // numeric
  total_input_tokens: number;
  total_output_tokens: number;
  active_users_count: number;
}

export interface DbUserStatsDaily {
  org_id: string;
  user_id: string;
  day: string; // DATE as string
  sessions_count: number;
  sessions_with_handoff: number;
  sessions_with_post_handoff: number;
  runs_count: number;
  success_runs: number;
  failed_runs: number;
  errors_tool: number;
  errors_model: number;
  errors_timeout: number;
  errors_other: number;
  total_duration_ms: number;
  total_cost: string; // numeric
  total_input_tokens: number;
  total_output_tokens: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Post-handoff iteration window in milliseconds (4 hours).
 */
export const POST_HANDOFF_WINDOW_MS = 4 * 60 * 60 * 1000;
