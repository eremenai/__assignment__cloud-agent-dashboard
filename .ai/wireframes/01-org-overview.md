# 01 - Org Overview Dashboard

## Overview
The primary landing page for org admins/managers. Provides a 30-second health check showing adoption, reliability, cost, and friction metrics.

**Route:** `/dashboard`

---

## ASCII Diagram

```
+--------------------------------------------------------------------------------+
| HEADER (see 00-layout.md)                                                      |
+--------+-----------------------------------------------------------------------+
| SIDEBAR|  Overview                                                             |
|        |-----------------------------------------------------------------------|
|        |  KPI ROW A - Platform Basics                                          |
|        |  +------------+ +------------+ +------------+ +------------+ +-------+|
|        |  | Total Runs | | Success %  | | p95 Dur.   | | Total Cost | | Tokens||
|        |  | 1,234  ↑5% | | 94.2%  ↓1% | | 45s    ↑3% | | $1,234 ↑8% | | 2.1M  ||
|        |  +------------+ +------------+ +------------+ +------------+ +-------+|
|        |                                                                       |
|        |  KPI ROW B - Session/Friction                                         |
|        |  +------------+ +------------+ +------------+ +------------+ +-------+|
|        |  | Runs/Sess  | | Avg Active | | Avg Life   | | Handoff %  | | Post-H||
|        |  | 2.3    ↑2% | | 4m 32s ↓5% | | 18m    ↑1% | | 34%   ↓3%  | | 12%   ||
|        |  +------------+ +------------+ +------------+ +------------+ +-------+|
|        |                                                                       |
|        |  CHARTS ROW                                                           |
|        |  +---------------------------+  +---------------------------+         |
|        |  | Usage Trends              |  | Cost Trends               |         |
|        |  | [Runs/Sessions over time] |  | [Cost over time]          |         |
|        |  | ════════════════════════  |  | ════════════════════════  |         |
|        |  +---------------------------+  +---------------------------+         |
|        |                                                                       |
|        |  +---------------------------+  +---------------------------+         |
|        |  | Friction Trends           |  | Reliability               |         |
|        |  | [Runs/Sess, Handoff%]     |  | [Success rate trend]      |         |
|        |  | ════════════════════════  |  | + Top Failures table      |         |
|        |  +---------------------------+  +---------------------------+         |
|        |                                                                       |
|        |  TOP SESSIONS TABLE                                                   |
|        |  +-------------------------------------------------------------------+|
|        |  | Session ID | Started | Lifespan | Runs | Handoff | Success | Cost ||
|        |  |------------|---------|----------|------|---------|---------|------||
|        |  | #abc123    | 2h ago  | 18m      | 4    | Yes     | 75%     | $12  ||
|        |  | #def456    | 5h ago  | 45m      | 8    | No      | 87%     | $34  ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
|        |  TOP USERS TABLE                                                      |
|        |  +-------------------------------------------------------------------+|
|        |  | User       | Sessions | Runs | Runs/Sess | Handoff% | Cost        ||
|        |  |------------|----------|------|-----------|----------|-------------||
|        |  | alice@...  | 12       | 28   | 2.3       | 25%      | $156        ||
|        |  | bob@...    | 8        | 24   | 3.0       | 50%      | $234        ||
|        |  +-------------------------------------------------------------------+|
+--------+-----------------------------------------------------------------------+
```

---

## Component Breakdown

### 1. KPI Row A - Platform Basics

| Component | Metric | Description | States |
|-----------|--------|-------------|--------|
| KPI Card | Total Runs | Count of runs in period | loading, populated |
| KPI Card | Success Rate | SUCCEEDED / total runs | loading, populated |
| KPI Card | p95 Duration | 95th percentile run duration | loading, populated |
| KPI Card | Total Cost | Sum of costCents | loading, populated |
| KPI Card | Total Tokens | Sum of totalTokens | loading, populated |

#### KPI Card Structure
```
+------------------+
| Metric Label     |
| 1,234    ↑5%     |  (value + trend indicator)
| vs prev period   |  (comparison note)
+------------------+
```

#### Trend Indicators
- **↑** (green): increase is positive (for usage) or neutral
- **↓** (red): decrease is negative (for success rate)
- **↑** (red): increase is negative (for cost if concerning)
- Percentage shows delta vs previous equivalent period

---

### 2. KPI Row B - Session/Friction Metrics

| Component | Metric | Description | States |
|-----------|--------|-------------|--------|
| KPI Card | Avg Runs/Session | Average runs per session | loading, populated |
| KPI Card | Avg Active Time | Average sum of run execution time per session | loading, populated |
| KPI Card | Avg Session Lifespan | Average (lastMessageAt - firstMessageAt) | loading, populated |
| KPI Card | Local Handoff Rate | % sessions with ≥1 handoff event | loading, populated |
| KPI Card | Post-Handoff Iteration | % sessions with runs after handoff | loading, populated |

---

### 3. Charts Row

#### 3a. Usage Trends Chart

| Component | Description | States |
|-----------|-------------|--------|
| Line Chart | Runs over time (primary) | loading, empty, populated |
| Toggle | Switch between Runs / Sessions / Active Users | - |

**Chart specs:**
- X-axis: Time (daily buckets for 7d/30d, weekly for 90d)
- Y-axis: Count
- Line: Primary metric (runs)
- Optional: Secondary line (sessions) or bars (context)

#### 3b. Cost Trends Chart

| Component | Description | States |
|-----------|-------------|--------|
| Line Chart | Total cost over time | loading, empty, populated |
| Toggle | Switch between Cost / Cost per run / Token usage | - |

#### 3c. Friction Trends Chart

| Component | Description | States |
|-----------|-------------|--------|
| Multi-line Chart | Friction metrics over time | loading, empty, populated |

**Metrics shown:**
- Avg Runs/Session (line)
- Local Handoff Rate (line)
- Post-Handoff Iteration Rate (line)

#### 3d. Reliability Section

| Component | Description | States |
|-----------|-------------|--------|
| Line Chart | Success rate over time | loading, empty, populated |
| Table | Top failure categories | loading, empty, populated |

**Top Failures Table columns:**
| Column | Description |
|--------|-------------|
| Category | Failure category name |
| Count | Number of failures |
| % | Percentage of total failures |

---

### 4. Top Sessions Table

| Component | Description | States |
|-----------|-------------|--------|
| Data Table | Top sessions by selected sort | loading, empty, populated |
| Sort Dropdown | Sort by: Cost, Runs, Lifespan, Failures | - |

**Columns:**
| Column | Description | Sortable |
|--------|-------------|----------|
| Session ID | Truncated session ID, link to detail | No |
| Started | Relative time (e.g., "2h ago") | Yes |
| Lifespan | Duration from first to last message | Yes |
| Active Time | Sum of run execution time | Yes |
| Runs | Number of runs | Yes |
| Local Handoffs | Count of handoff events | Yes |
| Post-Handoff Iter. | Yes/No indicator | No |
| Success % | Percentage of successful runs | Yes |
| Cost | Total cost in dollars | Yes |

**Interactions:**
- Row click → Navigate to `/sessions/:id`
- Default sort: Cost (descending)
- Limit: 10 rows with "View all sessions" link

---

### 5. Top Users Table

| Component | Description | States |
|-----------|-------------|--------|
| Data Table | Top users by selected sort | loading, empty, populated |
| Sort Dropdown | Sort by: Cost, Runs, Sessions, Handoff% | - |

**Columns:**
| Column | Description | Sortable |
|--------|-------------|----------|
| User | Name + email | No |
| Sessions | Number of sessions | Yes |
| Runs | Number of runs | Yes |
| Avg Runs/Session | Average runs per session | Yes |
| Avg Active Time | Average active agent time | Yes |
| Handoff Rate | % sessions with handoff | Yes |
| Post-Handoff Iter. | % with post-handoff runs | Yes |
| Success % | Overall success rate | Yes |
| Cost | Total cost | Yes |

**Interactions:**
- Row click → Navigate to `/users/:userId`
- Default sort: Cost (descending)
- Limit: 10 rows with "View all users" link

---

## Data Requirements

| Field | Source | Notes |
|-------|--------|-------|
| orgId | AuthContext | Current org context |
| timeRange | URL params | from/to dates |
| kpiMetrics | API `GET /api/orgs/:orgId/metrics` | Aggregated KPIs |
| usageTrends | API `GET /api/orgs/:orgId/trends/usage` | Time series data |
| costTrends | API `GET /api/orgs/:orgId/trends/cost` | Time series data |
| frictionTrends | API `GET /api/orgs/:orgId/trends/friction` | Time series data |
| reliabilityTrends | API `GET /api/orgs/:orgId/trends/reliability` | Time series data |
| topSessions | API `GET /api/orgs/:orgId/sessions?sort=cost&limit=10` | Session list |
| topUsers | API `GET /api/orgs/:orgId/users?sort=cost&limit=10` | User list |
| failureCategories | API `GET /api/orgs/:orgId/failures` | Failure breakdown |

---

## Empty States

| Scenario | Display |
|----------|---------|
| No data in period | "No activity in selected time range" + illustration |
| New org (no data ever) | "Welcome! Data will appear once agents start running." |
| API error | "Failed to load data. Please try again." + retry button |

---

## Role-Based Visibility

| Role | Can View This Page |
|------|-------------------|
| MEMBER | Yes (limited to own data in tables) |
| MANAGER | Yes (full org view) |
| ORG_ADMIN | Yes (full org view) |
| SUPPORT | Yes (when org selected) |
| SUPER_ADMIN | Yes (when org selected) |

Note: When SUPER_ADMIN has "All Organizations" selected, they see Global Overview instead.
