# Feature 003: Organisation Management

## Introduction

Implement the multi-tenancy foundation. Super-admins can create and manage organisations. Each organisation is an isolated tenant with its own storage limits, time zone, and default playlist configuration.

### Architecture Context

- **Vision alignment:** "Provisioned by a super-admin — no self-registration", "Each organisation is fully isolated"
- **Components involved:** OrganisationModule (new), database schema
- **New patterns:** Multi-tenancy scoping (organisationId on all queries), super-admin role concept

## Goals

- Super-admin can create, update, and list organisations
- Organisation entity stores name, time zone, storage limits, and default playlist reference
- Multi-tenancy scoping pattern established for reuse by all subsequent modules
- Basic super-admin frontend page to manage organisations

## Tasks

### TASK-003-001: Organisation Entity & Database Schema
**Description:** As the system, I want an Organisation entity in the database so that all tenant-scoped data has a parent.

**Token Estimate:** ~20k tokens
**Predecessors:** none
**Successors:** TASK-003-002, TASK-003-003
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] `Organisation` TypeORM entity with fields: `id` (UUID, PK), `name` (string), `timeZone` (string, e.g. "Europe/Vienna"), `storageOriginalLimitBytes` (bigint), `storageTranscodedLimitBytes` (bigint), `storageOriginalUsedBytes` (bigint, default 0), `storageTranscodedUsedBytes` (bigint, default 0), `defaultPlaylistId` (UUID, nullable FK — playlist entity doesn't exist yet, just the column), `createdAt`, `updatedAt`
- [x] TypeORM migration creates the table
- [x] Unit tests for entity validation (name required, timeZone required)
- [x] Typecheck and lint pass

### TASK-003-002: Organisation Service & REST API
**Description:** As a super-admin, I want API endpoints to create, update, list, and view organisations so that I can provision tenants.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-003-001
**Successors:** TASK-003-004
**Parallel:** yes — can run alongside TASK-003-003

**Acceptance Criteria:**
- [x] `OrganisationService` with methods: `create`, `update`, `findAll`, `findOne`
- [x] `OrganisationController` with routes:
  - `POST /api/organisations` — create (super-admin only)
  - `GET /api/organisations` — list all (super-admin only)
  - `GET /api/organisations/:id` — get one (super-admin only)
  - `PATCH /api/organisations/:id` — update (super-admin only)
- [x] Input validation via class-validator DTOs
- [x] Super-admin check: for now, a simple guard that checks a `SUPER_ADMIN_USER_IDS` env var (comma-separated list of Hanko user IDs)
- [x] Unit tests for service: create, update, findAll, findOne
- [x] Unit tests for controller: auth rejection for non-super-admin
- [x] Typecheck and lint pass

### TASK-003-003: Multi-Tenancy Scoping Pattern
**Description:** As a developer, I want a reusable pattern for scoping queries to the current organisation so that tenant isolation is consistent across all modules.

**Token Estimate:** ~25k tokens
**Predecessors:** TASK-003-001
**Successors:** TASK-003-004
**Parallel:** yes — can run alongside TASK-003-002

**Acceptance Criteria:**
- [x] `@CurrentOrganisation()` parameter decorator that extracts `organisationId` from the request (from JWT claims or a header — to be refined in feature 004 when user-org membership exists)
- [x] `OrganisationScope` TypeORM repository pattern or service mixin that automatically adds `WHERE organisationId = :id` to queries
- [x] Documentation comments in code explaining how to use the pattern in new modules
- [x] Unit tests verifying scope is applied correctly
- [x] Typecheck and lint pass

### TASK-003-004: Super-Admin Organisation Management UI
**Description:** As a super-admin, I want a page in the frontend to create and manage organisations.

**Token Estimate:** ~45k tokens
**Predecessors:** TASK-003-002, TASK-003-003
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] `/admin/organisations` route (only accessible to super-admin)
- [x] List view: table of organisations with name, time zone, storage limits, created date
- [x] Create form: name, time zone (dropdown of IANA time zones), original storage limit, transcoded storage limit
- [x] Edit form: same fields, pre-populated
- [x] Dark-themed, consistent with app design (Tailwind CSS)
- [x] API calls use the authenticated HTTP client from feature 002
- [x] ⚠️ BLOCKED: Verify in browser: can create an organisation, see it in the list, edit it — Cannot verify in browser in automated CI environment; requires manual testing with running backend and Hanko auth

## Task Dependency Graph

```
TASK-003-001 ──→ TASK-003-002 ──→ TASK-003-004
     │                               ↑
     └──→ TASK-003-003 ─────────────┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-003-001 | ~20k | none | — | — |
| TASK-003-002 | ~40k | 001 | yes (with 003) | — |
| TASK-003-003 | ~25k | 001 | yes (with 002) | — |
| TASK-003-004 | ~45k | 002, 003 | no | — |

**Total estimated tokens:** ~130k

## Functional Requirements

- FR-1: Only super-admins can create, update, or list organisations
- FR-2: Each organisation must have a unique name
- FR-3: Storage limits are set per organisation (separate limits for originals and transcoded)
- FR-4: Time zone must be a valid IANA time zone string
- FR-5: The `defaultPlaylistId` is nullable until playlists are implemented (feature 008)

## Non-Goals

- No organisation deletion (risky operation, defer)
- No user assignment to organisations (comes in feature 004)
- No organisation switcher in the top bar (comes in feature 010)
- No storage enforcement logic yet (comes in feature 007)

## Technical Considerations

- The super-admin check via `SUPER_ADMIN_USER_IDS` env var is a temporary approach; it's simple and sufficient for now
- The multi-tenancy scoping pattern will be used by every subsequent module — getting this right is critical
- `defaultPlaylistId` FK can't be enforced yet (playlist table doesn't exist); add the constraint in feature 008's migration

## Success Metrics

- Super-admin can create and manage organisations via the UI
- Non-super-admin users get 403 on organisation management endpoints
- Multi-tenancy scoping pattern is reusable and tested

## Open Questions

None — all resolved.
