# Feature 005: Screen Management

## Introduction

Implement screen registration, API key authentication, and screen status tracking. Org Admins can register screens, view their status, and manage API keys. This is the foundation for screen communication (feature 006).

### Architecture Context

- **Vision alignment:** "Registered manually by an Org Admin", "API key shown once, can be regenerated", "heartbeat to report online/offline status"
- **Components involved:** ScreenModule (new), AuthModule (extend with API key validation)
- **New patterns:** API key generation/hashing, heartbeat-based status detection

## Goals

- Org Admins can register screens with name, resolution, and location
- Each screen gets a unique API key (shown once on creation, regeneratable)
- API key authentication for screen-facing endpoints
- Heartbeat tracking with online/offline status detection
- Screen list and detail views in the frontend

## Tasks

### TASK-005-001: Screen Entity & API Key Generation
**Description:** As the system, I want a Screen entity with secure API key handling so that screens can be registered and authenticated.

**Token Estimate:** ~30k tokens
**Predecessors:** none
**Successors:** TASK-005-002, TASK-005-003
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] `Screen` entity: `id` (UUID, PK), `organisationId` (FK), `name` (string), `resolution` (string, e.g. "1920x1080"), `location` (string), `apiKeyHash` (string — bcrypt hash of the API key), `lastHeartbeat` (datetime, nullable), `isOnline` (boolean, default false), `createdAt`, `updatedAt`
- [x] API key generation: crypto-random 32-byte token, base64url-encoded
- [x] API key is hashed (bcrypt) before storing — the plaintext is returned only on creation/regeneration
- [x] TypeORM migration creates the table with index on `apiKeyHash`
- [x] Unit tests for API key generation and hashing
- [x] Typecheck and lint pass

### TASK-005-002: Screen Service & REST API
**Description:** As an Org Admin, I want API endpoints to register screens, list them, view details, and regenerate API keys.

**Token Estimate:** ~45k tokens
**Predecessors:** TASK-005-001
**Successors:** TASK-005-004, TASK-005-005
**Parallel:** yes — can run alongside TASK-005-003

**Acceptance Criteria:**
- [x] `ScreenService` with methods: `create`, `findAll(orgId)`, `findOne(id, orgId)`, `update`, `regenerateApiKey`, `recordHeartbeat`, `detectOfflineScreens`
- [x] `ScreenController` with routes:
  - `POST /api/screens` — register screen (Org Admin) → returns screen + plaintext API key
  - `GET /api/screens` — list screens in current org (all roles)
  - `GET /api/screens/:id` — screen detail (all roles)
  - `PATCH /api/screens/:id` — update name/resolution/location (Org Admin)
  - `POST /api/screens/:id/regenerate-key` — regenerate API key (Org Admin) → returns new plaintext key
- [x] All endpoints scoped to current organisation
- [x] Input validation via DTOs
- [x] Unit tests for all service methods
- [x] Typecheck and lint pass

### TASK-005-003: API Key Authentication Guard
**Description:** As the system, I want to authenticate screens via API key so that screen-facing endpoints are secured.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-005-001
**Successors:** TASK-005-004
**Parallel:** yes — can run alongside TASK-005-002

**Acceptance Criteria:**
- [x] `ApiKeyAuthGuard` that:
  - Checks for `Authorization: Bearer <api-key>` header
  - Looks up the screen by comparing the bcrypt hash
  - On match: attaches `screenId` and `organisationId` to the request
  - On no match: returns HTTP 401
- [x] `@ScreenAuth()` decorator to mark endpoints as screen-authenticated (instead of JWT)
- [x] Screen-authenticated endpoints skip the JWT guard
- [x] Unit tests: valid key, invalid key, missing header
- [x] Typecheck and lint pass

### TASK-005-004: Heartbeat & Offline Detection
**Description:** As the system, I want to track screen heartbeats and detect offline screens so that the dashboard shows accurate status.

**Token Estimate:** ~35k tokens
**Predecessors:** TASK-005-002, TASK-005-003
**Successors:** TASK-005-005
**Parallel:** no

**Acceptance Criteria:**
- [x] `POST /api/screens/:id/heartbeat` — screen-authenticated endpoint, updates `lastHeartbeat` and sets `isOnline = true`
- [x] Scheduled task (NestJS `@Cron` or `@Interval`) runs every 60 seconds:
  - Marks screens as offline if `lastHeartbeat` is older than configurable threshold (default: 120 seconds)
- [x] `isOnline` status change emitted as an event (NestJS EventEmitter) for future use by dashboard and notifications
- [x] Unit tests: heartbeat updates timestamp, offline detection works correctly
- [x] Typecheck and lint pass

### TASK-005-005: Screen Management UI
**Description:** As an Org Admin, I want to see and manage screens in the dashboard so that I can register new screens and monitor their status.

**Token Estimate:** ~55k tokens
**Predecessors:** TASK-005-002, TASK-005-004
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] `/screens` route showing list/grid view of screens
- [x] Each screen card shows: name, location, resolution, online/offline status (colour-coded: green/red)
- [x] "Register Screen" button → form with name, resolution (dropdown or free input), location
- [x] On creation: modal showing the API key with a "Copy" button and warning that it won't be shown again
- [x] Screen detail view: name, location, resolution, status, last heartbeat timestamp, API key management
- [x] "Regenerate API Key" button with confirmation dialog → shows new key in modal
- [x] Edit screen: update name, resolution, location
- [x] Dark-themed, consistent styling
- [x] ⚠️ BLOCKED: Verify in browser: can register screen, see API key, view screen list with status indicators — Cannot start dev server in automated run; manual browser verification required

## Task Dependency Graph

```
TASK-005-001 ──→ TASK-005-002 ──→ TASK-005-004 ──→ TASK-005-005
     │                               ↑
     └──→ TASK-005-003 ─────────────┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-005-001 | ~30k | none | — | — |
| TASK-005-002 | ~45k | 001 | yes (with 003) | — |
| TASK-005-003 | ~30k | 001 | yes (with 002) | — |
| TASK-005-004 | ~35k | 002, 003 | no | — |
| TASK-005-005 | ~55k | 002, 004 | no | — |

**Total estimated tokens:** ~195k

## Functional Requirements

- FR-1: Org Admins can register screens with name, resolution, and location
- FR-2: On registration, a unique API key is generated and shown once
- FR-3: API keys are stored as bcrypt hashes — plaintext is never persisted
- FR-4: Screens authenticate via `Authorization: Bearer <api-key>` header
- FR-5: Screens send heartbeats; the server marks them offline after a configurable timeout
- FR-6: Screen status (online/offline) is visible in the screen list

## Non-Goals

- No screen deletion (defer — need to consider cleanup of schedules, groups)
- No screen groups (comes in a later feature)
- No live preview thumbnails
- No heartbeat history graph (just current status)

## Technical Considerations

- API key lookup via bcrypt comparison is O(n) per screen — for venue-scale (< 100 screens), this is fine. If scaling becomes an issue, add a key prefix for indexed lookup.
- The heartbeat interval and offline threshold should be configurable via env vars
- The `@ScreenAuth()` decorator needs to work alongside `@Public()` and `@Roles()` — ensure guard ordering is correct
- Events emitted on status change will be consumed by the dashboard WebSocket gateway (feature 010) and audit log (feature 011)

## Success Metrics

- Org Admin can register a screen and receive an API key
- A screen can authenticate with its API key and send heartbeats
- The screen list shows accurate online/offline status

## Open Questions

None — all resolved.
