# Feature 014: Live Streams

## Introduction

Live Streams allow an Org Admin or Editor to configure stream sources (RTMP or RTP) and activate them on one or more target screens or screen groups with a single action. Activating a stream sends a real-time override to the targeted screens, interrupting the current playlist or schedule. When the stream source disconnects or the stream is manually deactivated, affected screens automatically resume their scheduled playlist. The server performs all transcoding, so screens only need to consume a standard HLS endpoint — no changes to the screen client protocol.

### Architecture Context

- **Vision alignment:** "A live stream is a separate mode, NOT part of a playlist", "server performs live transcoding and distributes to target screen(s)", "activating a live stream on a screen overrides the current playlist/schedule", "when the stream source stops, the screen automatically falls back to the scheduled playlist"
- **Components involved:** LiveStreamModule (new), TranscodingModule (FFmpeg/BullMQ patterns, reuse for process lifecycle), ScreenProtocolModule (SSE push for override/fallback events), DashboardGateway (Socket.IO, broadcast stream health events), ScreenGroupsModule (Feature 012, target a group)
- **New patterns:** FFmpeg child process for live ingest (not queue-based like transcoding jobs — process runs for the duration of the stream), HLS segment serving via HTTP, stream health monitoring via process health check loop
- **Prerequisite:** Feature 012 (Screen Groups) must be completed — live streams can target a group and the group membership must be resolvable to individual screens at activation time

## Goals

- Org Admin or Editor can create, edit, and delete stream source configurations (name, URL, protocol)
- Activating a stream on one or more screens or a screen group overrides their current content immediately
- Server transcodes the incoming RTMP or RTP stream to HLS segments served over HTTP
- Screens receive an SSE event with the HLS endpoint URL and begin playback
- Stream health is monitored continuously; screens and admins are notified of unhealthy or stopped streams
- When a stream stops (source disconnects or manual deactivation), screens automatically resume their scheduled playlist via an SSE fallback event
- All stream activation, deactivation, and failure events are recorded in the audit log
- Frontend provides a Live Streams page: list of stream sources, activate/deactivate controls per screen or group, stream health indicator

## Tasks

### TASK-014-001: LiveStream Entity & Migration
**Description:** As the system, I want a LiveStream entity and database migration so that stream source configurations can be persisted per organisation.

**Token Estimate:** ~20k tokens
**Predecessors:** none
**Successors:** TASK-014-002, TASK-014-003
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] `LiveStream` entity with fields: `id` (UUID, PK), `orgId` (UUID, FK → organisations), `name` (string, not null), `sourceUrl` (string, not null), `protocol` (enum: `rtmp`, `rtp`), `status` (enum: `idle`, `active`, `error`), `createdAt` (datetime, default now), `updatedAt` (datetime, auto-update)
- [x] TypeORM migration creates table `live_streams` with indexes on `orgId` and `status`
- [x] `LiveStream` entity exported from `LiveStreamModule`
- [x] Basic `LiveStreamRepository` (TypeORM) injected into `LiveStreamService` (stub at this stage)
- [x] Unit tests: entity instantiation, field defaults
- [x] Typecheck and lint pass

---

### TASK-014-002: LiveStream CRUD REST API
**Description:** As an Org Admin or Editor, I want REST endpoints to manage stream source configurations so that I can create, view, update, and delete them.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-014-001
**Successors:** TASK-014-004, TASK-014-009
**Parallel:** yes — can run alongside TASK-014-003

**Acceptance Criteria:**
- [x] `LiveStreamController` routes (all scoped to current org via `X-Organisation-Id`):
  - `POST /api/live-streams` — create stream source (Org Admin or Editor)
  - `GET /api/live-streams` — list all stream sources for the org
  - `GET /api/live-streams/:id` — get single stream source
  - `PATCH /api/live-streams/:id` — update name, sourceUrl, protocol (Org Admin or Editor); forbidden if status is `active`
  - `DELETE /api/live-streams/:id` — delete stream source (Org Admin only); forbidden if status is `active`
- [x] Request DTOs with validation (`class-validator`): `name` (string, 1–100 chars), `sourceUrl` (valid URL string), `protocol` (enum `rtmp` | `rtp`)
- [x] Response DTO includes all entity fields; `sourceUrl` is included (not sensitive)
- [x] Deleting a stream in `active` state returns HTTP 409 with descriptive error message
- [x] Updating a stream in `active` state returns HTTP 409
- [x] Viewers (non-editor/non-admin roles) receive HTTP 403 on write operations
- [x] Unit tests for each endpoint: success path, access control, conflict scenarios
- [x] Typecheck and lint pass

---

### TASK-014-003: FFmpeg Live Transcoding Pipeline
**Description:** As the system, I want to ingest an RTMP or RTP source stream and transcode it to HLS segments served over HTTP so that screens can play it using their existing HLS player.

**Token Estimate:** ~50k tokens
**Predecessors:** TASK-014-001
**Successors:** TASK-014-004, TASK-014-005
**Parallel:** yes — can run alongside TASK-014-002
**Model:** opus

**Acceptance Criteria:**
- [ ] `FfmpegLiveService` (within `LiveStreamModule`) that manages FFmpeg child processes:
  - `start(stream: LiveStream): Promise<void>` — spawns an FFmpeg child process that ingests from `sourceUrl` (RTMP or RTP) and outputs HLS segments to `<hlsOutputDir>/<streamId>/index.m3u8`
  - `stop(streamId: string): Promise<void>` — terminates the FFmpeg child process for the given stream
  - `isRunning(streamId: string): boolean` — returns whether a process is currently running
  - Internal map `Map<string, ChildProcess>` tracks running processes keyed by stream ID
- [ ] FFmpeg command construction:
  - RTMP source: `ffmpeg -i rtmp://<url> -c:v libx264 -preset ultrafast -tune zerolatency -c:a aac -f hls -hls_time 2 -hls_list_size 5 -hls_flags delete_segments+append_list <outputPath>`
  - RTP source: same output flags; input uses `-protocol_whitelist file,rtp,udp -i <sdpFileOrUrl>`
  - HLS segment duration: 2 seconds; playlist size: 5 segments (low-latency tuning)
  - HLS output directory created if not existing; segments cleaned up on stop
- [ ] HLS output served via a static HTTP route: `GET /api/live-streams/:id/hls/index.m3u8` and `GET /api/live-streams/:id/hls/:segment` — served from the output directory using NestJS static file serving or `res.sendFile`
- [ ] FFmpeg stderr captured to structured logs (log level `verbose` in development, `error` in production); do not surface raw FFmpeg output to API consumers
- [ ] If FFmpeg process exits with a non-zero code before being explicitly stopped, the exit is treated as an unplanned source disconnect (see TASK-014-005 for fallback logic)
- [ ] Unit tests for `FfmpegLiveService`: mock child process, verify start/stop/isRunning behaviour, verify command construction for RTMP and RTP protocols
- [ ] Typecheck and lint pass

---

### TASK-014-004: Stream Activation & Override Logic
**Description:** As an Org Admin or Editor, I want to activate a stream on one or more screens or a screen group so that those screens immediately switch to live stream playback.

**Token Estimate:** ~45k tokens
**Predecessors:** TASK-014-002, TASK-014-003
**Successors:** TASK-014-005, TASK-014-006
**Parallel:** no

**Acceptance Criteria:**
- [ ] `POST /api/live-streams/:id/activate` endpoint (Org Admin or Editor):
  - Request body: `{ targetScreenIds?: string[], targetGroupId?: string }` — exactly one of the two must be provided
  - If `targetGroupId` is provided, resolves to the group's member screen IDs (via `ScreenGroupsService` from Feature 012)
  - Validates all target screens belong to the current org
  - Calls `FfmpegLiveService.start()` to spawn the FFmpeg process (idempotent — if already running for this stream, reuse)
  - Updates `LiveStream.status` to `active` and persists `targetScreenIds` (store as JSON column `activeTargetScreenIds` on the entity or a separate `LiveStreamActivation` join record — choose join record for auditability)
  - Sends an SSE event to each target screen via `ScreenProtocolService`:
    - Event type: `live-stream-start`
    - Payload: `{ streamId, hlsUrl: '/api/live-streams/:id/hls/index.m3u8' }`
  - Returns HTTP 200 with the updated stream object
- [ ] A screen can only have one active live stream override at a time; activating a second stream on a screen that is already overriding deactivates the previous stream for that screen first
- [ ] If `FfmpegLiveService.start()` fails (e.g. FFmpeg binary not found), the endpoint returns HTTP 502 with a descriptive error and does not update the stream status
- [ ] Audit log event emitted: `live_stream.activated` with `{ streamId, streamName, targetScreenIds }`
- [ ] Unit tests for activation: screen resolution from group, duplicate override handling, FFmpeg start failure path
- [ ] Typecheck and lint pass

---

### TASK-014-005: Stream Fallback & Deactivation Logic
**Description:** As the system, I want screens to automatically resume their scheduled playlist when a stream stops, either due to manual deactivation or source disconnection.

**Token Estimate:** ~35k tokens
**Predecessors:** TASK-014-004
**Successors:** TASK-014-006, TASK-014-007
**Parallel:** no

**Acceptance Criteria:**
- [ ] `POST /api/live-streams/:id/deactivate` endpoint (Org Admin or Editor):
  - Calls `FfmpegLiveService.stop()` for the stream
  - Sends SSE event `live-stream-stop` to all previously targeted screens (resolved from `activeTargetScreenIds`)
  - Clears the activation record and sets `LiveStream.status` back to `idle`
  - Returns HTTP 200
  - Audit log event emitted: `live_stream.deactivated` with `{ streamId, streamName, reason: 'manual' }`
- [ ] Automatic fallback on unplanned FFmpeg process exit:
  - `FfmpegLiveService` emits an internal event `live-stream.process-exited` (via NestJS EventEmitter) when a process exits without an explicit `stop()` call
  - `LiveStreamService` listens to this event: sends SSE event `live-stream-stop` to all active target screens, sets stream `status` to `error`, clears activation record
  - Audit log event emitted: `live_stream.failed` with `{ streamId, streamName, reason: 'source_disconnected' }`
- [ ] Screen client behaviour on receiving `live-stream-stop` SSE: resume normal playlist/schedule (this is handled by the existing ScreenProtocolModule — verify the event type is handled or add handler)
- [ ] If the stream has no active targets at deactivation time (e.g. all screens were individually overridden by another stream), deactivation still cleans up the FFmpeg process and returns 200
- [ ] Unit tests: manual deactivation, unplanned exit event flow, no-targets edge case
- [ ] Typecheck and lint pass

---

### TASK-014-006: Stream Health Monitoring
**Description:** As the system, I want continuous health monitoring of active FFmpeg processes so that stream health is visible in the admin UI and degraded streams trigger alerts.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-014-005
**Successors:** TASK-014-008
**Parallel:** no

**Acceptance Criteria:**
- [ ] `StreamHealthService` (within `LiveStreamModule`) runs a periodic health check (every 10 seconds via `setInterval` or NestJS `@Cron`):
  - For each stream with `status === 'active'`: calls `FfmpegLiveService.isRunning()` to check process liveness
  - Additionally, checks that the HLS output directory contains a recent segment file (modified within the last 15 seconds) — if segments are stale, the stream is considered unhealthy even if the process is alive
  - Result: `healthy` (process running + fresh segments), `degraded` (process running but segments stale), `stopped` (process not running)
- [ ] Health state stored in memory (no DB persistence needed — ephemeral); exposed via:
  - `GET /api/live-streams/:id/health` — returns `{ streamId, status, health: 'healthy' | 'degraded' | 'stopped', checkedAt: ISO timestamp }`
  - `GET /api/live-streams` response augmented with `health` field per stream (injected by `StreamHealthService`)
- [ ] On `degraded` or `stopped` health detection: emit a Socket.IO event to the org's dashboard room via `DashboardGateway`:
  - Event type: `live-stream-health`
  - Payload: `{ streamId, streamName, health, checkedAt }`
- [ ] If health check detects `stopped` for a stream that was not explicitly deactivated, trigger the fallback flow from TASK-014-005 (call `LiveStreamService.handleUnplannedExit()`)
- [ ] Unit tests for `StreamHealthService`: healthy path, stale segment detection, stopped detection, dashboard event emission
- [ ] Typecheck and lint pass

---

### TASK-014-007: Audit Log Integration
**Description:** As the system, I want live stream events recorded in the audit log so that admins have a full history of stream activations, deactivations, and failures.

**Token Estimate:** ~15k tokens
**Predecessors:** TASK-014-005
**Successors:** TASK-014-009
**Parallel:** yes — can run alongside TASK-014-006

**Acceptance Criteria:**
- [ ] Extend the `AuditEntry` action enum (from Feature 011) with: `live_stream.created`, `live_stream.updated`, `live_stream.deleted`, `live_stream.activated`, `live_stream.deactivated`, `live_stream.failed`
- [ ] `LiveStreamService` emits EventEmitter events for each action; `AuditListener` (from Feature 011) maps them to audit entries
- [ ] `details` JSON for each event:
  - `live_stream.activated`: `{ streamId, streamName, protocol, targetScreenIds, targetGroupId? }`
  - `live_stream.deactivated`: `{ streamId, streamName, reason: 'manual' | 'source_disconnected' }`
  - `live_stream.failed`: `{ streamId, streamName, reason: 'source_disconnected', exitCode? }`
  - `live_stream.created/updated/deleted`: `{ streamId, streamName, sourceUrl, protocol }`
- [ ] Unit tests: verify each event produces a correctly shaped audit entry
- [ ] Typecheck and lint pass

---

### TASK-014-008: Frontend — Live Streams List Page
**Description:** As an Org Admin or Editor, I want a Live Streams page so that I can see all configured stream sources and their current health at a glance.

**Token Estimate:** ~50k tokens
**Predecessors:** TASK-014-006, TASK-014-007
**Successors:** TASK-014-009, TASK-014-010
**Parallel:** no

**Acceptance Criteria:**
- [ ] `/live-streams` route, accessible to Org Admin and Editor roles
- [ ] Sidebar navigation entry: "Live Streams" between "Schedules" and "Audit Log"
- [ ] Page renders a list/table of configured stream sources with columns: name, protocol (badge: RTMP / RTP), source URL (truncated with tooltip), status (idle / active / error — colour-coded), health indicator (shown only when status is `active`: green dot = healthy, amber dot = degraded, red dot = stopped)
- [ ] Health indicator updates in real time via Socket.IO `live-stream-health` events — no page refresh required
- [ ] Empty state: "No stream sources configured. Add your first stream." with a "New Stream" button
- [ ] "New Stream" button opens the create form (TASK-014-009)
- [ ] Each row has: edit button (opens edit form), delete button (disabled if status is `active`, with tooltip explaining why), activate/deactivate control (TASK-014-010)
- [ ] Delete action shows a confirmation modal before calling the delete endpoint
- [ ] Page loads stream list on mount; shows loading skeleton while fetching
- [ ] Dark-themed, consistent with rest of the app
- [ ] Unit tests for component: list rendering, empty state, health indicator state transitions
- [ ] ⚠️ BLOCKED: Verify in browser: list renders, health indicator updates in real time, delete confirmation works — requires running dev server with backend
- [ ] Typecheck and lint pass

---

### TASK-014-009: Frontend — Create & Edit Stream Source Form
**Description:** As an Org Admin or Editor, I want a form to create or edit a stream source so that I can configure the stream name, URL, and protocol.

**Token Estimate:** ~35k tokens
**Predecessors:** TASK-014-002, TASK-014-008
**Successors:** TASK-014-010
**Parallel:** no

**Acceptance Criteria:**
- [ ] Create form (modal or inline panel): fields — name (text input, required), source URL (text input, required, URL format validation), protocol (radio or select: RTMP / RTP)
- [ ] Edit form: pre-populated with existing values; all fields editable; form is disabled (read-only with a banner) if stream status is `active`
- [ ] Validation feedback: field-level error messages shown inline on submit or on blur
- [ ] Submit calls `POST /api/live-streams` (create) or `PATCH /api/live-streams/:id` (edit)
- [ ] On success: closes the form, refreshes the stream list, shows a toast notification ("Stream source created" / "Stream source updated")
- [ ] On error: shows the API error message in the form
- [ ] Cancel button discards changes and closes the form without calling the API
- [ ] Unit tests for form: validation logic, submit success path, edit form disabled state
- [ ] ⚠️ BLOCKED: Verify in browser: form validation works, submit creates/updates stream — requires running dev server with backend
- [ ] Typecheck and lint pass

---

### TASK-014-010: Frontend — Activate & Deactivate Controls
**Description:** As an Org Admin or Editor, I want activate and deactivate controls on the Live Streams page so that I can push a stream to target screens or groups with one click.

**Token Estimate:** ~55k tokens
**Predecessors:** TASK-014-009
**Successors:** none
**Parallel:** no
**Model:** opus

**Acceptance Criteria:**
- [ ] Each stream row has an "Activate" button (shown when status is `idle` or `error`) and a "Deactivate" button (shown when status is `active`)
- [ ] Clicking "Activate" opens a target selection modal:
  - Two tabs: "Screens" and "Groups"
  - Screens tab: searchable multi-select list of all screens in the org (name + location); shows current override status if a screen is already overridden by another stream
  - Groups tab: list of screen groups (from Feature 012); selecting a group shows a count of member screens
  - Confirm button label: "Activate on [N] screen(s)"
  - Confirm calls `POST /api/live-streams/:id/activate` with `targetScreenIds` or `targetGroupId`
- [ ] On activation success: closes the modal, stream row updates to `active` status, success toast shown
- [ ] If a target screen is already overridden by another active stream: show a warning in the modal ("Screen X is currently showing stream Y — activating will replace it") and allow the user to proceed
- [ ] "Deactivate" button: single click (no confirmation modal needed — deactivation is low-risk and reversible); calls `POST /api/live-streams/:id/deactivate`; stream row updates to `idle` on success
- [ ] Both buttons show a loading spinner during the API call and are disabled to prevent double-submission
- [ ] Real-time status updates: stream status changes received via Socket.IO `live-stream-health` events update the button states without page refresh
- [ ] Unit tests: modal rendering, target selection logic, activate/deactivate API calls, loading states
- [ ] ⚠️ BLOCKED: Verify in browser: activate modal works, stream switches to active, deactivate returns to idle, health indicator updates — requires running dev server with backend
- [ ] Typecheck and lint pass

---

## Task Dependency Graph

```
TASK-014-001 ──→ TASK-014-002 ──→ TASK-014-004 ──→ TASK-014-005 ──→ TASK-014-006 ──→ TASK-014-008 ──→ TASK-014-009 ──→ TASK-014-010
     │                                                     │                                ↑
     └──→ TASK-014-003 ──────────────────────────────────┘               TASK-014-007 ──→┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-014-001 | ~20k | none | — | — |
| TASK-014-002 | ~30k | 001 | yes (with 003) | — |
| TASK-014-003 | ~50k | 001 | yes (with 002) | opus |
| TASK-014-004 | ~45k | 002, 003 | no | — |
| TASK-014-005 | ~35k | 004 | no | — |
| TASK-014-006 | ~30k | 005 | no | — |
| TASK-014-007 | ~15k | 005 | yes (with 006) | — |
| TASK-014-008 | ~50k | 006, 007 | no | — |
| TASK-014-009 | ~35k | 002, 008 | no | — |
| TASK-014-010 | ~55k | 009 | no | opus |

**Total estimated tokens:** ~365k

## Functional Requirements

- FR-1: An Org Admin or Editor can create, edit, and delete stream source configurations (name, URL, protocol: RTMP or RTP)
- FR-2: Activating a stream on a screen or group immediately overrides the screen's current content
- FR-3: The server transcodes the incoming stream to HLS segments served over HTTP; screens consume the HLS URL
- FR-4: Activating a stream on a group targets all member screens of that group at the time of activation
- FR-5: When a stream is manually deactivated, all targeted screens receive an SSE `live-stream-stop` event and resume their scheduled playlist
- FR-6: When the stream source disconnects (unplanned FFmpeg exit), the server detects it and sends the same fallback SSE event automatically
- FR-7: Stream health is monitored every 10 seconds; health state (healthy / degraded / stopped) is exposed on the API and pushed to the dashboard via Socket.IO
- FR-8: A screen can have at most one active live stream override at a time; activating a second stream replaces the first
- FR-9: All stream lifecycle events (created, updated, deleted, activated, deactivated, failed) are recorded in the audit log
- FR-10: The Live Streams page shows stream health in real time without page refresh

## Non-Goals

- No recording or DVR functionality — streams are live-only; segments are deleted on stop
- No support for source protocols beyond RTMP and RTP in this iteration (e.g. SRT, WebRTC, RTSP are future work)
- No multi-bitrate adaptive streaming (ABR) — single-quality HLS output only
- No stream scheduling (start a stream at a future time) — activation is always manual and immediate
- No per-screen stream priority rules — the last activation wins
- No public/unauthenticated stream access — HLS endpoints require a valid session or screen authentication token (reuse existing screen auth patterns)
- No stream analytics or viewer count
- No frontend preview of the stream in the admin UI

## Design Considerations

- The activate modal uses a two-tab layout (Screens / Groups) to keep the UI unambiguous — mixing screen IDs and group IDs in a single list would be confusing
- Stream health indicator uses coloured dots rather than text labels to minimise visual noise in the list view; a tooltip provides the text label on hover
- The "Deactivate" action does not require a confirmation modal because it is immediately reversible (re-activate with the same targets)
- The "Delete" action requires a confirmation modal because it removes configuration that cannot be automatically recovered
- Stream source URL is shown truncated in the list but fully visible in the edit form — avoid exposing credentials embedded in URLs in list views; if credentials are present in source URLs, consider obfuscating them in list display in a future iteration
- Status badges use the same colour convention as screen status: green = active/healthy, amber = degraded, red = error/stopped, grey = idle

## Technical Considerations

- FFmpeg must be installed on the server host; the `FfmpegLiveService` should check for the binary on startup and emit a warning log if not found, rather than failing silently at activation time
- HLS output directory should be configurable via an environment variable (e.g. `HLS_OUTPUT_DIR`, default `/tmp/signage-hls`) to allow easy volume mounting in Docker deployments
- FFmpeg child processes are managed in memory — they do not survive server restarts. On server startup, any streams with `status === 'active'` in the database should be reset to `status === 'error'` and the fallback SSE sent, since the processes are no longer running. Add this as a startup hook in `LiveStreamModule.onModuleInit()`
- HLS segment cleanup: FFmpeg's `delete_segments` flag handles rolling deletion of old segments. On stream stop, the entire output directory for that stream should be deleted to avoid disk accumulation
- SSE events to screens reuse the existing `ScreenProtocolService` — verify that `live-stream-start` and `live-stream-stop` event types are defined in the shared event type enum, or add them
- The `activeTargetScreenIds` should be stored in a `live_stream_activations` join table (streamId, screenId, activatedAt) rather than a JSON column — this enables efficient querying ("which streams is screen X currently overriding?") needed for the duplicate override check in activation
- Socket.IO broadcast for health events reuses the existing `DashboardGateway` org room pattern from Feature 010 — add a new event type `live-stream-health` to the existing event payload union
- For RTP sources, the source URL may be an SDP file path or an `rtp://` URI. Document both formats in the create form's help text
- FFmpeg `ultrafast` preset and `zerolatency` tune are appropriate for live streaming where latency is more important than compression ratio; this is a reasonable default and need not be configurable in this iteration

## Success Metrics

- An Org Admin can configure an RTMP or RTP source, activate it on a screen group, and the targeted screens switch to live stream playback within 5 seconds of activation
- When the stream source disconnects, targeted screens resume their scheduled playlist within 15 seconds (two health check cycles)
- The Live Streams page health indicator reflects the current stream health within 10 seconds of a state change (one health check cycle)
- No HLS segment files remain on disk after a stream is stopped or falls back

## Open Questions

- **HLS segment access authentication:** Should the HLS endpoint (`/api/live-streams/:id/hls/`) require the screen's authentication token, or is it acceptable to serve HLS segments unauthenticated (relying on the obscurity of the segment path)? The SSE override event sends the HLS URL directly to the screen, so unauthenticated serving is low-risk in practice but may be a compliance concern. — *Leaning toward requiring the screen token in the request; to be confirmed with product.*
- **Concurrent stream limit:** Should there be a configurable cap on the number of simultaneously active streams per organisation to protect server CPU resources? FFmpeg transcoding is CPU-intensive; without a cap, a large org could spawn many processes simultaneously. — *Recommend a configurable `MAX_CONCURRENT_STREAMS` environment variable (default: 5); to be confirmed with ops.*
- **RTP SDP handling:** For RTP sources, FFmpeg requires an SDP file or a direct `rtp://` URI. If the user provides an SDP file path (server-local), the backend must validate the path exists. If the user provides a URI, it is used directly. The form currently accepts a single `sourceUrl` string — should there be a separate "SDP upload" flow for RTP, or is a URI-only approach sufficient? — *Deferring to product decision; URI-only is simpler and sufficient for most use cases.*
