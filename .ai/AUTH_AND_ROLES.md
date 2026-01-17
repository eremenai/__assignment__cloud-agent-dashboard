# Authentication & Authorization Model

## Authentication Approach
**Pattern:** Custom JWT validation + Mock Issuer for development

### Production Flow
1. User authenticates with external IdP (OIDC-compatible)
2. IdP issues JWT with standard claims + custom claims (orgId, role)
3. Dashboard validates JWT against IdP's JWKS endpoint
4. User info extracted from token claims

### Development Flow
1. App exposes `/api/dev/auth` endpoint (dev mode only)
2. Dev can request token for any test user: `POST /api/dev/auth { userId, role, orgId }`
3. Token stored in HTTP-only cookie
4. **DevAuthSwitcher** component in header allows quick user switching

### JWT Claims Structure
```typescript
interface JWTClaims {
  sub: string;           // userId
  email: string;
  name: string;
  org_id: string;        // primary organization
  role: UserRole;        // role within org OR platform role
  iat: number;
  exp: number;
}
```

---

## Role Hierarchy

### Platform-Level Roles
These roles operate across organizations:

| Role | Description | Scope |
|------|-------------|-------|
| `SUPPORT` | Support staff assisting org admins | Can view any org (via selector) |
| `SUPER_ADMIN` | Platform administrators | All orgs + global aggregate view |

### Organization-Level Roles
These roles are scoped to a single organization:

| Role | Description | Permissions |
|------|-------------|-------------|
| `ORG_ADMIN` | Organization administrator | Full read access to org data, manage org settings |
| `MANAGER` | Team manager | Read access to org data, team-level views |
| `MEMBER` | Individual engineer | Read access to own data + team aggregate |

---

## UI Behavior by Role

### Org-Scoped Users (ORG_ADMIN, MANAGER, MEMBER)
- No org selector shown
- Dashboard automatically scoped to their `org_id` from token
- Navigation: Overview → Sessions → Users → Session Detail

### Support Users (SUPPORT)
- **Org selector dropdown** in header
- Can switch to view any organization
- Sees same views as ORG_ADMIN for selected org
- No global aggregate view (focuses on helping specific orgs)

### Super Admin (SUPER_ADMIN)
- **Org selector dropdown** in header with additional "All Organizations" option
- When org selected: sees same view as ORG_ADMIN
- When "All Organizations" selected: sees **Global Overview**
  - Aggregate metrics across all orgs
  - Top orgs by usage/cost/failures
  - Org health comparison

---

## Permission Matrix

| Action | MEMBER | MANAGER | ORG_ADMIN | SUPPORT | SUPER_ADMIN |
|--------|--------|---------|-----------|---------|-------------|
| View own sessions | ✓ | ✓ | ✓ | ✓ | ✓ |
| View org/team aggregates | ✓ (read-only) | ✓ | ✓ | ✓ | ✓ |
| View all org sessions | - | ✓ | ✓ | ✓ | ✓ |
| View session details | Own | All | All | All | All |
| View users list | - | ✓ | ✓ | ✓ | ✓ |
| View user detail | Own | All | All | All | All |
| Export CSV/JSON | - | ✓ | ✓ | ✓ | ✓ |
| Switch org context | - | - | - | ✓ | ✓ |
| View global overview | - | - | - | - | ✓ |

---

## Dev Mode User Presets

For easy testing, provide these preset users in DevAuthSwitcher:

```typescript
const DEV_USERS = [
  { id: 'member-1', name: 'Alice Member', role: 'MEMBER', orgId: 'org-acme' },
  { id: 'manager-1', name: 'Bob Manager', role: 'MANAGER', orgId: 'org-acme' },
  { id: 'admin-1', name: 'Carol Admin', role: 'ORG_ADMIN', orgId: 'org-acme' },
  { id: 'admin-2', name: 'Dan Admin', role: 'ORG_ADMIN', orgId: 'org-globex' },
  { id: 'support-1', name: 'Eve Support', role: 'SUPPORT', orgId: null },
  { id: 'super-1', name: 'Frank Super', role: 'SUPER_ADMIN', orgId: null },
];
```

---

## Implementation Notes

### AuthContext
```typescript
interface AuthContext {
  user: User | null;
  isLoading: boolean;
  // Current viewing context (may differ from user's org for SUPPORT/SUPER_ADMIN)
  currentOrgId: string | null;  // null = global view
  setCurrentOrgId: (orgId: string | null) => void;
  can: (permission: Permission) => boolean;
}
```

### Middleware
- Validate JWT on all `/api/*` routes (except `/api/dev/auth`)
- Inject `user` into request context
- Check `currentOrgId` query param against permissions for SUPPORT/SUPER_ADMIN

---

## Resolved
- **MEMBER scope**: Own sessions + org/team aggregates (read-only KPIs)
- **Teams**: Defer team UI for V1, design data model to support future team groupings
- **Data retention**: 1 year of historical data

---

## Related Documents
- `.ai/PROJECT_BRIEF.md` - Product requirements and domain model
- `.ai/ROADMAP.md` - Implementation phases
- `.ai/TECH_STACK.md` - Technology choices
