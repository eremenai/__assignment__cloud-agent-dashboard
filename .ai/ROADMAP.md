# Project Roadmap

## Overview
This roadmap outlines the phased development of the Agent Cloud Execution Monitoring Dashboard.

**Key constraints:** (see `.ai/TECH_STACK.md` for full details)
- TypeScript only (no JavaScript)
- Next.js + Tailwind CSS v4 (preferred, may adjust based on reference project)
- Local Docker Compose deployment for V1
- Backend data source: mocked for V1, architecture decided in Phase 4
- Auth: Custom JWT validation + Mock Issuer for dev (see `.ai/AUTH_AND_ROLES.md`)
- Multi-org with role hierarchy: MEMBER < MANAGER < ORG_ADMIN | SUPPORT | SUPER_ADMIN
- Scale: Small (< 100 sessions/day)

---

## Phase 1: Wireframes & UI Design ✅
**Goal:** Define the visual structure and component hierarchy for all dashboard views.

**Deliverables:**
- [x] `.ai/wireframes/00-layout.md` - Shared layout, navigation, org selector, time range selector
- [x] `.ai/wireframes/01-org-overview.md` - Org-level KPI dashboard
- [x] `.ai/wireframes/02-sessions-list.md` - Sessions table with filters
- [x] `.ai/wireframes/03-session-detail.md` - Timeline + run details view
- [x] `.ai/wireframes/04-global-overview.md` - Cross-org view for SUPER_ADMIN
- [x] `.ai/wireframes/05-users.md` - Users comparison table with friction metrics
- [x] `.ai/wireframes/06-user-detail.md` - Individual user analytics and sessions

**Bonus deliverables:**
- [x] `.ai/wireframes/html/` - Interactive HTML prototype with all pages
- [x] Role switcher to preview MEMBER/MANAGER/ORG_ADMIN/SUPPORT/SUPER_ADMIN views
- [x] Working navigation links between all pages

**Format:** Each wireframe includes:
1. ASCII diagram (quick visual reference)
2. Component breakdown (structured spec for implementation)
3. Data requirements (what fields/APIs each component needs)

**Exit criteria:** Wireframes reviewed and approved.

---

## Phase 2: Technology Selection ✅
**Goal:** Finalize frontend stack and identify reference implementations.

**Reference:** `.ai/TECH_STACK.md`

**Tasks:**
- [x] Research existing analytics dashboard projects (open source)
- [x] Evaluate charting libraries → Recharts (included in reference project)
- [x] Evaluate component libraries → shadcn/ui + Tailwind v4 works
- [x] Finalize decisions in `.ai/TECH_STACK.md`

**Decisions made:**
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Base project | next-shadcn-admin-dashboard | Comprehensive setup, Tailwind v4, Recharts |
| Charts | Recharts v2.15.4 | Already integrated, flexible |
| Components | shadcn/ui | Copy-paste, Radix primitives |
| Data fetching | SSR first | KISS, add TanStack Query if needed |
| Tables | TanStack Table v8.21.3 | Headless, TypeScript-first |
| Linter/Formatter | Biome.js | Single tool, fast |

**Customizations applied to base project:**
- Removed theme presets (single default theme)
- Removed font selector (Inter only)
- Removed navbar sticky toggle (always sticky)
- Removed sidebar collapse style selector (icon mode only)
- Removed Husky pre-commit hooks
- Removed CONTRIBUTING.md, media/

**Exit criteria:** All frontend ❓ items in TECH_STACK.md changed to ✅.

---

## Phase 3: Frontend Implementation (Mocked Data) ✅
**Goal:** Build fully functional dashboard UI with static/mocked data.

**Milestones:**

### 3.1 Project Setup
- [x] Initialize Next.js project with TypeScript (via reference project)
- [x] Configure Tailwind CSS v4 (via reference project)
- [x] Set up project structure (via reference project)
- [x] Configure Biome.js (replaces ESLint + Prettier)

### 3.2 Auth & Context
- [x] JWT validation middleware (mock issuer in dev)
- [x] AuthContext provider (user, currentOrgId, permissions)
- [x] DevAuthSwitcher component (dev mode only - user preset dropdown)
- [x] Protected route wrapper

### 3.3 Shared Components & Layout
- [x] App shell (sidebar nav, header, org selector for SUPPORT/SUPER_ADMIN)
- [x] Time range selector
- [x] KPI card component
- [x] Data table component (sortable, filterable)
- [x] Chart components (line, bar, pie)
- [x] Status badges, loading states, empty states

### 3.4 Org Overview Page
- [x] KPI cards row (Active users, Runs, Success rate, Cost, Tokens, etc.)
- [x] Time series charts (Runs/day, Success rate trend, Cost/Token trends)
- [x] Top users table
- [x] Top failure categories table

### 3.5 Sessions List Page
- [x] Sessions table with all columns per spec
- [x] Time range filter
- [x] User filter (optional)
- [x] Pagination
- [x] CSV export

### 3.6 Session Detail Page
- [x] Session header (metadata, summary metrics)
- [x] Timeline view (messages, runs, handoff events)
- [x] Runs table (expandable with details)

### 3.7 Global Overview Page (SUPER_ADMIN only)
- [x] Cross-org aggregate KPIs
- [x] Top orgs by usage/cost table
- [x] Org health comparison (success rates)

### 3.8 Users Page
- [x] Users table (sortable, paginated)
- [x] Columns: Sessions, Runs, Avg runs/session, Avg active time, Local handoff rate, Post-handoff iteration rate, Success rate, Cost
- [x] Click row → User Detail page

### 3.9 User Detail Page
- [x] User header (name, email, role, member since, last active)
- [x] KPI row (user stats for selected period)
- [x] Trends charts (activity, cost, friction over time)
- [x] User's sessions table (pre-filtered, links to Session Detail)

### 3.10 Mock Data Layer
- [x] Define TypeScript types matching domain model
- [x] Create realistic mock data generator (multiple orgs, users, roles)
- [x] Implement mock API handlers (or static data)

**Exit criteria:** All pages functional with mocked data, visually complete. ✅

---

## Phase 4: Backend Architecture Discussion ✅
**Goal:** Define how the dashboard receives real data.

**Questions answered:**
- [x] Who provides the raw data? → Internal "drop-copy" service forwards events for all orgs
- [x] What's the integration pattern? → Batch POST to internal ingest API
- [x] Do we need to store/aggregate data ourselves? → Yes, append-only event store + read models
- [x] What's the data freshness requirement? → Near real-time (queue + worker loop)
- [x] Authentication/authorization model? → Service-level for ingest (mTLS in prod), JWT for dashboard

**Deliverables:**
- [x] `.ai/BACKEND_ARCHITECTURE.md` - Integration patterns, data flow diagrams
- [x] API contract / schema definition (event envelope, ingest endpoint)
- [x] Decision on storage (PostgreSQL with events_raw, run_facts, session_stats)

**Exit criteria:** Architecture documented and approved. ✅

---

## Phase 5: Backend Technology Selection ✅
**Goal:** Choose backend implementation approach.

**Decisions made:**
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend runtime | Next.js API routes + separate worker | Single codebase for dashboard, worker scales independently |
| Database | PostgreSQL 16 | Sufficient for V1, good JSON support, mature |
| ORM | Drizzle ORM | Lightweight, SQL-like, TypeScript-first |
| Caching | None (V1) | Query-time aggregation is fast enough at this scale |

**Deliverables:**
- [x] Update `.ai/TECH_STACK.md` with backend choices

**Exit criteria:** Backend stack confirmed. ✅

---

## Phase 6: Backend Implementation ✅
**Goal:** Implement data layer and connect frontend to real APIs.

**Milestones:**

### 6.1 Data Layer Setup ✅
- [x] Database schema (`packages/shared/src/db/schema.ts`)
- [x] Drizzle ORM client with singleton pattern (`packages/shared/src/db/client.ts`)
- [x] Event contract with Zod validation (`packages/shared/src/schemas/`)
- [x] Domain types (`packages/shared/src/types/`)

### 6.2 Ingest Service ✅
- [x] Fastify server with graceful shutdown (`services/ingest/`)
- [x] POST /events endpoint with batch validation
- [x] Transaction-safe insert to events_raw + events_queue
- [x] Duplicate event handling (onConflictDoNothing)

### 6.3 Projection Worker ✅
- [x] Long-running process with configurable poll interval (`services/worker/`)
- [x] Two-phase commit pattern (claim → process → mark done)
- [x] Projectors: message, run, handoff events
- [x] Daily aggregate updates (org_stats_daily, user_stats_daily)
- [x] Post-handoff iteration logic (4-hour window)

### 6.4 Dashboard Queries ✅
- [x] Org metrics aggregation (`getOrgMetricsFromDb`)
- [x] Org daily trends (`getOrgTrendsFromDb`)
- [x] Sessions list with pagination (`getSessionsListFromDb`)
- [x] Session detail with runs/events (`getSessionDetailFromDb`)
- [x] Users list aggregation (`getUsersListFromDb`)
- [x] P95 duration query (`getP95DurationFromDb`)
- [x] Global metrics - SUPER_ADMIN (`getGlobalMetricsFromDb`)
- [x] Top orgs - SUPER_ADMIN (`getTopOrgsFromDb`)

### 6.5 Mock Data Generator ✅
- [x] CLI tool with commander.js (`tools/generator/`)
- [x] Date range generation (--days, --from/--to)
- [x] Posts to Ingest API with batching
- [x] Dry-run mode support

### 6.6 Frontend Integration ✅
- [x] Replace mock data with real DB queries via server actions
- [x] Wire up dashboard page to DB (`lib/data/org-data.ts`)
- [x] Wire up sessions page to DB (`lib/data/sessions-data.ts`)
- [x] Wire up users page to DB (`lib/data/users-data.ts`)
- [x] Wire up global page to DB (`lib/data/global-data.ts`)

### 6.7 Backend Tests ✅
- [x] Ingest API tests (validation, batch handling, duplicates)
- [x] Worker processor tests (queue handling, projections)
- [x] Projector unit tests (message, run, handoff)

### 6.8 Docker Setup ✅
- [x] Dockerfile for ingest service (`services/ingest/Dockerfile`)
- [x] Dockerfile for worker service (`services/worker/Dockerfile`)
- [x] Dockerfile for dashboard (`services/dashboard/Dockerfile`)

**Exit criteria:** Dashboard displays real data from backend.

**Note:** Set `USE_REAL_DB=true` environment variable to use real database instead of mock data.

---

## Phase 7: Deployment (Docker Compose) ✅
**Goal:** Package solution for local deployment.

**Deliverables:**
- [x] `Dockerfile` for dashboard (`services/dashboard/Dockerfile`)
- [x] `Dockerfile` for ingest API (`services/ingest/Dockerfile`)
- [x] `Dockerfile` for worker (`services/worker/Dockerfile`)
- [x] `docker-compose.yml` with all services (dev mode - DB only)
- [x] `docker-compose.prod.yml` with full production stack
- [ ] Environment configuration (`.env.example`) - TODO
- [ ] README with setup/run instructions - TODO

**Services in compose:**
- Dashboard (Next.js)
- Ingest API (Fastify)
- Worker (long-running process)
- PostgreSQL database
- (Optional) Mock data generator CLI

**Exit criteria:** `docker compose up` starts working dashboard.

---

## Open Questions / Parking Lot
- (None currently)

---

## Tradeoffs & Future Steps

See `.ai/TRADEOFFS_FUTURE_STEPS.md` for comprehensive list of:
- Security tradeoffs (must address before production)
- Scalability decisions (when they break, how to fix)
- Deferred features (teams, integrations, tagging)
- Polish items (a11y, i18n, dark mode)

---

## Resolved Decisions
| Decision | Resolution | Date |
|----------|------------|------|
| Authentication | Custom JWT + Mock Issuer | 2026-01-17 |
| Multi-org | Yes, with SUPPORT/SUPER_ADMIN org selector | 2026-01-17 |
| Data volume | Small (< 100 sessions/day) | 2026-01-17 |
| MEMBER scope | Own sessions + team/org aggregates | 2026-01-17 |
| Teams | Defer UI, design data model for future | 2026-01-17 |
| Data retention | 1 year | 2026-01-17 |
| Database | PostgreSQL 16 | 2026-01-18 |
| ORM | Drizzle ORM | 2026-01-18 |
| Dev workflow | DB in Docker, Next.js + worker local | 2026-01-18 |
| Seed data | 5 months history, full pipeline (events → worker → read models) | 2026-01-18 |
| Frontend mocks | Remove, all data from DB | 2026-01-18 |
| Session ownership | Single user per session | 2026-01-18 |
| Mock generator | CLI with --days flag, simulates complete days | 2026-01-18 |
| Worker execution | Long-running process with 2s poll interval | 2026-01-18 |
| Daily aggregates | org_stats_daily + user_stats_daily (totals, not averages) | 2026-01-18 |
| Integration tests | Test full ingest → worker → read model pipeline | 2026-01-18 |
| Schema migrations | Drizzle Kit (schema-driven) | 2026-01-18 |
| Dev/test databases | Ephemeral (no volume), fresh on restart | 2026-01-18 |
| Backend test coverage | Extensive - 90%+ for ingest/worker | 2026-01-18 |
| P95 duration | Separate query, async load on frontend | 2026-01-18 |
| Error categories | errors_tool, errors_model, errors_timeout, errors_other in daily aggregates | 2026-01-18 |
| Repository structure | Monorepo with pnpm workspaces (packages/, services/, tools/) | 2026-01-18 |

---

## Version History
| Date | Change |
|------|--------|
| 2026-01-17 | Initial roadmap created |
| 2026-01-17 | Added auth model, multi-org support, Global Overview page |
| 2026-01-18 | Completed Phase 4 & 5: Backend architecture and tech selection |
| 2026-01-18 | Completed Phase 6: Backend tests, frontend integration, Dockerfiles |
| 2026-01-18 | Completed Phase 7: Docker deployment configuration |
