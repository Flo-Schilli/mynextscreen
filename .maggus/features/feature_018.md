# Feature 018: Configurable Transition Modes for Playlist Items

## Introduction

Add configurable transition/blending modes to playlist items so that content transitions in the player are no longer hardcoded to a simple fade. Each playlist item gets its own transition type and duration, selectable via a dropdown in the playlist editor. The player renders the selected transition when advancing between items.

### Architecture Context

- **Vision alignment:** Playlists are "ordered lists of content items" with per-item configuration (VISION.md) — transition mode is a natural extension of per-item settings alongside duration
- **Components involved:**
  - `PlaylistModule` (backend) — entity, DTOs, service, controller
  - `ScreenProtocolModule` (backend) — PlaylistItem model, JsonProtocolAdapter
  - Frontend playlist editor (`frontend/src/app/playlists/`)
  - Player playback component (`player/src/app/playback/`)
  - Player models (`player/src/app/player/player.models.ts`)
- **New patterns:** None — extends existing per-item fields (same pattern as `durationSeconds`)

## Goals

- Allow each playlist item to have a configurable transition type (Cut, Fade, Slide L/R/U/D, Zoom In/Out)
- Allow each playlist item to have a configurable transition duration in milliseconds
- Expose transition settings in the existing playlist editor UI as a dropdown + duration input per item row
- Player renders transitions faithfully using CSS animations
- First item in a playlist also uses its configured transition on initial appearance

## Tasks

### TASK-018-001: Backend — Add transition fields to PlaylistItem entity and DTOs
**Description:** As a developer, I want `transition` and `transitionDurationMs` columns on the `playlist_items` table so that transition settings are persisted per item.

**Token Estimate:** ~35k tokens
**Predecessors:** none
**Successors:** TASK-018-002, TASK-018-003
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] `PlaylistItem` entity gets two new columns:
  - `transition` — varchar, default `'fade'`, validated against an enum of allowed values: `cut`, `fade`, `slide-left`, `slide-right`, `slide-up`, `slide-down`, `zoom-in`, `zoom-out`
  - `transitionDurationMs` — integer, default `500`, min `0`, max `3000`
- [x] `AddPlaylistItemDto` accepts optional `transition` and `transitionDurationMs` fields
- [x] A new `UpdatePlaylistItemDto` is created (or existing update mechanism extended) to allow patching `transition` and `transitionDurationMs` on an existing item
- [x] Playlist service `addItem` and update methods handle the new fields
- [x] Controller exposes a `PATCH /api/playlists/:playlistId/items/:itemId` endpoint for updating transition settings (same auth as existing item endpoints)
- [x] TypeORM migration or schema sync adds the columns with defaults (existing items get `fade` / `500`)
- [x] Unit tests cover: adding item with transition, updating transition, default values applied when omitted
- [x] Typecheck/lint passes

### TASK-018-002: Backend — Expose transition in screen protocol
**Description:** As a player, I want the screen state response to include transition type and duration per playlist item so that I can render the correct transition.

**Token Estimate:** ~25k tokens
**Predecessors:** TASK-018-001
**Successors:** TASK-018-004
**Parallel:** yes — can run alongside TASK-018-003

**Acceptance Criteria:**
- [x] `screen-state.model.ts` `PlaylistItem` interface gets `transition: string` and `transitionDurationMs: number` fields
- [x] `JsonProtocolAdapter.renderPlaylistItem()` includes `transition` and `transitionDurationMs` in the output
- [x] `ScreenStateService.mapPlaylist()` maps the entity fields to the protocol model
- [x] Player's `player.models.ts` `PlaylistItem` interface gets `transition` and `transitionDurationMs` fields
- [x] Unit tests for JsonProtocolAdapter and ScreenStateService updated
- [x] Typecheck/lint passes

### TASK-018-003: Frontend — Transition dropdown and duration input in playlist editor
**Description:** As an editor, I want a transition dropdown and duration input on each playlist item row so that I can configure how each item enters the screen.

**Token Estimate:** ~50k tokens
**Predecessors:** TASK-018-001
**Successors:** none
**Parallel:** yes — can run alongside TASK-018-002

**Acceptance Criteria:**
- [ ] Each item row in the playlist editor shows:
  - A dropdown/select for transition type (Cut, Fade, Slide Left, Slide Right, Slide Up, Slide Down, Zoom In, Zoom Out)
  - A number input for transition duration in ms (default 500, range 0–3000)
- [ ] Changing either field calls `PATCH /api/playlists/:playlistId/items/:itemId` with debounce (same pattern as existing duration editing)
- [ ] Frontend `PlaylistItem` model updated with `transition` and `transitionDurationMs` fields
- [ ] Dropdown shows human-readable labels (e.g. "Slide Left" not "slide-left")
- [ ] New items added to a playlist default to Fade / 500ms
- [ ] Verify in browser: dropdown and duration input appear, changes persist on reload
- [ ] Typecheck/lint passes

### TASK-018-004: Player — Render configurable transitions
**Description:** As a viewer, I want content items to transition using the configured effect (fade, slide, zoom, cut) so that playback looks polished and varied.

**Token Estimate:** ~60k tokens
**Predecessors:** TASK-018-002
**Successors:** none
**Parallel:** yes — can run alongside TASK-018-003
**Model:** opus

**Acceptance Criteria:**
- [ ] Player reads `transition` and `transitionDurationMs` from each playlist item
- [ ] Supported transitions with CSS animations:
  - `cut` — instant switch, no animation
  - `fade` — opacity crossfade (current behaviour, now with configurable duration)
  - `slide-left` — current exits left, next enters from right
  - `slide-right` — current exits right, next enters from left
  - `slide-up` — current exits upward, next enters from below
  - `slide-down` — current exits downward, next enters from above
  - `zoom-in` — current scales up and fades out, next fades in at normal scale
  - `zoom-out` — current scales down and fades out, next fades in at normal scale
- [ ] Transition duration taken from the **incoming** item's `transitionDurationMs`
- [ ] First item uses its configured transition on initial appearance (enters from black)
- [ ] Single-item playlists: transition replays on each loop iteration
- [ ] `cut` transition with 0ms duration behaves identically to instant swap (no flicker)
- [ ] Fallback: if an unknown transition value is received, default to `fade` with 500ms
- [ ] Verify in browser: test each transition type, verify duration changes are visible
- [ ] Typecheck/lint passes

## Task Dependency Graph

```
TASK-018-001 ──→ TASK-018-002 ──→ TASK-018-004
             └──→ TASK-018-003
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-018-001 | ~35k | none | — | — |
| TASK-018-002 | ~25k | 001 | yes (with 003) | — |
| TASK-018-003 | ~50k | 001 | yes (with 002) | — |
| TASK-018-004 | ~60k | 002 | yes (with 003) | opus |

**Total estimated tokens:** ~170k

## Functional Requirements

- FR-1: Each playlist item must have a `transition` field (enum: cut, fade, slide-left, slide-right, slide-up, slide-down, zoom-in, zoom-out) defaulting to `fade`
- FR-2: Each playlist item must have a `transitionDurationMs` field (integer, 0–3000) defaulting to `500`
- FR-3: The playlist editor must show a dropdown and duration input per item row for transition settings
- FR-4: Changes to transition settings must be saved to the backend via PATCH endpoint with debounce
- FR-5: The screen state response must include transition and duration per playlist item
- FR-6: The player must render the configured transition when advancing between items
- FR-7: The first item in a playlist must use its configured transition on initial appearance
- FR-8: Existing playlist items (before this feature) must default to fade/500ms with no manual migration needed

## Non-Goals

- No transition preview in the playlist editor (play button to see what it looks like)
- No per-playlist default transition (each item is configured individually)
- No custom easing curve configuration (CSS defaults used)
- No transition effects for live stream start/stop (those remain instant)
- No 3D transitions (rotate, flip, cube)

## Design Considerations

- Transition dropdown should be compact — fits inline on the item row without making it too wide
- Consider a small icon or label next to the duration input (e.g. "ms") for clarity
- The dropdown values should use human-readable labels: "Fade", "Slide Left", etc.

## Technical Considerations

- **CSS animations over JS:** All transitions should be implementable with CSS `transform` + `opacity` + `transition`/`@keyframes`. No JavaScript animation libraries needed.
- **Two-layer approach:** The player currently has a single content layer with opacity toggling. Slide/zoom transitions require a **two-layer** approach: outgoing content on one layer, incoming on another, both animating simultaneously. This is the main structural change in the playback component.
- **Schema migration:** Since SQLite is used, adding columns with defaults is straightforward. TypeORM `synchronize: true` in dev handles it, but a migration should be created for production safety.
- **ARCHITECTURE.md:** No update needed — this extends existing modules without introducing new components or patterns.

## Success Metrics

- All 8 transition types render correctly in the player
- Transition duration is visually distinguishable between e.g. 200ms and 2000ms
- Existing playlists continue to work with default fade/500ms without any manual changes
- Playlist editor UI for transitions feels natural alongside the existing duration input

## Open Questions

*None — all questions resolved during clarification.*
