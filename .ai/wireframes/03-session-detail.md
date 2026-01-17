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
|        |  VISUAL TIMELINE BAR                                                  |
|        |  +-------------------------------------------------------------------+|
|        |  | 2:34 PM                                                   3:19 PM ||
|        |  | |▓▓▓▓▓▓▓|░░|▓▓▓▓▓▓▓▓▓▓▓|░░░░░░░░|▒▒|░░░░░░░░░░░░░░|▓▓▓▓▓|▓▓▓|   ||
|        |  |  Run #1   │   Run #2      Wait   HO   Wait (handoff)  R#3  R#4    ||
|        |  | Legend: ▓=Run(success) ▒=Run(fail) ░=Wait/Idle ▒▒=Handoff        ||
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

### 2. Visual Timeline Bar

| Component | Description | States |
|-----------|-------------|--------|
| Timeline Bar | Horizontal bar visualization of session activity | loading, populated |
| Time Axis | Start and end timestamps | - |
| Segment | Colored bar segment representing an event/period | hover, selected |
| Tooltip | Details popup on hover | hidden, visible |
| Legend | Color key for segment types | - |

**Purpose:**
Provides an at-a-glance view of the entire session timeline, showing:
- When runs executed and how long they took
- Idle/wait periods between activities
- Where handoffs occurred
- Relative time distribution across the session

**Segment Types & Colors:**

| Segment Type | Color | Description |
|--------------|-------|-------------|
| Run (Success) | Green (#28a745) | Successful run execution period |
| Run (Failed) | Red (#dc3545) | Failed run execution period |
| Run (Timeout) | Orange (#fd7e14) | Timed-out run execution period |
| Run (Canceled) | Gray (#6c757d) | Canceled run execution period |
| Idle/Wait | Light gray (#e9ecef) | Time between events (user thinking, etc.) |
| Handoff | Teal (#17a2b8) | Local handoff event marker |
| User Message | Blue (#007bff) | User message event marker (thin line) |
| Agent Message | Purple (#6f42c1) | Agent message event marker (thin line) |

**Visual Layout:**
```
+-----------------------------------------------------------------------+
| 2:34 PM                                                       3:19 PM |
| ├──────────────────────────────────────────────────────────────────┤  |
| |████|░|██████████|░░░░░░|▒|░░░░░░░░░░░░░░░|█████|███|              |  |
| └──────────────────────────────────────────────────────────────────┘  |
| Legend: █ Run (success)  ▓ Run (failed)  ░ Idle  ▒ Handoff           |
+-----------------------------------------------------------------------+
```

**Interactions:**

| Interaction | Behavior |
|-------------|----------|
| Hover segment | Show tooltip with details (event type, time, duration, cost if applicable) |
| Click segment | Scroll to corresponding item in Timeline list below; highlight the item |
| Hover + Timeline sync | Corresponding Timeline item gets subtle highlight |

**Tooltip Content by Segment Type:**

| Segment | Tooltip Shows |
|---------|---------------|
| Run | "Run #N • Status • Duration • Cost • Tokens" |
| Idle | "Idle • Duration" |
| Handoff | "Local Handoff • Method • User" |
| User Message | "User message • Time • Preview text" |
| Agent Message | "Agent response • Time • Preview text" |

**Click-to-Scroll Behavior:**
1. User clicks a segment (e.g., Run #2)
2. Timeline tab activates if not already active
3. Page scrolls to the corresponding event in the vertical timeline
4. Event item gets highlighted (pulsing border or background flash)
5. Highlight fades after 2 seconds

**Data Requirements:**

| Field | Source | Notes |
|-------|--------|-------|
| sessionStart | session.firstMessageAt | Left edge of timeline |
| sessionEnd | session.lastMessageAt | Right edge of timeline |
| events | API events list | All events with timestamps |
| runs | API runs list | Run start/end times, status |

---

### 3. Tab Navigation

| Tab | Description | Default |
|-----|-------------|---------|
| Timeline | Chronological event view | Yes |
| Runs | Detailed runs table | No |
| Artifacts | Files changed + handoff history | No |

---

### 4. Timeline View (Default Tab)

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

### 5. Runs Tab

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

### 6. Artifacts Tab

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

### 7. In-Session Charts (Optional Section)

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
