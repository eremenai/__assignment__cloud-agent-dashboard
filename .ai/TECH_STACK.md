# Technology Stack

This document defines the technology choices for the Agent Cloud Execution Monitoring Dashboard.

**Status legend:** ✅ Confirmed | ⏳ Preferred (pending validation) | ❓ TBD

---

## Frontend

| Category | Choice | Status | Notes |
|----------|--------|--------|-------|
| Language | TypeScript (strict, no JS) | ✅ | |
| Framework | Next.js 14+ (App Router) | ⏳ | May adjust based on reference project |
| Styling | Tailwind CSS v4 | ⏳ | |
| Components | shadcn/ui | ❓ | Evaluate: Radix, Headless UI, custom |
| Charts | Recharts | ❓ | Evaluate: Tremor, ECharts, Nivo |
| Tables | TanStack Table | ❓ | Evaluate: AG Grid (overkill?), custom |
| Data fetching | TanStack Query (React Query) | ❓ | Evaluate: SWR, native fetch |
| Forms | React Hook Form + Zod | ❓ | For filters, settings |
| Icons | Lucide React | ❓ | |
| Date handling | date-fns | ❓ | Lightweight, tree-shakeable |

### Frontend Structure (proposed)
```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Dashboard route group
│   │   ├── overview/       # Org overview page
│   │   ├── sessions/       # Sessions list
│   │   └── sessions/[id]/  # Session detail
│   ├── global/             # Global overview (SUPER_ADMIN)
│   └── api/                # API routes
├── components/
│   ├── ui/                 # Base components (shadcn)
│   ├── charts/             # Chart wrappers
│   ├── tables/             # Table components
│   └── layout/             # Shell, nav, header
├── lib/
│   ├── auth/               # Auth context, JWT utils
│   ├── api/                # API client, hooks
│   └── utils/              # Helpers
├── types/                  # Domain types
└── mocks/                  # Mock data, dev auth
```

---

## Backend

| Category | Choice | Status | Notes |
|----------|--------|--------|-------|
| Runtime | Next.js API Routes | ⏳ | Single codebase; revisit if aggregation heavy |
| Language | TypeScript | ✅ | |
| Database | PostgreSQL | ❓ | Evaluate: SQLite for simplicity |
| ORM | Drizzle ORM | ❓ | Evaluate: Prisma, Kysely |
| Validation | Zod | ⏳ | Shared with frontend |
| Auth | Custom JWT middleware | ✅ | See AUTH_AND_ROLES.md |

### Backend Alternatives (if Next.js API routes insufficient)
| Option | When to consider |
|--------|------------------|
| Standalone Node.js + Fastify | Heavy aggregation, background jobs |
| BFF pattern | Complex upstream integrations |
| Edge functions | Global latency requirements |

---

## DevOps / Infrastructure

| Category | Choice | Status | Notes |
|----------|--------|--------|-------|
| Containerization | Docker | ✅ | |
| Orchestration | Docker Compose | ✅ | Local dev/demo only for V1 |
| Node version | 20 LTS | ⏳ | |
| Package manager | pnpm | ❓ | Evaluate: npm, bun |
| Linting | ESLint + Prettier | ✅ | |
| Pre-commit | Husky + lint-staged | ❓ | |
| CI/CD | GitHub Actions | ❓ | Basic lint/build/test |

### Docker Compose Services (V1)
```yaml
services:
  dashboard:        # Next.js app (frontend + API)
  db:               # PostgreSQL (if needed)
  # Future: redis, worker, etc.
```

---

## Development Tools

| Category | Choice | Status | Notes |
|----------|--------|--------|-------|
| IDE | VS Code | ⏳ | With recommended extensions |
| API testing | Bruno / Insomnia | ❓ | Or built-in dev tools |
| Mock data | MSW (Mock Service Worker) | ❓ | Or simple JSON fixtures |

---

## Reference Projects to Evaluate

Before finalizing, evaluate these open-source dashboards for patterns:

| Project | Why evaluate |
|---------|--------------|
| [Tremor](https://tremor.so) | Dashboard components, charts built on Tailwind |
| [shadcn/ui](https://ui.shadcn.com) | Accessible components, copy-paste pattern |
| [Cal.com](https://github.com/calcom/cal.com) | Next.js 14, production patterns |
| [Plausible](https://github.com/plausible/analytics) | Analytics dashboard reference |
| [Vercel Dashboard](https://vercel.com/dashboard) | UX inspiration (proprietary) |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-17 | TypeScript only | Team preference, type safety |
| 2026-01-17 | Next.js preferred | SSR capability, single codebase |
| 2026-01-17 | Tailwind v4 preferred | Rapid styling, consistent design |
| 2026-01-17 | Custom JWT auth | Full control, simple dev experience |
| 2026-01-17 | Docker Compose for V1 | Local deployment focus |

---

## Open Decisions (Phase 2)

Priority decisions to make before implementation:

1. **Charts library** - Build a sample chart with top 2 options
2. **Component library** - Test shadcn/ui integration with Tailwind v4
3. **Data fetching** - Decide React Query vs SWR
4. **Database** - PostgreSQL vs SQLite for V1 simplicity
5. **Reference project** - Pick one to use as structural inspiration

---

## Related Documents
- `.ai/PROJECT_BRIEF.md` - Product requirements and domain model
- `.ai/ROADMAP.md` - Implementation phases and milestones
- `.ai/AUTH_AND_ROLES.md` - Authentication and authorization model
