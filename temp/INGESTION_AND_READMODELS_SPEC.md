# Agent Cloud Monitoring — Ingestion & Read Models Spec (V1)

This document defines **how analytics events are ingested and transformed into queryable read models** for the customer-facing org dashboard.

## Scope (V1)

- Customer-facing org-level analytics for **cloud-executed coding tasks** (agent runs executed in the cloud).
- **No external integrations** (no GitHub / PR lifecycle / CI hooks).
- **No tagging**.
- **No explicit “acceptance”** state (sessions/chats persist).
- The dashboard is powered by **session-centric friction metrics**:
  - avg runs per session
  - avg active agent time per session
  - avg session lifespan
  - local handoff rate
  - post-handoff iteration rate

## Assumptions

- Upstream cloud event pipeline provides a **stable unique `event_id`** for every event (per org).
- Events can arrive **out of order** (e.g., a `run_completed` can arrive before `run_started`, a `local_handoff` can arrive late).
- A single internal service ("drop-copy") forwards events **for all orgs** and includes `org_id` on each event.
- Event ingestion is **internal-only** (service-to-service). End-user auth is separate from ingest auth.
- Data volume is moderate for a take-home (Postgres is sufficient).

## Non-goals (for take-home)

- Full production service-to-service auth (mTLS, signed JWT with rotation, etc.). **Documented as future step.**
- Full retention strategy + partitions/hypertables + archiving. **Documented as future step.**
- Exactly-once delivery end-to-end. We implement **idempotent ingest** + **idempotent processing**.

---

# 1) Event model

## 1.1 Event envelope (batch-friendly)

Each event includes:

- `event_id: string` (UUID or stable ID from upstream)
- `org_id: string`
- `occurred_at: string` (RFC3339 timestamp when the event happened)
- `event_type: string` (enum)
- `session_id: string` (required for V1 events)
- `user_id: string | null` (nullable when service-generated)
- `run_id: string | null` (required for run events)
- `payload: object` (JSON payload for event-type specific fields)

## 1.2 Event types (V1 minimum)

1) `message_created`
- payload: optional metadata (e.g., message length)

2) `run_started`
- payload: optional runner metadata

3) `run_completed`
- payload (required for dashboard metrics):
  - `status: "success" | "fail" | "timeout" | "cancelled"`
  - `duration_ms: number`
  - `cost: number` (currency assumed USD in V1)
  - `input_tokens: number`
  - `output_tokens: number`
  - `error_type?: string` (e.g., "tool_error", "model_error", "timeout", "unknown")

4) `local_handoff`
- payload:
  - `method: "teleport" | "download" | "copy_patch" | "other"` (keep open)
  - optional: client metadata

---

# 2) Ingestion interface

## 2.1 Endpoint

`POST /internal/ingest/events`

Body:
```json
{
  "events": [ /* Event[] */ ]
}
```

Behavior:
- Accepts **batches** to reduce overhead.
- Returns:
  - counts: received / inserted / ignored (due to idempotency)
  - (optional) per-event error list for invalid schema

## 2.2 Authentication (internal-only, not per-org)

Because the ingest caller sees **all orgs**, we do **service-level authentication**, not per-org keys.

- Recommended production approach: mTLS or signed JWT identifying the caller service.
- Take-home: **not implemented**, but documented.

Security invariant:
- `org_id` is accepted only from **authenticated internal services**.

---

# 3) Idempotency & durability

We require idempotency at **two stages**:
1) raw event insert
2) processing into read models

## 3.1 Raw event insert idempotency

Use a **unique constraint** on `(org_id, event_id)` and insert with conflict-ignore:
- `INSERT ... ON CONFLICT (org_id, event_id) DO NOTHING`

This makes retries safe.

## 3.2 Processing idempotency (Approach 1)

We implement an internal **queue table** and mark processed rows:
- Ingest writes to `events_raw` and also to `events_queue` (both conflict-ignore).
- Worker claims unprocessed rows using `FOR UPDATE SKIP LOCKED`, applies read model updates, then marks them processed.

This gives:
- "at least once" delivery from queue → worker,
- but "effectively once" updates to aggregates due to processing discipline.

---

# 4) Storage layout (Postgres)

## 4.1 Append-only raw store

`events_raw` (append-only, system of record)
- `org_id TEXT NOT NULL`
- `event_id TEXT NOT NULL`
- `occurred_at TIMESTAMPTZ NOT NULL`
- `inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `event_type TEXT NOT NULL`
- `session_id TEXT NOT NULL`
- `user_id TEXT NULL`
- `run_id TEXT NULL`
- `payload JSONB NOT NULL`
- **UNIQUE (org_id, event_id)**

Partitioning (future step):
- time partitions by `occurred_at` (monthly) or use Timescale hypertable.

## 4.2 Queue table

`events_queue`
- `org_id TEXT NOT NULL`
- `event_id TEXT NOT NULL`
- `inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `processed_at TIMESTAMPTZ NULL`
- `attempts INT NOT NULL DEFAULT 0`
- `last_error TEXT NULL`
- **UNIQUE (org_id, event_id)**

## 4.3 Optional run facts table (highly recommended for Session Detail)

`run_facts`
- `org_id TEXT NOT NULL`
- `run_id TEXT NOT NULL`
- `session_id TEXT NOT NULL`
- `user_id TEXT NULL`
- `started_at TIMESTAMPTZ NULL`
- `completed_at TIMESTAMPTZ NULL`
- `status TEXT NULL`
- `duration_ms BIGINT NULL`
- `cost NUMERIC NULL`
- `input_tokens BIGINT NULL`
- `output_tokens BIGINT NULL`
- `error_type TEXT NULL`
- **UNIQUE (org_id, run_id)**

This enables:
- per-run breakdown in Session Detail
- p95 duration query from runs
- out-of-order tolerance (upsert by run_id)

## 4.4 Read models (dashboard tables)

### `session_stats` (one row per session)

Primary source for Sessions page and many org/user aggregates.

- `org_id TEXT NOT NULL`
- `session_id TEXT NOT NULL`
- `first_message_at TIMESTAMPTZ NULL`
- `last_event_at TIMESTAMPTZ NULL`
- `runs_count BIGINT NOT NULL DEFAULT 0`
- `active_agent_time_ms BIGINT NOT NULL DEFAULT 0`
- `handoffs_count BIGINT NOT NULL DEFAULT 0`
- `last_handoff_at TIMESTAMPTZ NULL`
- `has_post_handoff_iteration BOOLEAN NOT NULL DEFAULT false`
- `success_runs BIGINT NOT NULL DEFAULT 0`
- `failed_runs BIGINT NOT NULL DEFAULT 0`
- `cost_total NUMERIC NOT NULL DEFAULT 0`
- `input_tokens_total BIGINT NOT NULL DEFAULT 0`
- `output_tokens_total BIGINT NOT NULL DEFAULT 0`
- **PRIMARY KEY (org_id, session_id)**

### Optional daily rollups (trade-off / future step)

- `org_stats_daily(org_id, day, ...)`
- `user_stats_daily(org_id, user_id, day, ...)`

Given out-of-order events, these are either:
- computed on demand from `session_stats` / `run_facts`, or
- maintained incrementally plus a correction job.

For take-home, prefer **query-time aggregation** unless dataset grows.

---

# 5) Level 1 processing (worker)

## 5.1 Ingest transaction

For each event in a batch (single transaction per request):
1) Insert into `events_raw` (`ON CONFLICT DO NOTHING`)
2) Insert into `events_queue` (`ON CONFLICT DO NOTHING`)

If the raw insert is ignored (duplicate), the queue insert will also conflict and ignore.

## 5.2 Worker loop (incremental projection)

1) Claim a batch:
```sql
SELECT org_id, event_id
FROM events_queue
WHERE processed_at IS NULL
ORDER BY inserted_at
LIMIT :N
FOR UPDATE SKIP LOCKED;
```

2) For each claimed event:
- Load full event from `events_raw`
- Apply projection updates (below)

3) Mark processed:
```sql
UPDATE events_queue
SET processed_at = now()
WHERE (org_id, event_id) IN (...);
```

4) Commit

Scaling:
- Multiple workers are safe due to `SKIP LOCKED`.

---

# 6) Projection rules (out-of-order tolerant)

General rules:
- Always update `session_stats.last_event_at = MAX(last_event_at, occurred_at)`
- Use UPSERTs for `run_facts` keyed by `(org_id, run_id)`
- Use `MIN` for earliest timestamps.

## 6.1 message_created
Update `session_stats`:
- `first_message_at = COALESCE(first_message_at, occurred_at)` then `MIN`
- `last_event_at = MAX(last_event_at, occurred_at)`

## 6.2 run_started
Upsert `run_facts.started_at`:
- `started_at = MIN(existing, occurred_at)` (if you want earliest)

Update `session_stats.last_event_at`.

## 6.3 run_completed (contains tokens)
Upsert into `run_facts`:
- `completed_at = MAX(existing, occurred_at)` (or set if null)
- `status, duration_ms, cost, input_tokens, output_tokens, error_type`

Update `session_stats`:
- `runs_count += 1`
- `active_agent_time_ms += duration_ms`
- `cost_total += cost`
- `input_tokens_total += input_tokens`
- `output_tokens_total += output_tokens`
- increment `success_runs` or `failed_runs` based on status
- `last_event_at = MAX(last_event_at, occurred_at)`

**Out-of-order caveat**:
- If the same `event_id` is retried, raw insert will ignore it; so we will not double-increment.

## 6.4 local_handoff
Update `session_stats`:
- `handoffs_count += 1`
- `last_handoff_at = MAX(last_handoff_at, occurred_at)`
- `last_event_at = MAX(last_event_at, occurred_at)`

### Post-handoff iteration correctness under out-of-order delivery

We must set `has_post_handoff_iteration` even if handoff arrives late or runs arrive late.

Window: constant `X` (e.g., 4 hours)

**Rule A (on run events):**
- If `last_handoff_at` exists and `occurred_at` is in `(last_handoff_at, last_handoff_at + X]`, set `has_post_handoff_iteration = true`.

**Rule B (on handoff event):**
- Query `run_facts` for the same session:
  - if any run has `completed_at` (or occurred_at) in `(handoff_time, handoff_time + X]`, set `has_post_handoff_iteration = true`.

This makes the flag correct even when events arrive out of order.

---

# 7) Dashboard metrics and how they’re computed

Canonical definitions used by UI:

- **Session lifespan** = `last_event_at - first_message_at`
- **Active agent time per session** = `active_agent_time_ms`
- **Runs per session** = `runs_count`
- **Local handoffs per session** = `handoffs_count`
- **Post-handoff iteration (per session)** = `has_post_handoff_iteration`
- **Local handoff rate** = `% of sessions with handoffs_count >= 1`
- **Post-handoff iteration rate** = `% of sessions with has_post_handoff_iteration = true`
- **Total cost** = sum of `cost_total`
- **Total input/output tokens** = sum of `input_tokens_total` / `output_tokens_total`
- **Success rate** = `sum(success_runs) / sum(runs_count)` (or `success_runs / (success_runs+failed_runs)`)

Run-level metrics (for Session Detail):
- `run_facts.duration_ms`, `run_facts.cost`, `run_facts.input_tokens`, `run_facts.output_tokens`, `run_facts.error_type`

Percentiles:
- **p95 run duration** computed from `run_facts` in query-time (acceptable for take-home).

---

# 8) Query model (how Next.js reads)

V1 pages:

- **Overview**
  - KPIs from aggregations over `session_stats` and `run_facts` in date range
  - Trend charts via grouping by day on `run_facts.completed_at` or `events_raw.occurred_at` (implementation choice)
  - Top Sessions from `session_stats` ordered by cost/runs/lifespan/failures

- **Sessions**
  - Table from `session_stats` with filters:
    - success/fail based on `failed_runs > 0` or `success_runs`
    - ranges on lifespan/active time/cost
    - handoff (handoffs_count >= 1)
    - post-handoff (has_post_handoff_iteration)

- **Session Detail**
  - Header from `session_stats`
  - Timeline from `events_raw` (filtered by session_id + date range)
  - Runs breakdown from `run_facts` (filtered by session_id)
  - Handoff history from `events_raw` (event_type = local_handoff)

- **Users**
  - Aggregate by `user_id` using `run_facts` and/or `events_raw` (message events) within date range
  - Alternatively, add a `user_stats_daily` rollup later.

---

# 9) Trade-offs (Level 1)

## Pros
- Near real-time dashboards without full re-aggregation.
- Append-only raw events enable replay/backfills.
- Worker scales horizontally (`SKIP LOCKED`).

## Cons / risks
- More moving parts (queue + worker + projections).
- Out-of-order events require correction logic (notably post-handoff iteration).
- Daily aggregates are hard to keep correct incrementally with late events:
  - either compute at query-time,
  - or run periodic recompute for last N days.

---

# 10) Future steps (explicitly out of scope for take-home)

- Service-to-service auth implementation (mTLS / signed JWT with rotation).
- Data retention policy: TTL/archiving of raw events; partition management.
- Backfill/replay CLI for rebuilding projections from raw events.
- OLAP store (ClickHouse) if sustained ingestion/query volumes exceed Postgres comfort.
- Row-Level Security (RLS) for strict org isolation at DB layer.
