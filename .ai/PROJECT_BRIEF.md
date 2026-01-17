# Agent Cloud Execution Monitoring Dashboard (Org Analytics)

## Problem statement
Engineering teams increasingly run **coding agents** in a managed cloud environment (similar to “Claude Code on the web”) to perform tasks they would otherwise do locally: implement changes, run tests, and push a branch with results. The customer (an engineering org) needs a **customer-facing, org-level analytics dashboard** to understand:

- **Adoption**: who is using cloud agents and how often
- **Reliability**: how frequently tasks succeed vs fail, and why
- **Speed**: how long work takes (queue time + execution time) and where time is spent
- **Cost**: what the org spends, what drives cost
- **Human intervention**: how often results require local takeover / iteration

Non-goals for V1:
- No external integrations (e.g., GitHub PR lifecycle, CI systems, Jira, etc.).
- No tagging/classification of tasks.
- No “acceptance” tracking: sessions are chat-like threads that persist and are never “done” explicitly.

## Product scope (V1)
The system provides a chat-like UI where users submit a prompt to run a cloud coding task. The agent runs remotely, performs changes, runs tests, and pushes results to a remote branch. Users can **continue interacting in the same session** or **handoff the results locally** (e.g., teleport / open in CLI) to inspect or amend.

Reference behavior (conceptual): Claude Code on the web describes cloud execution, pushing a branch, and “teleporting” a session/branch to local CLI. Teleport fetches and checks out the remote branch and loads conversation history. (We use this as a conceptual model for “Local handoff”.)

## Users and roles

### Organization-Level Roles (scoped to single org)
- **Org Admin**: full read access to org data, manage org settings
- **Manager**: read access to org data, team-level views
- **Member**: read access to own data + team aggregates

### Platform-Level Roles (cross-org)
- **Support**: can view any org via selector (to assist org admins)
- **Super Admin**: all orgs + global aggregate view

See `.ai/AUTH_AND_ROLES.md` for detailed permission matrix and UI behavior.

## Core objects (domain model)
### Organization
- `orgId`, `name`

### User
- `userId`, `orgId` (null for platform roles), `email`
- `role`: `MEMBER | MANAGER | ORG_ADMIN | SUPPORT | SUPER_ADMIN`

### Session
A persistent chat-like thread bound to a repo/workspace context.
- `sessionId`, `orgId`, `createdByUserId`
- `createdAt`
- `firstMessageAt` (usually `createdAt`)
- `lastMessageAt` (updates on every user/agent message)
- `repoId` / `workspaceId` (opaque in V1)

### Run
One autonomous cloud execution attempt within a session.
- `runId`, `sessionId`, `orgId`
- `startedAt`, `completedAt`
- `status`: `SUCCEEDED | FAILED | CANCELED | TIMEOUT`
- `queueWaitMs` (optional)
- `executionMs` (computed)
- `failureCategory` (if failed; limited controlled vocabulary)
- `artifactSummary`: `filesChanged`, `linesAdded`, `linesDeleted`, `testsRun`, `testsPassed` (if available)
- `inputTokens`: number of input tokens consumed
- `outputTokens`: number of output tokens generated
- `totalTokens`: `inputTokens + outputTokens` (computed)
- `costCents`: monetary cost in cents (derived from token usage and pricing)

### Event
A timestamped occurrence within a session, used for timeline visualization.
- `eventId`, `sessionId`
- `timestamp`
- `type`: `MESSAGE | RUN_START | RUN_END | HANDOFF`
- `actorType`: `USER | AGENT | SYSTEM`
- `payload`: type-specific data (message content, runId reference, etc.)

### LocalHandoffEvent
Represents exporting/teleporting session results to local.
- `handoffId`, `sessionId`, `orgId`, `userId`
- `timestamp`
- `method`: `TELEPORT | OPEN_IN_CLI | DOWNLOAD_PATCH` (platform-defined)

## Key metrics (V1)
### A) Adoption / usage
- **Active users (DAU/WAU/30d)**: distinct users with ≥1 run in period
- **Runs per day**: count of runs per day in period
- **Runs per active user**: runs / active users

### B) Reliability
- **Run success rate**: `SUCCEEDED / totalRuns`
- **Run failure rate**: `FAILED / totalRuns`
- **Top failure categories** (count + %)

### C) Speed / latency
- **Avg run duration**: avg(`completedAt - startedAt`)
- **P95 run duration**
- **Avg queue wait time** (if captured)

### D) Cost & Token Usage
- **Total cost (period)**: sum(`costCents`)
- **Cost per run**: avg(`costCents`)
- **Cost by user** (top N)
- **Total tokens (period)**: sum(`totalTokens`)
- **Tokens per run**: avg(`totalTokens`)
- **Input/Output token ratio**: sum(`inputTokens`) / sum(`outputTokens`)

### E) Session-centric metrics (since there is no explicit acceptance)
These are the core “quality / friction” proxies in this product model.

1) **Average runs per session**
- Definition: avg over sessions of `count(runs in session within period)`
- Interpretation: higher values indicate more iteration/tweaking.

2) **Average active agent time per session**
- Definition: avg over sessions of `sum(run.executionMs)`
- Interpretation: how much agent execution time is consumed per session.

3) **Average session lifespan**
- Definition: avg over sessions of `(lastMessageAt - firstMessageAt)`
- Interpretation: time between first prompt and final message (agent or user) within the measured window.

4) **Local handoff rate** (Local Checkout Rate)
- Definition: `% of sessions with ≥1 LocalHandoffEvent in period`
- Interpretation: how often users pull results locally (for inspection or amendments).

5) **Post-handoff iteration rate**
- Definition: `% of sessions where a LocalHandoffEvent is followed by ≥1 additional Run in the same session within X hours (default X=24h)`
- Interpretation: proxy for “handoff exposed issues or required more work”.

Notes:
- Because session threads persist indefinitely, metrics are computed over a **selected time range** and can use a rolling inactivity rule (e.g., treat "session activity window" as messages/runs within the last N days).
- **Data retention**: 1 year of historical data available for queries.

## Dashboard information architecture (V1)

### 1) Org Overview (`/dashboard`)
Goal: 30-second health check for admins/managers — adoption, reliability, cost, friction.

**A. KPI Row — Platform Basics**
- Total Runs, Success Rate, p95 Run Duration, Total Cost, Total Tokens

**B. KPI Row — Session/Friction**
- Avg Runs/Session, Avg Active Agent Time/Session, Avg Session Lifespan, Local Handoff Rate, Post-Handoff Iteration Rate

**C. Trends — Usage**
- Chart: Runs over time, Sessions over time (toggle: Active Users)

**D. Trends — Cost**
- Chart: Total cost over time (toggle: Cost per run, Token usage)

**E. Trends — Friction**
- Chart: Avg Runs/Session over time, Local Handoff Rate over time, Post-Handoff Iteration Rate over time

**F. Reliability**
- Chart: Success rate trend
- Table: Top failure categories (count + %)

**G. Top Sessions Table**
- Sortable by: cost, runs, lifespan, failures
- Columns: Session ID, Started, Lifespan, Active agent time, Runs, Local handoffs, Post-handoff iteration (Y/N), Success %, Cost
- Row click → Session Detail

**H. Top Users Table**
- Sortable by: cost, runs, avg runs/session, handoff rates
- Columns: User, Sessions, Runs, Avg runs/session, Avg active time, Local handoff rate, Post-handoff iteration rate, Success rate, Cost
- Row click → Users page filtered to that user

### 2) Sessions (`/sessions`)
Goal: find which sessions are costly / problematic / high-iteration.

**Filters bar:** Date range, search (session id), status, duration range, cost range, local handoff (yes/no), post-handoff iteration (yes/no)

**Summary strip (aggregated):** Avg Runs/Session, Avg Active Agent Time, Avg Session Lifespan, Local Handoff Rate, Post-Handoff Iteration Rate

**Sessions table:** session id, createdBy, started, lifespan, active agent time, runs, local handoffs, post-handoff iteration (Y/N), success %, cost
- Row click → Session Detail

### 3) Session Detail (`/sessions/:id`)
Goal: explain *why* a session needed multiple runs or handoff.

**Session header:** Session ID, Started, Lifespan, Active Agent Time, Runs count, Local Handoffs count, Post-handoff iteration (Y/N)

**Timeline view:** Chronological events (user messages, run start/end, handoff events)

**Runs table:** Run #, Status, Duration, Tokens (in/out), Cost, Error category (if failed)

**In-session distributions:** Run duration distribution, Run cost distribution (charts)

**Artifacts & Handoff History:** Files changed summary, handoff events list (timestamp, user, method)

### 4) Users (`/users`)
Goal: compare users — power users vs low adopters, cost drivers, friction hotspots.

**Filters bar:** Date range, search user

**Users table (sortable, paginated):**
- Columns: User, Sessions, Runs, Avg runs/session, Avg active agent time, Avg session lifespan, Local handoff rate, Post-handoff iteration rate, Success rate, Total cost, Cost/run
- Row click → User Detail

### 5) User Detail (`/users/:userId`)
Goal: deep-dive into a specific user's activity, patterns, and sessions.

**User header:** Name, Email, Role, Member since, Last active

**A. KPI Row — User Stats (for selected period)**
- Sessions, Runs, Avg Runs/Session, Avg Active Agent Time, Avg Session Lifespan, Local Handoff Rate, Post-Handoff Iteration Rate, Success Rate, Total Cost

**B. Trends — User Activity**
- Chart: Runs over time, Sessions over time
- Chart: Cost over time

**C. Trends — User Friction**
- Chart: Avg Runs/Session over time, Local Handoff Rate over time

**D. User's Sessions Table**
- Same columns as Sessions page, pre-filtered to this user
- Columns: Session ID, Started, Lifespan, Active agent time, Runs, Local handoffs, Post-handoff iteration (Y/N), Success %, Cost
- Row click → Session Detail

## Data export
- CSV/JSON export for Org Overview tables, Sessions list, and Users list.

## Future (explicitly out of scope for V1)
- External integrations: PR lifecycle, merges, CI checks, issue trackers
- Task tagging / taxonomy
- Saved “agent presets” / pipelines / workflow templates
- Deeper observability: traces, per-tool spans, per-command logs (keep for drill-down)

## Acceptance criteria (business)
- User can view org-level KPIs and trends over a selectable time range (7/30/90/custom).
- User can drill down from org overview → sessions list → session detail.
- Metrics displayed match the definitions above (especially session-centric metrics: runs/session, agent active time, session lifespan, local handoff rate, post-handoff iteration rate).
- Dashboard remains understandable without any external systems (no PR/merge status).

## References (conceptual inspiration)
- Claude Code on the web (teleport, cloud execution lifecycle): https://code.claude.com/docs/en/claude-code-on-the-web
- Zencoder Analytics dashboard components (metric card + trends + member table patterns): https://docs.zencoder.ai/features/analytics

## Related Documents
- `.ai/ROADMAP.md` - Implementation phases and milestones
- `.ai/TECH_STACK.md` - Technology choices (frontend, backend, devops)
- `.ai/AUTH_AND_ROLES.md` - Authentication and authorization model
