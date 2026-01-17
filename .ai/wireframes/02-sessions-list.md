# 02 - Sessions List Page

## Overview
A filterable, sortable list of all sessions in the organization. Enables finding costly, problematic, or high-iteration sessions.

**Route:** `/sessions`

---

## ASCII Diagram

```
+--------------------------------------------------------------------------------+
| HEADER (see 00-layout.md)                                                      |
+--------+-----------------------------------------------------------------------+
| SIDEBAR|  Sessions                                                    [Export] |
|        |-----------------------------------------------------------------------|
|        |  FILTERS BAR                                                          |
|        |  +-------------------------------------------------------------------+|
|        |  | [Search session ID...] | Status: [All▾] | Duration: [Any▾] |     ||
|        |  | Cost: [Any▾] | Handoff: [Any▾] | Post-Handoff: [Any▾] | [Clear]  ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
|        |  SUMMARY STRIP                                                        |
|        |  +-------------------------------------------------------------------+|
|        |  | 234 sessions | Avg 2.3 runs/sess | Avg 4m active | 34% handoff   ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
|        |  SESSIONS TABLE                                                       |
|        |  +-------------------------------------------------------------------+|
|        |  | ☐ | Session ID | Created By | Started   | Lifespan | Active | ... ||
|        |  |---|------------|------------|-----------|----------|--------|-----||
|        |  | ☐ | #abc123    | alice@...  | Jan 15    | 18m      | 4m 32s | ... ||
|        |  | ☐ | #def456    | bob@...    | Jan 15    | 45m      | 12m 5s | ... ||
|        |  | ☐ | #ghi789    | alice@...  | Jan 14    | 2h 15m   | 28m    | ... ||
|        |  | ☐ | #jkl012    | carol@...  | Jan 14    | 5m       | 2m 10s | ... ||
|        |  | ☐ | #mno345    | bob@...    | Jan 13    | 1h 30m   | 15m    | ... ||
|        |  +-------------------------------------------------------------------+|
|        |                                                                       |
|        |  PAGINATION                                                           |
|        |  [< Prev]  Page 1 of 24  (234 total)  [Next >]                        |
|        |                                                                       |
+--------+-----------------------------------------------------------------------+
```

---

## Component Breakdown

### 1. Page Header

| Component | Description | States |
|-----------|-------------|--------|
| Title | "Sessions" | - |
| Export Button | Downloads filtered results as CSV | default, loading |

---

### 2. Filters Bar

| Component | Description | States |
|-----------|-------------|--------|
| Search Input | Filter by session ID | empty, has value |
| Status Filter | Dropdown: All, Has Failures, All Succeeded | selected |
| Duration Filter | Dropdown: Any, <5m, 5-30m, 30m-1h, >1h | selected |
| Cost Filter | Dropdown: Any, <$10, $10-50, $50-100, >$100 | selected |
| Handoff Filter | Dropdown: Any, Yes, No | selected |
| Post-Handoff Filter | Dropdown: Any, Yes, No | selected |
| Clear Button | Resets all filters | disabled when no filters |

**Filter Interactions:**
- Filters apply immediately on change (debounced search)
- URL query params update to reflect filter state
- Filters persist across page navigation

---

### 3. Summary Strip

| Component | Description | States |
|-----------|-------------|--------|
| Session Count | Total matching sessions | loading, populated |
| Avg Runs/Session | Average for filtered set | loading, populated |
| Avg Active Time | Average for filtered set | loading, populated |
| Avg Lifespan | Average for filtered set | loading, populated |
| Handoff Rate | Percentage for filtered set | loading, populated |

---

### 4. Sessions Table

| Component | Description | States |
|-----------|-------------|--------|
| Data Table | Paginated session list | loading, empty, populated |
| Checkbox Column | For bulk selection (future) | - |
| Sort Headers | Click to sort by column | asc, desc, none |

**Columns:**

| Column | Description | Sortable | Width |
|--------|-------------|----------|-------|
| ☐ | Bulk select checkbox | No | 40px |
| Session ID | Truncated ID, click to view | No | 120px |
| Created By | User who started session | No | 150px |
| Started | Start date/time | Yes | 120px |
| Lifespan | lastMessageAt - firstMessageAt | Yes | 80px |
| Active Time | Sum of run execution time | Yes | 90px |
| Runs | Number of runs | Yes | 60px |
| Local Handoffs | Count of handoff events | Yes | 80px |
| Post-Handoff Iter. | Yes/No badge | No | 80px |
| Success % | Percentage of successful runs | Yes | 80px |
| Cost | Total cost in dollars | Yes | 80px |

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
| Page Size | Dropdown: 25, 50, 100 | - |

---

## Data Requirements

| Field | Source | Notes |
|-------|--------|-------|
| orgId | AuthContext | Current org context |
| timeRange | URL params | from/to dates |
| filters | URL params | All filter values |
| page | URL params | Current page number |
| pageSize | URL params | Items per page |
| sessions | API `GET /api/orgs/:orgId/sessions` | Paginated session list |
| summary | API `GET /api/orgs/:orgId/sessions/summary` | Aggregated metrics for filters |

**API Query Parameters:**
```
GET /api/orgs/:orgId/sessions?
  from=2024-01-01&
  to=2024-01-15&
  search=abc&
  status=has_failures&
  duration=5m-30m&
  cost=>100&
  handoff=yes&
  postHandoff=no&
  sort=cost&
  order=desc&
  page=1&
  pageSize=25
```

---

## Empty States

| Scenario | Display |
|----------|---------|
| No sessions match filters | "No sessions match your filters" + [Clear filters] button |
| No sessions in org | "No sessions yet. Activity will appear once agents start running." |
| API error | "Failed to load sessions" + [Retry] button |

---

## Export Functionality

| Feature | Description |
|---------|-------------|
| Format | CSV |
| Scope | All sessions matching current filters (not just current page) |
| Columns | All visible columns |
| Filename | `sessions-{orgId}-{date}.csv` |
| Limit | Max 10,000 rows |

**Export flow:**
1. User clicks Export button
2. Button shows loading state
3. API returns CSV blob
4. Browser downloads file
5. Button returns to default state

---

## Role-Based Visibility

| Role | Visibility |
|------|------------|
| MEMBER | Only own sessions (createdByUserId = current user) |
| MANAGER | All org sessions |
| ORG_ADMIN | All org sessions |
| SUPPORT | All sessions for selected org |
| SUPER_ADMIN | All sessions for selected org |

Note: For MEMBER, the "Created By" column is hidden since all sessions are their own.
