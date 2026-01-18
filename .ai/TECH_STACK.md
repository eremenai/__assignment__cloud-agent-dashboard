# Technology Stack

This document defines the technology choices for the Agent Cloud Execution Monitoring Dashboard.

**Status legend:** ✅ Confirmed | ⏳ Preferred (pending validation) | ❓ TBD

---

## Frontend

| Category | Choice | Status | Notes |
|----------|--------|--------|-------|
| Language | TypeScript (strict, no JS) | ✅ | |
| Framework | Next.js 16+ (App Router) | ✅ | Based on next-shadcn-admin-dashboard |
| Styling | Tailwind CSS v4 | ✅ | v4.1.18 |
| Components | shadcn/ui | ✅ | Copy-paste pattern, Radix primitives |
| Charts | Recharts | ✅ | v2.15.4, included in reference project |
| Tables | TanStack Table | ✅ | v8.21.3, headless, TypeScript-first |
| Data fetching | SSR first | ✅ | TanStack Query if needed later |
| Forms | React Hook Form + Zod | ✅ | v7.71.1 + v3.25.76 (if needed) |
| Icons | Lucide React | ✅ | v0.562.0 |
| Date handling | date-fns | ✅ | v3.6.0 |
| Linter/Formatter | Biome.js | ✅ | v2.3.8, replaces ESLint + Prettier |
| Package manager | pnpm workspaces | ✅ | Monorepo structure |

### Frontend Structure (actual)
```
src/
├── app/                    # Next.js App Router pages
│   ├── (main)/             # Main route group
│   │   ├── dashboard/      # Dashboard pages
│   │   │   ├── default/    # Default dashboard
│   │   │   ├── crm/        # CRM dashboard
│   │   │   └── finance/    # Finance dashboard
│   │   ├── auth/           # Auth pages
│   │   └── unauthorized/   # Unauthorized page
│   └── (external)/         # External pages
├── components/
│   ├── ui/                 # Base components (shadcn)
│   ├── data-table/         # Data table components
│   └── simple-icon.tsx     # Simple icons component
├── lib/
│   ├── fonts/              # Font registry
│   ├── preferences/        # Theme/layout preferences
│   └── utils.ts            # Helpers
├── stores/                 # Zustand stores
├── hooks/                  # Custom hooks
├── data/                   # Static data
├── config/                 # App config
├── navigation/             # Navigation config
├── server/                 # Server actions
└── scripts/                # Boot scripts
```

---

## Backend

| Category | Choice | Status | Notes |
|----------|--------|--------|-------|
| Dashboard API | Next.js API Routes | ✅ | Client-facing read APIs only |
| Ingest API | Standalone Fastify | ✅ | Internal service-to-service, port 3001 |
| Worker | Standalone Node.js script | ✅ | Separate process for projection |
| Language | TypeScript | ✅ | |
| Database | PostgreSQL 16 | ✅ | Via Docker, sufficient for V1 scale |
| ORM | Drizzle ORM | ✅ | Lightweight, SQL-like, good TypeScript DX |
| Migrations | Drizzle Kit | ✅ | Schema-driven migrations, pairs with Drizzle ORM |
| Validation | Zod | ✅ | Shared across all services |
| Auth (dashboard) | Custom JWT middleware | ✅ | See AUTH_AND_ROLES.md |
| Auth (ingest) | None (V1) | ✅ | Internal network; mTLS in production |

### Architecture Pattern

Event-driven with append-only event store + pre-computed read models:

```
                    INTERNAL NETWORK
Producer → Ingest API (:3001) → events_raw/events_queue
                                       ↓
                                 Worker (polls)
                                       ↓
                              run_facts + session_stats
                                       ↓
                    CLIENT-FACING
                              Dashboard (:3000) reads
```

**Process separation:** Ingest API is separate from Dashboard to isolate internal service-to-service traffic from client-facing endpoints.

### Database Tables

| Table | Purpose | Written by | Read by |
|-------|---------|------------|---------|
| `orgs` | Organization registry | Seed/Admin | Dashboard |
| `users` | User registry (with role + org_id) | Seed/Admin | Dashboard |
| `events_raw` | Append-only event log | Ingest API | Worker, Dashboard |
| `events_queue` | Processing queue | Ingest API | Worker |
| `run_facts` | Per-run metrics | Worker | Dashboard |
| `session_stats` | Per-session aggregates | Worker | Dashboard |
| `org_stats_daily` | Daily org totals | Worker | Dashboard |
| `user_stats_daily` | Daily user totals | Worker | Dashboard |

See `.ai/BACKEND_ARCHITECTURE.md` for full schemas.

---

## DevOps / Infrastructure

| Category | Choice | Status | Notes |
|----------|--------|--------|-------|
| Containerization | Docker | ✅ | |
| Orchestration | Docker Compose | ✅ | Local dev/demo only for V1 |
| Node version | 24.x | ✅ | v24.12.0 |
| Package manager | pnpm workspaces | ✅ | Monorepo structure |
| Linting | Biome.js | ✅ | Single tool for lint + format |
| Pre-commit | None | ✅ | Removed Husky |
| CI/CD | GitHub Actions | ❓ | Basic lint/build/test |

### Docker Compose Services (V1)
```yaml
services:
  db:               # PostgreSQL 16 (:5432)
  ingest:           # Ingest API - Fastify (:3001, internal only)
  worker:           # Projection worker (no HTTP)
  dashboard:        # Next.js app (:3000, client-facing)
  generator:        # Mock event generator (optional, via profile)
```

---

## Development Tools

| Category | Choice | Status | Notes |
|----------|--------|--------|-------|
| IDE | VS Code | ⏳ | With recommended extensions |
| API testing | Bruno / Insomnia | ❓ | Or built-in dev tools |
| Mock data | JSON fixtures | ✅ | Simple approach for V1 |

---

## Reference Project

**Base:** [arhamkhnz/next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard)

**Customizations applied:**
- Removed theme presets (single default theme)
- Removed font selector (Inter only)
- Removed navbar sticky toggle (always sticky)
- Removed sidebar collapse style selector (icon mode only)
- Removed Husky pre-commit hooks
- Removed CONTRIBUTING.md, media/

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-17 | TypeScript only | Team preference, type safety |
| 2026-01-17 | Next.js preferred | SSR capability, single codebase |
| 2026-01-17 | Tailwind v4 | Rapid styling, consistent design |
| 2026-01-17 | Custom JWT auth | Full control, simple dev experience |
| 2026-01-17 | Docker Compose for V1 | Local deployment focus |
| 2026-01-17 | next-shadcn-admin-dashboard as base | Comprehensive shadcn setup, Tailwind v4, Recharts |
| 2026-01-17 | Biome.js | Single tool for lint + format, faster than ESLint |
| 2026-01-17 | SSR-first data fetching | KISS - add TanStack Query only if needed |
| 2026-01-17 | No Husky | Simpler workflow, manual lint before commit |
| 2026-01-18 | PostgreSQL 16 | Sufficient for V1 scale, good JSON support |
| 2026-01-18 | Drizzle ORM | Lightweight, SQL-like syntax, TypeScript-first |
| 2026-01-18 | Separate worker container | Clean separation, horizontally scalable |
| 2026-01-18 | Event-driven + read models | Near real-time, out-of-order tolerant, replayable |
| 2026-01-18 | Separate Ingest API (Fastify) | Isolate internal S2S from client-facing, different trust boundaries |

---

## Related Documents
- `.ai/PROJECT_BRIEF.md` - Product requirements and domain model
- `.ai/ROADMAP.md` - Implementation phases and milestones
- `.ai/AUTH_AND_ROLES.md` - Authentication and authorization model
- `.ai/BACKEND_ARCHITECTURE.md` - Backend architecture and data model
- `.ai/TRADEOFFS_FUTURE_STEPS.md` - What we deferred and why
