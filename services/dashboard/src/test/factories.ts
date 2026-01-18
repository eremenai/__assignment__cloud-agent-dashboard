/**
 * Test data factories for creating mock data in tests.
 */

import type { AuthUser } from "@/lib/types/auth";
import type {
  Event,
  LocalHandoffEvent,
  Organization,
  Run,
  RunStatus,
  Session,
  SessionWithMetrics,
  User,
  UserRole,
  UserWithMetrics,
} from "@/lib/types/domain";

// ============================================================================
// ID Generation
// ============================================================================

let idCounter = 0;

function generateId(prefix: string): string {
  idCounter++;
  return `${prefix}-test-${idCounter}`;
}

/**
 * Reset ID counter (call in beforeEach if needed)
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

// ============================================================================
// Organization Factory
// ============================================================================

export function createOrganization(overrides: Partial<Organization> = {}): Organization {
  return {
    orgId: generateId("org"),
    name: "Test Organization",
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// ============================================================================
// User Factory
// ============================================================================

export function createUser(overrides: Partial<User> = {}): User {
  const id = generateId("user");
  return {
    userId: id,
    orgId: "org-test",
    email: `${id}@test.com`,
    name: "Test User",
    role: "member" as UserRole,
    createdAt: new Date("2024-01-01"),
    lastActiveAt: new Date(),
    ...overrides,
  };
}

export function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  const id = generateId("user");
  return {
    userId: id,
    email: `${id}@test.com`,
    name: "Test User",
    role: "member" as UserRole,
    orgId: "org-test",
    ...overrides,
  };
}

// ============================================================================
// Session Factory
// ============================================================================

export function createSession(overrides: Partial<Session> = {}): Session {
  const createdAt = overrides.createdAt || new Date();
  return {
    sessionId: generateId("sess"),
    orgId: "org-test",
    createdByUserId: "user-test",
    createdAt,
    firstMessageAt: createdAt,
    lastMessageAt: new Date(createdAt.getTime() + 30 * 60 * 1000), // 30 min later
    ...overrides,
  };
}

export function createSessionWithMetrics(overrides: Partial<SessionWithMetrics> = {}): SessionWithMetrics {
  const session = createSession(overrides);
  return {
    ...session,
    createdByUser: {
      userId: session.createdByUserId,
      name: "Test User",
      email: "test@test.com",
    },
    lifespanMs: 30 * 60 * 1000, // 30 min
    activeTimeMs: 5 * 60 * 1000, // 5 min
    runCount: 2,
    successfulRunCount: 2,
    failedRunCount: 0,
    localHandoffCount: 0,
    hasPostHandoffIteration: false,
    successRate: 100,
    totalCostCents: 500,
    inputTokens: 20000,
    outputTokens: 10000,
    totalTokens: 30000,
    ...overrides,
  };
}

// ============================================================================
// Run Factory
// ============================================================================

export function createRun(overrides: Partial<Run> = {}): Run {
  const startedAt = overrides.startedAt || new Date();
  const executionMs = overrides.executionMs || 60000; // 1 min
  return {
    runId: generateId("run"),
    sessionId: "sess-test",
    orgId: "org-test",
    startedAt,
    completedAt: new Date(startedAt.getTime() + executionMs),
    status: "success" as RunStatus,
    executionMs,
    inputTokens: 10000,
    outputTokens: 5000,
    totalTokens: 15000,
    costCents: 250,
    ...overrides,
  };
}

// ============================================================================
// Event Factory
// ============================================================================

export function createEvent(overrides: Partial<Event> = {}): Event {
  return {
    eventId: generateId("evt"),
    sessionId: "sess-test",
    timestamp: new Date(),
    type: "message_created",
    actorType: "user",
    payload: {
      type: "message_created",
      content: "Test message",
    },
    ...overrides,
  };
}

// ============================================================================
// Handoff Factory
// ============================================================================

export function createHandoff(overrides: Partial<LocalHandoffEvent> = {}): LocalHandoffEvent {
  return {
    handoffId: generateId("ho"),
    sessionId: "sess-test",
    orgId: "org-test",
    userId: "user-test",
    timestamp: new Date(),
    method: "teleport",
    ...overrides,
  };
}

// ============================================================================
// User With Metrics Factory
// ============================================================================

export function createUserWithMetrics(overrides: Partial<UserWithMetrics> = {}): UserWithMetrics {
  const user = createUser(overrides);
  return {
    ...user,
    sessionCount: 10,
    runCount: 25,
    avgRunsPerSession: 2.5,
    avgActiveTimeMs: 5 * 60 * 1000,
    avgLifespanMs: 30 * 60 * 1000,
    localHandoffRate: 30,
    postHandoffIterationRate: 10,
    successRate: 92,
    totalCostCents: 5000,
    totalTokens: 375000,
    costPerRun: 200,
    ...overrides,
  };
}

// ============================================================================
// Batch Factories
// ============================================================================

export function createSessions(count: number): Session[] {
  return Array.from({ length: count }, () => createSession());
}

export function createRuns(count: number, sessionId?: string): Run[] {
  return Array.from({ length: count }, () => createRun(sessionId ? { sessionId } : {}));
}

export function createUsers(count: number, orgId?: string): User[] {
  return Array.from({ length: count }, () => createUser(orgId ? { orgId } : {}));
}
