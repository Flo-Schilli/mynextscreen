# Feature 023: Fix Player Not Receiving Playlist Change Updates

## Introduction

The player does not receive SSE updates when a playlist transition occurs due to a schedule boundary being crossed (e.g., switching from the default/fallback playlist to a scheduled playlist when its start time arrives). Additionally, when playlist contents are modified (items added/removed/reordered) while the playlist is active on a screen, the screen is never notified.

Live streams work because activation is an explicit, immediate user action that emits events directly to target screens. Playlist transitions, by contrast, are **time-based** — they depend on schedule boundaries — and the system currently has no mechanism to detect when a boundary is crossed and push an update.

### Architecture Context

- **Vision alignment:** Screens must reflect schedule and playlist state in real time without manual refresh (Design Principles: "Real-time updates — dashboard and screen status update live via push")
- **Components involved:**
  - `ScreenModule` — `ScreenStateService` manages SSE connections and pushes events to players
  - `ScheduleEntryModule` — `ScheduleService` resolves current playlists via `getCurrentPlaylist()`
  - `PlaylistModule` — `PlaylistService` emits `PLAYLIST_UPDATED` (dashboard-only, never reaches screens)
- **Root causes:**
  1. **No schedule boundary scheduler** — when a schedule entry's start/end time arrives, no event is emitted. The only events fire when an admin creates/modifies/deletes a schedule entry.
  2. **`PLAYLIST_CHANGED` is never emitted** — the event constant and handler exist in `screen-state.event.ts` / `ScreenStateService`, but nothing bridges `PLAYLIST_UPDATED` (from `PlaylistService`) to screen-targeted `PLAYLIST_CHANGED` events.

## Goals

- Player receives SSE updates when a schedule boundary is crossed (default → scheduled playlist, or scheduled → default/fallback)
- Player receives SSE updates when the contents of its active playlist change (items added/removed/reordered)
- Transitions occur within ~30 seconds of the schedule boundary
- No new dependencies introduced; uses existing `@nestjs/schedule`, `EventEmitter2`, and `ScheduleService`

## Tasks

### TASK-023-001: Create ScheduleBoundaryService for time-based playlist transitions
**Description:** As a screen player, I want to receive an SSE event when a schedule boundary is crossed so that I automatically switch from the default playlist to a scheduled one (and back) without manual intervention.

**Token Estimate:** ~75k tokens
**Predecessors:** none
**Successors:** TASK-023-003
**Parallel:** yes — can run alongside TASK-023-002
**Model:** opus — requires careful timer lifecycle management and interaction with multiple services

**Implementation Notes:**

Create `backend/src/screen/schedule-boundary.service.ts`:

- **Track connected screens:** Listen to SSE connect/disconnect. When `ScreenStateService` registers a new connection, the boundary service should be notified (either via event or direct call). Maintain a `Map<screenId, { timer, currentPlaylistId }>`.
- **Compute next boundary:** For a given screen, query all schedule entries (direct + group), expand RRULE occurrences in a ±24h window using existing `getOccurrences()` from `rrule.util.ts`, find the nearest future boundary (any entry's start or end time), and set a `setTimeout` for that moment.
- **On timer fire:** Call `scheduleService.getCurrentPlaylist(screenId)`, compare the resolved playlist ID with the stored `currentPlaylistId`. If different, emit `SCHEDULE_CHANGED` (a `ScreenStateChangeEvent` with `screenId` and `organisationId`) so that `ScreenStateService.handleScheduleChanged()` pushes a `ScheduleUpdate` to the player. Update stored state and recompute the next boundary.
- **Recalculate on schedule changes:** Listen to `SCHEDULE_ENTRY_CHANGED` and `GROUP_SCHEDULE_CHANGED` events. When a schedule entry is created/modified/deleted for a tracked screen, clear the existing timer and recompute.
- **Cleanup:** Clear timers when a screen disconnects or on module destroy.
- **Edge case:** If no future boundary exists within the look-ahead window, set a fallback re-evaluation timer (e.g., 60 seconds) to handle entries created while the screen is connected.

Register `ScheduleBoundaryService` as a provider in `ScreenModule`.

**Acceptance Criteria:**
- [x] `ScheduleBoundaryService` is created and registered in `ScreenModule`
- [x] Timers are set based on the next schedule boundary for each connected screen
- [x] When a timer fires and the active playlist has changed, a `SCHEDULE_CHANGED` event is emitted
- [x] Timers are recalculated when `SCHEDULE_ENTRY_CHANGED` or `GROUP_SCHEDULE_CHANGED` fires
- [x] Timers are cleaned up on screen disconnect and module destroy
- [x] Typecheck/lint passes
- [x] Unit tests are written and successful

### TASK-023-002: Bridge playlist content changes to screen notifications
**Description:** As a screen player, I want to receive an SSE event when the contents of my active playlist change (items added, removed, or reordered) so that I display the updated playlist without a manual refresh.

**Token Estimate:** ~40k tokens
**Predecessors:** none
**Successors:** TASK-023-003
**Parallel:** yes — can run alongside TASK-023-001

**Implementation Notes:**

The `PlaylistService` already emits `PLAYLIST_UPDATED` with `playlistId` and `organisationId` on every mutation. The `ScreenStateService` already has a handler for `PLAYLIST_CHANGED` that pushes a `PlaylistUpdate` event to a screen. The missing piece is a bridge that:

1. Listens to `PLAYLIST_UPDATED` events
2. Finds all screens currently using that playlist (query schedule entries where `playlistId` matches and the entry is currently active, plus screens whose organisation default playlist matches)
3. Emits `PLAYLIST_CHANGED` (`ScreenStateChangeEvent`) for each affected screen

This bridge can live in `ScreenStateService` as a new `@OnEvent(PLAYLIST_UPDATED)` handler, or in a small dedicated service. It needs access to:
- `ScheduleEntry` repository (to find entries using the playlist)
- `Organisation` repository (to check default playlist)
- `Screen` repository (to resolve screen → organisation for default playlist checks)
- The existing `getOccurrences()` util to check if entries are currently active

Import `PLAYLIST_UPDATED` and `PlaylistUpdatedEvent` from the playlist module into the screen module.

**Acceptance Criteria:**
- [x] When a playlist's items are modified, all screens currently showing that playlist receive a `playlist_update` SSE event
- [x] Screens using the playlist via a schedule entry are detected
- [x] Screens using the playlist as the organisation's default/fallback are detected
- [x] Only screens with active SSE connections receive events (no unnecessary DB queries for disconnected screens)
- [x] Typecheck/lint passes
- [x] Unit tests are written and successful

### TASK-023-003: Integration smoke test — end-to-end playlist transition
**Description:** As a developer, I want an integration-level test that verifies the full event chain from schedule boundary crossing to SSE event delivery, so that regressions are caught.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-023-001, TASK-023-002
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] Test: screen connected via SSE, schedule entry starts → player receives `schedule_update` event within timer precision
- [x] Test: screen connected via SSE, schedule entry ends → player receives `schedule_update` event (transition back to default)
- [x] Test: screen connected via SSE, active playlist's items are modified → player receives `playlist_update` event
- [x] Test: screen disconnects → no timers leak, no errors on next schedule boundary
- [x] Typecheck/lint passes
- [x] All tests pass

## Task Dependency Graph

```
TASK-023-001 ──→ TASK-023-003
TASK-023-002 ──┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-023-001 | ~75k | none | yes (with 002) | opus |
| TASK-023-002 | ~40k | none | yes (with 001) | — |
| TASK-023-003 | ~30k | 001, 002 | no | — |

**Total estimated tokens:** ~145k

## Functional Requirements

- FR-1: When a schedule entry's start time arrives, the server must push a `schedule_update` SSE event to the affected screen within ~30 seconds
- FR-2: When a schedule entry's end time arrives (and no other entry is active), the server must push a `schedule_update` SSE event so the screen falls back to the default playlist
- FR-3: When a playlist's items are modified (add, remove, reorder, update), all screens currently displaying that playlist must receive a `playlist_update` SSE event
- FR-4: Recurring schedule entries (RRULE) must be correctly evaluated — each occurrence's start/end triggers a boundary event
- FR-5: Timers must be recalculated when schedule entries are created, updated, or deleted
- FR-6: No timer leaks — all timers are cleaned up when screens disconnect or the module is destroyed

## Non-Goals

- Sub-second precision for schedule transitions (within ~30s is acceptable)
- Player-side polling as a fallback (the fix is server-side only)
- Changes to the SSE protocol or event format (existing `schedule_update` and `playlist_update` types are sufficient)
- Handling schedule transitions for screens without active SSE connections (they will fetch state on reconnect)

## Technical Considerations

- **Timer precision:** `setTimeout` is sufficient for ~30s tolerance. For entries far in the future, cap the timer at a reasonable look-ahead (e.g., 24h) and re-evaluate periodically.
- **RRULE expansion:** Reuse existing `getOccurrences()` from `rrule.util.ts`. Only expand within a bounded window to avoid performance issues with infinite recurrences.
- **Screen ↔ ScreenStateService coupling:** `ScheduleBoundaryService` needs to know which screens are connected. Options: (a) inject `ScreenStateService` and expose a `isConnected(screenId)` method, (b) emit connect/disconnect events, or (c) have `ScreenStateService` call into `ScheduleBoundaryService` directly. Option (c) is simplest.
- **Playlist bridge query cost:** The `PLAYLIST_UPDATED` handler must find affected screens. To avoid expensive queries on every playlist edit, first check if any connected screen might be affected (short-circuit if no connections exist for the org).
- **No ARCHITECTURE.md update needed** — this is a bug fix within existing module boundaries, not a new component.

## Success Metrics

- Player automatically switches from default to scheduled playlist when the schedule entry's start time arrives
- Player automatically switches back to default when the schedule entry's end time passes
- Player updates its playlist when items are added/removed/reordered in the active playlist
- No timer leaks observed after screens disconnect
- All existing tests continue to pass

## Open Questions

None — all questions resolved.
