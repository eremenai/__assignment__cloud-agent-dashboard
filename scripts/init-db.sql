-- init-db.sql
-- Schema creation for analytics database
-- This file is run automatically on first container start

-- ============================================================================
-- Support Tables (Reference Data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS orgs (
  org_id       TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users table with role and org_id
-- Roles: admin, manager, member (org-scoped) | support, super_admin (global)
-- org_id is NULL for global roles (support, super_admin)
CREATE TABLE IF NOT EXISTS users (
  user_id      TEXT PRIMARY KEY,
  email        TEXT UNIQUE,
  display_name TEXT,
  org_id       TEXT REFERENCES orgs(org_id),
  role         TEXT NOT NULL DEFAULT 'member',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_org_id_idx ON users(org_id);

-- ============================================================================
-- Event Store
-- ============================================================================

CREATE TABLE IF NOT EXISTS events_raw (
  org_id      TEXT NOT NULL,
  event_id    TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type  TEXT NOT NULL,
  session_id  TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  run_id      TEXT NULL,
  payload     JSONB NOT NULL,
  PRIMARY KEY (org_id, event_id)
);

CREATE INDEX IF NOT EXISTS events_raw_org_time_idx
  ON events_raw (org_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS events_raw_org_session_time_idx
  ON events_raw (org_id, session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS events_raw_org_run_idx
  ON events_raw (org_id, run_id);

CREATE TABLE IF NOT EXISTS events_queue (
  org_id       TEXT NOT NULL,
  event_id     TEXT NOT NULL,
  inserted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  attempts     INT NOT NULL DEFAULT 0,
  last_error   TEXT NULL,
  PRIMARY KEY (org_id, event_id)
);

CREATE INDEX IF NOT EXISTS events_queue_unprocessed_idx
  ON events_queue (inserted_at)
  WHERE processed_at IS NULL;

-- ============================================================================
-- Read Models
-- ============================================================================

CREATE TABLE IF NOT EXISTS run_facts (
  org_id        TEXT NOT NULL,
  run_id        TEXT NOT NULL,
  session_id    TEXT NOT NULL,
  user_id       TEXT NULL,
  started_at    TIMESTAMPTZ NULL,
  completed_at  TIMESTAMPTZ NULL,
  status        TEXT NULL,
  duration_ms   BIGINT NULL,
  cost          NUMERIC NULL,
  input_tokens  BIGINT NULL,
  output_tokens BIGINT NULL,
  error_type    TEXT NULL,
  PRIMARY KEY (org_id, run_id)
);

CREATE INDEX IF NOT EXISTS run_facts_org_time_idx
  ON run_facts (org_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS run_facts_org_session_idx
  ON run_facts (org_id, session_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS run_facts_org_user_idx
  ON run_facts (org_id, user_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS session_stats (
  org_id                     TEXT NOT NULL,
  session_id                 TEXT NOT NULL,
  user_id                    TEXT NULL,
  first_message_at           TIMESTAMPTZ NULL,
  last_event_at              TIMESTAMPTZ NULL,
  runs_count                 BIGINT NOT NULL DEFAULT 0,
  active_agent_time_ms       BIGINT NOT NULL DEFAULT 0,
  handoffs_count             BIGINT NOT NULL DEFAULT 0,
  last_handoff_at            TIMESTAMPTZ NULL,
  has_post_handoff_iteration BOOLEAN NOT NULL DEFAULT false,
  success_runs               BIGINT NOT NULL DEFAULT 0,
  failed_runs                BIGINT NOT NULL DEFAULT 0,
  cost_total                 NUMERIC NOT NULL DEFAULT 0,
  input_tokens_total         BIGINT NOT NULL DEFAULT 0,
  output_tokens_total        BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, session_id)
);

CREATE INDEX IF NOT EXISTS session_stats_org_last_event_idx
  ON session_stats (org_id, last_event_at DESC);
CREATE INDEX IF NOT EXISTS session_stats_org_user_idx
  ON session_stats (org_id, user_id, last_event_at DESC);

CREATE TABLE IF NOT EXISTS org_stats_daily (
  org_id                     TEXT NOT NULL,
  day                        DATE NOT NULL,
  sessions_count             BIGINT NOT NULL DEFAULT 0,
  sessions_with_handoff      BIGINT NOT NULL DEFAULT 0,
  sessions_with_post_handoff BIGINT NOT NULL DEFAULT 0,
  runs_count                 BIGINT NOT NULL DEFAULT 0,
  success_runs               BIGINT NOT NULL DEFAULT 0,
  failed_runs                BIGINT NOT NULL DEFAULT 0,
  errors_tool                BIGINT NOT NULL DEFAULT 0,
  errors_model               BIGINT NOT NULL DEFAULT 0,
  errors_timeout             BIGINT NOT NULL DEFAULT 0,
  errors_other               BIGINT NOT NULL DEFAULT 0,
  total_duration_ms          BIGINT NOT NULL DEFAULT 0,
  total_cost                 NUMERIC NOT NULL DEFAULT 0,
  total_input_tokens         BIGINT NOT NULL DEFAULT 0,
  total_output_tokens        BIGINT NOT NULL DEFAULT 0,
  active_users_count         BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, day)
);

CREATE INDEX IF NOT EXISTS org_stats_daily_org_day_idx
  ON org_stats_daily (org_id, day DESC);

CREATE TABLE IF NOT EXISTS user_stats_daily (
  org_id                     TEXT NOT NULL,
  user_id                    TEXT NOT NULL,
  day                        DATE NOT NULL,
  sessions_count             BIGINT NOT NULL DEFAULT 0,
  sessions_with_handoff      BIGINT NOT NULL DEFAULT 0,
  sessions_with_post_handoff BIGINT NOT NULL DEFAULT 0,
  runs_count                 BIGINT NOT NULL DEFAULT 0,
  success_runs               BIGINT NOT NULL DEFAULT 0,
  failed_runs                BIGINT NOT NULL DEFAULT 0,
  errors_tool                BIGINT NOT NULL DEFAULT 0,
  errors_model               BIGINT NOT NULL DEFAULT 0,
  errors_timeout             BIGINT NOT NULL DEFAULT 0,
  errors_other               BIGINT NOT NULL DEFAULT 0,
  total_duration_ms          BIGINT NOT NULL DEFAULT 0,
  total_cost                 NUMERIC NOT NULL DEFAULT 0,
  total_input_tokens         BIGINT NOT NULL DEFAULT 0,
  total_output_tokens        BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, user_id, day)
);

CREATE INDEX IF NOT EXISTS user_stats_daily_org_day_idx
  ON user_stats_daily (org_id, day DESC);
CREATE INDEX IF NOT EXISTS user_stats_daily_user_day_idx
  ON user_stats_daily (org_id, user_id, day DESC);
