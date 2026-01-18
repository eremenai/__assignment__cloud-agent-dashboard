# Tradeoffs & Future Steps

This document captures all tradeoffs made across the system (frontend + backend), what was deferred, and what needs to be addressed for production readiness. Items are sorted by importance/risk.

---

## Legend

| Priority | Meaning |
|----------|---------|
| 🔴 **Critical** | Must address before production; security/data integrity risk |
| 🟠 **High** | Should address soon; scalability/reliability concern |
| 🟡 **Medium** | Address when needed; improves quality/DX |
| 🟢 **Low** | Nice to have; polish/convenience |

---

## 🔴 Critical (Address Before Production)

### 1. No Authentication on Ingest API

**Current state:** Ingest API (`POST /events`) has no authentication. Assumes internal network isolation.

**Risk:** Any service that can reach the ingest endpoint can inject events for any org.

**Future step:**
- Implement mTLS (mutual TLS) for service-to-service auth
- Or: Signed JWT with service identity and short expiry
- Validate caller is authorized drop-copy producer

**Effort:** Medium (2-3 days)

---

### 2. No Row-Level Security (RLS) in Database

**Current state:** Org isolation enforced at application layer only. All queries include `WHERE org_id = ?` manually.

**Risk:** Bug in application code could leak data across orgs. Single missed filter = cross-tenant data exposure.

**Future step:**
- Enable Postgres RLS policies on all tables
- Set `app.current_org_id` session variable from application
- RLS policies automatically filter by org

**Effort:** Medium (1-2 days)

---

### 3. Mock JWT Issuer (No Real Identity Provider)

**Current state:** Dashboard uses mock JWT issuer for development. Tokens are generated locally with hardcoded secrets.

**Risk:** Not suitable for production. No real user management, password reset, MFA, etc.

**Future step:**
- Integrate with real identity provider (Auth0, Clerk, Cognito, or self-hosted)
- Implement proper JWT validation with key rotation
- Add session management, refresh tokens

**Effort:** High (3-5 days)

---

### 4. No HTTPS/TLS Configuration

**Current state:** All services communicate over plain HTTP in Docker Compose.

**Risk:** Data in transit is unencrypted.

**Future step:**
- Add TLS termination (nginx/traefik reverse proxy)
- Or: Deploy behind cloud load balancer with TLS
- Ensure all internal service communication is encrypted

**Effort:** Low-Medium (1 day)

---

## 🟠 High (Address for Scale/Reliability)

### 5. ~~Query-Time Aggregation (No Daily Rollups)~~ ✅ RESOLVED

**Status:** Implemented `org_stats_daily` and `user_stats_daily` tables.

Worker updates daily aggregates incrementally on each event. Dashboard queries sum daily rollups for fast date range queries.

**Note:** P95/percentiles still computed at query-time from `run_facts` - cannot be pre-aggregated accurately. See architecture doc for future options (histogram buckets, t-digest).

---

### 6. Single Postgres Instance (No Replicas)

**Current state:** Single PostgreSQL container. No read replicas, no failover.

**Risk:** Database is single point of failure. No horizontal read scaling.

**Future step:**
- Add read replica for dashboard queries
- Configure streaming replication
- Or: Use managed Postgres (RDS, Cloud SQL) with automatic failover

**Effort:** Medium (depends on infrastructure)

---

### 7. No Dead-Letter Queue for Failed Events

**Current state:** Worker retries failed events (increments `attempts`, records `last_error`). No max retries or dead-letter handling.

**Risk:** Poison events block the queue. No alerting on persistent failures.

**Future step:**
- Add `max_attempts` threshold (e.g., 5)
- Move to `events_dead_letter` table after max attempts
- Alert on dead-letter queue growth
- Admin UI to inspect/replay dead letters

**Effort:** Low (1 day)

---

### 8. No Data Retention/Archiving Strategy

**Current state:** All events kept forever. No partitioning, no archival.

**Risk:** Storage grows unbounded. Query performance degrades over time.

**Future step:**
- Partition `events_raw` by month (or use TimescaleDB)
- Archive old partitions to cold storage (S3)
- Define retention policy (e.g., 1 year hot, archive older)
- Implement partition drop/archive automation

**Effort:** Medium (2-3 days)

---

### 9. No Real-Time Updates (Polling Only)

**Current state:** Dashboard shows point-in-time data. Users must refresh to see new data.

**Tradeoff:** Much simpler architecture. Acceptable for analytics dashboard (not live monitoring).

**Future step (if needed):**
- Add WebSocket connection for live updates
- Or: Server-Sent Events (SSE) for simpler one-way updates
- Worker publishes to pub/sub when projections update

**Effort:** High (3-5 days)

---

### 10. No Caching Layer

**Current state:** Every dashboard query hits Postgres directly. No Redis or in-memory cache.

**Tradeoff:** Simpler. Postgres is fast enough for V1 scale.

**When it breaks:** High concurrent users, repeated expensive queries.

**Future step:**
- Add Redis for query result caching
- Cache expensive aggregates with short TTL (1-5 min)
- Invalidate on relevant event ingestion

**Effort:** Medium (1-2 days)

---

## 🟡 Medium (Quality/DX Improvements)

### 11. No CI/CD Pipeline

**Current state:** No automated builds, tests, or deployments configured.

**Future step:**
- GitHub Actions for lint/build/test on PR
- Automated Docker image builds
- Deployment automation (staging → production)

**Effort:** Low (1 day for basic, more for full pipeline)

---

### 12. No Monitoring/Alerting

**Current state:** No observability. Errors go to console logs only.

**Future step:**
- Structured logging (JSON logs)
- Error tracking (Sentry or similar)
- Metrics (Prometheus + Grafana or cloud equivalent)
- Alerts on error rates, queue depth, latency

**Effort:** Medium (2-3 days)

---

### 13. No OpenAPI/Swagger Documentation

**Current state:** API contracts documented in markdown only. No machine-readable spec.

**Future step:**
- Generate OpenAPI spec from Zod schemas
- Swagger UI for API exploration
- Client SDK generation (optional)

**Effort:** Low (1 day)

---

### 14. No Rate Limiting on Ingest

**Current state:** Ingest API accepts unlimited requests. No throttling.

**Risk:** Runaway producer could overwhelm database.

**Future step:**
- Add rate limiting per source service
- Return 429 when limit exceeded
- Queue overflow protection

**Effort:** Low (0.5 days)

---

### 15. No Backfill/Replay Tooling

**Current state:** If projections get corrupted, no easy way to rebuild from raw events.

**Future step:**
- CLI command to replay events from `events_raw`
- Truncate read models, re-process all events
- Support partial replay (date range, specific org)

**Effort:** Low (1 day)

---

### 16. CSV Export Deferred

**Current state:** No CSV export functionality for sessions or users lists.

**Tradeoff:** V1 focuses on interactive dashboard views. Export can be done via browser copy/paste or screenshots.

**Future step:**
- Add CSV export endpoint for sessions list
- Add CSV export endpoint for users list
- Download button in table headers

**Effort:** Low (0.5 days)

---

### 17. Teams Feature Deferred

**Current state:** Data model does not include teams. Users see org-level or individual views only.

**Tradeoff:** Simplified V1 scope. Can add later with schema migration.

**Future step:**
- Add `team_id` column to `users` table or create `teams` table
- Add team management UI
- Team-scoped dashboards
- Team-level permissions

**Effort:** Medium (2-3 days)

---

### 18. No External Integrations

**Current state:** No GitHub, GitLab, CI/CD, Slack, or other integrations.

**Tradeoff:** V1 focuses on core analytics. Integrations add complexity.

**Future step:**
- GitHub PR lifecycle integration
- Slack notifications for anomalies
- CI pipeline status correlation

**Effort:** High (varies by integration)

---

### 19. No Tagging System

**Current state:** Sessions/runs cannot be tagged or categorized by users.

**Future step:**
- Add tags to sessions (user-defined or auto-detected)
- Filter/group by tags in dashboard
- Tag-based alerting rules

**Effort:** Medium (2-3 days)

---

## 🟢 Low (Polish/Convenience)

### 20. SSR-First Data Fetching (No TanStack Query)

**Current state:** Dashboard uses SSR for data fetching. No client-side caching or background refetch.

**Tradeoff:** Simpler. Works well for dashboard that doesn't need instant updates.

**Future step (if needed):**
- Add TanStack Query for client-side caching
- Background refetch on window focus
- Optimistic updates

**Effort:** Medium (1-2 days)

---

### 21. No Keyboard Shortcuts

**Current state:** All interactions are mouse/touch only.

**Future step:**
- Add keyboard navigation (j/k for list items)
- Shortcuts for common actions (r for refresh, / for search)

**Effort:** Low (0.5 days)

---

### 22. No Accessibility Audit

**Current state:** Using shadcn/ui (Radix primitives), which has good a11y defaults. But no formal audit.

**Future step:**
- Run axe-core or Lighthouse accessibility audit
- Fix identified issues
- Add skip links, focus management
- Screen reader testing

**Effort:** Low-Medium (1-2 days)

---

### 23. No Internationalization (i18n)

**Current state:** English only. No translation infrastructure.

**Future step:**
- Add next-intl or similar
- Extract strings to translation files
- Add language selector

**Effort:** Medium (2-3 days for infrastructure, more for translations)

---

### 24. Single Theme (No Dark Mode Toggle)

**Current state:** Default theme only. Theme system was removed for simplicity.

**Tradeoff:** Simpler. Theme was over-engineered in base project.

**Future step:**
- Re-add dark mode toggle
- Respect system preference

**Effort:** Low (0.5 days)

---

### 25. Basic Responsive Design

**Current state:** Dashboard works on mobile but optimized for desktop. Complex tables may need horizontal scroll.

**Future step:**
- Improve mobile table views (card layout)
- Touch-friendly interactions
- Mobile-optimized navigation

**Effort:** Medium (1-2 days)

---

### 26. USD-Only Cost Display

**Current state:** All costs displayed in USD. No currency conversion.

**Future step:**
- Add currency preference per org
- Display in local currency
- Or: Keep USD as canonical, add note

**Effort:** Low (0.5 days)

---

### 27. Single Timezone Assumption

**Current state:** Times displayed in browser local timezone. No explicit timezone handling.

**Future step:**
- Add org/user timezone preference
- Display times in configured timezone
- UTC option for cross-org views

**Effort:** Low (1 day)

---

### 28. No Offline Support

**Current state:** Dashboard requires network connection. No service worker or offline caching.

**Tradeoff:** Analytics dashboard typically needs fresh data anyway.

**Future step (probably not needed):**
- Service worker for static assets
- IndexedDB for offline data access

**Effort:** High (not recommended for this use case)

---

## Summary by Category

| Category | Critical | High | Medium | Low | Resolved |
|----------|----------|------|--------|-----|----------|
| Security | 3 | 0 | 0 | 0 | 0 |
| Scalability | 0 | 3 | 1 | 0 | 1 (daily rollups) |
| Reliability | 1 | 2 | 1 | 0 | 0 |
| Features | 0 | 0 | 5 | 0 | 0 |
| DevOps | 0 | 0 | 3 | 0 | 0 |
| UX/Polish | 0 | 0 | 0 | 9 | 0 |

**Recommended order for production readiness:**
1. Service-to-service auth on Ingest API
2. Real identity provider integration
3. Row-Level Security in database
4. TLS configuration
5. Monitoring/alerting
6. CI/CD pipeline

---

## Related Documents

- `.ai/BACKEND_ARCHITECTURE.md` - Current architecture
- `.ai/TECH_STACK.md` - Technology choices
- `.ai/AUTH_AND_ROLES.md` - Authentication model
- `.ai/ROADMAP.md` - Implementation phases
