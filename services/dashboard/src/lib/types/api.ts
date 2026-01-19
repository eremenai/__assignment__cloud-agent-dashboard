/**
 * API response types for the Agent Cloud Execution Monitoring Dashboard.
 */

import type {
  FailureCategoryCount,
  FrictionKPIs,
  GlobalKPIs,
  MultiSeriesPoint,
  OrgWithMetrics,
  PlatformKPIs,
  SessionWithMetrics,
  TimeSeriesPoint,
  UserWithMetrics,
} from "./domain";

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// Sorting & Filtering
// ============================================================================

export type SortOrder = "asc" | "desc";

export interface SortParams {
  sortBy: string;
  sortOrder: SortOrder;
}

export interface TimeRangeParams {
  from: string; // ISO date string
  to: string; // ISO date string
}

export interface SessionFilters extends TimeRangeParams {
  search?: string;
  status?: "all" | "has_failures" | "all_succeeded";
  durationRange?: "any" | "<5m" | "5m-30m" | "30m-1h" | ">1h";
  costRange?: "any" | "<10" | "10-50" | "50-100" | ">100";
  hasHandoff?: "any" | "yes" | "no";
  hasPostHandoffIteration?: "any" | "yes" | "no";
  userIds?: string[];
}

export interface UserFilters extends TimeRangeParams {
  search?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

// Org Overview
export interface OrgMetricsResponse {
  platform: PlatformKPIs;
  friction: FrictionKPIs;
}

export interface OrgTrendsResponse {
  usage: TimeSeriesPoint[];
  sessions: TimeSeriesPoint[];
  activeUsers: TimeSeriesPoint[];
  cost: TimeSeriesPoint[];
  costPerRun: TimeSeriesPoint[];
  tokens: TimeSeriesPoint[];
  friction: MultiSeriesPoint[]; // avgRunsPerSession, handoffRate, postHandoffRate
  reliability: TimeSeriesPoint[]; // successRate over time
  reliabilityBreakdown: MultiSeriesPoint[]; // errors, timeouts, cancels per date
}

export interface OrgFailuresResponse {
  categories: FailureCategoryCount[];
  totalFailures: number;
}

// Sessions
export interface SessionsListResponse extends PaginatedResponse<SessionWithMetrics> {
  summary: {
    totalSessions: number;
    avgRunsPerSession: number;
    avgActiveTimeMs: number;
    avgLifespanMs: number;
    handoffRate: number;
  };
}

export interface SessionDetailResponse {
  session: SessionWithMetrics;
  runs: import("./domain").Run[];
  events: import("./domain").Event[];
  handoffs: import("./domain").LocalHandoffEvent[];
  artifacts: {
    totalFilesChanged: number;
    totalLinesAdded: number;
    totalLinesDeleted: number;
    files: Array<{
      path: string;
      linesAdded: number;
      linesDeleted: number;
    }>;
  };
}

// Users
export interface UsersListResponse extends PaginatedResponse<UserWithMetrics> {
  summary: {
    totalUsers: number;
    totalSessions: number;
    totalCostCents: number;
    avgHandoffRate: number;
  };
}

export interface UserDetailResponse {
  user: UserWithMetrics;
  trends: {
    activity: MultiSeriesPoint[]; // runs, sessions
    cost: TimeSeriesPoint[];
    friction: MultiSeriesPoint[]; // avgRunsPerSession, handoffRate
  };
}

export interface UserSessionsResponse extends PaginatedResponse<SessionWithMetrics> {}

// Global (SUPER_ADMIN)
export interface GlobalMetricsResponse {
  kpis: GlobalKPIs;
}

export interface GlobalTrendsResponse {
  usage: MultiSeriesPoint[]; // stacked by org
  cost: MultiSeriesPoint[]; // stacked by org
}

export interface GlobalOrgsResponse extends PaginatedResponse<OrgWithMetrics> {}

export interface GlobalOrgHealthResponse {
  orgs: Array<{
    orgId: string;
    name: string;
    successRate: number;
    avgRunsPerSession: number;
    handoffRate: number;
    trend: "improving" | "declining" | "stable";
  }>;
}

// ============================================================================
// Export Responses
// ============================================================================

export interface ExportResponse {
  downloadUrl: string;
  filename: string;
  expiresAt: string;
}
