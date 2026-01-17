# 06 - User Detail Page

## Overview
Deep-dive into a specific user's activity, patterns, and sessions. Shows individual trends and provides access to their session history.

**Route:** `/users/:userId`

---

## ASCII Diagram

```
+--------------------------------------------------------------------------------+
| HEADER (see 00-layout.md)                                                      |
+--------+-----------------------------------------------------------------------+
| SIDEBAR|  Users > alice@acme.com                                               |
|        |-----------------------------------------------------------------------|
|        |  USER HEADER                                                          |
|        |  +-------------------------------------------------------------------+|
|        |  | [Avatar]  Alice Johnson                              Role: MEMBER ||
|        |  |           alice@acme.com                                          ||
|        |  |           Member since: Jan 1, 2024    Last active: 2 hours ago   ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
|        |  KPI ROW - User Stats (for selected period)                           |
|        |  +----------+ +----------+ +----------+ +----------+ +----------+     |
|        |  | Sessions | | Runs     | | R/Sess   | | Active   | | Lifespan |     |
|        |  | 12       | | 28       | | 2.3      | | 4h 32m   | | 18m avg  |     |
|        |  +----------+ +----------+ +----------+ +----------+ +----------+     |
|        |  +----------+ +----------+ +----------+ +----------+                  |
|        |  | Handoff% | | Post-H%  | | Success% | | Cost     |                  |
|        |  | 25%      | | 8%       | | 92%      | | $156     |                  |
|        |  +----------+ +----------+ +----------+ +----------+                  |
|        |                                                                       |
|        |  TRENDS SECTION                                                       |
|        |  +---------------------------+  +---------------------------+         |
|        |  | Activity Over Time        |  | Cost Over Time            |         |
|        |  | [Runs + Sessions lines]   |  | [Cost line chart]         |         |
|        |  | ════════════════════════  |  | ════════════════════════  |         |
|        |  +---------------------------+  +---------------------------+         |
|        |                                                                       |
|        |  +---------------------------+                                        |
|        |  | Friction Over Time        |                                        |
|        |  | [Runs/Sess + Handoff%]    |                                        |
|        |  | ════════════════════════  |                                        |
|        |  +---------------------------+                                        |
|        |                                                                       |
|        |  USER'S SESSIONS TABLE                                                |
|        |  +-------------------------------------------------------------------+|
|        |  | Session ID | Started   | Lifespan | Runs | Handoff | Succ% | Cost ||
|        |  |------------|-----------|----------|------|---------|-------|------||
|        |  | #abc123    | Jan 15    | 18m      | 4    | Yes     | 75%   | $12  ||
|        |  | #def456    | Jan 14    | 45m      | 8    | No      | 87%   | $34  ||
|        |  | #ghi789    | Jan 13    | 2h 15m   | 2    | No      | 100%  | $8   ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
|        |  [< Prev]  Page 1 of 2  (12 total)  [Next >]                          |
+--------+-----------------------------------------------------------------------+
```

---

## Component Breakdown

### 1. User Header

| Component | Description | States |
|-----------|-------------|--------|
| Avatar | User avatar (initials or image) | - |
| Name | User's display name | - |
| Email | User's email address | - |
| Role | Role badge (MEMBER, MANAGER, ORG_ADMIN) | - |
| Member Since | Account creation date | - |
| Last Active | Relative time of last activity | - |

---

### 2. KPI Row - User Stats

| Component | Metric | Description | States |
|-----------|--------|-------------|--------|
| KPI Card | Sessions | Count in period | loading, populated |
| KPI Card | Runs | Count in period | loading, populated |
| KPI Card | Avg Runs/Session | Friction indicator | loading, populated |
| KPI Card | Avg Active Time | Average agent time per session | loading, populated |
| KPI Card | Avg Lifespan | Average session duration | loading, populated |
| KPI Card | Handoff Rate | % sessions with handoff | loading, populated |
| KPI Card | Post-Handoff Iter. | % with post-handoff runs | loading, populated |
| KPI Card | Success Rate | Overall success rate | loading, populated |
| KPI Card | Total Cost | Sum of costs in period | loading, populated |

---

### 3. Trends Section

#### 3a. Activity Over Time Chart

| Component | Description | States |
|-----------|-------------|--------|
| Dual-Line Chart | Runs and Sessions over time | loading, empty, populated |

**Chart specs:**
- X-axis: Time (daily buckets)
- Y-axis (left): Run count
- Y-axis (right): Session count
- Lines: Runs (primary), Sessions (secondary)

#### 3b. Cost Over Time Chart

| Component | Description | States |
|-----------|-------------|--------|
| Line Chart | Daily cost | loading, empty, populated |
| Toggle | Switch to cumulative view | - |

#### 3c. Friction Over Time Chart

| Component | Description | States |
|-----------|-------------|--------|
| Dual-Line Chart | Friction metrics over time | loading, empty, populated |

**Metrics shown:**
- Avg Runs/Session (line)
- Handoff Rate % (line, secondary axis)

---

### 4. User's Sessions Table

| Component | Description | States |
|-----------|-------------|--------|
| Data Table | User's sessions (pre-filtered) | loading, empty, populated |
| Sort Headers | Click to sort | asc, desc, none |

**Columns:**

| Column | Description | Sortable | Width |
|--------|-------------|----------|-------|
| Session ID | Truncated ID, click to view | No | 120px |
| Started | Start date/time | Yes | 120px |
| Lifespan | Session duration | Yes | 80px |
| Active Time | Sum of run execution time | Yes | 90px |
| Runs | Number of runs | Yes | 60px |
| Local Handoffs | Count of handoff events | Yes | 80px |
| Post-Handoff Iter. | Yes/No badge | No | 80px |
| Success % | Percentage of successful runs | Yes | 80px |
| Cost | Total cost | Yes | 80px |

**Row Interactions:**
- Hover: Subtle background highlight
- Click row: Navigate to `/sessions/:id`
- Default sort: Started (descending - newest first)

---

### 5. Pagination

| Component | Description | States |
|-----------|-------------|--------|
| Prev Button | Go to previous page | enabled, disabled |
| Page Info | "Page X of Y (Z total)" | - |
| Next Button | Go to next page | enabled, disabled |
| Page Size | Dropdown: 10, 25, 50 | - |

---

## Data Requirements

| Field | Source | Notes |
|-------|--------|-------|
| userId | URL params | From route |
| orgId | AuthContext | Current org context |
| timeRange | URL params | from/to dates |
| user | API `GET /api/users/:userId` | User profile |
| userMetrics | API `GET /api/users/:userId/metrics` | Aggregated KPIs |
| activityTrends | API `GET /api/users/:userId/trends/activity` | Time series |
| costTrends | API `GET /api/users/:userId/trends/cost` | Time series |
| frictionTrends | API `GET /api/users/:userId/trends/friction` | Time series |
| sessions | API `GET /api/users/:userId/sessions` | Paginated sessions |

---

## Empty States

| Scenario | Display |
|----------|---------|
| User not found | "User not found" + link to users list |
| No activity in period | "No activity in selected time range" |
| No sessions ever | "This user has no sessions yet" |
| API error | "Failed to load user data" + [Retry] button |

---

## Role-Based Visibility

| Role | Can View |
|------|----------|
| MEMBER | Only own profile |
| MANAGER | Any org user |
| ORG_ADMIN | Any org user |
| SUPPORT | Any user in selected org |
| SUPER_ADMIN | Any user in selected org |

**Access Denied Handling:**
If user tries to access a profile they don't have permission for:
- Show "Access denied" message
- If MEMBER, provide link to their own profile
- If MANAGER+, provide link back to users list

---

## Comparison Feature (Optional Enhancement)

Allow comparing this user against org averages:

| Metric | User Value | Org Average | Delta |
|--------|------------|-------------|-------|
| Runs/Session | 2.3 | 2.8 | -18% (better) |
| Handoff Rate | 25% | 34% | -26% (better) |
| Success % | 92% | 94% | -2% (slightly worse) |
| Cost/Run | $5.57 | $4.89 | +14% (higher) |

Note: This is an optional enhancement for V1. Can be deferred.

---

## Navigation

**Breadcrumb:** `Users > alice@acme.com`

**From this page, user can:**
1. Click session row → Session Detail (`/sessions/:id`)
2. Click breadcrumb "Users" → Users list (`/users`)
3. Use sidebar navigation → Other pages
