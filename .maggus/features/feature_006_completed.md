# Feature 006: Screen Communication (Protocol, SSE, Heartbeat)

## Introduction

Implement the screen protocol abstraction layer with the JSON adapter as the first implementation. Screens can pull their full state on startup and receive real-time updates via Server-Sent Events (SSE).

### Architecture Context

- **Vision alignment:** "On startup, the screen pulls its full state", "the server pushes updates in real time", "architecture allows adding more protocols"
- **Components involved:** ScreenProtocolModule (new), ScreenModule (extend)
- **New patterns:** Protocol adapter interface, SSE endpoints, screen state model

## Goals

- Protocol abstraction layer with a pluggable adapter interface
- JSON protocol adapter as the first implementation
- Screen can fetch its full state (current playlist, schedule, content URLs) on startup
- Screen receives real-time updates via SSE when its state changes
- Architecture supports adding new protocol adapters without modifying core logic

## Tasks

### TASK-006-001: Screen State Model & Protocol Adapter Interface
**Description:** As a developer, I want a protocol-agnostic screen state model and adapter interface so that multiple protocols can render the same data differently.

**Token Estimate:** ~30k tokens
**Predecessors:** none
**Successors:** TASK-006-002, TASK-006-003
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] `ScreenState` model class containing: screen info, current playlist (ordered items with content URLs and durations), current schedule entries, active live stream (if any, nullable), fallback playlist
- [x] `ScreenEvent` model class representing a state change: type (enum: `schedule_update`, `playlist_update`, `content_update`, `live_stream_start`, `live_stream_stop`), payload
- [x] `ScreenProtocolAdapter` interface with methods:
  - `renderState(state: ScreenState): any` — full state for initial pull
  - `renderEvent(event: ScreenEvent): any` — incremental update for SSE push
- [x] Interface and models exported from the ScreenProtocolModule
- [x] Unit tests for model construction
- [x] Typecheck and lint pass

### TASK-006-002: JSON Protocol Adapter
**Description:** As a screen client, I want the server to deliver state and updates in JSON format so that I can easily parse and render content.

**Token Estimate:** ~20k tokens
**Predecessors:** TASK-006-001
**Successors:** TASK-006-003
**Parallel:** no

**Acceptance Criteria:**
- [x] `JsonProtocolAdapter` implements `ScreenProtocolAdapter`
- [x] `renderState` returns a JSON object with: `screen`, `currentPlaylist` (items with `url`, `duration`, `type`), `schedule` (upcoming entries), `fallbackPlaylist`, `liveStream` (null or stream info)
- [x] `renderEvent` returns a JSON object with: `type`, `timestamp`, `data` (event-specific payload)
- [x] Content URLs are absolute paths to the media endpoint (e.g. `/api/media/{orgId}/{contentId}`)
- [x] Unit tests for JSON rendering of state and events
- [x] Typecheck and lint pass

### TASK-006-003: Screen State & SSE Endpoints
**Description:** As a screen, I want to fetch my full state on startup and subscribe to updates via SSE so that I always display the correct content.

**Token Estimate:** ~50k tokens
**Predecessors:** TASK-006-001, TASK-006-002
**Successors:** TASK-006-004
**Parallel:** no

**Acceptance Criteria:**
- [x] `ScreenStateService` that assembles the full `ScreenState` for a given screen by querying schedule, playlist, and content data
- [x] `GET /api/screens/:id/state` — screen-authenticated, returns full state via the protocol adapter
- [x] `GET /api/screens/:id/events` — screen-authenticated, SSE endpoint that:
  - Opens a persistent connection
  - Sends `ScreenEvent` payloads whenever the screen's state changes
  - Sends a periodic keepalive comment (every 30 seconds) to prevent timeout
  - Closes cleanly when the screen disconnects
- [x] NestJS `@Sse()` decorator used for the SSE endpoint
- [x] Events are triggered via NestJS EventEmitter — when a schedule, playlist, or content changes, the relevant module emits an event; `ScreenStateService` listens and pushes to the correct SSE connection
- [x] Unit tests for state assembly (with mock data — playlists/schedules may not exist yet, use stubs)
- [x] Typecheck and lint pass

### TASK-006-004: Media Serving Endpoint
**Description:** As a screen, I want to download transcoded media files so that I can cache and play content locally.

**Token Estimate:** ~25k tokens
**Predecessors:** TASK-006-003
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] `GET /api/media/:organisationId/:contentId` — screen-authenticated, serves the transcoded file from the filesystem
- [x] Validates that the screen belongs to the requested organisation
- [x] Sets appropriate `Content-Type` header based on file extension
- [x] Sets `Cache-Control` header for client-side caching
- [x] Returns 404 if content doesn't exist or transcoding isn't complete
- [x] Unit tests for auth validation and file serving
- [x] Typecheck and lint pass

## Task Dependency Graph

```
TASK-006-001 ──→ TASK-006-002 ──→ TASK-006-003 ──→ TASK-006-004
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-006-001 | ~30k | none | — | opus |
| TASK-006-002 | ~20k | 001 | no | — |
| TASK-006-003 | ~50k | 001, 002 | no | opus |
| TASK-006-004 | ~25k | 003 | no | — |

**Total estimated tokens:** ~125k

## Functional Requirements

- FR-1: Screens can fetch their full state via `GET /api/screens/:id/state`
- FR-2: Screens receive real-time updates via SSE at `GET /api/screens/:id/events`
- FR-3: SSE connection sends keepalive comments to prevent proxy/timeout disconnection
- FR-4: All screen endpoints require API key authentication
- FR-5: The protocol adapter is swappable — the JSON adapter is the default
- FR-6: Media files are served with correct content types and cache headers
- FR-7: A screen can only access media belonging to its own organisation

## Non-Goals

- No SMIL adapter (deferred — JSON is the first and only protocol for now)
- No screen-side client implementation (screens are external)
- No live stream integration in state model yet (placeholder — implemented in a future feature)
- No content caching strategy on server side (screens cache locally per the vision)

## Technical Considerations

- SSE connections are long-lived — ensure NestJS doesn't buffer responses (use `@Sse()` with Observable)
- Each SSE connection is per-screen; use a Map/Registry to track active connections and route events
- The `ScreenStateService` needs to query across modules (schedules, playlists, content) — use NestJS EventEmitter for loose coupling rather than direct imports
- Media serving should use `StreamableFile` or `res.sendFile` for efficient file streaming (no loading entire file into memory)
- The state and event endpoints will return minimal data until playlists, schedules, and content are implemented (features 007-009) — that's fine, they'll return empty arrays

## Success Metrics

- A screen can pull its full state on startup
- Changes to schedules/playlists trigger SSE events to connected screens
- Media files are served efficiently with proper caching headers

## Open Questions

None — all resolved.
