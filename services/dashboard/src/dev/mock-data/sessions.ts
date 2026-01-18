/**
 * Pre-generated mock session data for all organizations.
 */

import type { Event, LocalHandoffEvent, Run, Session } from "@/lib/types/domain";

import { generateEvents, generateHandoffs, generateRuns, generateSessions } from "../generator";
import { getUsersForOrg } from "./users";

// ============================================================================
// Configuration
// ============================================================================

const now = new Date();
const ONE_YEAR_AGO = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

// Use underscore naming to match database seed data
// Session counts scaled for 1 year of data (~4x from 90 days)
const ORG_SESSION_COUNTS: Record<string, number> = {
  org_small: 60, // Small startup: ~5 sessions/month
  org_medium: 150, // Medium team: ~12 sessions/month
  org_large: 300, // Large corp: ~25 sessions/month
};

// ============================================================================
// Data Generation
// ============================================================================

interface GeneratedSessionData {
  session: Session;
  runs: Run[];
  events: Event[];
  handoffs: LocalHandoffEvent[];
}

function generateOrgData(orgId: string): GeneratedSessionData[] {
  const users = getUsersForOrg(orgId);
  const userIds = users.map((u) => u.userId);
  const sessionCount = ORG_SESSION_COUNTS[orgId] || 30;

  const sessions = generateSessions({
    orgId,
    userIds,
    startDate: ONE_YEAR_AGO,
    endDate: now,
    count: sessionCount,
  });

  return sessions.map((session) => {
    // Vary run count: 70% low friction (1-2), 20% medium (3-4), 10% high (5+)
    const roll = Math.random();
    let runCount: number;
    if (roll < 0.7) {
      runCount = Math.floor(Math.random() * 2) + 1; // 1-2
    } else if (roll < 0.9) {
      runCount = Math.floor(Math.random() * 2) + 3; // 3-4
    } else {
      runCount = Math.floor(Math.random() * 4) + 5; // 5-8
    }

    const runs = generateRuns({ session, runCount });
    const baseEvents = generateEvents({ session, runs });
    const handoffs = generateHandoffs({
      session,
      runs,
      probability: 0.35, // 35% of sessions have handoffs
    });

    // Add handoff events to the events list
    const handoffEvents: Event[] = handoffs
      .filter((handoff): handoff is typeof handoff & { handoffId: string; userId: string } =>
        Boolean(handoff.handoffId && handoff.userId)
      )
      .map((handoff) => ({
        eventId: `evt-${handoff.handoffId}`,
        sessionId: session.sessionId,
        timestamp: handoff.timestamp,
        type: "local_handoff" as const,
        actorType: "user" as const,
        payload: {
          type: "local_handoff" as const,
          handoffId: handoff.handoffId,
          method: handoff.method as "teleport" | "download" | "copy_patch",
          userId: handoff.userId,
        },
      }));

    // Merge and sort all events by timestamp
    const events = [...baseEvents, ...handoffEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return { session, runs, events, handoffs };
  });
}

// ============================================================================
// Pre-generated Data
// ============================================================================

// Generate data once at module load
// Use underscore naming to match database seed data
const SMALL_DATA = generateOrgData("org_small");
const MEDIUM_DATA = generateOrgData("org_medium");
const LARGE_DATA = generateOrgData("org_large");

const ALL_ORG_DATA: Record<string, GeneratedSessionData[]> = {
  org_small: SMALL_DATA,
  org_medium: MEDIUM_DATA,
  org_large: LARGE_DATA,
};

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Get all sessions for an organization.
 */
export function getSessionsForOrg(orgId: string): Session[] {
  const data = ALL_ORG_DATA[orgId];
  return data ? data.map((d) => d.session) : [];
}

/**
 * Get a session by ID.
 */
export function getSession(sessionId: string): Session | undefined {
  for (const orgData of Object.values(ALL_ORG_DATA)) {
    const found = orgData.find((d) => d.session.sessionId === sessionId);
    if (found) return found.session;
  }
  return undefined;
}

/**
 * Get full session data (session + runs + events + handoffs).
 */
export function getSessionData(sessionId: string): GeneratedSessionData | undefined {
  for (const orgData of Object.values(ALL_ORG_DATA)) {
    const found = orgData.find((d) => d.session.sessionId === sessionId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Get all runs for a session.
 */
export function getRunsForSession(sessionId: string): Run[] {
  const data = getSessionData(sessionId);
  return data?.runs ?? [];
}

/**
 * Get all events for a session.
 */
export function getEventsForSession(sessionId: string): Event[] {
  const data = getSessionData(sessionId);
  return data?.events ?? [];
}

/**
 * Get all handoffs for a session.
 */
export function getHandoffsForSession(sessionId: string): LocalHandoffEvent[] {
  const data = getSessionData(sessionId);
  return data?.handoffs ?? [];
}

/**
 * Get all sessions for a user.
 */
export function getSessionsForUser(userId: string): Session[] {
  const sessions: Session[] = [];
  for (const orgData of Object.values(ALL_ORG_DATA)) {
    for (const data of orgData) {
      if (data.session.createdByUserId === userId) {
        sessions.push(data.session);
      }
    }
  }
  return sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get all runs for an organization.
 */
export function getRunsForOrg(orgId: string): Run[] {
  const data = ALL_ORG_DATA[orgId];
  return data ? data.flatMap((d) => d.runs) : [];
}

/**
 * Get all handoffs for an organization.
 */
export function getHandoffsForOrg(orgId: string): LocalHandoffEvent[] {
  const data = ALL_ORG_DATA[orgId];
  return data ? data.flatMap((d) => d.handoffs) : [];
}

/**
 * Get all sessions across all organizations.
 */
export function getAllSessions(): Session[] {
  return Object.values(ALL_ORG_DATA)
    .flatMap((orgData) => orgData.map((d) => d.session))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get all generated data for an organization.
 */
export function getOrgData(orgId: string): GeneratedSessionData[] {
  return ALL_ORG_DATA[orgId] ?? [];
}
