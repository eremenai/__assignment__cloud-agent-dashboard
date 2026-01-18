/**
 * Drizzle ORM schema definitions for all database tables.
 * Matches the schema defined in .ai/BACKEND_ARCHITECTURE.md
 */

import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ============================================================================
// Support Tables (Reference Data)
// ============================================================================

/**
 * Organizations table.
 */
export const orgs = pgTable("orgs", {
  org_id: text("org_id").primaryKey(),
  name: text("name").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Users table.
 */
export const users = pgTable("users", {
  user_id: text("user_id").primaryKey(),
  email: text("email").unique(),
  display_name: text("display_name"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Organization membership table.
 */
export const orgMembers = pgTable(
  "org_members",
  {
    org_id: text("org_id")
      .notNull()
      .references(() => orgs.org_id),
    user_id: text("user_id")
      .notNull()
      .references(() => users.user_id),
    role: text("role").notNull(), // "admin" | "member" | "viewer"
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.org_id, table.user_id] })]
);

// ============================================================================
// Event Store
// ============================================================================

/**
 * Append-only event log (system of record).
 */
export const eventsRaw = pgTable(
  "events_raw",
  {
    org_id: text("org_id").notNull(),
    event_id: text("event_id").notNull(),
    occurred_at: timestamp("occurred_at", { withTimezone: true }).notNull(),
    inserted_at: timestamp("inserted_at", { withTimezone: true }).notNull().defaultNow(),
    event_type: text("event_type").notNull(),
    session_id: text("session_id").notNull(),
    user_id: text("user_id"),
    run_id: text("run_id"),
    payload: jsonb("payload").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.org_id, table.event_id] }),
    index("events_raw_org_time_idx").on(table.org_id, table.occurred_at),
    index("events_raw_org_session_time_idx").on(table.org_id, table.session_id, table.occurred_at),
    index("events_raw_org_run_idx").on(table.org_id, table.run_id),
  ]
);

/**
 * Processing queue for worker.
 */
export const eventsQueue = pgTable(
  "events_queue",
  {
    org_id: text("org_id").notNull(),
    event_id: text("event_id").notNull(),
    inserted_at: timestamp("inserted_at", { withTimezone: true }).notNull().defaultNow(),
    processed_at: timestamp("processed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    last_error: text("last_error"),
  },
  (table) => [
    primaryKey({ columns: [table.org_id, table.event_id] }),
    // Partial index for unprocessed events
    index("events_queue_unprocessed_idx").on(table.inserted_at),
  ]
);

// ============================================================================
// Read Models
// ============================================================================

/**
 * Per-run facts (metrics for each run).
 */
export const runFacts = pgTable(
  "run_facts",
  {
    org_id: text("org_id").notNull(),
    run_id: text("run_id").notNull(),
    session_id: text("session_id").notNull(),
    user_id: text("user_id"),
    started_at: timestamp("started_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    status: text("status"), // success | fail | timeout | cancelled
    duration_ms: bigint("duration_ms", { mode: "number" }),
    cost: numeric("cost"),
    input_tokens: bigint("input_tokens", { mode: "number" }),
    output_tokens: bigint("output_tokens", { mode: "number" }),
    error_type: text("error_type"),
  },
  (table) => [
    primaryKey({ columns: [table.org_id, table.run_id] }),
    index("run_facts_org_time_idx").on(table.org_id, table.completed_at),
    index("run_facts_org_session_idx").on(table.org_id, table.session_id, table.completed_at),
    index("run_facts_org_user_idx").on(table.org_id, table.user_id, table.completed_at),
  ]
);

/**
 * Per-session aggregates (primary read model).
 */
export const sessionStats = pgTable(
  "session_stats",
  {
    org_id: text("org_id").notNull(),
    session_id: text("session_id").notNull(),
    user_id: text("user_id"),
    first_message_at: timestamp("first_message_at", { withTimezone: true }),
    last_event_at: timestamp("last_event_at", { withTimezone: true }),
    runs_count: bigint("runs_count", { mode: "number" }).notNull().default(0),
    active_agent_time_ms: bigint("active_agent_time_ms", { mode: "number" }).notNull().default(0),
    handoffs_count: bigint("handoffs_count", { mode: "number" }).notNull().default(0),
    last_handoff_at: timestamp("last_handoff_at", { withTimezone: true }),
    has_post_handoff_iteration: boolean("has_post_handoff_iteration").notNull().default(false),
    success_runs: bigint("success_runs", { mode: "number" }).notNull().default(0),
    failed_runs: bigint("failed_runs", { mode: "number" }).notNull().default(0),
    cost_total: numeric("cost_total").notNull().default("0"),
    input_tokens_total: bigint("input_tokens_total", { mode: "number" }).notNull().default(0),
    output_tokens_total: bigint("output_tokens_total", { mode: "number" }).notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.org_id, table.session_id] }),
    index("session_stats_org_last_event_idx").on(table.org_id, table.last_event_at),
    index("session_stats_org_user_idx").on(table.org_id, table.user_id, table.last_event_at),
  ]
);

/**
 * Daily org aggregates (totals, not averages).
 */
export const orgStatsDaily = pgTable(
  "org_stats_daily",
  {
    org_id: text("org_id").notNull(),
    day: date("day").notNull(),
    sessions_count: bigint("sessions_count", { mode: "number" }).notNull().default(0),
    sessions_with_handoff: bigint("sessions_with_handoff", { mode: "number" }).notNull().default(0),
    sessions_with_post_handoff: bigint("sessions_with_post_handoff", { mode: "number" })
      .notNull()
      .default(0),
    runs_count: bigint("runs_count", { mode: "number" }).notNull().default(0),
    success_runs: bigint("success_runs", { mode: "number" }).notNull().default(0),
    failed_runs: bigint("failed_runs", { mode: "number" }).notNull().default(0),
    errors_tool: bigint("errors_tool", { mode: "number" }).notNull().default(0),
    errors_model: bigint("errors_model", { mode: "number" }).notNull().default(0),
    errors_timeout: bigint("errors_timeout", { mode: "number" }).notNull().default(0),
    errors_other: bigint("errors_other", { mode: "number" }).notNull().default(0),
    total_duration_ms: bigint("total_duration_ms", { mode: "number" }).notNull().default(0),
    total_cost: numeric("total_cost").notNull().default("0"),
    total_input_tokens: bigint("total_input_tokens", { mode: "number" }).notNull().default(0),
    total_output_tokens: bigint("total_output_tokens", { mode: "number" }).notNull().default(0),
    active_users_count: bigint("active_users_count", { mode: "number" }).notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.org_id, table.day] }),
    index("org_stats_daily_org_day_idx").on(table.org_id, table.day),
  ]
);

/**
 * Daily user aggregates (totals, not averages).
 */
export const userStatsDaily = pgTable(
  "user_stats_daily",
  {
    org_id: text("org_id").notNull(),
    user_id: text("user_id").notNull(),
    day: date("day").notNull(),
    sessions_count: bigint("sessions_count", { mode: "number" }).notNull().default(0),
    sessions_with_handoff: bigint("sessions_with_handoff", { mode: "number" }).notNull().default(0),
    sessions_with_post_handoff: bigint("sessions_with_post_handoff", { mode: "number" })
      .notNull()
      .default(0),
    runs_count: bigint("runs_count", { mode: "number" }).notNull().default(0),
    success_runs: bigint("success_runs", { mode: "number" }).notNull().default(0),
    failed_runs: bigint("failed_runs", { mode: "number" }).notNull().default(0),
    errors_tool: bigint("errors_tool", { mode: "number" }).notNull().default(0),
    errors_model: bigint("errors_model", { mode: "number" }).notNull().default(0),
    errors_timeout: bigint("errors_timeout", { mode: "number" }).notNull().default(0),
    errors_other: bigint("errors_other", { mode: "number" }).notNull().default(0),
    total_duration_ms: bigint("total_duration_ms", { mode: "number" }).notNull().default(0),
    total_cost: numeric("total_cost").notNull().default("0"),
    total_input_tokens: bigint("total_input_tokens", { mode: "number" }).notNull().default(0),
    total_output_tokens: bigint("total_output_tokens", { mode: "number" }).notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.org_id, table.user_id, table.day] }),
    index("user_stats_daily_org_day_idx").on(table.org_id, table.day),
    index("user_stats_daily_user_day_idx").on(table.org_id, table.user_id, table.day),
  ]
);

// ============================================================================
// Type Exports
// ============================================================================

export type Org = typeof orgs.$inferSelect;
export type NewOrg = typeof orgs.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type OrgMember = typeof orgMembers.$inferSelect;
export type NewOrgMember = typeof orgMembers.$inferInsert;

export type EventRaw = typeof eventsRaw.$inferSelect;
export type NewEventRaw = typeof eventsRaw.$inferInsert;

export type EventQueue = typeof eventsQueue.$inferSelect;
export type NewEventQueue = typeof eventsQueue.$inferInsert;

export type RunFact = typeof runFacts.$inferSelect;
export type NewRunFact = typeof runFacts.$inferInsert;

export type SessionStat = typeof sessionStats.$inferSelect;
export type NewSessionStat = typeof sessionStats.$inferInsert;

export type OrgStatDaily = typeof orgStatsDaily.$inferSelect;
export type NewOrgStatDaily = typeof orgStatsDaily.$inferInsert;

export type UserStatDaily = typeof userStatsDaily.$inferSelect;
export type NewUserStatDaily = typeof userStatsDaily.$inferInsert;
