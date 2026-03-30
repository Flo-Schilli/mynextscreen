# Feature 017: Virtual Screen Web Player

## Introduction

Build a standalone Angular application that acts as a virtual screen player, allowing developers and admins to test the signage system without physical hardware. The player connects to the signage server using a screen's API key, pulls state, subscribes to SSE events, sends heartbeats, and plays content (images, videos, HLS live streams) exactly as a physical screen would. It supports both single-screen playback and screen group modes (mirror and split with viewport slicing).

### Architecture Context

- **Vision alignment:** Directly supports the screen communication protocol defined in VISION.md — enables testing and development without physical screens
- **Components involved:**
  - Consumes existing backend endpoints: `GET /api/screens/:id/state`, `SSE /api/screens/:id/events`, `POST /api/screens/:id/heartbeat`
  - Consumes media endpoints: `/api/media/...`, `/api/live-streams/:id/hls/...`, `/api/media/slices/...`
- **New components:** Standalone Angular app at `player/` — completely separate from the main frontend
- **No backend changes required** — all screen protocol endpoints are already implemented

## Goals

- Provide a browser-based screen simulator that behaves identically to a physical screen
- Support full playlist playback with correct item durations and looping
- Support live stream override via HLS with automatic fallback to scheduled playlist
- Support screen group modes: mirror (identical content) and split (viewport-sliced content)
- Send heartbeats at regular intervals so the server tracks the virtual screen as online
- Persist connection settings (server URL, API key) in localStorage for quick reconnect
- Allow multiple browser windows to simulate multiple screens simultaneously

## Tasks

### TASK-017-001: Scaffold Standalone Angular Player App
**Description:** As a developer, I want a standalone Angular application in the `player/` directory so that the virtual screen player is completely separate from the admin frontend.

**Token Estimate:** ~25k tokens
**Predecessors:** none
**Successors:** TASK-017-002, TASK-017-003
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] New Angular 21 app scaffolded at `player/` with standalone components
- [x] Tailwind CSS v4 configured (dark theme — screen players have black backgrounds)
- [x] `player/Dockerfile` created (Node 22 Alpine, `ng serve` dev mode)
- [x] `docker-compose.yml` updated with `player` service on port 4300
- [x] Proxy config for `/api` pointing to backend (same pattern as main frontend)
- [x] App builds and serves without errors
- [x] Typecheck/lint passes

### TASK-017-002: Connection Dialog & Settings Service
**Description:** As a user, I want a modal dialog on startup where I enter the server URL and screen API key so that I can connect to any signage server instance.

**Token Estimate:** ~35k tokens
**Predecessors:** TASK-017-001
**Successors:** TASK-017-004
**Parallel:** yes — can run alongside TASK-017-003

**Acceptance Criteria:**
- [x] Modal dialog appears on app load if no saved connection exists
- [x] Fields: Server URL (text input, e.g. `http://localhost:3000`), Screen API Key (text input, masked)
- [x] "Connect" button validates inputs are non-empty
- [x] On connect: calls `GET /api/screens/:id/state` with the API key to verify connection
  - API key is sent as `Authorization: Bearer <key>` header
  - Screen ID is extracted from the state response
- [x] On success: saves server URL and API key to localStorage, closes dialog, starts player
- [x] On failure: shows error message ("Invalid API key" or "Server unreachable")
- [x] "Disconnect" button in a small top-right overlay to return to the dialog
- [x] Settings persist across page reloads — auto-reconnects on load if settings exist
- [x] A `ConnectionService` manages the server URL, API key, and connection state
- [x] ⚠️ BLOCKED: Verify in browser — requires running backend with a configured screen and API key; structural verification done via build + lint

### TASK-017-003: Player Core Service — State, SSE, Heartbeat
**Description:** As a virtual screen, I want to pull my full state from the server, subscribe to SSE events for real-time updates, and send heartbeats so that the server tracks me as online.

**Token Estimate:** ~50k tokens
**Predecessors:** TASK-017-001
**Successors:** TASK-017-004
**Parallel:** yes — can run alongside TASK-017-002

**Acceptance Criteria:**
- [x] `PlayerService` pulls full state from `GET /api/screens/:id/state` on connect
  - Parses `ScreenState` response: screen info, currentPlaylist, scheduleEntries, activeLiveStream, fallbackPlaylist
- [x] SSE connection to `/api/screens/:id/events` with API key auth
  - Handles event types: `schedule_update`, `playlist_update`, `content_update`, `live_stream_start`, `live_stream_stop`, `group_play`, `pending`
  - On `schedule_update` / `playlist_update` / `content_update`: re-fetches full state
  - On `live_stream_start`: switches to live stream mode with HLS URL
  - On `live_stream_stop`: returns to scheduled playlist
  - On `group_play`: plays the specified content (uses sliced URL if split mode)
- [x] Heartbeat sent via `POST /api/screens/:id/heartbeat` every 30 seconds
- [x] Auto-reconnect SSE on connection drop (exponential backoff, max 30s)
- [x] Clean disconnect on window close / user disconnect
- [x] State exposed as signals/observables for the playback component to consume
- [x] Unit tests for state parsing and event handling logic
- [x] Typecheck/lint passes

### TASK-017-004: Playlist Playback Engine
**Description:** As a virtual screen, I want to display playlist content (images and videos) in sequence with correct durations and automatic looping so that playback matches a real screen.

**Token Estimate:** ~60k tokens
**Predecessors:** TASK-017-002, TASK-017-003
**Successors:** TASK-017-005
**Parallel:** no

**Acceptance Criteria:**
- [x] Full-screen black background — content centered and scaled to fit (contain, not stretch)
- [x] Image playback: displays image for the configured duration (seconds), then advances
- [x] Video playback: plays video to completion (ignoring duration field), then advances
  - Video element is muted by default with a click-to-unmute overlay
- [x] Playlist loops continuously — when last item finishes, restarts from first
- [x] Empty playlist or no playlist: shows a "No content scheduled" message on black background
- [x] Smooth transitions between items (brief fade or instant cut — no jarring flashes)
- [x] Content URLs include `?token=<apiKey>` for authentication (same pattern as admin frontend)
- [x] Preloads next item while current is playing to eliminate loading gaps
- [x] Status overlay (top-left, semi-transparent, auto-hides after 5s, toggle with 'i' key):
  - Screen name and ID
  - Current playlist name
  - Current item index / total (e.g. "3 / 7")
  - Connection status (connected / reconnecting)
  - Group mode if applicable (mirror / split with grid position)
- [x] ⚠️ BLOCKED: Verify in browser — test with images, videos, and empty playlist — requires running backend with a configured screen and API key; structural verification done via build + lint

### TASK-017-005: Live Stream HLS Playback
**Description:** As a virtual screen, I want to play HLS live streams when activated so that live stream override and fallback work correctly.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-017-004
**Successors:** TASK-017-006
**Parallel:** no

**Acceptance Criteria:**
- [ ] When `live_stream_start` SSE event received: switches to HLS playback immediately
- [ ] HLS playback via hls.js library (since native HLS support is Safari-only)
- [ ] HLS URL constructed from stream data: `{serverUrl}/api/live-streams/{streamId}/hls/index.m3u8`
- [ ] Low-latency configuration: `liveSyncDuration: 3`, `liveMaxLatencyDuration: 10`
- [ ] When `live_stream_stop` event received or HLS stream ends: returns to scheduled playlist playback seamlessly
- [ ] Error handling: if HLS fails to load, shows "Live stream unavailable" message and continues with playlist
- [ ] Stream health indicator in status overlay (healthy / degraded / stopped)
- [ ] Verify in browser — test live stream override and automatic fallback
- [ ] Typecheck/lint passes

### TASK-017-006: Screen Group Support — Mirror & Split Mode
**Description:** As a virtual screen in a group, I want to correctly handle mirror mode (same content as all peers) and split mode (only my viewport slice) so that screen groups work in the virtual player.

**Token Estimate:** ~45k tokens
**Predecessors:** TASK-017-005
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [ ] Player detects group membership and mode from the state response (screen entity includes `groupId`, group info in state)
- [ ] **Mirror mode:** no special handling needed — same content URLs as single screen
- [ ] **Split mode:**
  - On `group_play` event: uses the sliced content URL specific to this screen's grid position
  - Sliced content URL format: `{serverUrl}/api/media/slices/{groupId}/{screenId}/{contentItemId}`
  - If `pending` event received (slice not yet ready): shows "Preparing content..." message, re-checks on next event
- [ ] Status overlay shows group info: group name, mode (mirror/split), and grid position for split mode (e.g. "Row 1, Col 2")
- [ ] Multiple browser windows can each connect with different screen API keys from the same group to visually verify split layout
- [ ] Verify in browser — test mirror mode and split mode with multiple windows
- [ ] Typecheck/lint passes

## Task Dependency Graph

```
TASK-017-001 ──→ TASK-017-002 ──→ TASK-017-004 ──→ TASK-017-005 ──→ TASK-017-006
             └──→ TASK-017-003 ──┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-017-001 | ~25k | none | — | — |
| TASK-017-002 | ~35k | 001 | yes (with 003) | — |
| TASK-017-003 | ~50k | 001 | yes (with 002) | — |
| TASK-017-004 | ~60k | 002, 003 | no | opus |
| TASK-017-005 | ~40k | 004 | no | — |
| TASK-017-006 | ~45k | 005 | no | — |

**Total estimated tokens:** ~255k

## Functional Requirements

- FR-1: On first load, the player must show a connection dialog requesting server URL and screen API key
- FR-2: The player must validate the connection by calling the screen state endpoint before starting playback
- FR-3: Connection settings must persist in localStorage and auto-reconnect on page reload
- FR-4: The player must pull the full screen state on connect and begin playlist playback immediately
- FR-5: The player must subscribe to SSE events and react to schedule changes, playlist updates, live stream start/stop, and group play commands in real time
- FR-6: The player must send heartbeats every 30 seconds so the server marks the virtual screen as online
- FR-7: Images must display for their configured duration; videos must play to completion
- FR-8: Playlists must loop continuously; empty playlists show a "No content scheduled" message
- FR-9: Live stream activation must override playlist playback immediately; deactivation must resume the playlist
- FR-10: HLS live streams must play via hls.js with low-latency settings
- FR-11: In split mode, the player must use sliced content URLs specific to its grid position
- FR-12: In mirror mode, the player must display the same content as all other screens in the group
- FR-13: A toggleable status overlay must show screen info, current playlist, item progress, connection status, and group info
- FR-14: Multiple browser windows must be able to run as different screens simultaneously

## Non-Goals

- No content caching or offline playback (browser-only, always online)
- No admin controls (no editing playlists, schedules, or settings from the player)
- No frame-level sync between multiple browser windows (loose sync via SSE is sufficient)
- No custom transition effects between content items
- No touch/remote control interface
- No production deployment optimisation (this is a development/testing tool)

## Design Considerations

- **Full-screen, black background** — mimics a real screen display
- **Minimal chrome** — connection dialog is the only UI; everything else is content
- **Status overlay** — semi-transparent, auto-hides, togglable with keyboard shortcut
- **Multiple instances** — designed to open several browser windows side by side for group testing
- **Responsive** — scales to any window size, content uses `object-fit: contain`

## Technical Considerations

- **Standalone app** — completely separate from the admin frontend; own `package.json`, `angular.json`, `Dockerfile`
- **API key auth** — screens use `Authorization: Bearer <apiKey>` header, not Hanko JWT
- **SSE reconnection** — browser EventSource API doesn't support custom headers; use `fetch` + ReadableStream or pass token as query param
- **HLS playback** — requires hls.js since most browsers don't support HLS natively (Safari does)
- **Content URLs** — must include `?token=<apiKey>&organisationId=<orgId>` for media endpoints that require auth, or API key for screen-authed endpoints
- **No ARCHITECTURE.md update needed** — the player is a consumer of existing APIs, not a new backend component

## Success Metrics

- A developer can open the player, enter a screen's API key, and see the currently scheduled playlist playing
- Schedule changes in the admin UI are reflected in the player within seconds (SSE latency)
- Live stream activation/deactivation works with smooth transitions
- Multiple player windows showing different screens from the same split-mode group display their correct viewport slices
- The server's screen list shows virtual screens as "online" with regular heartbeats

## Open Questions

*None — all questions resolved during clarification.*
