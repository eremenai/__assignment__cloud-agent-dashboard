# Cloud Agent Dashboard

Org-level analytics dashboard for cloud coding agent execution. Tracks adoption, reliability, speed, cost, and human intervention metrics.

> **Details:** See `.ai/` folder for full documentation. Ask Claude agent to explain any aspect.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  INTERNAL NETWORK                                               │
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ Drop-copy    │────▶│ Ingest API   │────▶│ PostgreSQL   │    │
│  │ Producer     │     │ :3001        │     │ :5432        │    │
│  │ (mocked)     │     └──────────────┘     └──────┬───────┘    │
│  └──────────────┘                                 │            │
│                       ┌──────────────┐            │            │
│                       │ Worker       │◀───────────┤            │
│                       │ (polls)      │────────────┤            │
│                       └──────────────┘            │            │
└───────────────────────────────────────────────────┼────────────┘
                                                    │
┌───────────────────────────────────────────────────┼────────────┐
│  CLIENT-FACING                                    │            │
│  ┌──────────────┐                                 │            │
│  │ Dashboard    │◀────────────────────────────────┘            │
│  │ :3000        │  (reads only)                                │
│  └──────────────┘                                              │
└────────────────────────────────────────────────────────────────┘
```

### Services

| Service | Port | Type | Purpose |
|---------|------|------|---------|
| **ingest** | 3001 | Prod | Receives events from upstream internal systems (drop-copy pattern). Validates, deduplicates, queues for processing. Isolated from client traffic. |
| **worker** | - | Prod | Async event processor. Polls queue, computes aggregates into read models. Horizontally scalable - add more workers for throughput. |
| **dashboard** | 3000 | Prod | Client-facing Next.js app. Read-only access to pre-computed data. Serves org admins and managers. |
| **db** | 5432 | Prod | PostgreSQL. Append-only event log + materialized read models. Single instance for V1. |
| **mock-auth** | 3002 | Dev | Fake JWT issuer for local development. Replace with real IdP in production. |
| **generator** | - | Dev | Simulates 1 year of historical events for demo/testing. Calls ingest API (not direct DB). |

---

## Running

### Docker (Demo/Testing)

```bash
docker compose --profile dashboard up -d          # Start all services
docker compose --profile generator run --rm generator --days 30  # Generate data
# Dashboard at http://localhost:3000
docker compose --profile dashboard down           # Stop
```

### Local Development

```bash
pnpm db:start     # PostgreSQL in Docker
pnpm install      # First time only
pnpm dev:local    # All services with hot reload
pnpm generate -- --days 30  # Generate mock data
```

---

## What the Dashboard Measures

Cloud coding agents run tasks remotely (implement changes, run tests, push branches). Users interact via chat sessions and can "handoff" results locally to inspect or continue work. The dashboard answers:

| Question | How We Measure It |
|----------|-------------------|
| **Who's using agents?** | Active users (DAU/WAU/30d), runs per user, sessions per user |
| **Are agents reliable?** | Success/failure rate, top failure categories (tool error, model error, timeout) |
| **How long do tasks take?** | Avg/P95 run duration, queue wait time, active agent time per session |
| **What does it cost?** | Total cost, cost per run, token usage (input/output breakdown) |
| **Do results need human fixes?** | Local handoff rate (user pulled results locally), post-handoff iteration (user ran more after handoff within 4h) |
| **How much iteration?** | Avg runs per session (higher = more tweaking), session lifespan (first to last message) |

**Key insight:** Sessions are ongoing chat threads with no explicit "done" state. Handoff + post-handoff iteration are proxies for "agent output required human intervention."

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Separate ingest from dashboard** | Different trust boundaries (internal S2S vs client-facing), different scaling needs (write-heavy vs read-heavy), cleaner security posture |
| **Separate worker from ingest** | Decouples ingestion latency from processing time. Workers scale independently. Ingest stays fast (<50ms). |
| **Event sourcing + read models** | Append-only log is system of record. Pre-computed aggregates for fast queries. Can replay to rebuild if needed. |
| **Out-of-order tolerant projections** | Events may arrive late. Use `GREATEST`/`LEAST` for timestamps, upserts for idempotency. |
| **Daily rollups for aggregates** | Store totals per day, compute averages at query time. Flexible date ranges without pre-computing every window. |
| **P95 computed at query time** | Percentiles can't be pre-aggregated accurately. Acceptable for V1; add histogram buckets if slow. |
| **Polling worker (no message queue)** | Simpler than Kafka/RabbitMQ. Postgres `FOR UPDATE SKIP LOCKED` for distributed locking. Good enough for V1 scale. |
| **Per-user transaction batching** | Worker groups events by user to reduce lock contention on session/user stats. Org-level stats still a hotkey. |

### Production Gaps (🔴 Critical / 🟠 High)

| Gap | Current State | Before Production |
|-----|---------------|-------------------|
| 🔴 Ingest auth | None (internal network) | Add mTLS or signed JWT |
| 🔴 Row-Level Security | App-layer `WHERE org_id=?` | Enable Postgres RLS policies |
| 🔴 Identity provider | Mock JWT issuer | Integrate Auth0/Clerk/Cognito |
| 🟠 Database HA | Single Postgres | Add replica or use managed PG |
| 🟠 Dead-letter queue | Retry forever | Add max_attempts, move to DLQ |
| 🟠 Data retention | Keep forever | Partition by month, archive old |

---

## Documentation

All details in `.ai/` folder:
- `PROJECT_BRIEF.md` - Domain model, metrics definitions, dashboard IA
- `BACKEND_ARCHITECTURE.md` - Schemas, projections, query patterns
- `TECH_STACK.md` - Technology choices and rationale
- `TRADEOFFS_FUTURE_STEPS.md` - Full list with priorities
- `AUTH_AND_ROLES.md` - Permissions matrix
