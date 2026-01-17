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
- **Org Admin / Manager**: needs org-level overview (adoption, spend, reliability trends), and drill-down by user/session.
- **Individual Engineer**: needs personal/team visibility and session/run drill-down for troubleshooting and iteration.

## Core objects (domain model)
### Organization
- `orgId`, `name`

### User
- `userId`, `orgId`, `email`, `role` (admin/manager/member)

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
- Because session threads persist indefinitely, metrics are computed over a **selected time range** and can use a rolling inactivity rule (e.g., treat “session activity window” as messages/runs within the last N days).

## Dashboard information architecture (V1)
### 1) Org Overview
Goal: 30-second snapshot for admins/managers.

Widgets:
- KPI cards: Active users, Runs, Success rate, Total cost, Total tokens, Avg runs/session, Local handoff rate
- Time series: Runs/day, Success rate trend, Cost trend, Token usage trend
- Tables: Top users by runs, Top users by cost/tokens, Top failure categories

### 2) Sessions
Goal: find which sessions are costly / problematic / high-iteration.

- Table with: session id (short), createdBy, last active, runs (period), success rate, total cost, total tokens, agent active time, lifespan, local handoff (yes/no), post-handoff iteration (yes/no)
- Filters: time range, user (optional)

### 3) Session Detail
Goal: explain *why* a session needed multiple runs or handoff.

- Timeline view: messages + runs + handoff events
- Run list: status, duration, tokens (input/output), cost, failure category
- Session metrics summary: runs count, total agent time, total tokens, total cost, lifespan, handoff count, post-handoff iteration

## Data export
- CSV export for Org Overview tables and Sessions list.

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
