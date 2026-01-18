# Agent Cloud Monitoring — Data Model & Pipelines (V1)

This document defines **all tables, schemas, and pipeline responsibilities**:
- database tables (schemas + indexes)
- producers/consumers (who writes/reads what)
- processing pipelines (ingestion → queue → projections → UI queries)
- failure modes and out-of-order handling

V1 scope constraints:
- Org-facing analytics for **cloud-executed coding tasks**
- **No external integrations**
- **No tagging**
- **No explicit acceptance**
- Analytics centered on **session friction metrics** and cost/perf

---

## 0) Glossary (canonical entities)

- **org**: customer organization (multi-tenant boundary). Key: `org_id`.
- **user**: a member of an org who initiates sessions/runs.
- **session**: a chat thread / conversation context.
- **run**: one cloud execution attempt inside a session.
- **event**: immutable fact emitted by internal systems (message created, run completed, handoff, …).
- **local handoff**: user exports/teleports results to local environment (1+ times per session).

---

## 1) Runtime components (processes)

### 1.1 Drop-copy Producer (upstream internal service)
- Listens to cloud agent platform events across **all orgs**
- Adds `org_id` and forwards a batch to Ingest API
- Provides stable `event_id` per org (assumption)
- Events may arrive out of order

### 1.2 Analytics Ingest API (internal-only)
- Validates schema
- Writes to `events_raw` (append-only, idempotent)
- Enqueues to `events_queue` (idempotent)

### 1.3 Projection Worker (Level 1)
- Claims from `events_queue` with `FOR UPDATE SKIP LOCKED`
- Reads payload from `events_raw`
- Upserts `run_facts` and updates `session_stats`
- Marks queue rows processed
- Out-of-order tolerant (includes correction logic for post-handoff iteration)

### 1.4 Dashboard App (Next.js)
- End-user auth (separate from ingest; may be stubbed)
- Reads from read models (`session_stats`, `run_facts`, `events_raw`) to render:
  - Overview
  - Sessions list
  - Session detail
  - Users comparison
- Writes nothing to analytics tables (read-only)

---

## 2) Data flow (sequence)

### 2.1 Ingestion (append-only + queue) — idempotent
1. Producer sends `POST /internal/ingest/events` with `events[]`
2. Ingest API transaction:
   - `INSERT INTO events_raw ... ON CONFLICT (org_id, event_id) DO NOTHING`
   - `INSERT INTO events_queue ... ON CONFLICT (org_id, event_id) DO NOTHING`
3. Response includes counts: received/inserted/ignored

### 2.2 Projection (queue → read models)
1. Worker claims unprocessed queue rows:
   - `SELECT ... WHERE processed_at IS NULL ... FOR UPDATE SKIP LOCKED`
2. For each `(org_id, event_id)`:
   - reads the `events_raw` row
   - applies projection rules
3. Marks `processed_at = now()` for the claimed batch
4. On failure:
   - increments `attempts`
   - records `last_error`
   - leaves row unprocessed for retry (dead-letter is future step)

---

## 3) Assumptions (explicit)
- Upstream provides stable unique `event_id` per org.
- Events can arrive out of order.
- Ingest is internal-only; auth is service-to-service (documented; not implemented in take-home).
- Postgres is the system of record; Redis not required for V1.

---

## 4) Tables (schemas + responsibilities)

> Note: Support tables (orgs/users/memberships) may be stubbed for take-home, but are included for completeness.

---

### 4.1 `orgs` (support table)
**Written by**: Auth/Admin provisioning (not analytics ingest)  
**Read by**: Dashboard app

```sql
CREATE TABLE orgs (
  org_id       TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.2 `users` (support table)
**Written by**: Auth service  
**Read by**: Dashboard app, user aggregates (display)

```sql
CREATE TABLE users (
  user_id      TEXT PRIMARY KEY,
  email        TEXT UNIQUE,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.3 `org_members` (support table)
**Written by**: Auth service  
**Read by**: Dashboard app (authorization)

```sql
CREATE TABLE org_members (
  org_id    TEXT NOT NULL REFERENCES orgs(org_id),
  user_id   TEXT NOT NULL REFERENCES users(user_id),
  role      TEXT NOT NULL, -- "admin" | "member" | "viewer"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
```

---

## 5) Event store + queue (system of record)

### 5.1 `events_raw` (append-only event log)
**Written by**: Ingest API only  
**Read by**: Projection Worker; Dashboard timeline (Session Detail)

```sql
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
```

Partitioning (future step):
- partition by `occurred_at` (monthly) or Timescale hypertable.

### 5.2 `events_queue` (projection queue)
**Written by**: Ingest API only  
**Read/Updated by**: Projection Worker

```sql
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

Worker claim pattern:
```sql
SELECT org_id, event_id
FROM events_queue
WHERE processed_at IS NULL
ORDER BY inserted_at
LIMIT $1
FOR UPDATE SKIP LOCKED;
```

---

## 6) Facts + read models (serving tables)

### 6.1 `run_facts` (recommended)
**Written by**: Projection Worker  
**Read by**: Dashboard (Session Detail, percentiles, user aggregates)

```sql
CREATE TABLE run_facts (
  org_id      TEXT NOT NULL,
  run_id      TEXT NOT NULL,

  session_id  TEXT NOT NULL,
  user_id     TEXT NULL,

  started_at   TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,

  status      TEXT NULL,   -- success | fail | timeout | cancelled
  duration_ms BIGINT NULL,
  cost        NUMERIC NULL,

  input_tokens  BIGINT NULL,
  output_tokens BIGINT NULL,

  error_type  TEXT NULL,

  PRIMARY KEY (org_id, run_id)
);

CREATE INDEX run_facts_org_time_idx
  ON run_facts (org_id, completed_at DESC);

CREATE INDEX run_facts_org_session_idx
  ON run_facts (org_id, session_id, completed_at DESC);

CREATE INDEX run_facts_org_user_idx
  ON run_facts (org_id, user_id, completed_at DESC);
```

### 6.2 `session_stats` (primary read model)
**Written by**: Projection Worker  
**Read by**: Dashboard (Overview, Sessions list, Session header)

```sql
CREATE TABLE session_stats (
  org_id      TEXT NOT NULL,
  session_id  TEXT NOT NULL,

  first_message_at TIMESTAMPTZ NULL,
  last_event_at    TIMESTAMPTZ NULL,

  runs_count BIGINT NOT NULL DEFAULT 0,
  active_agent_time_ms BIGINT NOT NULL DEFAULT 0,

  handoffs_count BIGINT NOT NULL DEFAULT 0,
  last_handoff_at TIMESTAMPTZ NULL,

  has_post_handoff_iteration BOOLEAN NOT NULL DEFAULT false,

  success_runs BIGINT NOT NULL DEFAULT 0,
  failed_runs  BIGINT NOT NULL DEFAULT 0,

  cost_total NUMERIC NOT NULL DEFAULT 0,

  input_tokens_total  BIGINT NOT NULL DEFAULT 0,
  output_tokens_total BIGINT NOT NULL DEFAULT 0,

  PRIMARY KEY (org_id, session_id)
);

CREATE INDEX session_stats_org_last_event_idx
  ON session_stats (org_id, last_event_at DESC);
```

---

## 7) Event contract (minimum)

### 7.1 Event envelope
- `event_id` (stable; upstream-provided)
- `org_id`
- `occurred_at` (RFC3339)
- `event_type`
- `session_id`
- `user_id` (nullable)
- `run_id` (nullable; required for run events)
- `payload` JSON

### 7.2 Event types (V1)
- `message_created`
- `run_started`
- `run_completed` payload includes:
  - `status`, `duration_ms`, `cost`, `input_tokens`, `output_tokens`, `error_type?`
- `local_handoff` payload includes:
  - `method`

---

## 8) Projection logic (who populates what; out-of-order safe)

Constant:
- `X` = post-handoff iteration window (e.g., 4 hours; config)

General rules:
- `session_stats.last_event_at = GREATEST(last_event_at, occurred_at)`
- `session_stats.first_message_at = LEAST(first_message_at, occurred_at)` (for message events)
- `run_facts` UPSERT keyed by `(org_id, run_id)`.

### 8.1 message_created
Writes:
- `session_stats` (upsert):
  - `first_message_at = MIN(first_message_at, occurred_at)`
  - `last_event_at = MAX(last_event_at, occurred_at)`

### 8.2 run_started
Writes:
- `run_facts` (upsert):
  - `started_at = MIN(started_at, occurred_at)`
- `session_stats.last_event_at = MAX(...)`

### 8.3 run_completed
Writes:
- `run_facts` (upsert by org_id+run_id):
  - `completed_at = MAX(completed_at, occurred_at)`
  - set/overwrite: `status`, `duration_ms`, `cost`, `input_tokens`, `output_tokens`, `error_type`
- `session_stats` (upsert + increments):
  - `runs_count += 1`
  - `active_agent_time_ms += duration_ms`
  - `cost_total += cost`
  - `input_tokens_total += input_tokens`
  - `output_tokens_total += output_tokens`
  - `success_runs += 1` if status=success else `failed_runs += 1`
  - `last_event_at = MAX(...)`

Post-handoff iteration (run-side rule):
- if `last_handoff_at` exists and `occurred_at` in `(last_handoff_at, last_handoff_at + X]`
  - set `has_post_handoff_iteration = true`

### 8.4 local_handoff
Writes:
- `session_stats`:
  - `handoffs_count += 1`
  - `last_handoff_at = MAX(last_handoff_at, occurred_at)`
  - `last_event_at = MAX(...)`

Post-handoff iteration (handoff-side correction):
- Query `run_facts` for this `(org_id, session_id)`:
  - if any run has `completed_at` in `(handoff_time, handoff_time + X]`
    - set `has_post_handoff_iteration = true`

---

## 9) Who writes/reads what (matrix)

| Table | Populated by | Read by | Notes |
|---|---|---|---|
| orgs | Auth/Admin | Dashboard | Optional stub in take-home |
| users | Auth/Admin | Dashboard | Optional stub in take-home |
| org_members | Auth/Admin | Dashboard | Optional stub in take-home |
| events_raw | Ingest API | Worker; Dashboard | Source of truth + timeline |
| events_queue | Ingest API | Worker | Idempotent processing queue |
| run_facts | Worker | Dashboard | Per-run drilldown + p95 |
| session_stats | Worker | Dashboard | Sessions list + core KPIs |

---

## 10) Dashboard read model usage (by page)

### 10.1 Overview (`/dashboard`)
Reads:
- Aggregates over `session_stats` for:
  - avg runs/session
  - avg active agent time/session
  - avg session lifespan
  - local handoff rate
  - post-handoff iteration rate
  - total cost (also from session_stats)
- `run_facts` for:
  - p95 run duration
  - run-based trends (optional)
- Top Sessions: from `session_stats`

### 10.2 Sessions (`/sessions`)
Reads:
- `session_stats` filtered by:
  - status (failed_runs > 0)
  - cost range / runs range / handoff / post-handoff
  - time window (see open decision below)

### 10.3 Session Detail (`/sessions/:sessionId`)
Reads:
- Header KPIs: `session_stats`
- Timeline: `events_raw` filtered by `(org_id, session_id)` ordered by `occurred_at`
- Runs table: `run_facts` filtered by `(org_id, session_id)` ordered by `completed_at`
- Handoff history: `events_raw` where `event_type='local_handoff'`

### 10.4 Users (`/users`)
Reads:
- Aggregate by `user_id` from `run_facts` (runs, cost, tokens, active time)
- Session-based metrics by user from:
  - `session_stats` joined via `(org_id, session_id)` and session-to-user association derived from run_facts.user_id

Future step if needed:
- Add `user_stats_daily` rollup.

---

## 11) Failure handling & retries

### 11.1 Ingest API
- Invalid schema: reject with per-item errors (HTTP 400/422)
- DB failure: fail request; producer retries safely (idempotency)

### 11.2 Worker
- Processing failure:
  - `attempts += 1`
  - set `last_error`
  - keep `processed_at` null for retry
- Future step:
  - dead-letter after N attempts

---

## 12) Date-range semantics (resolved)

**Rule (V1): show any session that intersects the selected date range.**

We model a session as a time interval:
- `session_start = first_message_at`
- `session_end = last_event_at`

A session is included if it overlaps the selected range `[range_start, range_end]`:

- `session_start <= range_end AND session_end >= range_start`

This satisfies: “if any event (any part of the session lifespan) appears in our date-range — show it”.

### Canonical SQL snippet (used by Sessions list and any session-based aggregate)

```sql
-- inclusive overlap filter
WHERE ss.org_id = :org_id
  AND ss.first_message_at IS NOT NULL
  AND ss.last_event_at IS NOT NULL
  AND ss.first_message_at <= :range_end
  AND ss.last_event_at >= :range_start
```

### Edge cases
- If `first_message_at` is null (unexpected in V1), either:
  - treat the earliest known event timestamp as `session_start`, or
  - exclude the session until a first message arrives.
- If `last_event_at` is null, treat it as `first_message_at` (single-event session), or exclude until available.



**When applying date-range filters for sessions, what is the primary anchor?**

Choose one:
- **A) `last_event_at`** (sessions active in range)
- **B) `first_message_at`** (sessions started in range)
- **C) both (two tabs / toggle)**

