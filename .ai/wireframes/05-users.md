# 05 - Users Page

## Overview
Comparison view of all users in the organization. Identifies power users, cost drivers, and friction hotspots.

**Route:** `/users`

---

## ASCII Diagram

```
+--------------------------------------------------------------------------------+
| HEADER (see 00-layout.md)                                                      |
+--------+-----------------------------------------------------------------------+
| SIDEBAR|  Users                                                       [Export] |
|        |-----------------------------------------------------------------------|
|        |  FILTERS BAR                                                          |
|        |  +-------------------------------------------------------------------+|
|        |  | [Search user name or email...]                          [Clear]   ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
|        |  SUMMARY STRIP                                                        |
|        |  +-------------------------------------------------------------------+|
|        |  | 45 users | 234 total sessions | $12,345 total cost | 34% handoff ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
|        |  USERS TABLE                                                          |
|        |  +-------------------------------------------------------------------+|
|        |  | User          | Sessions | Runs | R/Sess | Active | Handoff | ... ||
|        |  |---------------|----------|------|--------|--------|---------|-----||
|        |  | alice@acme... | 12       | 28   | 2.3    | 4h 32m | 25%     | ... ||
|        |  | bob@acme.com  | 8        | 24   | 3.0    | 6h 15m | 50%     | ... ||
|        |  | carol@acme... | 15       | 22   | 1.5    | 2h 45m | 13%     | ... ||
|        |  | dan@acme.com  | 6        | 18   | 3.0    | 3h 20m | 67%     | ... ||
|        |  | eve@acme.com  | 10       | 15   | 1.5    | 2h 10m | 20%     | ... ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
|        |  PAGINATION                                                           |
|        |  [< Prev]  Page 1 of 3  (45 total)  [Next >]                          |
|        |                                                                       |
+--------+-----------------------------------------------------------------------+
```

---

## Component Breakdown

### 1. Page Header

| Component | Description | States |
|-----------|-------------|--------|
| Title | "Users" | - |
| Export Button | Downloads filtered results as CSV | default, loading |

---

### 2. Filters Bar

| Component | Description | States |
|-----------|-------------|--------|
| Search Input | Filter by name or email | empty, has value |
| Clear Button | Resets search | disabled when empty |

Note: Simpler filter bar than Sessions page - just search. Time range from header applies.

---

### 3. Summary Strip

| Component | Description | States |
|-----------|-------------|--------|
| User Count | Total matching users | loading, populated |
| Total Sessions | Sum of sessions across users | loading, populated |
| Total Cost | Sum of cost across users | loading, populated |
| Avg Handoff Rate | Average handoff rate | loading, populated |

---

### 4. Users Table

| Component | Description | States |
|-----------|-------------|--------|
| Data Table | Paginated user list | loading, empty, populated |
| Sort Headers | Click to sort by column | asc, desc, none |

**Columns:**

| Column | Description | Sortable | Width |
|--------|-------------|----------|-------|
| User | Name + email (truncated) | No | 180px |
| Role | Role badge | No | 80px |
| Sessions | Session count in period | Yes | 80px |
| Runs | Run count in period | Yes | 70px |
| Avg Runs/Session | Friction indicator | Yes | 90px |
| Avg Active Time | Average agent time per session | Yes | 100px |
| Avg Lifespan | Average session duration | Yes | 90px |
| Handoff Rate | % sessions with handoff | Yes | 90px |
| Post-Handoff Iter. | % with post-handoff runs | Yes | 90px |
| Success % | Overall success rate | Yes | 80px |
| Total Cost | Sum of costs | Yes | 90px |
| Cost/Run | Average cost per run | Yes | 80px |

**Row Interactions:**
- Hover: Subtle background highlight
- Click row: Navigate to `/users/:userId`
- Default sort: Cost (descending)

---

### 5. Pagination

| Component | Description | States |
|-----------|-------------|--------|
| Prev Button | Go to previous page | enabled, disabled |
| Page Info | "Page X of Y (Z total)" | - |
| Next Button | Go to next page | enabled, disabled |
| Page Size | Dropdown: 25, 50, 100 | - |

---

## Data Requirements

| Field | Source | Notes |
|-------|--------|-------|
| orgId | AuthContext | Current org context |
| timeRange | URL params | from/to dates |
| search | URL params | Search query |
| page | URL params | Current page number |
| pageSize | URL params | Items per page |
| sort | URL params | Sort column |
| order | URL params | Sort direction |
| users | API `GET /api/orgs/:orgId/users` | Paginated user list with metrics |
| summary | API `GET /api/orgs/:orgId/users/summary` | Aggregated metrics |

**API Query Parameters:**
```
GET /api/orgs/:orgId/users?
  from=2024-01-01&
  to=2024-01-15&
  search=alice&
  sort=cost&
  order=desc&
  page=1&
  pageSize=25
```

---

## Empty States

| Scenario | Display |
|----------|---------|
| No users match search | "No users match your search" + [Clear] button |
| No users with activity | "No user activity in selected time range" |
| No users in org | "No users in this organization" |
| API error | "Failed to load users" + [Retry] button |

---

## Export Functionality

| Feature | Description |
|---------|-------------|
| Format | CSV |
| Scope | All users matching current filters (not just current page) |
| Columns | All visible columns |
| Filename | `users-{orgId}-{date}.csv` |
| Limit | Max 10,000 rows |

---

## Role-Based Visibility

| Role | Visibility |
|------|------------|
| MEMBER | Only sees own row (single user view) |
| MANAGER | All org users |
| ORG_ADMIN | All org users |
| SUPPORT | All users in selected org |
| SUPER_ADMIN | All users in selected org |

**MEMBER Experience:**
When a MEMBER accesses `/users`:
- Table shows only their own row
- Summary strip shows only their metrics
- Consider redirecting to `/users/:ownId` (User Detail) instead

---

## User Row Details

**User Cell Structure:**
```
+----------------------------------+
| [Avatar]  Alice Johnson          |
|           alice@acme.com         |
+----------------------------------+
```

**Role Badges:**
| Role | Badge Color |
|------|-------------|
| MEMBER | Gray |
| MANAGER | Blue |
| ORG_ADMIN | Purple |

---

## Metric Interpretation Hints

Visual indicators to help identify issues:

| Metric | Warning Threshold | Display |
|--------|-------------------|---------|
| Avg Runs/Session | >4 | Yellow highlight |
| Handoff Rate | >50% | Yellow highlight |
| Post-Handoff Iter. | >30% | Yellow highlight |
| Success % | <85% | Red text |

Note: Thresholds are suggestions; can be configurable or removed.
