# Feature 004: User & Role Management

## Introduction

Implement user-organisation membership with per-organisation roles (Org Admin, Editor, Viewer). Org Admins can invite users and assign roles. Users can belong to multiple organisations with different roles in each.

### Architecture Context

- **Vision alignment:** "A user can belong to multiple organisations, with a separate role per organisation", three roles per org
- **Components involved:** UserModule (new), AuthModule (extend guards with role checking), OrganisationModule (link)
- **New patterns:** Role-based access control guards, user-org membership entity, organisation context on JWT/request

## Goals

- User-organisation membership with per-org roles stored in the database
- Role-based access guards that enforce Org Admin / Editor / Viewer permissions
- Org Admin can invite users and manage roles within their organisation
- Authenticated requests carry the current organisation context

## Tasks

### TASK-004-001: User & Membership Entities
**Description:** As the system, I want User and UserOrganisationMembership entities so that users can belong to organisations with specific roles.

**Token Estimate:** ~25k tokens
**Predecessors:** none
**Successors:** TASK-004-002, TASK-004-003
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] `User` entity: `id` (UUID, PK — maps to Hanko user ID), `email` (string), `name` (string, nullable), `createdAt`, `updatedAt`
- [x] `UserOrganisationMembership` entity: `id` (UUID, PK), `userId` (FK → User), `organisationId` (FK → Organisation), `role` (enum: `org_admin`, `editor`, `viewer`), `createdAt`
- [x] Unique constraint on (userId, organisationId) — one role per org per user
- [x] TypeORM migration creates both tables
- [x] Unit tests for entity constraints
- [x] Typecheck and lint pass

### TASK-004-002: User Service & Role-Based Guards
**Description:** As the system, I want role-based guards so that endpoints can restrict access based on the user's role in the current organisation.

**Token Estimate:** ~45k tokens
**Predecessors:** TASK-004-001
**Successors:** TASK-004-004
**Parallel:** yes — can run alongside TASK-004-003

**Acceptance Criteria:**
- [x] `UserService` with methods: `findOrCreate` (upserts user on first login from Hanko JWT), `getMemberships(userId)`, `getMembership(userId, organisationId)`
- [x] `@Roles('org_admin', 'editor')` decorator for controller methods
- [x] `RolesGuard` that:
  - Extracts `organisationId` from request (header `X-Organisation-Id` or query param)
  - Looks up the user's role in that organisation
  - Rejects with 403 if the user lacks the required role
  - Rejects with 403 if the user has no membership in that organisation
- [x] Update `@CurrentOrganisation()` decorator to extract verified organisation context
- [x] On first authenticated request, `findOrCreate` ensures the user record exists
- [x] Unit tests: role guard allows/denies correctly for each role level
- [x] Typecheck and lint pass

### TASK-004-003: Membership Management API
**Description:** As an Org Admin, I want to invite users to my organisation and manage their roles so that I can control access.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-004-001
**Successors:** TASK-004-004
**Parallel:** yes — can run alongside TASK-004-002

**Acceptance Criteria:**
- [x] `MembershipController` with routes:
  - `GET /api/organisations/:orgId/members` — list members (Org Admin only)
  - `POST /api/organisations/:orgId/members` — add member by email + role (Org Admin only)
  - `PATCH /api/organisations/:orgId/members/:userId` — update role (Org Admin only)
  - `DELETE /api/organisations/:orgId/members/:userId` — remove member (Org Admin only)
- [x] When adding a member: if user doesn't exist in User table, create a placeholder record with the email
- [x] Cannot remove the last Org Admin from an organisation
- [x] Input validation: role must be a valid enum value, email must be valid
- [x] Unit tests for all CRUD operations and edge cases
- [x] Typecheck and lint pass

### TASK-004-004: User Management UI
**Description:** As an Org Admin, I want a settings page to manage users and their roles within my organisation.

**Token Estimate:** ~50k tokens
**Predecessors:** TASK-004-002, TASK-004-003
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] `/settings/users` route (Org Admin only)
- [x] Table listing current members: name, email, role, joined date
- [x] "Invite User" button → modal with email input and role dropdown (Org Admin, Editor, Viewer)
- [x] Role change dropdown inline in the table row
- [x] Remove member button with confirmation dialog
- [x] Error handling: cannot remove last Org Admin (show message)
- [x] Dark-themed, consistent styling
- [x] ⚠️ BLOCKED: Verify in browser: can invite a user, change their role, remove them — Cannot verify in browser in this automated context (no running server/browser available)

## Task Dependency Graph

```
TASK-004-001 ──→ TASK-004-002 ──→ TASK-004-004
     │                               ↑
     └──→ TASK-004-003 ─────────────┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-004-001 | ~25k | none | — | — |
| TASK-004-002 | ~45k | 001 | yes (with 003) | opus |
| TASK-004-003 | ~40k | 001 | yes (with 002) | — |
| TASK-004-004 | ~50k | 002, 003 | no | — |

**Total estimated tokens:** ~160k

## Functional Requirements

- FR-1: A user can belong to multiple organisations, each with an independent role
- FR-2: Only Org Admins can manage members within their organisation
- FR-3: The last Org Admin cannot be removed from an organisation
- FR-4: The user's role in the current organisation must be checked on every protected request
- FR-5: Organisation context is passed via `X-Organisation-Id` header from the frontend
- FR-6: On first login, a User record is auto-created from the Hanko JWT claims

## Non-Goals

- No email invitation sending (just adds them to the org — they can log in via Hanko)
- No user profile editing (name, avatar)
- No notification preferences (comes in a later feature)
- No organisation switcher UI (comes in feature 010)

## Technical Considerations

- `X-Organisation-Id` header is set by the frontend based on the user's currently selected organisation
- The `findOrCreate` pattern ensures no separate user registration flow is needed — Hanko handles that
- Role guard must run after JWT auth guard (guard execution order matters in NestJS)
- Consider a `@RequireRole(Role.OrgAdmin)` shorthand for the most common check

## Success Metrics

- Org Admin can invite users and assign roles through the UI
- API requests with insufficient roles are rejected with 403
- A user logging in for the first time is auto-created in the database

## Open Questions

None — all resolved.
