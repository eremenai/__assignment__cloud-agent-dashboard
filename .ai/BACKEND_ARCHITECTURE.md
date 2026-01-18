# Backend Architecture (V1)

This document defines the backend architecture for the Agent Cloud Monitoring Dashboard.

**Source specs:** `temp/INGESTION_AND_READMODELS_SPEC.md`, `temp/DATA_MODEL_AND_PIPELINES.md`

---

## Overview

Event-driven architecture with **append-only event store** and **pre-computed read models**.

```
┌─────────────────────┐
│  Drop-Copy Producer │  (upstream internal service - mocked for V1)
│  (all orgs)         │
└─────────┬───────────┘
          │ POST /internal/ingest/events (batch)
          ▼
┌─────────────────────┐     ┌──────────────┐
│  Analytics Ingest   │────▶│  events_raw  │  (append-only)
│  API                │────▶│  events_queue│  (processing queue)
└─────────────────────┘     └──────────────┘
                                   │
                                   ▼
                            ┌──────────────┐
                            │  Projection  │
                            │  Worker      │
                            └──────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             ┌───────────┐  ┌───────────┐  ┌───────────┐
             │run_facts  │  │session_   │  │(support   │
             │           │  │stats      │  │tables)    │
             └───────────┘  └───────────┘  └───────────┘
                    │              │              │
                    └──────────────┼──────────────┘
                                   ▼
                            ┌──────────────┐
                            │  Dashboard   │  (Next.js - read only)
                            │  App         │
                            └──────────────┘
```

---

## Runtime Components (V1)

| Component | Implementation | Container | Port | Notes |
|-----------|----------------|-----------|------|-------|
| **Ingest API** | Standalone Node.js (Fastify) | `ingest` | 3001 | Internal service-to-service only |
| **Projection Worker** | Node.js script | `worker` | - | Polls queue, no HTTP |
| **Dashboard App** | Next.js | `dashboard` | 3000 | Client-facing frontend + read APIs |
| **Mock Event Generator** | Node.js script | `generator` | - | Simulates drop-copy producer |
| **Database** | PostgreSQL 16 | `db` | 5432 | Single instance for V1 |

### Process Separation Rationale

```
┌─────────────────────────────────────────────────────────────────┐
│  INTERNAL NETWORK (service-to-service)                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ Drop-copy    │────▶│ Ingest API   │────▶│ PostgreSQL   │    │
│  │ Producer     │     │ :3001        │     │ :5432        │    │
│  └──────────────┘     └──────────────┘     └──────┬───────┘    │
│                                                    │            │
│                       ┌──────────────┐             │            │
│                       │ Worker       │◀────────────┤            │
│                       │ (polls)      │─────────────┤            │
│                       └──────────────┘             │            │
└────────────────────────────────────────────────────┼────────────┘
                                                     │
┌────────────────────────────────────────────────────┼────────────┐
│  CLIENT-FACING                                     │            │
│  ┌──────────────┐                                  │            │
│  │ Dashboard    │◀─────────────────────────────────┘            │
│  │ :3000        │  (reads only)                                 │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Why separate Ingest API from Dashboard:**
- Different trust boundaries (internal vs client-facing)
- Different scaling needs (ingest is write-heavy, dashboard is read-heavy)
- Different auth models (service-to-service vs user JWT)
- Cleaner security posture (no internal endpoints exposed to clients)

### Process Responsibilities

**Ingest API (`:3001` - internal only)**
- Standalone Fastify server (lightweight, fast)
- `POST /events` - validates schema, writes to `events_raw` + `events_queue`
- No auth in V1 (internal network assumption); mTLS in production
- Returns counts: received/inserted/ignored

**Projection Worker (long-running process, no HTTP)**
- **Execution model:** Long-running process with poll interval
- **Poll interval:** 2 seconds (configurable via `WORKER_POLL_INTERVAL_MS`)
- **Batch size:** 100 events per poll (configurable via `WORKER_BATCH_SIZE`)
- Claims batch with `FOR UPDATE SKIP LOCKED`
- Applies projection rules to `run_facts`, `session_stats`, and daily aggregates
- Marks rows as processed
- Handles failures with retry (increments `attempts`, records `last_error`)
- Graceful shutdown on SIGTERM/SIGINT

```
┌─────────────────────────────────────────────────────┐
│  Worker Loop                                        │
│                                                     │
│  while (running) {                                  │
│    1. BEGIN transaction                             │
│    2. SELECT ... FOR UPDATE SKIP LOCKED (batch)    │
│    3. For each event: apply projections            │
│    4. UPDATE events_queue SET processed_at = now() │
│    5. COMMIT                                        │
│    6. Sleep(POLL_INTERVAL) if batch was empty      │
│  }                                                  │
└─────────────────────────────────────────────────────┘
```

**Dashboard App (`:3000` - client-facing)**
- Next.js with App Router
- Reads from `session_stats`, `run_facts`, `events_raw`
- Never writes to analytics tables
- Handles end-user authentication (JWT)

---

## Database Schema

### Support Tables (stubbed for V1)

```sql
-- Organizations
CREATE TABLE orgs (
  org_id       TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users
CREATE TABLE users (
  user_id      TEXT PRIMARY KEY,
  email        TEXT UNIQUE,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Org membership
CREATE TABLE org_members (
  org_id     TEXT NOT NULL REFERENCES orgs(org_id),
  user_id    TEXT NOT NULL REFERENCES users(user_id),
  role       TEXT NOT NULL, -- "admin" | "member" | "viewer"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
```

### Event Store

```sql
-- Append-only event log (system of record)
CREATE TABLE events_raw (
  org_id      TEXT NOT NULL,
  event_id    TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type  TEXT NOT NULL,
  session_id  TEXT NOT NULL,
  user_id     TEXT NULL,
  run_id      TEXT NULL,
  payload     JSONB NOT NULL,
  PRIMARY KEY (org_id, event_id)
);

CREATE INDEX events_raw_org_time_idx
  ON events_raw (org_id, occurred_at DESC);
CREATE INDEX events_raw_org_session_time_idx
  ON events_raw (org_id, session_id, occurred_at DESC);
CREATE INDEX events_raw_org_run_idx
  ON events_raw (org_id, run_id);

-- Processing queue
CREATE TABLE events_queue (
  org_id       TEXT NOT NULL,
  event_id     TEXT NOT NULL,
  inserted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  attempts     INT NOT NULL DEFAULT 0,
  last_error   TEXT NULL,
  PRIMARY KEY (org_id, event_id)
);

CREATE INDEX events_queue_unprocessed_idx
  ON events_queue (inserted_at)
  WHERE processed_at IS NULL;
```

### Read Models

```sql
-- Per-run facts (for Session Detail, percentiles, user aggregates)
CREATE TABLE run_facts (
  org_id        TEXT NOT NULL,
  run_id        TEXT NOT NULL,
  session_id    TEXT NOT NULL,
  user_id       TEXT NULL,
  started_at    TIMESTAMPTZ NULL,
  completed_at  TIMESTAMPTZ NULL,
  status        TEXT NULL,   -- success | fail | timeout | cancelled
  duration_ms   BIGINT NULL,
  cost          NUMERIC NULL,
  input_tokens  BIGINT NULL,
  output_tokens BIGINT NULL,
  error_type    TEXT NULL,
  PRIMARY KEY (org_id, run_id)
);

CREATE INDEX run_facts_org_time_idx
  ON run_facts (org_id, completed_at DESC);
CREATE INDEX run_facts_org_session_idx
  ON run_facts (org_id, session_id, completed_at DESC);
CREATE INDEX run_facts_org_user_idx
  ON run_facts (org_id, user_id, completed_at DESC);

-- Per-session aggregates (primary read model)
CREATE TABLE session_stats (
  org_id                     TEXT NOT NULL,
  session_id                 TEXT NOT NULL,
  user_id                    TEXT NULL,  -- primary user (from first run)
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

CREATE INDEX session_stats_org_last_event_idx
  ON session_stats (org_id, last_event_at DESC);
CREATE INDEX session_stats_org_user_idx
  ON session_stats (org_id, user_id, last_event_at DESC);

-- Daily org aggregates (totals, not averages)
CREATE TABLE org_stats_daily (
  org_id                     TEXT NOT NULL,
  day                        DATE NOT NULL,

  -- Session counts
  sessions_count             BIGINT NOT NULL DEFAULT 0,
  sessions_with_handoff      BIGINT NOT NULL DEFAULT 0,
  sessions_with_post_handoff BIGINT NOT NULL DEFAULT 0,

  -- Run counts
  runs_count                 BIGINT NOT NULL DEFAULT 0,
  success_runs               BIGINT NOT NULL DEFAULT 0,
  failed_runs                BIGINT NOT NULL DEFAULT 0,

  -- Error breakdown by category
  errors_tool                BIGINT NOT NULL DEFAULT 0,  -- tool_error
  errors_model               BIGINT NOT NULL DEFAULT 0,  -- model_error
  errors_timeout             BIGINT NOT NULL DEFAULT 0,  -- timeout
  errors_other               BIGINT NOT NULL DEFAULT 0,  -- unknown/other

  -- Totals (sum, not avg)
  total_duration_ms          BIGINT NOT NULL DEFAULT 0,
  total_cost                 NUMERIC NOT NULL DEFAULT 0,
  total_input_tokens         BIGINT NOT NULL DEFAULT 0,
  total_output_tokens        BIGINT NOT NULL DEFAULT 0,

  -- Active users (distinct count)
  active_users_count         BIGINT NOT NULL DEFAULT 0,

  PRIMARY KEY (org_id, day)
);

CREATE INDEX org_stats_daily_org_day_idx
  ON org_stats_daily (org_id, day DESC);

-- Daily user aggregates (totals, not averages)
CREATE TABLE user_stats_daily (
  org_id                     TEXT NOT NULL,
  user_id                    TEXT NOT NULL,
  day                        DATE NOT NULL,

  -- Session counts
  sessions_count             BIGINT NOT NULL DEFAULT 0,
  sessions_with_handoff      BIGINT NOT NULL DEFAULT 0,
  sessions_with_post_handoff BIGINT NOT NULL DEFAULT 0,

  -- Run counts
  runs_count                 BIGINT NOT NULL DEFAULT 0,
  success_runs               BIGINT NOT NULL DEFAULT 0,
  failed_runs                BIGINT NOT NULL DEFAULT 0,

  -- Error breakdown by category
  errors_tool                BIGINT NOT NULL DEFAULT 0,
  errors_model               BIGINT NOT NULL DEFAULT 0,
  errors_timeout             BIGINT NOT NULL DEFAULT 0,
  errors_other               BIGINT NOT NULL DEFAULT 0,

  -- Totals (sum, not avg)
  total_duration_ms          BIGINT NOT NULL DEFAULT 0,
  total_cost                 NUMERIC NOT NULL DEFAULT 0,
  total_input_tokens         BIGINT NOT NULL DEFAULT 0,
  total_output_tokens        BIGINT NOT NULL DEFAULT 0,

  PRIMARY KEY (org_id, user_id, day)
);

CREATE INDEX user_stats_daily_org_day_idx
  ON user_stats_daily (org_id, day DESC);
CREATE INDEX user_stats_daily_user_day_idx
  ON user_stats_daily (org_id, user_id, day DESC);
```

**Note on daily aggregates:**
- Tables store **totals** (counts, sums), not averages
- Averages computed at query time: `SUM(total_cost) / SUM(sessions_count)`
- Allows flexible date range queries without pre-computing every possible window
- Worker updates daily aggregates on each event (upsert with increment)

### Percentiles (P95 Duration) - Limitation

**Problem:** Percentiles cannot be accurately pre-aggregated. You can't combine daily P95s to get a weekly P95.

**V1 Approach:** Compute P95 at query time from `run_facts`:

```sql
-- P95 run duration for date range (acceptable for V1 scale)
SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration
FROM run_facts
WHERE org_id = :org_id
  AND completed_at >= :range_start
  AND completed_at <= :range_end;
```

**Future options if this becomes slow:**
1. **Histogram buckets** - Store counts per duration bucket (0-1s, 1-5s, 5-30s, etc.) in daily aggregates. Approximate P95 from histogram.
2. **T-Digest** - Store serialized t-digest structure per day. Merge t-digests for date range queries. Accurate but complex.
3. **Materialized view** - Pre-compute percentiles for common date ranges (last 7d, 30d, 90d).

**Recommendation:** Start with query-time. Add histogram buckets if P95 queries exceed 100ms.

---

## Event Contract

### Envelope

```typescript
interface AnalyticsEvent {
  event_id: string;      // stable UUID from upstream
  org_id: string;
  occurred_at: string;   // RFC3339
  event_type: EventType;
  session_id: string;
  user_id: string | null;
  run_id: string | null; // required for run events
  payload: Record<string, unknown>;
}

type EventType =
  | "message_created"
  | "run_started"
  | "run_completed"
  | "local_handoff";
```

### Payloads

```typescript
// run_completed payload
interface RunCompletedPayload {
  status: "success" | "fail" | "timeout" | "cancelled";
  duration_ms: number;
  cost: number;          // USD
  input_tokens: number;
  output_tokens: number;
  error_type?: string;   // "tool_error" | "model_error" | "timeout" | "unknown"
}

// local_handoff payload
interface LocalHandoffPayload {
  method: "teleport" | "download" | "copy_patch" | "other";
}
```

---

## Ingest API

### Endpoint

`POST http://ingest:3001/events` (internal network only)

### Request

```json
{
  "events": [
    {
      "event_id": "evt_abc123",
      "org_id": "org_1",
      "occurred_at": "2026-01-18T10:00:00Z",
      "event_type": "run_completed",
      "session_id": "sess_xyz",
      "user_id": "user_1",
      "run_id": "run_456",
      "payload": {
        "status": "success",
        "duration_ms": 12500,
        "cost": 0.0234,
        "input_tokens": 1500,
        "output_tokens": 800
      }
    }
  ]
}
```

### Response

```json
{
  "received": 10,
  "inserted": 8,
  "ignored": 2,
  "errors": []
}
```

### Authentication

- **V1 (take-home):** No auth on ingest endpoint (internal network assumption)
- **Production:** mTLS or signed JWT identifying caller service

---

## Projection Rules

### General

- All projections are **out-of-order tolerant**
- Use `GREATEST`/`LEAST` for timestamps
- Use `ON CONFLICT ... DO UPDATE` for upserts
- Idempotency ensured by `event_id` uniqueness
- Daily aggregates keyed by `DATE(occurred_at)` of the event

### Event: `message_created`

**Updates:**
1. `session_stats` (upsert by org_id, session_id):
   - `first_message_at = LEAST(first_message_at, occurred_at)`
   - `last_event_at = GREATEST(last_event_at, occurred_at)`
   - `user_id = COALESCE(user_id, event.user_id)` (set if not already set)

2. `org_stats_daily` (upsert by org_id, day):
   - No change (messages don't affect daily counts directly)

3. `user_stats_daily` (upsert by org_id, user_id, day):
   - No change (messages don't affect daily counts directly)

### Event: `run_started`

**Updates:**
1. `run_facts` (upsert by org_id, run_id):
   - `started_at = LEAST(started_at, occurred_at)`
   - `session_id`, `user_id` (set if not already set)

2. `session_stats`:
   - `last_event_at = GREATEST(last_event_at, occurred_at)`

### Event: `run_completed`

**Updates:**
1. `run_facts` (upsert by org_id, run_id):
   - `completed_at = GREATEST(completed_at, occurred_at)`
   - `status`, `duration_ms`, `cost`, `input_tokens`, `output_tokens`, `error_type`

2. `session_stats` (upsert by org_id, session_id):
   - `runs_count += 1`
   - `active_agent_time_ms += duration_ms`
   - `cost_total += cost`
   - `input_tokens_total += input_tokens`
   - `output_tokens_total += output_tokens`
   - `success_runs += 1` if status='success' else `failed_runs += 1`
   - `last_event_at = GREATEST(last_event_at, occurred_at)`
   - Check post-handoff iteration (see below)

3. `org_stats_daily` (upsert by org_id, DATE(occurred_at)):
   - `runs_count += 1`
   - `success_runs += 1` or `failed_runs += 1`
   - `total_duration_ms += duration_ms`
   - `total_cost += cost`
   - `total_input_tokens += input_tokens`
   - `total_output_tokens += output_tokens`
   - Error category increment (if status != 'success'):
     - `errors_tool += 1` if error_type = 'tool_error'
     - `errors_model += 1` if error_type = 'model_error'
     - `errors_timeout += 1` if error_type = 'timeout'
     - `errors_other += 1` otherwise (unknown, cancelled, etc.)

4. `user_stats_daily` (upsert by org_id, user_id, DATE(occurred_at)):
   - Same increments as org_stats_daily (including error categories)

### Event: `local_handoff`

**Updates:**
1. `session_stats` (upsert by org_id, session_id):
   - `handoffs_count += 1`
   - `last_handoff_at = GREATEST(last_handoff_at, occurred_at)`
   - `last_event_at = GREATEST(last_event_at, occurred_at)`
   - Check post-handoff iteration (retroactive, see below)

2. `org_stats_daily` / `user_stats_daily`:
   - Session-level handoff flags updated via separate logic (see below)

### Post-Handoff Iteration Window

Constant: `POST_HANDOFF_WINDOW = 4 hours`

A session has post-handoff iteration if any run completes within `POST_HANDOFF_WINDOW` after a handoff.

**On run_completed:**
- If `session_stats.last_handoff_at` exists AND `occurred_at` is in `(last_handoff_at, last_handoff_at + 4h]`
- Set `session_stats.has_post_handoff_iteration = true`

**On local_handoff:**
- Query `run_facts` for this session
- If any run has `completed_at` in `(handoff_time, handoff_time + 4h]`
- Set `session_stats.has_post_handoff_iteration = true`

### Daily Aggregate: Session Counts

Session counts in daily aggregates are tricky because a session can span multiple days.

**Approach:** Attribute session to the day of `first_message_at`.

On first event of a session (when `session_stats` row is created):
1. Determine `day = DATE(first_message_at)`
2. Increment `org_stats_daily.sessions_count` for that day
3. Increment `user_stats_daily.sessions_count` for that day

On handoff/post-handoff flags changing:
1. Update the daily aggregate for the session's `first_message_at` day
2. Increment `sessions_with_handoff` or `sessions_with_post_handoff` as needed

**Note:** This means daily aggregates for sessions are eventually consistent. If a session starts on day N and gets a handoff on day N+1, the handoff count is attributed to day N.

---

## Dashboard Query Patterns

### Overview Page (using daily aggregates)

```sql
-- Aggregate KPIs from daily rollups (fast)
SELECT
  SUM(sessions_count) as total_sessions,
  SUM(runs_count) as total_runs,
  SUM(success_runs) as total_success,
  SUM(failed_runs) as total_failed,
  SUM(total_cost) as total_cost,
  SUM(total_input_tokens) as total_input_tokens,
  SUM(total_output_tokens) as total_output_tokens,
  SUM(total_duration_ms) as total_duration_ms,
  SUM(sessions_with_handoff) as sessions_with_handoff,
  SUM(sessions_with_post_handoff) as sessions_with_post_handoff,
  SUM(active_users_count) as active_users_approx  -- note: may double-count across days
FROM org_stats_daily
WHERE org_id = :org_id
  AND day >= :range_start::date
  AND day <= :range_end::date;

-- Compute averages in application:
-- avg_runs_per_session = total_runs / total_sessions
-- avg_cost_per_session = total_cost / total_sessions
-- success_rate = total_success / total_runs
-- handoff_rate = sessions_with_handoff / total_sessions
```

### Overview Page (trend charts)

```sql
-- Daily trend data for charts
SELECT
  day,
  sessions_count,
  runs_count,
  success_runs,
  failed_runs,
  total_cost,
  active_users_count
FROM org_stats_daily
WHERE org_id = :org_id
  AND day >= :range_start::date
  AND day <= :range_end::date
ORDER BY day;
```

### Sessions List

```sql
SELECT *
FROM session_stats
WHERE org_id = :org_id
  AND first_message_at <= :range_end
  AND last_event_at >= :range_start
ORDER BY last_event_at DESC
LIMIT :limit OFFSET :offset;
```

### Session Detail

```sql
-- Timeline
SELECT * FROM events_raw
WHERE org_id = :org_id AND session_id = :session_id
ORDER BY occurred_at;

-- Runs
SELECT * FROM run_facts
WHERE org_id = :org_id AND session_id = :session_id
ORDER BY completed_at;
```

### Users Page (using daily aggregates)

```sql
-- User comparison table
SELECT
  usd.user_id,
  u.display_name,
  u.email,
  SUM(usd.sessions_count) as total_sessions,
  SUM(usd.runs_count) as total_runs,
  SUM(usd.success_runs) as success_runs,
  SUM(usd.failed_runs) as failed_runs,
  SUM(usd.total_cost) as total_cost,
  SUM(usd.total_duration_ms) as total_duration_ms,
  SUM(usd.sessions_with_handoff) as sessions_with_handoff,
  SUM(usd.sessions_with_post_handoff) as sessions_with_post_handoff
FROM user_stats_daily usd
JOIN users u ON u.user_id = usd.user_id
WHERE usd.org_id = :org_id
  AND usd.day >= :range_start::date
  AND usd.day <= :range_end::date
GROUP BY usd.user_id, u.display_name, u.email
ORDER BY total_runs DESC
LIMIT :limit OFFSET :offset;

-- Compute per-user averages in application:
-- avg_runs_per_session = total_runs / total_sessions
-- success_rate = success_runs / total_runs
-- handoff_rate = sessions_with_handoff / total_sessions
```

### User Detail Page

```sql
-- User trend over time
SELECT
  day,
  sessions_count,
  runs_count,
  success_runs,
  failed_runs,
  total_cost
FROM user_stats_daily
WHERE org_id = :org_id
  AND user_id = :user_id
  AND day >= :range_start::date
  AND day <= :range_end::date
ORDER BY day;

-- User's sessions (from session_stats)
SELECT *
FROM session_stats
WHERE org_id = :org_id
  AND user_id = :user_id
  AND first_message_at <= :range_end
  AND last_event_at >= :range_start
ORDER BY last_event_at DESC
LIMIT :limit OFFSET :offset;
```

---

## Mock Data Strategy

### Test Organizations

| Org ID | Name | Users | Usage Pattern | Sessions/day |
|--------|------|-------|---------------|--------------|
| `org_small` | Small Startup | 2 | Rare | 1-2 |
| `org_medium` | Medium Team | 5 | Medium | 5-10 |
| `org_large` | Large Corp | 10 | Heavy | 20-30 |

### Seed Data (SQL Init Script)

Pre-populated historical data covering **last 5 months**:
- Applied automatically on first `docker compose up`
- **Inserts into `events_raw` + `events_queue` only** - worker processes into read models
- Single user per session
- Mix of handoff scenarios (~30% of sessions have handoffs)

**Success rates by org:**
| Org | Success Rate | Notes |
|-----|--------------|-------|
| Small | 90% | Few users, careful usage |
| Medium | 80% | Typical team |
| Large | 75% | More edge cases, experimentation |

**Session characteristics:**
- 1-15 runs per session (weighted toward 2-5)
- Run duration: 5s - 5min (p50 ~30s)
- Cost per run: $0.001 - $0.50 (p50 ~$0.02)
- Tokens: 100 - 50,000 per run

### Mock Event Generator (CLI)

CLI tool for generating historical event data. Simulates complete days, not real-time.

**Usage:**
```bash
# Generate 30 days of history ending today
pnpm generate --days 30

# Generate specific date range
pnpm generate --from 2025-08-01 --to 2025-12-31

# Generate and send to ingest API (vs direct DB insert)
pnpm generate --days 30 --via-api

# Dry run (show what would be generated)
pnpm generate --days 7 --dry-run
```

**Behavior:**
- Generates complete event sequences per session (message → runs → optional handoff)
- Respects org-specific patterns (usage rate, success rate per org)
- Events distributed across working hours (8am-8pm, weighted toward business hours)
- **Calls Ingest API** (`POST http://localhost:3001/events`) - never writes to DB directly
- Tests full pipeline: Generator → Ingest API → DB → Worker → Read Models
- Idempotent: re-running same date range skips already-generated events (via event_id)

**Generated volume per simulated day:**
| Org | Sessions | Events (approx) |
|-----|----------|-----------------|
| Small | 1-2 | 10-30 |
| Medium | 5-10 | 50-150 |
| Large | 20-30 | 200-500 |

### Development Workflow

| Component | Runs in | Notes |
|-----------|---------|-------|
| PostgreSQL | Docker | `docker compose up db` |
| Next.js (dashboard) | Local | `pnpm dev` with hot reload |
| Worker | Local | `pnpm worker:dev` |
| Generator | Docker (optional) | Via `--profile with-generator` |

**No frontend mock layer** - all data comes from DB, even in development.

---

## Docker Compose Services (V1)

### Development (hybrid - recommended)

```yaml
# docker-compose.yml - DB only for local dev
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: analytics
      POSTGRES_USER: analytics
      POSTGRES_PASSWORD: dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/01-init.sql
      - ./scripts/seed-data.sql:/docker-entrypoint-initdb.d/02-seed.sql
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

**Local dev commands:**
```bash
docker compose up db          # Start PostgreSQL only
pnpm dev                      # Dashboard (Next.js) with hot reload
pnpm ingest:dev               # Ingest API (Fastify) with hot reload
pnpm worker:dev               # Worker with hot reload
```

### Production-like (all in containers)

```yaml
# docker-compose.prod.yml - full stack
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: analytics
      POSTGRES_USER: analytics
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/01-init.sql
      - ./scripts/seed-data.sql:/docker-entrypoint-initdb.d/02-seed.sql

  ingest:
    build:
      context: .
      dockerfile: Dockerfile.ingest
    environment:
      DATABASE_URL: postgres://analytics:${DB_PASSWORD}@db:5432/analytics
      PORT: 3001
    ports:
      - "3001:3001"  # Only exposed internally in production
    depends_on:
      - db

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      DATABASE_URL: postgres://analytics:${DB_PASSWORD}@db:5432/analytics
    depends_on:
      - db

  dashboard:
    build:
      context: ./dashboard-app
    environment:
      DATABASE_URL: postgres://analytics:${DB_PASSWORD}@db:5432/analytics
    ports:
      - "3000:3000"
    depends_on:
      - db

  generator:
    build:
      context: .
      dockerfile: Dockerfile.generator
    environment:
      INGEST_URL: http://ingest:3001/events
    depends_on:
      - ingest
    profiles:
      - with-generator

volumes:
  postgres_data:
```

---

## Integration Tests

Integration tests verify the full ingest → worker → read model pipeline.

### Test Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│  Integration Test                                               │
│                                                                 │
│  1. Setup: Clean test DB (truncate tables)                     │
│  2. Generate: Create test events with known values             │
│  3. Ingest: POST events to Ingest API                          │
│  4. Process: Run worker (or wait for poll)                     │
│  5. Assert: Query read models, verify expected values          │
│  6. Teardown: Clean up                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Test Cases

**Ingest API Tests:**
- `ingest.valid-batch` - accepts valid event batch, returns correct counts
- `ingest.idempotent` - duplicate event_id ignored, no error
- `ingest.invalid-schema` - rejects malformed events with errors
- `ingest.partial-batch` - valid events accepted, invalid rejected

**Projection Worker Tests:**
- `worker.run-completed` - updates `run_facts`, `session_stats`, daily aggregates
- `worker.message-created` - updates `session_stats.first_message_at`
- `worker.local-handoff` - updates handoff counts, checks post-handoff iteration
- `worker.out-of-order` - events processed correctly regardless of arrival order
- `worker.post-handoff-iteration` - flag set when run follows handoff within window

**End-to-End Pipeline Tests:**
- `e2e.full-session` - complete session lifecycle (message → runs → handoff)
- `e2e.multi-org` - events for different orgs isolated correctly
- `e2e.daily-aggregates` - daily rollups computed correctly for date range

### Running Tests

```bash
# Start test infrastructure (DB + Ingest API)
docker compose -f docker-compose.test.yml up -d

# Run integration tests
pnpm test:integration

# Run with coverage
pnpm test:integration --coverage

# Tear down
docker compose -f docker-compose.test.yml down -v
```

### Test Infrastructure (docker-compose.test.yml)

```yaml
services:
  db-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: analytics_test
      POSTGRES_USER: analytics
      POSTGRES_PASSWORD: test_password
    volumes:
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/01-init.sql
      # No seed data for tests - each test controls its own data
    ports:
      - "5433:5432"  # Different port to avoid conflict with dev DB
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U analytics -d analytics_test"]
      interval: 2s
      timeout: 5s
      retries: 10

  ingest-test:
    build:
      context: .
      dockerfile: Dockerfile.ingest
    environment:
      DATABASE_URL: postgres://analytics:test_password@db-test:5432/analytics_test
      PORT: 3001
    ports:
      - "3101:3001"  # Different port for test ingest
    depends_on:
      db-test:
        condition: service_healthy

  worker-test:
    build:
      context: .
      dockerfile: Dockerfile.worker
    environment:
      DATABASE_URL: postgres://analytics:test_password@db-test:5432/analytics_test
      WORKER_POLL_INTERVAL_MS: 100  # Faster polling for tests
      WORKER_BATCH_SIZE: 10
    depends_on:
      db-test:
        condition: service_healthy
```

### Test Environment Variables

```bash
# .env.test
DATABASE_URL=postgres://analytics:test_password@localhost:5433/analytics_test
INGEST_URL=http://localhost:3101/events
```

### Test Lifecycle

1. **Before all tests:** `docker compose -f docker-compose.test.yml up -d`
2. **Before each test suite:** Truncate all tables
3. **Test:** Generate events → POST to Ingest API → Wait for worker → Assert read models
4. **After all tests:** `docker compose -f docker-compose.test.yml down -v`

---

## Tradeoffs & Future Steps

See `.ai/TRADEOFFS_FUTURE_STEPS.md` for comprehensive list including:

**Critical (before production):**
- Service-to-service auth on Ingest API
- Row-Level Security in database
- Real identity provider integration

**High priority:**
- Daily rollups for query performance at scale
- Data retention/archiving strategy
- Monitoring and alerting

**Deferred features:**
- Teams UI
- External integrations
- Tagging system

---

## Related Documents

- `.ai/TECH_STACK.md` - Technology choices
- `.ai/AUTH_AND_ROLES.md` - Authentication model
- `.ai/ROADMAP.md` - Implementation phases
- `temp/INGESTION_AND_READMODELS_SPEC.md` - Original ingestion spec
- `temp/DATA_MODEL_AND_PIPELINES.md` - Full data model spec
