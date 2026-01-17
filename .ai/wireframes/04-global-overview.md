# 04 - Global Overview (SUPER_ADMIN Only)

## Overview
Cross-organization aggregate view available only to SUPER_ADMIN users when "All Organizations" is selected in the org selector. Provides platform-wide health metrics and org comparison.

**Route:** `/global`
**Access:** SUPER_ADMIN only, when `currentOrgId = null`

---

## ASCII Diagram

```
+--------------------------------------------------------------------------------+
| HEADER   [All Organizations ▾]  [7d ▾]  [Frank Super ▾]                        |
+--------+-----------------------------------------------------------------------+
| SIDEBAR|  Global Overview                                                      |
|        |-----------------------------------------------------------------------|
|  ○ Over|  GLOBAL KPI ROW                                                       |
|  ○ Sess|  +------------+ +------------+ +------------+ +------------+ +-------+|
|  ○ Users| | Total Orgs | | Total Runs | | Success %  | | Total Cost | | Tokens||
|  ───── |  | 24         | | 12,345 ↑8% | | 93.5%  ↓1% | | $45,678    | | 89M   ||
|  ● Glob|  +------------+ +------------+ +------------+ +------------+ +-------+|
|        |                                                                       |
|        |  PLATFORM TRENDS                                                      |
|        |  +---------------------------+  +---------------------------+         |
|        |  | Platform Usage            |  | Platform Cost             |         |
|        |  | [Runs across all orgs]    |  | [Cost across all orgs]    |         |
|        |  | ════════════════════════  |  | ════════════════════════  |         |
|        |  +---------------------------+  +---------------------------+         |
|        |                                                                       |
|        |  TOP ORGANIZATIONS BY USAGE                                           |
|        |  +-------------------------------------------------------------------+|
|        |  | Organization | Users | Sessions | Runs  | Success% | Cost        ||
|        |  |--------------|-------|----------|-------|----------|-------------||
|        |  | Acme Corp    | 45    | 234      | 1,234 | 95.2%    | $12,345     ||
|        |  | Globex Inc   | 32    | 156      | 890   | 91.0%    | $8,901      ||
|        |  | Initech      | 28    | 123      | 567   | 88.5%    | $5,678      ||
|        |  | Umbrella Co  | 15    | 89       | 345   | 97.1%    | $3,456      ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
|        |  ORG HEALTH COMPARISON                                                |
|        |  +-------------------------------------------------------------------+|
|        |  | Organization | Success% | Avg Runs/Sess | Handoff% | Trend        ||
|        |  |--------------|----------|---------------|----------|-------------||
|        |  | Acme Corp    | 95.2% ██████████░        | 2.1      | 28%   ↗     ||
|        |  | Globex Inc   | 91.0% █████████░░        | 3.4      | 45%   ↗     ||
|        |  | Initech      | 88.5% ████████░░░        | 2.8      | 52%   ↘     ||
|        |  | Umbrella Co  | 97.1% ██████████░        | 1.8      | 15%   →     ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
+--------+-----------------------------------------------------------------------+
```

---

## Component Breakdown

### 1. Global KPI Row

| Component | Metric | Description | States |
|-----------|--------|-------------|--------|
| KPI Card | Total Organizations | Count of active orgs | loading, populated |
| KPI Card | Total Runs | Sum across all orgs | loading, populated |
| KPI Card | Platform Success Rate | Weighted average | loading, populated |
| KPI Card | Total Cost | Sum across all orgs | loading, populated |
| KPI Card | Total Tokens | Sum across all orgs | loading, populated |
| KPI Card | Active Users | Distinct users across platform | loading, populated |

---

### 2. Platform Trends

#### 2a. Platform Usage Chart

| Component | Description | States |
|-----------|-------------|--------|
| Stacked Area Chart | Runs over time, stacked by org (top N) | loading, empty, populated |
| Legend | Top orgs + "Others" | - |

**Chart specs:**
- X-axis: Time (daily/weekly buckets)
- Y-axis: Run count
- Stacked areas: Top 5 orgs by volume + "Others"
- Hover: Shows breakdown by org

#### 2b. Platform Cost Chart

| Component | Description | States |
|-----------|-------------|--------|
| Stacked Area Chart | Cost over time, stacked by org | loading, empty, populated |
| Toggle | Switch to per-run cost view | - |

---

### 3. Top Organizations by Usage

| Component | Description | States |
|-----------|-------------|--------|
| Data Table | Orgs ranked by selected metric | loading, empty, populated |
| Sort Dropdown | Sort by: Runs, Cost, Users, Sessions | - |

**Columns:**
| Column | Description | Sortable |
|--------|-------------|----------|
| Organization | Org name, click to switch context | No |
| Users | Active users in period | Yes |
| Sessions | Session count | Yes |
| Runs | Run count | Yes |
| Success % | Success rate | Yes |
| Avg Runs/Session | Friction indicator | Yes |
| Handoff Rate | % sessions with handoff | Yes |
| Cost | Total cost | Yes |

**Interactions:**
- Row click → Sets `currentOrgId` and navigates to Org Overview
- Default sort: Cost (descending)
- Show all orgs (paginated if >20)

---

### 4. Org Health Comparison

| Component | Description | States |
|-----------|-------------|--------|
| Comparison Table | Side-by-side org health metrics | loading, populated |
| Visual Indicators | Bar charts within cells | - |

**Columns:**
| Column | Description | Visual |
|--------|-------------|--------|
| Organization | Org name | - |
| Success % | Success rate | Progress bar |
| Avg Runs/Session | Friction metric | Number |
| Handoff Rate | % with handoffs | Number |
| Trend | Week-over-week direction | Arrow indicator |

**Trend Indicators:**
- ↗ (green): Improving (success up, handoff down)
- ↘ (red): Declining (success down, handoff up)
- → (gray): Stable (within ±2%)

---

### 5. Alerts / Anomalies Section (Optional)

| Component | Description | States |
|-----------|-------------|--------|
| Alert Cards | Notable platform-wide issues | loading, empty, populated |

**Alert Types:**
| Type | Trigger | Display |
|------|---------|---------|
| Success Drop | Any org <85% success | "⚠ Acme Corp success rate dropped to 78%" |
| Cost Spike | Org cost >2x normal | "⚠ Globex Inc cost 3x higher than average" |
| High Friction | Org handoff >60% | "⚠ Initech handoff rate at 65%" |

Note: This section is optional for V1. Can be deferred.

---

## Data Requirements

| Field | Source | Notes |
|-------|--------|-------|
| currentOrgId | AuthContext | Must be null for this view |
| timeRange | URL params | from/to dates |
| globalKpis | API `GET /api/global/metrics` | Platform-wide KPIs |
| platformTrends | API `GET /api/global/trends` | Time series by org |
| orgRankings | API `GET /api/global/orgs?sort=cost` | Ranked org list |
| orgHealth | API `GET /api/global/orgs/health` | Health comparison data |

---

## Access Control

| Check | Behavior |
|-------|----------|
| User role != SUPER_ADMIN | Redirect to `/dashboard` |
| currentOrgId != null | Redirect to Org Overview |

**Implementation:**
```typescript
// Middleware check
if (user.role !== 'SUPER_ADMIN' || currentOrgId !== null) {
  redirect('/dashboard');
}
```

---

## Navigation Context

When SUPER_ADMIN is viewing Global Overview:
- Sidebar shows "Global" nav item as active
- Other nav items (Sessions, Users) are hidden or disabled
- To view org-specific data, must first select an org in selector

**Org Selector Behavior:**
| Selection | Result |
|-----------|--------|
| "All Organizations" | Stay on Global Overview |
| Specific org | Navigate to `/dashboard`, load org context |

---

## Empty States

| Scenario | Display |
|----------|---------|
| No orgs | "No organizations configured" |
| No data in period | "No platform activity in selected time range" |
| API error | "Failed to load global data" + retry button |

---

## Role Visibility Summary

| Role | Can Access Global Overview |
|------|---------------------------|
| MEMBER | No |
| MANAGER | No |
| ORG_ADMIN | No |
| SUPPORT | No |
| SUPER_ADMIN | Yes (when "All Organizations" selected) |
