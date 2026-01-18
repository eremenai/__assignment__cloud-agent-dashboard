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
