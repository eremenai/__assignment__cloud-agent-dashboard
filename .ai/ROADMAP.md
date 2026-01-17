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

## Phase 1: Wireframes & UI Design
**Goal:** Define the visual structure and component hierarchy for all dashboard views.

**Deliverables:**
- [ ] `.ai/wireframes/00-layout.md` - Shared layout, navigation, org selector, time range selector
- [ ] `.ai/wireframes/01-org-overview.md` - Org-level KPI dashboard
- [ ] `.ai/wireframes/02-sessions-list.md` - Sessions table with filters
- [ ] `.ai/wireframes/03-session-detail.md` - Timeline + run details view
- [ ] `.ai/wireframes/04-global-overview.md` - Cross-org view for SUPER_ADMIN
- [ ] `.ai/wireframes/05-users.md` - Users comparison table with friction metrics
- [ ] `.ai/wireframes/06-user-detail.md` - Individual user analytics and sessions

**Format:** Each wireframe includes:
1. ASCII diagram (quick visual reference)
2. Component breakdown (structured spec for implementation)
3. Data requirements (what fields/APIs each component needs)

**Exit criteria:** Wireframes reviewed and approved.

---

## Phase 2: Technology Selection
**Goal:** Finalize frontend stack and identify reference implementations.

**Reference:** `.ai/TECH_STACK.md` (created with initial preferences)

**Tasks:**
- [ ] Research existing analytics dashboard projects (open source)
- [ ] Evaluate charting libraries (build sample with top 2 options)
- [ ] Evaluate component libraries (test shadcn/ui + Tailwind v4 compatibility)
- [ ] Finalize decisions in `.ai/TECH_STACK.md`

**Open decisions:** (see TECH_STACK.md for full matrix)
| Decision | Leading options | Status |
|----------|-----------------|--------|
| Charts | Recharts, Tremor | TBD |
| Components | shadcn/ui | TBD |
| Data fetching | TanStack Query, SWR | TBD |
| Tables | TanStack Table | TBD |
| Database | PostgreSQL, SQLite | TBD |

**Exit criteria:** All ❓ items in TECH_STACK.md changed to ✅.

---

## Phase 3: Frontend Implementation (Mocked Data)
**Goal:** Build fully functional dashboard UI with static/mocked data.

**Milestones:**

### 3.1 Project Setup
- [ ] Initialize Next.js project with TypeScript
- [ ] Configure Tailwind CSS v4
- [ ] Set up project structure (components, pages, lib, types)
- [ ] Configure ESLint, Prettier

### 3.2 Auth & Context
- [ ] JWT validation middleware (mock issuer in dev)
- [ ] AuthContext provider (user, currentOrgId, permissions)
- [ ] DevAuthSwitcher component (dev mode only - user preset dropdown)
- [ ] Protected route wrapper

### 3.3 Shared Components & Layout
- [ ] App shell (sidebar nav, header, org selector for SUPPORT/SUPER_ADMIN)
- [ ] Time range selector
- [ ] KPI card component
- [ ] Data table component (sortable, filterable)
- [ ] Chart components (line, bar, pie)
- [ ] Status badges, loading states, empty states

### 3.4 Org Overview Page
- [ ] KPI cards row (Active users, Runs, Success rate, Cost, Tokens, etc.)
- [ ] Time series charts (Runs/day, Success rate trend, Cost/Token trends)
- [ ] Top users table
- [ ] Top failure categories table

### 3.5 Sessions List Page
- [ ] Sessions table with all columns per spec
- [ ] Time range filter
- [ ] User filter (optional)
- [ ] Pagination
- [ ] CSV export

### 3.6 Session Detail Page
- [ ] Session header (metadata, summary metrics)
- [ ] Timeline view (messages, runs, handoff events)
- [ ] Runs table (expandable with details)

### 3.7 Global Overview Page (SUPER_ADMIN only)
- [ ] Cross-org aggregate KPIs
- [ ] Top orgs by usage/cost table
- [ ] Org health comparison (success rates)

### 3.8 Users Page
- [ ] Users table (sortable, paginated)
- [ ] Columns: Sessions, Runs, Avg runs/session, Avg active time, Local handoff rate, Post-handoff iteration rate, Success rate, Cost
- [ ] Click row → User Detail page

### 3.9 User Detail Page
- [ ] User header (name, email, role, member since, last active)
- [ ] KPI row (user stats for selected period)
- [ ] Trends charts (activity, cost, friction over time)
- [ ] User's sessions table (pre-filtered, links to Session Detail)

### 3.10 Mock Data Layer
- [ ] Define TypeScript types matching domain model
- [ ] Create realistic mock data generator (multiple orgs, users, roles)
- [ ] Implement mock API handlers (or static data)

**Exit criteria:** All pages functional with mocked data, visually complete.

---

## Phase 4: Backend Architecture Discussion
**Goal:** Define how the dashboard receives real data.

**Questions to answer:**
- [ ] Who provides the raw data? (Agent execution platform, event stream, database)
- [ ] What's the integration pattern? (API polling, webhooks, direct DB access, event bus)
- [ ] Do we need to store/aggregate data ourselves, or query upstream?
- [ ] What's the data freshness requirement? (real-time, near-real-time, batch)
- [ ] Authentication/authorization model?

**Deliverables:**
- [ ] `.ai/BACKEND_ARCHITECTURE.md` - Integration patterns, data flow diagrams
- [ ] API contract / schema definition (if we own the API)
- [ ] Decision on storage (if we aggregate locally)

**Exit criteria:** Architecture documented and approved.

---

## Phase 5: Backend Technology Selection
**Goal:** Choose backend implementation approach.

**Options to evaluate:**
| Approach | Pros | Cons |
|----------|------|------|
| Next.js API routes | Single codebase, simple | May not scale for heavy aggregation |
| Standalone Node.js/TS service | Separation of concerns | More infrastructure |
| BFF pattern | Optimized for frontend needs | Additional layer |

**Decisions to make:**
- [ ] Backend runtime (Next.js API / standalone service)
- [ ] Database (if needed): PostgreSQL, SQLite, etc.
- [ ] ORM/query builder: Prisma, Drizzle, Kysely
- [ ] Caching layer (if needed)

**Deliverables:**
- [ ] Update `.ai/TECH_STACK.md` with backend choices

**Exit criteria:** Backend stack confirmed.

---

## Phase 6: Backend Implementation
**Goal:** Implement data layer and connect frontend to real APIs.

**Milestones:**

### 6.1 Data Layer Setup
- [ ] Database schema (if storing locally)
- [ ] Connection to upstream data source
- [ ] Data models / repositories

### 6.2 API Implementation
- [ ] Org overview endpoints (aggregated metrics)
- [ ] Sessions list endpoint (with filters, pagination)
- [ ] Session detail endpoint
- [ ] CSV export endpoint

### 6.3 Frontend Integration
- [ ] Replace mock data with API calls
- [ ] Add loading/error states
- [ ] Implement data caching/refetching strategy

**Exit criteria:** Dashboard displays real data from backend.

---

## Phase 7: Deployment (Docker Compose)
**Goal:** Package solution for local deployment.

**Deliverables:**
- [ ] `Dockerfile` for frontend (Next.js)
- [ ] `Dockerfile` for backend (if separate)
- [ ] `docker-compose.yml` with all services
- [ ] Environment configuration (`.env.example`)
- [ ] README with setup/run instructions

**Services in compose:**
- Frontend (Next.js)
- Backend API (if separate)
- Database (if needed)
- (Optional) Mock data seeder

**Exit criteria:** `docker compose up` starts working dashboard.

---

## Open Questions / Parking Lot
- (None currently)

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

---

## Version History
| Date | Change |
|------|--------|
| 2026-01-17 | Initial roadmap created |
| 2026-01-17 | Added auth model, multi-org support, Global Overview page |
