# Feature 011: Audit Log

## Introduction

Record all significant actions from the start — content changes, schedule modifications, screen events, user management actions. Org Admins can view and filter the log within their organisation; super-admins see everything.

### Architecture Context

- **Vision alignment:** "All significant actions are recorded from the start" — this is explicitly called out as a day-one requirement
- **Components involved:** AuditLogModule (new), all existing modules (emit audit events)
- **New patterns:** NestJS interceptor for automatic audit capture, event-driven logging

## Goals

- All significant actions produce an audit log entry
- Entries are queryable, filterable, and scoped to the organisation
- Audit log page in the frontend for Org Admins
- Super-admin can view the global audit log
- Audit logging is non-intrusive — existing modules emit events, the audit module captures them

## Tasks

### TASK-011-001: AuditEntry Entity & Service
**Description:** As the system, I want an AuditEntry entity and service so that all significant actions can be recorded and queried.

**Token Estimate:** ~30k tokens
**Predecessors:** none
**Successors:** TASK-011-002, TASK-011-003
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] `AuditEntry` entity: `id` (UUID, PK), `timestamp` (datetime, default now), `userId` (UUID, nullable — null for system actions), `organisationId` (FK, nullable — null for super-admin actions), `action` (enum: `content.upload`, `content.delete`, `content.reupload`, `playlist.create`, `playlist.update`, `playlist.delete`, `schedule.create`, `schedule.update`, `schedule.delete`, `screen.register`, `screen.update`, `screen.key_regenerated`, `screen.online`, `screen.offline`, `user.invited`, `user.role_changed`, `user.removed`, `organisation.created`, `organisation.updated`), `resourceType` (string — e.g. "content", "playlist", "screen"), `resourceId` (UUID, nullable), `details` (JSON — action-specific metadata)
- [x] `AuditLogService` with methods: `record(entry)`, `findByOrganisation(orgId, filters)`, `findAll(filters)` (super-admin)
- [x] Filters: action type, userId, resourceType, date range, pagination (offset + limit)
- [x] TypeORM migration creates the table with indexes on `organisationId`, `timestamp`, `action`
- [x] Unit tests for recording and querying with filters
- [x] Typecheck and lint pass

### TASK-011-002: Audit Event Listeners
**Description:** As the system, I want to capture audit events from all modules so that the log is populated automatically without modifying existing code.

**Token Estimate:** ~45k tokens
**Predecessors:** TASK-011-001
**Successors:** TASK-011-004
**Parallel:** yes — can run alongside TASK-011-003

**Acceptance Criteria:**
- [x] `AuditListener` service that listens to NestJS EventEmitter events:
  - Content events: upload, delete, reupload
  - Playlist events: create, update, delete
  - Schedule events: create, update, delete
  - Screen events: register, update, key regenerated, online, offline
  - User events: invited, role changed, removed
  - Organisation events: created, updated
- [x] Each listener maps the event payload to an `AuditEntry` and calls `AuditLogService.record()`
- [x] If a module doesn't emit events yet, add `EventEmitter.emit()` calls to the relevant service methods in: ContentService, PlaylistService, ScheduleService, ScreenService, MembershipController, OrganisationService
- [x] Audit recording is fire-and-forget (async, doesn't block the main request)
- [x] Unit tests for event-to-entry mapping
- [x] Typecheck and lint pass

### TASK-011-003: Audit Log REST API
**Description:** As an Org Admin, I want an API endpoint to query the audit log so that I can see what happened in my organisation.

**Token Estimate:** ~20k tokens
**Predecessors:** TASK-011-001
**Successors:** TASK-011-004
**Parallel:** yes — can run alongside TASK-011-002

**Acceptance Criteria:**
- [x] `AuditLogController` with routes:
  - `GET /api/audit-log` — list entries for current org (Org Admin), with query params: `action`, `userId`, `resourceType`, `from`, `to`, `limit`, `offset`
  - `GET /api/admin/audit-log` — list all entries across orgs (super-admin only), same filters + `organisationId`
- [x] Pagination: default limit 50, max limit 200
- [x] Results ordered by timestamp descending (newest first)
- [x] Unit tests for endpoint access control and filtering
- [x] Typecheck and lint pass

### TASK-011-004: Audit Log UI
**Description:** As an Org Admin, I want an audit log page to review all actions taken within my organisation.

**Token Estimate:** ~50k tokens
**Predecessors:** TASK-011-002, TASK-011-003
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] `/audit-log` route (Org Admin only)
- [x] Table view with columns: timestamp, user (name/email), action (human-readable label), resource type, resource name/ID, details
- [x] Filter bar: action type dropdown, user dropdown, resource type dropdown, date range picker
- [x] Pagination: "Load more" button or infinite scroll
- [x] Action labels are human-readable (e.g. `content.upload` → "Content uploaded")
- [x] Clicking a resource name/ID navigates to that resource's detail page (if it still exists)
- [x] Dark-themed, consistent styling
- [x] ⚠️ BLOCKED: Verify in browser: can see audit entries, filter by action type, filter by date range, paginate — Cannot verify in browser in automated session; requires manual testing with running backend and seeded audit data

## Task Dependency Graph

```
TASK-011-001 ──→ TASK-011-002 ──→ TASK-011-004
     │                               ↑
     └──→ TASK-011-003 ─────────────┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-011-001 | ~30k | none | — | — |
| TASK-011-002 | ~45k | 001 | yes (with 003) | — |
| TASK-011-003 | ~20k | 001 | yes (with 002) | — |
| TASK-011-004 | ~50k | 002, 003 | no | — |

**Total estimated tokens:** ~145k

## Functional Requirements

- FR-1: All significant actions listed in the vision are recorded as audit entries
- FR-2: Each entry records: timestamp, user, organisation, action, resource type, resource ID, details
- FR-3: Org Admins can view and filter the audit log within their organisation
- FR-4: Super-admins can view the global audit log across all organisations
- FR-5: The audit log is populated automatically via event listeners — no manual logging in each module
- FR-6: Audit recording does not block or slow down the main request

## Non-Goals

- No audit log export (CSV, PDF)
- No audit log retention/cleanup policy
- No real-time updates on the audit log page (user refreshes or paginates to see new entries)
- No detailed diff for update actions (just records that an update happened with key fields in details)

## Technical Considerations

- Use NestJS EventEmitter (`@nestjs/event-emitter`) for loose coupling — audit module subscribes to events, other modules just emit
- Adding `emit()` calls to existing services is a small change per module — keep the event payload minimal (userId, orgId, action, resourceId, key details)
- The `details` JSON field stores action-specific metadata (e.g. for content upload: filename, size; for role change: old role, new role)
- Consider a NestJS interceptor as an alternative to manual event emission — it can automatically audit all controller actions. However, manual events give more control over what's logged and what details are included. Recommend manual events for this use case.
- Index on `(organisationId, timestamp)` is critical for query performance as the log grows

## Success Metrics

- All significant actions from the vision are captured in the audit log
- Org Admin can filter and browse the log efficiently
- Audit logging adds no perceptible latency to API requests

## Open Questions

None — all resolved.
