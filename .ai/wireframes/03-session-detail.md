# 03 - Session Detail Page

## Overview
Deep-dive view into a single session. Explains why a session needed multiple runs or handoff, showing the complete timeline and run details.

**Route:** `/sessions/:id`

---

## ASCII Diagram

```
+--------------------------------------------------------------------------------+
| HEADER (see 00-layout.md)                                                      |
+--------+-----------------------------------------------------------------------+
| SIDEBAR|  Sessions > #abc123def                                                |
|        |-----------------------------------------------------------------------|
|        |  SESSION HEADER                                                       |
|        |  +-------------------------------------------------------------------+|
|        |  | Session #abc123def                              Created by: alice ||
|        |  | Started: Jan 15, 2024 at 2:34 PM                                  ||
|        |  |                                                                   ||
|        |  | +----------+ +----------+ +----------+ +----------+ +----------+  ||
|        |  | | Lifespan | | Active   | | Runs     | | Handoffs | | Success  |  ||
|        |  | | 45m      | | 12m 5s   | | 4        | | 2        | | 75%      |  ||
|        |  | +----------+ +----------+ +----------+ +----------+ +----------+  ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
|        |  [Timeline] [Runs] [Artifacts]                    <-- Tab navigation  |
|        |  =====================================================================|
|        |                                                                       |
|        |  TIMELINE VIEW (default tab)                                          |
|        |  +-------------------------------------------------------------------+|
|        |  | ● 2:34 PM  USER    Started session                                ||
|        |  | │                  "Fix the login bug in auth.ts"                 ||
|        |  | │                                                                 ||
|        |  | ● 2:34 PM  SYSTEM  Run #1 started                                 ||
|        |  | │                                                                 ||
|        |  | ● 2:38 PM  SYSTEM  Run #1 completed (SUCCESS)                     ||
|        |  | │                  Duration: 4m 12s | Cost: $2.34 | 45k tokens    ||
|        |  | │                                                                 ||
|        |  | ● 2:39 PM  AGENT   "I've fixed the login bug..."                  ||
|        |  | │                                                                 ||
|        |  | ● 2:45 PM  USER    "Can you also add error handling?"             ||
|        |  | │                                                                 ||
|        |  | ● 2:45 PM  SYSTEM  Run #2 started                                 ||
|        |  | │                                                                 ||
|        |  | ● 2:52 PM  SYSTEM  Run #2 completed (FAILED)                      ||
|        |  | │                  Duration: 7m 3s | Error: TIMEOUT               ||
|        |  | │                                                                 ||
|        |  | ● 3:00 PM  SYSTEM  Local handoff (TELEPORT)                       ||
|        |  | │                  User: alice@acme.com                           ||
|        |  | │                                                                 ||
|        |  | ● 3:15 PM  USER    "Let's try again with smaller scope"           ||
|        |  | ...                                                               ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
+--------+-----------------------------------------------------------------------+
```

---

## Component Breakdown

### 1. Session Header

| Component | Description | States |
|-----------|-------------|--------|
| Session ID | Full or truncated session ID | - |
| Created By | User who started session | - |
| Started | Start timestamp | - |
| KPI Cards Row | Summary metrics for session | loading, populated |

**KPI Cards:**
| Metric | Description |
|--------|-------------|
| Lifespan | lastMessageAt - firstMessageAt |
| Active Time | Sum of all run execution times |
| Runs | Total number of runs |
| Local Handoffs | Count of handoff events |
| Success % | Successful runs / total runs |
| Total Cost | Sum of run costs |

---

### 2. Tab Navigation

| Tab | Description | Default |
|-----|-------------|---------|
| Timeline | Chronological event view | Yes |
| Runs | Detailed runs table | No |
| Artifacts | Files changed + handoff history | No |

---

### 3. Timeline View (Default Tab)

| Component | Description | States |
|-----------|-------------|--------|
| Timeline | Vertical chronological event list | loading, empty, populated |
| Event Item | Individual event card | various types |

**Event Types:**

| Type | Icon | Color | Content |
|------|------|-------|---------|
| MESSAGE (USER) | 👤 | Blue | Message text (truncated, expandable) |
| MESSAGE (AGENT) | 🤖 | Purple | Message text (truncated, expandable) |
| RUN_START | ▶ | Gray | "Run #N started" |
| RUN_END (SUCCESS) | ✓ | Green | Duration, cost, tokens |
| RUN_END (FAILED) | ✗ | Red | Duration, error category |
| RUN_END (TIMEOUT) | ⏱ | Orange | Duration, timeout info |
| RUN_END (CANCELED) | ⊘ | Gray | Duration, canceled by |
| HANDOFF | ↗ | Teal | Method, user |

**Event Item Structure:**
```
● TIME    ACTOR    Title
│                  Details line 1
│                  Details line 2 (if applicable)
│
```

**Interactions:**
- MESSAGE events: Click to expand full text
- RUN_END events: Click to jump to run details in Runs tab
- Long timelines: Infinite scroll or "Load more" button

---

### 4. Runs Tab

| Component | Description | States |
|-----------|-------------|--------|
| Runs Table | All runs in session | loading, empty, populated |
| Expandable Row | Click to show run details | collapsed, expanded |

**Table Columns:**
| Column | Description |
|--------|-------------|
| Run # | Sequential number |
| Status | Badge: SUCCESS, FAILED, TIMEOUT, CANCELED |
| Started | Start timestamp |
| Duration | Execution time |
| Queue Wait | Time in queue (if available) |
| Input Tokens | Token count |
| Output Tokens | Token count |
| Cost | Run cost |
| Error | Error category (if failed) |

**Expanded Row Details:**
```
+-----------------------------------------------------------------------+
| Run #2 Details                                                        |
|-----------------------------------------------------------------------|
| Status: FAILED                        Error: TIMEOUT                  |
| Started: 2:45:00 PM                   Completed: 2:52:03 PM           |
| Duration: 7m 3s                       Queue Wait: 12s                 |
|                                                                       |
| Tokens:                               Cost:                           |
|   Input: 23,456                         $3.45                         |
|   Output: 12,345                                                      |
|   Total: 35,801                                                       |
|                                                                       |
| Artifacts (if available):                                             |
|   Files changed: 3                                                    |
|   Lines added: 45                                                     |
|   Lines deleted: 12                                                   |
+-----------------------------------------------------------------------+
```

---

### 5. Artifacts Tab

| Component | Description | States |
|-----------|-------------|--------|
| Artifacts Summary | Files changed across all runs | loading, empty, populated |
| Handoff History | List of all handoff events | loading, empty, populated |

**Artifacts Summary:**
```
+-----------------------------------------------------------------------+
| Files Changed (across all runs)                                       |
|-----------------------------------------------------------------------|
| Total: 5 files | +120 lines | -45 lines                               |
|                                                                       |
| src/auth/login.ts          +45 -12                                    |
| src/auth/session.ts        +23 -8                                     |
| src/utils/validate.ts      +30 -15                                    |
| tests/auth.test.ts         +22 -10                                    |
| README.md                  +0  -0  (touched)                          |
+-----------------------------------------------------------------------+
```

**Handoff History:**
```
+-----------------------------------------------------------------------+
| Local Handoff History                                                 |
|-----------------------------------------------------------------------|
| #  | Timestamp           | User           | Method                    |
|----|---------------------|----------------|---------------------------|
| 1  | Jan 15, 3:00 PM     | alice@acme.com | TELEPORT                  |
| 2  | Jan 15, 4:30 PM     | alice@acme.com | OPEN_IN_CLI               |
+-----------------------------------------------------------------------+
```

---

### 6. In-Session Charts (Optional Section)

| Component | Description | States |
|-----------|-------------|--------|
| Duration Distribution | Bar chart of run durations | loading, empty, populated |
| Cost Distribution | Bar chart of run costs | loading, empty, populated |

Note: Only shown if session has ≥3 runs. Provides visual overview of run patterns.

---

## Data Requirements

| Field | Source | Notes |
|-------|--------|-------|
| sessionId | URL params | From route |
| session | API `GET /api/sessions/:id` | Session metadata |
| events | API `GET /api/sessions/:id/events` | Timeline events |
| runs | API `GET /api/sessions/:id/runs` | Run details |
| artifacts | API `GET /api/sessions/:id/artifacts` | Aggregated artifact info |
| handoffs | API `GET /api/sessions/:id/handoffs` | Handoff events |

---

## Empty States

| Scenario | Display |
|----------|---------|
| Session not found | "Session not found" + link to sessions list |
| No events yet | "Session started but no activity yet" |
| No runs | "No runs in this session" |
| No handoffs | "No local handoffs for this session" |

---

## Role-Based Visibility

| Role | Can View |
|------|----------|
| MEMBER | Only own sessions |
| MANAGER | Any org session |
| ORG_ADMIN | Any org session |
| SUPPORT | Any session in selected org |
| SUPER_ADMIN | Any session in selected org |

If user tries to access a session they don't have permission for:
- Show "Access denied" message
- Provide link back to sessions list
