/**
 * Core domain types for the Agent Cloud Execution Monitoring Dashboard.
 * These types represent the main entities in the system.
 */

// ============================================================================
// Enums / Union Types
// ============================================================================

export type UserRole =
	| "MEMBER"
	| "MANAGER"
	| "ORG_ADMIN"
	| "SUPPORT"
	| "SUPER_ADMIN";

export type RunStatus = "SUCCEEDED" | "FAILED" | "CANCELED" | "TIMEOUT";

export type EventType = "MESSAGE" | "RUN_START" | "RUN_END" | "HANDOFF";

export type ActorType = "USER" | "AGENT" | "SYSTEM";

export type HandoffMethod = "TELEPORT" | "OPEN_IN_CLI" | "DOWNLOAD_PATCH";

export type FailureCategory =
	| "TIMEOUT"
	| "RATE_LIMIT"
	| "CONTEXT_LENGTH"
	| "TOOL_ERROR"
	| "VALIDATION_ERROR"
	| "INTERNAL_ERROR"
	| "USER_CANCELED";

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
	orgId: string;
	startedAt: Date;
	completedAt: Date;
	status: RunStatus;
	queueWaitMs?: number;
	executionMs: number;
	failureCategory?: FailureCategory;
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
	type: EventType;
	actorType: ActorType;
	payload: EventPayload;
}

export type EventPayload =
	| MessagePayload
	| RunStartPayload
	| RunEndPayload
	| HandoffPayload;

export interface MessagePayload {
	type: "MESSAGE";
	content: string;
	preview?: string; // Truncated version for timeline display
}

export interface RunStartPayload {
	type: "RUN_START";
	runId: string;
	runNumber: number;
}

export interface RunEndPayload {
	type: "RUN_END";
	runId: string;
	runNumber: number;
	status: RunStatus;
	durationMs: number;
	costCents: number;
	totalTokens: number;
	failureCategory?: FailureCategory;
}

export interface HandoffPayload {
	type: "HANDOFF";
	handoffId: string;
	method: HandoffMethod;
	userId: string;
}

export interface LocalHandoffEvent {
	handoffId: string;
	sessionId: string;
	orgId: string;
	userId: string;
	timestamp: Date;
	method: HandoffMethod;
}

// ============================================================================
// Computed / Aggregated Types
// ============================================================================

/**
 * Session with computed metrics for display in tables/lists.
 */
export interface SessionWithMetrics extends Session {
	createdByUser: Pick<User, "userId" | "name" | "email">;
	lifespanMs: number;
	activeTimeMs: number;
	runCount: number;
	successfulRunCount: number;
	failedRunCount: number;
	localHandoffCount: number;
	hasPostHandoffIteration: boolean;
	successRate: number;
	totalCostCents: number;
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
}

/**
 * User with computed metrics for display in tables/lists.
 */
export interface UserWithMetrics extends User {
	sessionCount: number;
	runCount: number;
	avgRunsPerSession: number;
	avgActiveTimeMs: number;
	avgLifespanMs: number;
	localHandoffRate: number;
	postHandoffIterationRate: number;
	successRate: number;
	totalCostCents: number;
	totalTokens: number;
	costPerRun: number;
}

/**
 * Organization with computed metrics for global overview.
 */
export interface OrgWithMetrics extends Organization {
	activeUserCount: number;
	sessionCount: number;
	runCount: number;
	successRate: number;
	avgRunsPerSession: number;
	localHandoffRate: number;
	totalCostCents: number;
	trend: "improving" | "declining" | "stable";
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
	totalRuns: TrendData;
	successRate: TrendData;
	p95DurationMs: TrendData;
	totalCostCents: TrendData;
	totalTokens: TrendData;
}

export interface FrictionKPIs {
	avgRunsPerSession: TrendData;
	avgActiveTimeMs: TrendData;
	avgLifespanMs: TrendData;
	localHandoffRate: TrendData;
	postHandoffIterationRate: TrendData;
}

export interface GlobalKPIs extends PlatformKPIs {
	totalOrgs: number;
	activeUsers: TrendData;
}

// ============================================================================
// Failure Analytics
// ============================================================================

export interface FailureCategoryCount {
	category: FailureCategory;
	count: number;
	percentage: number;
}
