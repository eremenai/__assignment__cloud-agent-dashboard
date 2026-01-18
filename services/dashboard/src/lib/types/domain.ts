/**
 * Core domain types for the Agent Cloud Execution Monitoring Dashboard.
 * These types represent the main entities in the system.
 *
 * IMPORTANT: These types should align with @repo/shared/types for consistency.
 * Backend types use snake_case and lowercase enum values.
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

// UserRole uses UPPERCASE to match auth convention (RBAC standard)
export type UserRole = "MEMBER" | "MANAGER" | "ORG_ADMIN" | "SUPPORT" | "SUPER_ADMIN";

// Backend uses lowercase for status values stored in DB
export type RunStatus = "success" | "fail" | "timeout" | "cancelled";

// Backend event types match analytics event contract
export type EventType = "message_created" | "run_started" | "run_completed" | "local_handoff";

export type ActorType = "user" | "agent" | "system";

// Backend handoff methods
export type HandoffMethod = "teleport" | "download" | "copy_patch" | "other";

// Error categories match backend ErrorCategory
export type FailureCategory = "tool_error" | "model_error" | "timeout" | "unknown";

// ============================================================================
// Core Entities
// ============================================================================

export interface Organization {
  orgId: string;
  name: string;
  createdAt: Date;
}

export interface User {
  userId: string;
  orgId: string | null; // null for platform roles (SUPPORT, SUPER_ADMIN)
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface Session {
  sessionId: string;
  orgId: string;
  createdByUserId: string;
  createdAt: Date;
  firstMessageAt: Date;
  lastMessageAt: Date;
  repoId?: string;
  workspaceId?: string;
}

export interface Run {
  runId: string;
  sessionId: string;
  orgId?: string;
  userId?: string;
  startedAt: Date;
  completedAt?: Date;
  endedAt?: Date;
  status: RunStatus;
  queueWaitMs?: number;
  executionMs: number;
  failureCategory?: FailureCategory;
  errorType?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costCents: number;
  artifactSummary?: ArtifactSummary;
}

export interface ArtifactSummary {
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  testsRun: number;
  testsPassed: number;
}

export interface Event {
  eventId: string;
  sessionId: string;
  timestamp: Date;
  type?: EventType;
  eventType?: string;
  actorType?: ActorType;
  payload?: EventPayload;
}

export type EventPayload = MessagePayload | RunStartPayload | RunEndPayload | HandoffPayload;

export interface MessagePayload {
  type: "message_created" | "MESSAGE"; // Allow both for backwards compatibility
  content: string;
  preview?: string; // Truncated version for timeline display
}

export interface RunStartPayload {
  type: "run_started" | "RUN_START"; // Allow both for backwards compatibility
  runId: string;
  runNumber: number;
}

export interface RunEndPayload {
  type: "run_completed" | "RUN_END"; // Allow both for backwards compatibility
  runId: string;
  runNumber: number;
  status: RunStatus;
  durationMs: number;
  costCents: number;
  totalTokens: number;
  failureCategory?: FailureCategory;
}

export interface HandoffPayload {
  type: "local_handoff" | "HANDOFF"; // Allow both for backwards compatibility
  handoffId: string;
  method: HandoffMethod;
  userId: string;
}

export interface LocalHandoffEvent {
  handoffId?: string;
  eventId?: string;
  eventType?: string;
  sessionId: string;
  orgId?: string;
  userId?: string;
  timestamp: Date;
  method: HandoffMethod | string;
}

// ============================================================================
// Computed / Aggregated Types
// ============================================================================

/**
 * Session with computed metrics for display in tables/lists.
 */
export interface SessionWithMetrics extends Partial<Session> {
  sessionId: string;
  orgId: string;
  createdAt: Date;
  firstMessageAt: Date;
  lastMessageAt: Date;
  createdByUser?: Pick<User, "userId" | "name" | "email">;
  userId?: string;
  lifespanMs: number;
  activeTimeMs: number;
  runCount: number;
  successfulRunCount?: number;
  successfulRuns?: number;
  failedRunCount?: number;
  failedRuns?: number;
  localHandoffCount?: number;
  handoffCount?: number;
  hasPostHandoffIteration: boolean;
  successRate?: number;
  totalCostCents: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * User with computed metrics for display in tables/lists.
 */
export interface UserWithMetrics extends Partial<User> {
  userId: string;
  email: string;
  displayName?: string;
  name?: string;
  role: UserRole;
  orgId?: string | null;
  createdAt?: Date;
  lastActiveAt?: Date;
  sessionCount: number;
  runCount: number;
  successfulRuns?: number;
  failedRuns?: number;
  avgRunsPerSession: number;
  avgActiveTimeMs: number;
  avgLifespanMs?: number;
  localHandoffRate?: number;
  handoffRate?: number;
  postHandoffIterationRate: number;
  successRate: number;
  totalCostCents: number;
  totalTokens: number;
  costPerRun?: number;
}

/**
 * Organization with computed metrics for global overview.
 */
export interface OrgWithMetrics extends Organization {
  activeUserCount?: number;
  userCount?: number;
  sessionCount: number;
  runCount: number;
  successRate: number;
  avgRunsPerSession: number;
  localHandoffRate?: number;
  handoffRate?: number;
  totalCostCents: number;
  trend?: "improving" | "declining" | "stable";
  healthTrend?: "improving" | "declining" | "stable";
}

// ============================================================================
// Time Series Types
// ============================================================================

export interface TimeSeriesPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  value: number;
}

export interface MultiSeriesPoint {
  date: string;
  [key: string]: string | number;
}

export interface FrictionTrendPoint {
  date: string;
  avgRunsPerSession: number;
  handoffRate: number;
  postHandoffRate: number;
}

export interface TrendData {
  current: number;
  previous: number;
  changePercent: number;
  isPositive: boolean;
}

// ============================================================================
// KPI Types
// ============================================================================

export interface PlatformKPIs {
  sessions?: TrendData;
  runs?: TrendData;
  totalRuns?: TrendData;
  successRate: TrendData;
  avgRunDurationMs?: TrendData;
  p95DurationMs: TrendData;
  totalCostCents: TrendData;
  totalTokens: TrendData;
}

export interface FrictionKPIs {
  avgRunsPerSession: TrendData;
  avgActiveTimeMs?: TrendData;
  avgLifespanMs?: TrendData;
  localHandoffRate: TrendData;
  postHandoffIterationRate: TrendData;
}

export interface GlobalKPIs extends PlatformKPIs {
  totalOrgs: TrendData | number;
  totalUsers?: TrendData;
  totalSessions?: TrendData;
  platformSuccessRate?: TrendData;
  platformHandoffRate?: TrendData;
  activeUsers?: TrendData;
}

// ============================================================================
// Failure Analytics
// ============================================================================

export interface FailureCategoryCount {
  category: FailureCategory;
  count: number;
  percentage: number;
}
