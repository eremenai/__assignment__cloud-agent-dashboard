# 00 - Shared Layout

## Overview
The app shell wraps all pages, providing consistent navigation and context controls.

---

## ASCII Diagram

```
+--------------------------------------------------------------------------------+
|  [Logo]  Agent Analytics              [Org Selector▾] [7d▾] [User Menu ▾]     |
+--------------------------------------------------------------------------------+
|         |                                                                      |
|  NAV    |  BREADCRUMBS: Overview > Sessions > #abc123                          |
|         |-------------------------------------------------------------------- |
|  ○ Over |                                                                      |
|  ○ Sess |  +--------------------------------------------------------------+   |
|  ○ Users|  |                                                              |   |
|         |  |                    MAIN CONTENT AREA                         |   |
|         |  |                                                              |   |
|         |  |                    (page-specific content)                   |   |
|         |  |                                                              |   |
|         |  +--------------------------------------------------------------+   |
|         |                                                                      |
+---------+----------------------------------------------------------------------+
```

---

## Component Breakdown

### 1. Header Bar

| Component | Description | States |
|-----------|-------------|--------|
| Logo | App branding, links to `/dashboard` | - |
| App Title | "Agent Analytics" | - |
| Org Selector | Dropdown to switch org context | hidden (MEMBER/MANAGER/ORG_ADMIN), visible (SUPPORT/SUPER_ADMIN) |
| Time Range Selector | Dropdown: 7d / 30d / 90d / Custom | expanded, collapsed |
| User Menu | Current user avatar + dropdown | collapsed, expanded |

#### Org Selector States
| Role | Behavior |
|------|----------|
| MEMBER, MANAGER, ORG_ADMIN | Hidden - org auto-set from token |
| SUPPORT | Dropdown with all orgs |
| SUPER_ADMIN | Dropdown with all orgs + "All Organizations" option |

#### Time Range Selector Options
- **7d** (default)
- **30d**
- **90d**
- **Custom** → opens date picker modal

#### User Menu Items
- User name + email
- Role badge
- DevAuthSwitcher (dev mode only) - dropdown to switch test users
- Sign out

---

### 2. Sidebar Navigation

| Component | Description | States |
|-----------|-------------|--------|
| Nav Item | Link to page | default, hover, active |
| Nav Group | Collapsible section (if needed) | expanded, collapsed |

#### Navigation Structure
```
Overview        → /dashboard
Sessions        → /sessions
Users           → /users
---
[Global]*       → /global    (* SUPER_ADMIN only, when "All Orgs" selected)
```

#### Nav Item States
- **default**: muted text, no background
- **hover**: slightly highlighted background
- **active**: accent background, bold text, left border indicator

---

### 3. Breadcrumbs

| Component | Description | States |
|-----------|-------------|--------|
| Breadcrumb Trail | Shows navigation hierarchy | 1-3 levels deep |

#### Breadcrumb Patterns
| Page | Breadcrumb |
|------|------------|
| Org Overview | `Overview` |
| Sessions List | `Sessions` |
| Session Detail | `Sessions > #abc123` |
| Users List | `Users` |
| User Detail | `Users > alice@acme.com` |
| Global Overview | `Global Overview` |

---

### 4. Main Content Area

| Component | Description | States |
|-----------|-------------|--------|
| Content Container | Page content wrapper | loading, error, populated |
| Page Header | Title + actions area | - |
| Content Body | Page-specific components | - |

---

### 5. DevAuthSwitcher (Development Only)

| Component | Description | States |
|-----------|-------------|--------|
| User Preset Dropdown | Quick switch between test users | collapsed, expanded |

#### Preset Users
| ID | Name | Role | Org |
|----|------|------|-----|
| member-1 | Alice Member | MEMBER | org-acme |
| manager-1 | Bob Manager | MANAGER | org-acme |
| admin-1 | Carol Admin | ORG_ADMIN | org-acme |
| admin-2 | Dan Admin | ORG_ADMIN | org-globex |
| support-1 | Eve Support | SUPPORT | (any) |
| super-1 | Frank Super | SUPER_ADMIN | (any/global) |

---

## Data Requirements

| Field | Source | Notes |
|-------|--------|-------|
| currentUser | AuthContext | From JWT claims |
| currentUser.role | AuthContext | Determines UI visibility |
| currentOrgId | AuthContext | null for global view |
| availableOrgs | API `/orgs` | For SUPPORT/SUPER_ADMIN selector |
| selectedTimeRange | Local state | Persisted in URL query param |

---

## Interaction Flows

### Org Selector (SUPPORT/SUPER_ADMIN)
1. User clicks org selector dropdown
2. Dropdown shows list of orgs (+ "All Organizations" for SUPER_ADMIN)
3. User selects an org
4. `currentOrgId` updates in AuthContext
5. All data-fetching hooks refetch with new org context
6. URL updates with `?orgId=xxx` query param

### Time Range Selector
1. User clicks time range dropdown
2. Selects preset (7d/30d/90d) or "Custom"
3. If "Custom": date picker modal opens
4. Selection updates URL query params (`?from=...&to=...`)
5. All data-fetching hooks refetch with new time range

### User Menu → DevAuthSwitcher
1. User clicks user menu
2. In dev mode, shows "Switch User" section
3. User selects a preset user
4. App calls `POST /api/dev/auth` with selected user
5. New JWT stored, page reloads with new context

---

## Responsive Behavior (Desktop Only - V1)

| Viewport | Sidebar | Header |
|----------|---------|--------|
| ≥1024px | Fixed left, 220px wide | Full width |
| <1024px | Collapsible (hamburger menu) | Condensed |

Note: V1 targets desktop only. Mobile/tablet deferred.

---

## Visual Style Notes

- **Sidebar**: Dark or muted background, light text
- **Header**: Light background, subtle bottom border
- **Active nav**: Accent color left border (4px), background highlight
- **Org selector**: Appears as a dropdown button with org name + chevron
- **Time selector**: Compact dropdown, shows selected range
