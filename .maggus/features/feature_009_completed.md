# Feature 009: Schedules

## Introduction

Implement calendar-based scheduling where playlists are assigned to screens for specific time slots. Supports day/week/month views, recurring schedules via RRULE, drag-and-drop interaction, and fallback to the organisation's default playlist when no schedule is active.

### Architecture Context

- **Vision alignment:** "Calendar-style interface", "playlists are added by clicking a time slot", "recurring schedules", "no overlapping time slots", "default/fallback playlist shown when no playlist is scheduled"
- **Components involved:** ScheduleModule (new), PlaylistModule (reference), ScreenModule (reference), ScreenProtocolModule (emit events)
- **New patterns:** RRULE recurrence, calendar UI, overlap detection, fallback resolution

## Goals

- Editors can schedule playlists on screens for specific time ranges
- Calendar UI with day/week/month views and drag-and-drop interaction
- Recurring schedule support via RRULE (daily, weekly, specific weekdays)
- No overlapping time slots enforced by the backend
- Fallback playlist resolution when no schedule is active
- Schedule changes trigger SSE events to affected screens

## Tasks

### TASK-009-001: Schedule Entity & RRULE Support
**Description:** As the system, I want a Schedule entity with RRULE recurrence support so that playlist assignments can be persisted with recurrence rules.

**Token Estimate:** ~30k tokens
**Predecessors:** none
**Successors:** TASK-009-002
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] `ScheduleEntry` entity: `id` (UUID, PK), `organisationId` (FK), `screenId` (FK → Screen), `playlistId` (FK → Playlist), `startTime` (datetime), `endTime` (datetime), `rrule` (string, nullable — RRULE string for recurrence), `colour` (string — hex colour for calendar display), `createdAt`, `updatedAt`
- [x] All times stored in UTC; frontend converts using the organisation's time zone
- [x] TypeORM migration creates the table with indexes on `screenId` and `(startTime, endTime)`
- [x] RRULE parsing utility using `rrule` npm package to expand recurrence into concrete date ranges
- [x] Unit tests for RRULE expansion (daily, weekly, specific weekdays)
- [x] Typecheck and lint pass

### TASK-009-002: Schedule Service & REST API
**Description:** As an Editor, I want API endpoints to create, update, move, resize, and delete schedule entries so that I can manage when playlists play on screens.

**Token Estimate:** ~60k tokens
**Predecessors:** TASK-009-001
**Successors:** TASK-009-003, TASK-009-004
**Parallel:** no
**Model:** opus

**Acceptance Criteria:**
- [x] `ScheduleService` with methods: `create`, `update` (move/resize), `delete`, `findByScreen(screenId, dateRange)`, `findByOrganisation(orgId, dateRange)`, `getCurrentPlaylist(screenId)`, `checkOverlap`
- [x] `ScheduleController` with routes:
  - `POST /api/schedules` — create entry (Editor+): screenId, playlistId, startTime, endTime, rrule (optional), colour
  - `GET /api/schedules?screenId=X&from=Y&to=Z` — list entries for a screen in a date range (all roles)
  - `GET /api/schedules?organisationId=X&from=Y&to=Z` — list entries for all screens in org in a date range (all roles)
  - `PATCH /api/schedules/:id` — update start/end time (move/resize) or playlist (Editor+)
  - `DELETE /api/schedules/:id` — delete entry (Editor+)
  - `GET /api/schedules/current?screenId=X` — get the currently active playlist for a screen (used by screen protocol)
- [x] **Overlap detection:** before creating or updating, expand RRULE occurrences for the relevant date range and check for conflicts with existing entries on the same screen; return 409 if overlap found
- [x] **Fallback resolution:** `getCurrentPlaylist` returns the org's default playlist if no entry is active
- [x] Emit schedule change event (for SSE push to affected screens)
- [x] Unit tests for: create, overlap detection (single + recurring), move, resize, fallback resolution, current playlist query
- [x] Typecheck and lint pass

### TASK-009-003: Schedule Calendar UI
**Description:** As an Editor, I want a calendar interface to visually manage when playlists play on screens.

**Token Estimate:** ~90k tokens
**Predecessors:** TASK-009-002
**Successors:** none
**Parallel:** yes — can run alongside TASK-009-004
**Model:** opus

**Acceptance Criteria:**
- [x] `/schedules` route with a calendar view
- [x] Screen selector: dropdown or tab bar to switch between screens
- [x] Three views: day, week, month — switchable via buttons
- [x] **Creating entries:** click a time slot → modal with playlist dropdown, start/end time, colour picker, recurrence options (none, daily, weekly, specific weekdays via checkboxes)
- [x] **Colour-coded blocks** per playlist on the calendar
- [x] **Drag-and-drop** to move a block to a different time slot (calls PATCH endpoint)
- [x] **Resize** by dragging block edges to adjust start/end time (calls PATCH endpoint)
- [x] **Visual gap indicators:** time slots with no scheduled playlist shown in a subtle warning colour, with a label "Fallback playlist"
- [x] **Side panel:** summary of the selected day's schedule as a timeline list (playlist name, time range, colour)
- [x] **Recurring entries** shown with a repeat icon and rendered on all applicable dates
- [x] **Overlap rejection:** if the backend returns 409, show an error toast
- [x] All times displayed in the organisation's time zone
- [x] Dark-themed, consistent styling
- [x] ⚠️ BLOCKED: Verify in browser: can create a schedule entry, see it on the calendar, drag to move, resize, delete, see gap indicators, create recurring entry — Cannot run browser verification in automated CI; requires manual testing with running backend

### TASK-009-004: Schedule Integration with Screen Protocol
**Description:** As the system, I want schedule changes to trigger SSE events to affected screens so that screens always show the correct playlist.

**Token Estimate:** ~25k tokens
**Predecessors:** TASK-009-002
**Successors:** none
**Parallel:** yes — can run alongside TASK-009-003

**Acceptance Criteria:**
- [x] Listen for schedule change events (from ScheduleService)
- [x] Determine which screens are affected by the change
- [x] For each affected screen with an active SSE connection: compute the new current state and send a `schedule_update` event via the SSE channel
- [x] Include the new current playlist (or fallback) in the event payload
- [x] Unit tests for event routing to correct screens
- [x] Typecheck and lint pass

## Task Dependency Graph

```
TASK-009-001 ──→ TASK-009-002 ──→ TASK-009-003
                      │
                      └──→ TASK-009-004
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-009-001 | ~30k | none | — | — |
| TASK-009-002 | ~60k | 001 | no | opus |
| TASK-009-003 | ~90k | 002 | yes (with 004) | opus |
| TASK-009-004 | ~25k | 002 | yes (with 003) | — |

**Total estimated tokens:** ~205k

## Functional Requirements

- FR-1: Editors and Org Admins can create, move, resize, and delete schedule entries
- FR-2: Each schedule entry assigns a playlist to a screen for a specific time range
- FR-3: Recurring schedules are supported via RRULE (daily, weekly, specific weekdays)
- FR-4: No overlapping time slots on the same screen — backend enforces this
- FR-5: When no playlist is scheduled, the organisation's default/fallback playlist is used
- FR-6: Schedule changes trigger real-time SSE events to affected screens
- FR-7: The calendar displays entries colour-coded by playlist with gap indicators
- FR-8: All times are stored in UTC and displayed in the organisation's time zone

## Non-Goals

- No multi-screen calendar view (one screen at a time for now)
- No bulk schedule operations (e.g. copy a day's schedule to another screen)
- No schedule templates
- No screen group scheduling (comes with screen groups feature)

## Technical Considerations

- Use the `rrule` npm package for RRULE parsing and occurrence expansion
- Overlap detection with RRULE is computationally complex — expand occurrences only for a bounded date range (e.g. the next 365 days) when checking overlaps
- For the calendar UI, consider using a library like FullCalendar (has Angular bindings) or building a simpler custom component. FullCalendar supports drag-and-drop, resize, and multiple views out of the box.
- Organisation time zone conversion: store in UTC, convert in the frontend using `Intl.DateTimeFormat` or a library like `date-fns-tz`
- The `getCurrentPlaylist` method is called frequently by the screen protocol — consider caching or optimising the query

## Success Metrics

- An Editor can schedule playlists on a calendar and see them visually
- Recurring schedules expand correctly across days/weeks
- Overlapping entries are rejected with a clear error
- Screens receive updated playlists in real time when the schedule changes

## Open Questions

None — all resolved.
