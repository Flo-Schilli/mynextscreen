# Feature 008: Playlists

## Introduction

Implement playlist management — ordered lists of content items with per-item display durations. Playlists are reusable and can be assigned to multiple screens via schedules.

### Architecture Context

- **Vision alignment:** "Ordered list of content items from the library", "each item has a display duration", "playlists are reusable"
- **Components involved:** PlaylistModule (new), ContentModule (reference), OrganisationModule (link default playlist)
- **New patterns:** Ordered list management with drag-and-drop reordering

## Goals

- Editors can create, edit, and delete playlists
- Playlists contain an ordered list of content items with per-item duration
- Drag-and-drop reordering in the frontend
- Org Admins can set a playlist as the organisation's default/fallback
- Total playlist duration calculated and displayed

## Tasks

### TASK-008-001: Playlist & PlaylistItem Entities
**Description:** As the system, I want Playlist and PlaylistItem entities so that ordered content sequences can be persisted.

**Token Estimate:** ~20k tokens
**Predecessors:** none
**Successors:** TASK-008-002
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] `Playlist` entity: `id` (UUID, PK), `organisationId` (FK), `name` (string), `createdAt`, `updatedAt`
- [x] `PlaylistItem` entity: `id` (UUID, PK), `playlistId` (FK → Playlist, cascade delete), `contentId` (FK → Content), `position` (integer — ordering), `durationSeconds` (integer — display duration for images; ignored for videos which play full length)
- [x] TypeORM migration creates both tables
- [x] Add FK constraint for `Organisation.defaultPlaylistId` → `Playlist.id` (deferred from feature 003)
- [x] Unit tests for entities
- [x] Typecheck and lint pass

### TASK-008-002: Playlist Service & REST API
**Description:** As an Editor, I want API endpoints to create, edit, reorder, and delete playlists so that I can build content sequences.

**Token Estimate:** ~45k tokens
**Predecessors:** TASK-008-001
**Successors:** TASK-008-003, TASK-008-004
**Parallel:** no

**Acceptance Criteria:**
- [x] `PlaylistService` with methods: `create`, `findAll(orgId)`, `findOne(id, orgId)`, `update` (name), `addItem`, `removeItem`, `reorderItems`, `delete`, `getTotalDuration`
- [x] `PlaylistController` with routes:
  - `POST /api/playlists` — create playlist (Editor+)
  - `GET /api/playlists` — list playlists in current org (all roles)
  - `GET /api/playlists/:id` — playlist detail with items (all roles)
  - `PATCH /api/playlists/:id` — update name (Editor+)
  - `DELETE /api/playlists/:id` — delete playlist (Editor+)
  - `POST /api/playlists/:id/items` — add content item with duration and position (Editor+)
  - `DELETE /api/playlists/:id/items/:itemId` — remove item (Editor+)
  - `PUT /api/playlists/:id/items/reorder` — accept array of item IDs in new order, update positions (Editor+)
- [x] `getTotalDuration` sums item durations (for videos: uses the video's actual duration from Content metadata)
- [x] Deleting a playlist that is set as an organisation's default clears the `defaultPlaylistId` on the organisation
- [x] Emit event when playlist changes (for SSE push to screens)
- [x] Unit tests for all service methods including reorder logic
- [x] Typecheck and lint pass

### TASK-008-003: Default Playlist API
**Description:** As an Org Admin, I want to set a playlist as the organisation's fallback so that screens always have content to display.

**Token Estimate:** ~15k tokens
**Predecessors:** TASK-008-002
**Successors:** TASK-008-004
**Parallel:** yes — can run alongside TASK-008-004 (backend-only)

**Acceptance Criteria:**
- [x] `PATCH /api/organisations/:orgId/default-playlist` — set `defaultPlaylistId` (Org Admin only)
- [x] Validates that the playlist belongs to the same organisation
- [x] Returns 404 if playlist doesn't exist
- [x] Unit tests
- [x] Typecheck and lint pass

### TASK-008-004: Playlist Management UI
**Description:** As an Editor, I want a playlist editor page to create, reorder, and preview playlists.

**Token Estimate:** ~60k tokens
**Predecessors:** TASK-008-002
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] `/playlists` route showing list of playlists with name and total duration
- [x] "Create Playlist" button → form with name input
- [x] Playlist editor view:
  - List of items with thumbnail, title, duration input, and type indicator (image/video)
  - Drag-and-drop reordering (Angular CDK DragDrop)
  - "Add Content" button → modal showing content library grid for selection
  - Remove item button per row
  - Total duration display at the bottom
  - Inline preview: click an item to preview it
- [x] Delete playlist button with confirmation dialog
- [x] "Set as Default" button on playlist detail (Org Admin only) — marks it as the org's fallback
- [x] Dark-themed, consistent styling
- [x] Verify in browser: can create playlist, add items, reorder via drag-and-drop, see total duration, set as default

## Task Dependency Graph

```
TASK-008-001 ──→ TASK-008-002 ──→ TASK-008-003
                      │
                      └──→ TASK-008-004
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-008-001 | ~20k | none | — | — |
| TASK-008-002 | ~45k | 001 | no | — |
| TASK-008-003 | ~15k | 002 | yes (with 004) | haiku |
| TASK-008-004 | ~60k | 002 | yes (with 003) | — |

**Total estimated tokens:** ~140k

## Functional Requirements

- FR-1: Editors and Org Admins can create, edit, and delete playlists
- FR-2: Playlist items are ordered and can be reordered via drag-and-drop
- FR-3: Each item has a display duration (images use it; videos play full length)
- FR-4: Total playlist duration is calculated and displayed
- FR-5: Org Admins can set any playlist as the organisation's default/fallback
- FR-6: Deleting a default playlist clears the organisation's default setting
- FR-7: Playlist changes emit events for screen SSE updates

## Non-Goals

- No playlist duplication/cloning
- No playlist preview playback (simulated slideshow)
- No transitions between items (defer to a future feature)
- No bulk item addition

## Technical Considerations

- Position field uses integers with gaps (e.g. 10, 20, 30) to make insertions easier without rewriting all positions — or simply rewrite positions on reorder (simpler for this scale)
- Angular CDK DragDrop module provides the drag-and-drop primitives
- Video duration should be extracted during transcoding (feature 007) and stored on the Content entity — add a `durationSeconds` field to Content if not already present
- Playlist change events should include the playlist ID so the SSE layer can determine which screens are affected (via their schedules)

## Success Metrics

- An Editor can create a playlist, add content items, reorder them, and see the total duration
- Default playlist can be set and is reflected in the organisation settings
- Playlist changes trigger events for downstream consumers

## Open Questions

None — all resolved.
