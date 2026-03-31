# Feature 020: Replace Socket.IO with SSE for Dashboard

## Introduction

Replace the Socket.IO WebSocket connection used by the admin dashboard with Server-Sent Events (SSE). All dashboard real-time events (screen status, transcoding progress, schedule updates, live stream health, notifications) are one-way server→client pushes — SSE is the right primitive for this pattern and eliminates the Socket.IO dependency that causes unresponsiveness.

### Architecture Context

- **Vision alignment:** VISION.md requires "Real-time updates — dashboard and screen status update live via push (no manual refresh)" — SSE fulfils this identically
- **Components involved:** DashboardModule (backend), DashboardSocketService (frontend), content-library.ts (frontend), notification.service.ts (frontend), Layout shell (frontend), in-app-notification-channel.service.ts (backend)
- **Proven pattern:** The player already uses SSE (screen.controller.ts `@Sse` + screen-state.service.ts + player.service.ts) — this migration reuses the same architecture
- **Removal scope:** DashboardGateway, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `socket.io-client`, proxy.conf.json WebSocket entry

## Goals

- Replace all Socket.IO usage with SSE for dashboard real-time events
- Consolidate the duplicate socket connection in content-library.ts into the shared SSE service
- Fully remove socket.io dependencies from both backend and frontend
- Maintain identical real-time functionality (all 8 event types)
- Update ARCHITECTURE.md to reflect SSE-only approach

## Tasks

### TASK-020-001: Backend — Create Dashboard SSE Service
**Description:** As the backend, I want a `DashboardSseService` that manages SSE connections per user session (scoped by organisationId + userId) so that dashboard clients receive real-time events via SSE instead of Socket.IO.

**Token Estimate:** ~60k tokens
**Predecessors:** none
**Successors:** TASK-020-002, TASK-020-003
**Parallel:** yes — can run alongside TASK-020-004
**Model:** opus

**Acceptance Criteria:**
- [x] New `DashboardSseService` in `backend/src/dashboard/` manages per-connection Observable streams (similar pattern to `ScreenStateService.subscribe()`)
- [x] Connections are keyed by a generated connection ID; each connection stores `organisationId` and `userId`
- [x] `pushToOrg(organisationId, event)` sends to all connections for that org
- [x] `pushToUser(userId, event)` sends to all connections for that user
- [x] Keepalive events emitted every 30 seconds per connection
- [x] Connections are cleaned up on Observable unsubscribe (SSE disconnect)
- [x] All existing `@OnEvent` handlers from `DashboardGateway` are migrated:
  - `SCREEN_STATUS_CHANGED` → emits `screen.online` / `screen.offline` to org
  - `TRANSCODING_PROGRESS` → emits `transcoding.progress` to org
  - `TRANSCODING_COMPLETED` → emits `transcoding.complete` to org
  - `TRANSCODING_FAILED` → emits `transcoding.failed` to org
  - `SCHEDULE_ENTRY_CHANGED` → emits `schedule.updated` to org
  - `LIVE_STREAM_HEALTH_CHANGED` → emits `live-stream-health` to org
- [x] `emitToUser(userId, type, data)` method preserved for notification channel to call
- [x] Event payload format preserved: `{ type, data, timestamp }`
- [x] Unit tests written and passing (mirror coverage from `dashboard.gateway.spec.ts`)
- [x] Typecheck/lint passes

### TASK-020-002: Backend — Create Dashboard SSE Endpoint & Wire Up
**Description:** As the backend, I want an SSE endpoint at `GET /api/dashboard/events` authenticated via JWT so that the frontend can connect and receive real-time events.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-020-001
**Successors:** TASK-020-005
**Parallel:** no

**Acceptance Criteria:**
- [x] New `DashboardController` (or add to existing) with `@Sse('events')` endpoint
- [x] Endpoint is authenticated using the existing JWT auth guard (Hanko token via `Authorization: Bearer` header)
- [x] `organisationId` is extracted from the JWT claims (same as REST endpoints use)
- [x] `userId` is extracted from the JWT claims
- [x] Calls `DashboardSseService.subscribe(organisationId, userId)` and returns the Observable
- [x] `InAppNotificationChannel` updated to call `DashboardSseService.emitToUser()` instead of `DashboardGateway.emitToUser()`
- [x] `DashboardModule` updated: removes `DashboardGateway`, exports `DashboardSseService`
- [x] Unit tests for the controller endpoint
- [x] Typecheck/lint passes

### TASK-020-003: Backend — Remove Socket.IO & Dependencies
**Description:** As a developer, I want Socket.IO fully removed from the backend so there are no unused dependencies.

**Token Estimate:** ~15k tokens
**Predecessors:** TASK-020-002
**Successors:** TASK-020-006
**Parallel:** yes — can run alongside TASK-020-005

**Acceptance Criteria:**
- [x] `dashboard.gateway.ts` deleted
- [x] `dashboard.gateway.spec.ts` deleted
- [x] `backend/src/dashboard/index.ts` updated (no more gateway export)
- [x] `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` removed from `backend/package.json`
- [x] No remaining imports of socket.io or `@nestjs/websockets` in any backend file
- [x] `npm install` in backend succeeds
- [x] Typecheck/lint passes
- [x] All existing backend tests pass

### TASK-020-004: Frontend — Create Dashboard SSE Service
**Description:** As the frontend, I want a `DashboardSseService` that connects to the SSE endpoint and exposes RxJS subjects for each event type, replacing the Socket.IO-based service.

**Token Estimate:** ~50k tokens
**Predecessors:** none
**Successors:** TASK-020-005
**Parallel:** yes — can run alongside TASK-020-001
**Model:** opus

**Acceptance Criteria:**
- [x] New `DashboardSseService` in `frontend/src/app/dashboard/` (replaces `DashboardSocketService`)
- [x] Uses `fetch()` + ReadableStream to parse SSE (same pattern as `player.service.ts` SSE client — NOT the `EventSource` API, since it doesn't support `Authorization` headers)
- [x] `connect()`/`disconnect()` lifecycle methods (same API surface as the old socket service)
- [x] Same-org no-op logic preserved: if already connected to the same org, `connect()` is a no-op
- [x] Automatic reconnection with exponential backoff (1s initial, 30s max)
- [x] Same RxJS Subject properties exposed:
  - `screenOnline$`, `screenOffline$`, `scheduleUpdated$`
  - `transcodingProgress$`, `transcodingComplete$`, `transcodingFailed$`
  - `notificationNew$`
  - `liveStreamHealth$` (new — previously not subscribed on frontend but now consistently available)
- [x] SSE event parsing: `event: state-change` with JSON `data` containing `{ type, data, timestamp }` — routes to the correct Subject by `type`
- [x] Keepalive events silently ignored
- [x] `DashboardEvent` interface preserved
- [x] Typecheck/lint passes

### TASK-020-005: Frontend — Migrate All Consumers to New SSE Service
**Description:** As the frontend, I want all components that used Socket.IO to use the new SSE service so that real-time updates work identically.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-020-004, TASK-020-002
**Successors:** TASK-020-006
**Parallel:** no

**Acceptance Criteria:**
- [x] `Layout` (`shell/layout.ts`): import changed from `DashboardSocketService` to new `DashboardSseService`, `connect()`/`disconnect()` calls preserved
- [x] `Dashboard` (`dashboard/dashboard.ts`): import changed, all `.subscribe()` calls work identically with new subjects
- [x] `NotificationService` (`notifications/notification.service.ts`): import changed, `notificationNew$` subscription preserved
- [x] `ContentLibrary` (`content/content-library.ts`): **standalone socket.io connection removed entirely**, replaced with injection of the shared `DashboardSseService`; subscribes to `transcodingProgress$`, `transcodingComplete$`, `transcodingFailed$` from the shared service
- [x] Content library's `connectSocket()` method and `socket` property removed
- [x] Old `DashboardSocketService` (`dashboard-socket.service.ts`) deleted
- [x] All event type names consistent between backend emission and frontend subscription (use dot notation: `screen.online`, `transcoding.progress`, etc.)
- [x] ⚠️ BLOCKED: Verify in browser: dashboard screen status tiles update live, transcoding progress shows in content library, notifications arrive in bell — requires running the full application with a browser, cannot be automated in this context
- [x] Typecheck/lint passes

### TASK-020-006: Cleanup — Remove Socket.IO from Frontend & Update Configs
**Description:** As a developer, I want socket.io-client fully removed from the frontend and all related config cleaned up.

**Token Estimate:** ~10k tokens
**Predecessors:** TASK-020-005, TASK-020-003
**Successors:** TASK-020-007
**Parallel:** no

**Acceptance Criteria:**
- [x] `socket.io-client` removed from `frontend/package.json`
- [x] `frontend/proxy.conf.json`: remove the `/socket.io` proxy entry
- [x] No remaining imports of `socket.io-client` in any frontend file
- [x] `npm install` in frontend succeeds
- [x] Typecheck/lint passes

### TASK-020-007: Update ARCHITECTURE.md
**Description:** As a developer, I want ARCHITECTURE.md to reflect that the dashboard now uses SSE instead of Socket.IO.

**Token Estimate:** ~10k tokens
**Predecessors:** TASK-020-006
**Successors:** none
**Parallel:** no
**Model:** haiku

**Acceptance Criteria:**
- [x] `DashboardGateway` row in Key Modules table replaced with `DashboardSseModule` description
- [x] Content Transcoding section: "DashboardGateway pushes to frontend via Socket.IO" → "DashboardSseService pushes to frontend via SSE"
- [x] Notifications section: "delivered to dashboard via Socket.IO" → "delivered to dashboard via SSE"
- [x] Frontend section: "Socket.IO client for real-time dashboard updates" → "SSE client for real-time dashboard updates"
- [x] Deployment section: `signage-server` service description no longer mentions WebSocket
- [x] No remaining references to Socket.IO in ARCHITECTURE.md

## Task Dependency Graph

```
TASK-020-001 ──→ TASK-020-002 ──→ TASK-020-005 ──→ TASK-020-006 ──→ TASK-020-007
                 TASK-020-003 ──┘                  ┘
TASK-020-004 ────────────────────┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-020-001 | ~60k | none | yes (with 004) | opus |
| TASK-020-002 | ~40k | 001 | no | — |
| TASK-020-003 | ~15k | 002 | yes (with 005) | — |
| TASK-020-004 | ~50k | none | yes (with 001) | opus |
| TASK-020-005 | ~40k | 004, 002 | no | — |
| TASK-020-006 | ~10k | 005, 003 | no | — |
| TASK-020-007 | ~10k | 006 | no | haiku |

**Total estimated tokens:** ~225k

## Functional Requirements

- FR-1: Dashboard SSE endpoint at `GET /api/dashboard/events` authenticated via JWT Bearer token
- FR-2: Events scoped per connection — org-level events sent to all connections for that org, user-level events (notifications) sent to all connections for that user
- FR-3: All 8 event types preserved with identical payload format: `screen.online`, `screen.offline`, `transcoding.progress`, `transcoding.complete`, `transcoding.failed`, `schedule.updated`, `live-stream-health`, `notification.new`
- FR-4: Frontend SSE client uses `fetch()` + ReadableStream (not `EventSource`) to support `Authorization` header
- FR-5: Automatic reconnection with exponential backoff (1s → 30s max)
- FR-6: Keepalive every 30s from server to prevent connection timeout
- FR-7: Content library uses the shared SSE service instead of its own standalone socket connection
- FR-8: All socket.io dependencies removed from both backend and frontend package.json

## Non-Goals

- No changes to the player SSE implementation (it already works correctly)
- No new event types beyond the existing 8
- No bidirectional communication (SSE is one-way; if future features need client→server messaging, they'll use REST calls)
- No authentication changes — JWT flow remains the same, just passed via header instead of socket handshake

## Technical Considerations

- The existing player SSE pattern (`ScreenStateService` + `@Sse` endpoint) is the proven reference — the dashboard implementation should mirror its structure closely
- `EventSource` API doesn't support custom headers, so the frontend must use `fetch()` with manual SSE parsing (exactly as the player already does in `player.service.ts`)
- The content-library.ts currently connects its own socket **without JWT auth** (only passes orgId as query param) — this is a security gap that gets fixed by consolidating into the shared authenticated service
- Backend `DashboardSseService` will hold in-memory connection maps — same lifecycle considerations as `ScreenStateService` (cleanup on disconnect, no persistence needed)

## Success Metrics

- Socket.IO dependencies fully removed from both packages
- Dashboard real-time features work identically (screen status, transcoding, notifications)
- No more unresponsiveness issues from socket.io connections
- Content library no longer creates a duplicate unauthenticated connection

## Open Questions

None — all decisions resolved via clarifying questions.
