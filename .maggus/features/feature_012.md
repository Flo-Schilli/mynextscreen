# Feature 012: Screen Groups & Video Wall

## Introduction

Feature 012 introduces Screen Groups, enabling administrators to group physical screens for coordinated content delivery. Two operational modes are supported: **Mirror mode**, where all screens in a group display identical content with frame-level synchronisation via simultaneous SSE delivery, and **Split mode** (video wall), where server-side FFmpeg pre-slices content at schedule time so each screen renders only its assigned viewport portion of a larger composition.

This feature completes the core playback model described in VISION.md and unlocks large-format video wall deployments without requiring specialised hardware beyond the existing screen clients.

### Architecture Context

- **ScreenGroupModule** is added as a new NestJS module alongside the existing screen and schedule modules.
- Sync is achieved via the existing SSE protocol abstraction (Feature 007). All screens in a group receive the same play command simultaneously; wall-sync tolerates the small delivery jitter inherent in SSE.
- Split mode slicing is performed by a new **BullMQ job** (`slice-content`) that invokes FFmpeg at schedule-assignment time. Pre-sliced renditions are stored in the media library under a group-scoped path. Each screen's SSE payload points to its own slice URL.
- The existing `ScheduleModule` gains a nullable `groupId` field alongside the existing nullable `screenId` field; exactly one must be set per schedule entry.
- Live streams bypass the slicing pipeline and always receive mirror-mode SSE regardless of the group's configured mode.
- Every entity is scoped by `organisationId` for multi-tenancy.

---

## Goals

- Allow administrators to create named screen groups and assign screens to them (a screen may belong to at most one group at a time).
- Support Mirror mode: all screens in a group receive identical content, delivered via simultaneous SSE events.
- Support Split mode (video wall): administrators define a grid layout (e.g. 2x2, 3x1), assign each screen a row/column cell, and the server pre-slices playlist content via FFmpeg so each screen receives only its viewport crop.
- Live streams on a group always use mirror behaviour regardless of the group's configured mode.
- Extend the Schedule module to support per-group scheduling in addition to per-screen scheduling.
- Provide a visual grid editor in the frontend for defining video wall layouts and assigning screens to grid positions.
- Provide a split-mode preview showing how content will be distributed across the wall.
- Emit audit log events for all group create/update/delete/membership operations.
- Maintain full multi-tenancy (all queries scoped by `organisationId`).

---

## Tasks

---

### TASK-012-001: ScreenGroup database entity & migration

**Description:** As a backend developer, I need a `ScreenGroup` database entity and the corresponding TypeORM migration so that group data can be persisted.

**Token Estimate:** ~20k tokens
**Predecessors:** none
**Successors:** TASK-012-002, TASK-012-003
**Parallel:** yes

**Acceptance Criteria:**
- [x] `ScreenGroup` entity exists with fields: `id` (UUID PK), `organisationId` (FK), `name` (string, non-null), `mode` (enum: `mirror` | `split`), `gridColumns` (int, nullable), `gridRows` (int, nullable), `createdAt`, `updatedAt`.
- [x] `Screen` entity gains nullable `groupId` (FK to ScreenGroup) and nullable `gridRow` / `gridColumn` (int) fields.
- [x] TypeORM migration file is generated and applies cleanly against a fresh SQLite database.
- [x] Rollback migration drops the new columns and table without errors.
- [x] All new columns have appropriate database-level constraints (e.g. `gridColumns` and `gridRows` must be > 0 when set).
- [x] Existing Screen entity tests continue to pass.

---

### TASK-012-002: ScreenGroupModule CRUD service & controller

**Description:** As an administrator, I want to create, read, update, and delete screen groups so that I can manage groups for my organisation.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-012-001
**Successors:** TASK-012-004, TASK-012-005, TASK-012-009
**Parallel:** yes — can run alongside TASK-012-003

**Acceptance Criteria:**
- [x] `ScreenGroupModule` registered in `AppModule`.
- [x] `ScreenGroupService` implements `create`, `findAll`, `findOne`, `update`, `remove`, all scoped by `organisationId`.
- [x] `ScreenGroupController` exposes: `POST /screen-groups`, `GET /screen-groups`, `GET /screen-groups/:id`, `PATCH /screen-groups/:id`, `DELETE /screen-groups/:id`.
- [x] Create and update DTOs validate: `name` (non-empty string), `mode` (enum), `gridColumns` / `gridRows` (positive integers, required when `mode=split`), grid dimensions not required when `mode=mirror`.
- [x] Attempting to set `mode=split` without `gridColumns` and `gridRows` returns HTTP 400.
- [x] Attempting to delete a group that still has member screens returns HTTP 409 with a descriptive message.
- [x] All endpoints require authentication (JWT guard).
- [x] Unit tests are written and successful.

---

### TASK-012-003: Screen membership service — assign/remove screen from group

**Description:** As an administrator, I want to add a screen to a group and remove it from a group so that I can build my wall configuration.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-012-001
**Successors:** TASK-012-004, TASK-012-005
**Parallel:** yes — can run alongside TASK-012-002

**Acceptance Criteria:**
- [x] `PUT /screen-groups/:groupId/screens/:screenId` assigns the screen to the group; sets `gridRow` and `gridColumn` if provided in body (required for `mode=split` groups).
- [x] `DELETE /screen-groups/:groupId/screens/:screenId` removes the screen from the group, nullifying its `groupId`, `gridRow`, and `gridColumn`.
- [x] Assigning a screen that already belongs to another group returns HTTP 409.
- [x] Assigning a screen to a split-mode group without specifying a grid position returns HTTP 400.
- [x] Assigning two screens to the same grid cell within a group returns HTTP 409.
- [x] Both endpoints are scoped by `organisationId` (screen and group must belong to the same organisation).
- [x] Both endpoints require authentication.
- [x] Unit tests are written and successful.

---

### TASK-012-004: Split mode content slicing pipeline (BullMQ + FFmpeg)

**Description:** As the system, I need a background job that pre-slices playlist content using FFmpeg for each screen's grid viewport when a split-mode group schedule is created or updated, so that each screen client can play its portion of the video wall without client-side processing.

**Token Estimate:** ~100k tokens
**Predecessors:** TASK-012-002, TASK-012-003
**Successors:** TASK-012-006, TASK-012-007
**Parallel:** no
**Model:** opus

**Acceptance Criteria:**
- [x] `SliceContentJob` is defined with payload: `{ groupId, scheduleId, playlistId, organisationId }`.
- [x] Job processor iterates over all content items in the playlist and, for each screen in the group, computes the FFmpeg `crop` filter parameters from the screen's `gridRow`, `gridColumn`, `gridRows`, `gridColumns`, and the source content's resolution.
- [x] FFmpeg command uses `crop=w:h:x:y` filter; output files are stored at `media/slices/{groupId}/{screenId}/{contentItemId}.mp4` (or appropriate extension).
- [x] Sliced rendition metadata is recorded in the database (new `SlicedRendition` entity: `id`, `groupId`, `screenId`, `contentItemId`, `filePath`, `organisationId`).
- [x] If a sliced rendition already exists and the source file has not changed, the job skips re-slicing (idempotent).
- [x] Job is enqueued by `ScheduleService` when a schedule is created or updated with a `groupId` and `mode=split`.
- [x] Images in a playlist are also sliced (using FFmpeg's image crop capability).
- [x] Job failures are logged; BullMQ retry policy set to 3 attempts with exponential backoff.
- [x] Unit tests cover crop coordinate computation logic in isolation.

---

### TASK-012-005: Screen protocol integration — group-aware SSE state & sync events

**Description:** As the system, I need the ScreenStateService and SSE event dispatcher to be aware of group membership and mode so that all screens in a group receive synchronised play commands simultaneously.

**Token Estimate:** ~60k tokens
**Predecessors:** TASK-012-002, TASK-012-003
**Successors:** TASK-012-007
**Parallel:** yes — can run alongside TASK-012-004

**Acceptance Criteria:**
- [x] `ScreenStateService` resolves a screen's active content via its group schedule when no direct screen schedule exists.
- [x] When a group play event is triggered, `ScreenProtocolService` fans out the SSE `play` command to all screens in the group within a single event loop tick (using `Promise.all`) to minimise jitter.
- [x] Mirror mode: all screens receive the same `contentUrl` in the SSE payload.
- [x] Split mode: each screen receives the URL of its pre-sliced rendition (looked up from `SlicedRendition` table); if a rendition is not yet available, the screen receives a `pending` state event.
- [x] Live stream items always use mirror-mode fan-out regardless of group mode.
- [x] SSE event payload includes `groupId` and `syncToken` (shared UTC timestamp, millisecond precision) so clients can detect synchronised playback.
- [x] Existing single-screen SSE behaviour is unaffected.
- [x] Unit tests are written and successful.

---

### TASK-012-006: Schedule module — group-based scheduling support

**Description:** As an administrator, I want to create schedule entries targeting a screen group so that I can schedule content for an entire video wall at once.

**Token Estimate:** ~35k tokens
**Predecessors:** TASK-012-004
**Successors:** TASK-012-007, TASK-012-009
**Parallel:** yes — after TASK-012-004

**Acceptance Criteria:**
- [x] `ScheduleEntry` entity gains nullable `groupId` FK; existing `screenId` FK remains nullable.
- [x] Validation ensures exactly one of `screenId` or `groupId` is set on any schedule entry.
- [x] `ScheduleService` validates that the referenced group belongs to the same organisation.
- [x] When a schedule with `groupId` is created/updated and the group mode is `split`, the service enqueues a `SliceContentJob`.
- [x] `GET /schedules` returns entries for both screens and groups; response includes `targetType` (`screen` | `group`) and `targetId`.
- [x] Existing per-screen scheduling tests continue to pass.
- [x] Migration for `schedule_entries` table adds `groupId` column cleanly.
- [x] Unit tests are written and successful.

---

### TASK-012-007: Audit log integration for group operations

**Description:** As a compliance officer, I need all screen group lifecycle and membership events recorded in the audit log.

**Token Estimate:** ~15k tokens
**Predecessors:** TASK-012-005, TASK-012-006
**Successors:** TASK-012-010
**Parallel:** yes — after predecessors

**Acceptance Criteria:**
- [x] Audit events emitted for: `group.created`, `group.updated`, `group.deleted`, `group.screen_added`, `group.screen_removed`, `group.mode_changed`.
- [x] Each event includes: `organisationId`, `actorId`, `targetId` (group UUID), `payload` (relevant diff or membership change).
- [x] `group.mode_changed` captures `previousMode` and `newMode` in payload.
- [x] Audit log entries are retrievable via the existing API filtered by `targetId`.
- [x] No audit events are emitted for read-only operations.

---

### TASK-012-008: Backend unit tests for ScreenGroupService and slicing logic

**Description:** As a developer, I need comprehensive unit tests for the ScreenGroupService, membership validation, and crop coordinate computation.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-012-004, TASK-012-005, TASK-012-006
**Successors:** none
**Parallel:** yes

**Acceptance Criteria:**
- [x] `ScreenGroupService` tests cover: create (valid/invalid), update (mode switch validation), delete (conflict when screens assigned), findAll (org scoping).
- [x] Membership service tests cover: assign (happy path, duplicate group conflict, duplicate cell conflict, missing position for split), remove (happy path, cross-org rejection).
- [x] Crop computation tests cover: 2x2 grid all four cells, 3x1 grid, 1x3 grid, non-square content resolutions, odd pixel dimensions (floor rounding).
- [x] `ScheduleService` group-path tests cover: enqueues slice job on split-mode create/update, does not enqueue on mirror-mode.
- [x] All tests use Jest with mocked TypeORM repositories and mocked BullMQ queues.
- [x] Test coverage for new modules >= 80%.

---

### TASK-012-009: Frontend — Screen Groups list page

**Description:** As an administrator, I want a Screen Groups page that lists all groups with their mode and member count so that I can manage my video wall configurations.

**Token Estimate:** ~35k tokens
**Predecessors:** TASK-012-002, TASK-012-006
**Successors:** TASK-012-010, TASK-012-012
**Parallel:** yes — after predecessors

**Acceptance Criteria:**
- [x] Route `/screen-groups` added to Angular router; link appears in sidebar navigation under "Screens".
- [x] Page displays a list/table of groups with columns: Name, Mode (badge: "Mirror" / "Split"), Grid Size (e.g. "2x2" for split, "-" for mirror), Screen Count, Actions (Edit, Delete).
- [x] "New Group" button opens a creation modal/form with fields: Name, Mode selector, Grid Columns and Grid Rows (shown only when Split is selected).
- [x] Delete action is guarded by a confirmation dialog; blocked with inline error if group has member screens.
- [x] Empty state shown when no groups exist, with prompt to create the first group.
- [x] All API calls use existing Angular HTTP service patterns with proper error handling and loading states.
- [x] Page is responsive and follows the existing Tailwind CSS v4 design system.
- [x] ⚠️ BLOCKED: Verify in browser using dev-browser skill. — dev-browser skill not available in this environment.

---

### TASK-012-010: Frontend — Group detail page with visual grid editor

**Description:** As an administrator, I want a group detail page with a visual drag-and-drop grid editor so that I can assign screens to specific cells in a video wall layout.

**Token Estimate:** ~90k tokens
**Predecessors:** TASK-012-007, TASK-012-009
**Successors:** TASK-012-011
**Parallel:** no
**Model:** opus

**Acceptance Criteria:**
- [x] Route `/screen-groups/:id` renders a detail page showing group name, mode badge, and member screens.
- [x] For split-mode groups: a visual grid is rendered with the configured columns and rows; each cell displays either the assigned screen's name or an "Empty" placeholder.
- [x] Unassigned screens are listed in a sidebar panel; they can be dragged onto empty grid cells.
- [x] Dropping a screen onto a cell calls `PUT /screen-groups/:groupId/screens/:screenId` with the cell's `gridRow` and `gridColumn`.
- [x] Screens in a cell can be dragged to a different empty cell or back to the sidebar to remove them.
- [x] For mirror-mode groups: a simpler list of assigned screens with an "Add Screen" button (no grid positioning).
- [x] A "Switch Mode" control allows toggling between mirror and split; switching from split to mirror warns that grid positions will be cleared.
- [x] Inline validation prevents assigning a screen that already belongs to another group.
- [x] All interactions provide loading states and error toasts.
- [x] ⚠️ BLOCKED: Verify in browser using dev-browser skill. — dev-browser skill not available in this environment.

---

### TASK-012-011: Frontend — Split mode wall preview

**Description:** As an administrator, I want a visual preview showing how a selected content item will be sliced and distributed across the screens in the video wall.

**Token Estimate:** ~50k tokens
**Predecessors:** TASK-012-010
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [ ] A "Preview Wall" panel is visible on the group detail page for split-mode groups with all grid cells assigned.
- [ ] The panel allows selecting a content item from the organisation's library (image or video thumbnail).
- [ ] The preview renders a to-scale composite thumbnail of the full wall, overlaid with grid lines and screen labels at each cell boundary.
- [ ] Each cell displays the cropped portion of the selected content, computed client-side using the same crop formula as the backend slicer.
- [ ] Unassigned cells show a hatched or greyed-out overlay.
- [ ] The preview updates in real time as content selection or grid assignment changes.
- [ ] Preview is not shown for mirror-mode groups or groups with unassigned cells.
- [ ] Verify in browser using dev-browser skill.

---

### TASK-012-012: Frontend — Schedule calendar integration for groups

**Description:** As an administrator, I want the schedule calendar to support selecting a screen group as the scheduling target.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-012-009
**Successors:** none
**Parallel:** yes

**Acceptance Criteria:**
- [ ] Schedule creation/edit form's target selector lists both individual screens and screen groups, distinguished by type (screen icon vs. grid icon).
- [ ] Selecting a group target displays the group's mode as informational context.
- [ ] When a split-mode group is selected, an informational notice explains that content will be pre-sliced and may take a moment to process.
- [ ] Schedule entries for groups are displayed on the calendar with a distinct visual indicator (e.g. "group" badge) and show the group name.
- [ ] Saving a schedule targeting a split-mode group triggers the slicing pipeline; UI shows "Processing slices..." status until renditions are ready.
- [ ] The schedule form prevents selecting both a screen and a group simultaneously.
- [ ] Existing per-screen schedule functionality is unaffected.
- [ ] Verify in browser using dev-browser skill.

---

## Task Dependency Graph

```
TASK-012-001 ──┬── TASK-012-002 ──┬── TASK-012-004 ──┬── TASK-012-006 ──┬── TASK-012-007 ──── TASK-012-010 ──── TASK-012-011
               │                  │                  │                  │
               └── TASK-012-003 ──┤                  │                  │
                                  │                  │                  │
                                  └── TASK-012-005 ──┘                  │
                                                                        │
                                  TASK-012-004 + 005 + 006 ──── TASK-012-008
                                                                        │
                                  TASK-012-002 + 006 ──── TASK-012-009 ─┴── TASK-012-012
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-012-001 | ~20k | none | yes | — |
| TASK-012-002 | ~40k | 001 | yes (with 003) | — |
| TASK-012-003 | ~30k | 001 | yes (with 002) | — |
| TASK-012-004 | ~100k | 002, 003 | no | opus |
| TASK-012-005 | ~60k | 002, 003 | yes (with 004) | — |
| TASK-012-006 | ~35k | 004 | yes | — |
| TASK-012-007 | ~15k | 005, 006 | yes | — |
| TASK-012-008 | ~40k | 004, 005, 006 | yes | — |
| TASK-012-009 | ~35k | 002, 006 | yes | — |
| TASK-012-010 | ~90k | 007, 009 | no | opus |
| TASK-012-011 | ~50k | 010 | no | — |
| TASK-012-012 | ~40k | 009 | yes | — |

**Total estimated tokens: ~555k**

---

## Functional Requirements

- **FR-1:** The system shall allow administrators to create, read, update, and delete screen groups scoped to their organisation.
- **FR-2:** A screen shall belong to at most one group at a time. Attempting to assign a screen already in a different group shall be rejected.
- **FR-3:** Screen groups shall support two modes: `mirror` and `split`. The mode is configurable at creation and changeable afterwards.
- **FR-4:** Mirror mode shall cause all screens in the group to receive identical SSE play commands simultaneously.
- **FR-5:** Split mode shall require a grid configuration (`gridColumns` x `gridRows`). Each screen shall be assigned a unique `gridRow` and `gridColumn`.
- **FR-6:** For split-mode groups, the system shall pre-slice playlist content using FFmpeg at schedule-assignment time. Each screen receives its own slice URL via SSE.
- **FR-7:** Live stream content on a group shall always use mirror-mode fan-out, regardless of group mode.
- **FR-8:** Sliced renditions shall be stored persistently and reused if the source content has not changed (idempotent slicing).
- **FR-9:** When a screen's sliced rendition is not yet available, the screen shall receive a `pending` SSE state event.
- **FR-10:** A schedule entry shall target either a single screen or a single screen group, not both.
- **FR-11:** The frontend shall provide a visual grid editor for assigning screens to grid cell positions.
- **FR-12:** The frontend shall provide a real-time wall preview showing how content will be distributed across the grid.
- **FR-13:** The schedule calendar shall display group-targeted entries with a visual distinction.
- **FR-14:** All group lifecycle and membership changes shall be recorded in the audit log.
- **FR-15:** All queries shall be strictly scoped by `organisationId`.

---

## Non-Goals

- Hardware-level genlock or sub-millisecond synchronisation. Sync is via simultaneous SSE delivery; network jitter is accepted.
- Client-side real-time content slicing on the screen device.
- Nested groups or hierarchical group structures.
- Groups spanning multiple organisations.
- Dynamic grid resizing after content has been sliced (re-slicing must be triggered explicitly via schedule update).
- Per-screen volume or brightness control within a group.
- A dedicated mobile view of the grid editor (desktop admin UI only).

---

## Design Considerations

- **Grid coordinate system:** `gridRow` and `gridColumn` are zero-indexed. Cell (0,0) is top-left. Matches FFmpeg crop offset conventions.
- **Crop formula:** For source `W x H` on a `C x R` grid, cell `(col, row)` gets: `crop_w = floor(W / C)`, `crop_h = floor(H / R)`, `x = col * crop_w`, `y = row * crop_h`. Content authors should use resolutions evenly divisible by grid dimensions.
- **SlicedRendition entity:** Registry of completed slices. Slicer checks before invoking FFmpeg. Deletion of a content item cascade-deletes its renditions and files.
- **Mode switching UX:** Switching split to mirror clears all `gridRow`/`gridColumn` assignments (but does not remove screens from the group). Frontend must warn before this destructive action.
- **SSE syncToken:** Shared UTC timestamp (ms precision) in all group play events. Screen clients can use it for drift detection in future enhancements.
- **Navigation:** "Screen Groups" link in sidebar sits under the "Screens" section.

---

## Technical Considerations

- **FFmpeg availability:** Already included in the Docker container from Feature 007's transcoding pipeline. Slicing reuses the same binary.
- **File storage:** Sliced renditions at `MEDIA_PATH/slices/{groupId}/{screenId}/{contentItemId}.{ext}`. `MediaModule` extended to serve from this subdirectory.
- **BullMQ queue:** New `slice-content` queue, separate from the existing `transcoding` queue to avoid job starvation.
- **Migration ordering:** `ScreenGroup` migration must run before the `Screen` migration adding `groupId`.
- **Schedule constraint:** Mutual exclusivity of `screenId` and `groupId` enforced at service layer (HTTP 400) and via database CHECK constraint.
- **TypeORM relations:** `ScreenGroup` has `@OneToMany` to `Screen`. `Screen` has `@ManyToOne` to `ScreenGroup` with `nullable: true` and `onDelete: 'SET NULL'`.
- **Angular drag-and-drop:** Uses `@angular/cdk/drag-drop` (already available). No additional libraries required.
- **Redis:** BullMQ requires Redis, already provisioned in Docker Compose.

---

## Success Metrics

- Administrators can create a screen group, assign screens, and publish a split-mode video wall schedule end-to-end without errors.
- All screens in a mirror-mode group receive their SSE play event within 50ms of each other under normal LAN conditions.
- Pre-sliced renditions for a 4-item playlist on a 2x2 grid (8 total slices) are generated within 60 seconds on reference development hardware.
- The grid editor renders and is interactable on latest stable Chrome and Firefox.
- Backend test coverage for new modules >= 80%.
- No regression in existing per-screen scheduling or SSE functionality.

---

## Open Questions

None — all key decisions have been confirmed.