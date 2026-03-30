# Feature 016: Bulk Operations

## Introduction

Allow users to select multiple items at once on the Screens, Content Library, and Playlists pages and perform batch actions (delete, assign, tag, etc.) in a single operation. This eliminates the need to apply repetitive actions one item at a time, which becomes painful as a library grows.

### Architecture Context

- **Vision alignment:** "Bulk actions: multi-select on screens, content, and playlists for assign/delete/tag operations" — listed explicitly in the vision as a core UX requirement
- **Components involved:** Frontend — ScreensListComponent, ContentLibraryComponent, PlaylistsListComponent; new shared SelectionService, SelectionCheckboxComponent, BulkActionToolbarComponent; Backend — ScreensController, ContentController, PlaylistsController (new bulk endpoints per entity)
- **New patterns:** Angular selection service (shared state for multi-select), bulk action toolbar with context-sensitive actions, backend bulk endpoints that accept an array of IDs and an action, bulk audit log entries

## Goals

- Users can select multiple items on the Screens, Content Library, and Playlists pages using checkboxes, shift-click range select, and select-all
- A contextual toolbar appears at the bottom (or top) of the page when one or more items are selected, showing available bulk actions for that entity
- Destructive actions (bulk delete) require a confirmation dialog before executing
- Each bulk operation is recorded in the audit log, with one entry per affected resource
- The selection is cleared automatically after a successful bulk operation
- The feature is built with shared, reusable Angular components so all three pages use identical interaction patterns

## Tasks

### TASK-016-001: Shared SelectionService
**Description:** As a frontend developer, I want a shared Angular service that tracks which items are currently selected on a page, so that the checkbox component and the bulk action toolbar can share state without tight coupling.

**Token Estimate:** ~20k tokens
**Predecessors:** none
**Successors:** TASK-016-002, TASK-016-005, TASK-016-006, TASK-016-007
**Parallel:** yes — can run alongside TASK-016-003, TASK-016-004

**Acceptance Criteria:**
- [ ] `SelectionService` (injectable, not provided in root — instantiated per page) with:
  - `selectedIds: Signal<Set<string>>`
  - `toggle(id: string): void`
  - `selectRange(ids: string[], fromId: string, toId: string): void` — selects all IDs between the two anchor points in the current ordered list
  - `selectAll(ids: string[]): void`
  - `clearAll(): void`
  - `isSelected(id: string): Signal<boolean>` (computed)
  - `count: Signal<number>` (computed)
  - `hasSelection: Signal<boolean>` (computed)
- [ ] Service is provided at component level (`providers: [SelectionService]`) on each host page so state is isolated per page
- [ ] Unit tests for toggle, range select, select-all, clear, and count
- [ ] Typecheck and lint pass

### TASK-016-002: SelectionCheckboxComponent
**Description:** As a frontend developer, I want a reusable checkbox component that integrates with SelectionService so that I can drop it into any list/grid row with minimal wiring.

**Token Estimate:** ~15k tokens
**Predecessors:** TASK-016-001
**Successors:** TASK-016-005, TASK-016-006, TASK-016-007
**Parallel:** yes — can run alongside TASK-016-003, TASK-016-004

**Acceptance Criteria:**
- [ ] `SelectionCheckboxComponent` standalone component with inputs: `itemId: string`, `itemIndex: number` (for shift-click range calculation)
- [ ] Injects `SelectionService` from parent provider context
- [ ] Renders a styled checkbox (Tailwind, dark theme consistent with existing UI) that reflects `isSelected(itemId)` signal
- [ ] Clicking the checkbox calls `toggle(itemId)`
- [ ] Shift-clicking calls `selectRange()` based on the last-clicked index tracked in the service
- [ ] "Select all" row-level checkbox (separate `SelectAllCheckboxComponent` or an `[all]` input flag) that calls `selectAll(allIds)` / `clearAll()` depending on current state; shows indeterminate state when some but not all items are selected
- [ ] Accessible: `aria-label`, keyboard-navigable
- [ ] Unit tests for click and shift-click behaviour
- [ ] Typecheck and lint pass

### TASK-016-003: Backend Bulk Endpoints — Screens
**Description:** As a backend developer, I want bulk operation endpoints for screens so that the frontend can execute multi-item actions in a single API call.

**Token Estimate:** ~25k tokens
**Predecessors:** none
**Successors:** TASK-016-005
**Parallel:** yes — can run alongside TASK-016-001, TASK-016-002, TASK-016-004

**Acceptance Criteria:**
- [ ] `POST /api/screens/bulk-delete` — body: `{ ids: string[] }` — deletes all specified screens owned by the request's `organisationId`; returns `{ deleted: number, notFound: string[] }`
- [ ] `POST /api/screens/bulk-assign-group` — body: `{ ids: string[], groupId: string | null }` — assigns all specified screens to the given group (or removes them from any group if `groupId` is null); returns `{ updated: number, notFound: string[] }`
- [ ] Both endpoints validate that all IDs belong to the current organisation (silently skip or 400 on foreign IDs — choose 400 with list of offending IDs)
- [ ] Both endpoints are guarded by JWT auth + Org Admin role
- [ ] Each affected screen produces an individual audit log event (emit one event per screen so the audit log has per-resource entries)
- [ ] Input validation via NestJS `class-validator` DTO; `ids` must be a non-empty array, max 200 items
- [ ] Unit tests for both endpoints including auth guard, org scoping, and partial-notFound scenario
- [ ] Typecheck and lint pass

### TASK-016-004: Backend Bulk Endpoints — Content
**Description:** As a backend developer, I want bulk operation endpoints for content items so that the frontend can execute multi-item actions in a single API call.

**Token Estimate:** ~30k tokens
**Predecessors:** none
**Successors:** TASK-016-006
**Parallel:** yes — can run alongside TASK-016-001, TASK-016-002, TASK-016-003

**Acceptance Criteria:**
- [ ] `POST /api/content/bulk-delete` — body: `{ ids: string[] }` — deletes specified content items; also removes associated files; returns `{ deleted: number, notFound: string[] }`
- [ ] `POST /api/content/bulk-tag` — body: `{ ids: string[], tags: string[] }` — adds the given tags to all specified content items (additive, does not remove existing tags); returns `{ updated: number, notFound: string[] }`
- [ ] `POST /api/content/bulk-untag` — body: `{ ids: string[], tags: string[] }` — removes the given tags from all specified content items; returns `{ updated: number, notFound: string[] }`
- [ ] `POST /api/content/bulk-add-to-playlist` — body: `{ ids: string[], playlistId: string }` — appends all specified content items to the given playlist (in order of selection, deduplicating items already in the playlist); returns `{ added: number, alreadyPresent: number, notFound: string[] }`
- [ ] All endpoints scoped to `organisationId`; 400 on foreign IDs
- [ ] Guarded by JWT auth; viewer role cannot bulk-delete (must be Org Admin or Editor)
- [ ] Each affected content item produces an individual audit log event
- [ ] Input validation DTOs; `ids` non-empty array, max 200 items
- [ ] Unit tests covering auth, org scoping, deduplication in add-to-playlist, and tag operations
- [ ] Typecheck and lint pass

### TASK-016-005: Backend Bulk Endpoints — Playlists
**Description:** As a backend developer, I want bulk operation endpoints for playlists so that the frontend can execute multi-item actions in a single API call.

**Token Estimate:** ~25k tokens
**Predecessors:** none
**Successors:** TASK-016-007
**Parallel:** yes — can run alongside TASK-016-001, TASK-016-002, TASK-016-003, TASK-016-004

**Acceptance Criteria:**
- [ ] `POST /api/playlists/bulk-delete` — body: `{ ids: string[] }` — deletes specified playlists; returns `{ deleted: number, notFound: string[] }`
- [ ] `POST /api/playlists/bulk-assign-screen` — body: `{ ids: string[], screenId: string }` — assigns all specified playlists to a screen (replaces that screen's current active playlist with each playlist in sequence, or sets all as candidates — clarify with domain model: if a screen has one active playlist, this sets the first playlist and returns a warning about the rest); returns `{ assigned: number, notFound: string[] }`
  - Implementation note: if the domain model does not support multiple playlists per screen, treat this as "assign selected playlist(s) to screen(s)" via `bulk-assign-to-screens` — body: `{ playlistIds: string[], screenIds: string[] }` (assign each playlist to each screen); consult the existing screen/playlist relationship model and adjust accordingly. Document the chosen interpretation in the PR.
- [ ] All endpoints scoped to `organisationId`; 400 on foreign IDs
- [ ] Guarded by JWT auth + Org Admin or Editor role
- [ ] Each affected playlist produces an individual audit log event
- [ ] Input validation DTOs; `ids` non-empty array, max 200 items
- [ ] Unit tests covering auth, org scoping, and the multi-assign scenario
- [ ] Typecheck and lint pass

### TASK-016-006: BulkActionToolbarComponent
**Description:** As a frontend developer, I want a reusable bulk action toolbar component that appears when items are selected and presents the relevant actions for the current entity type, so that the UI pattern is consistent across pages.

**Token Estimate:** ~25k tokens
**Predecessors:** TASK-016-001
**Successors:** TASK-016-008, TASK-016-009, TASK-016-010
**Parallel:** no — depends on SelectionService API being stable

**Acceptance Criteria:**
- [ ] `BulkActionToolbarComponent` standalone component
- [ ] Inputs: `actions: BulkAction[]` (each action: `{ label: string, icon?: string, variant: 'default' | 'danger', handler: () => void | Promise<void>, disabled?: Signal<boolean> }`)
- [ ] Shows/hides via `hasSelection` signal from injected `SelectionService` — uses Angular animation or Tailwind transition to slide in from bottom (or appear as a sticky bar at the top of the list area)
- [ ] Displays selection count: "X item(s) selected" with a "Clear selection" link/button
- [ ] Renders action buttons; danger-variant buttons styled in red (consistent with existing destructive action styling in the app)
- [ ] While a bulk action is in progress, all action buttons are disabled and show a loading spinner; selection count badge is preserved
- [ ] After a successful action the toolbar calls `SelectionService.clearAll()` and the page refreshes its list
- [ ] Unit tests for show/hide behaviour and action invocation
- [ ] Typecheck and lint pass

### TASK-016-007: Integrate Bulk Operations into Screens List
**Description:** As an Org Admin, I want to select multiple screens and perform bulk actions (delete, assign to group) so that I can manage a large fleet of screens efficiently.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-016-002, TASK-016-003, TASK-016-006
**Successors:** TASK-016-011
**Parallel:** yes — can run alongside TASK-016-008, TASK-016-009

**Acceptance Criteria:**
- [ ] `ScreensListComponent` provides `SelectionService` at component level
- [ ] Each screen row includes a `SelectionCheckboxComponent` as the first column; a "select all" checkbox in the table header
- [ ] `BulkActionToolbarComponent` is embedded with actions: "Delete selected" (danger), "Assign to group" (default)
- [ ] "Delete selected" opens a confirmation dialog (see TASK-016-011) before calling `POST /api/screens/bulk-delete`; on success shows a toast "X screen(s) deleted" and refreshes the list
- [ ] "Assign to group" opens a modal with a group picker dropdown (reuse the existing group selector if one exists, otherwise a simple `<select>`) and calls `POST /api/screens/bulk-assign-group`; on success shows "X screen(s) assigned to [group name]" toast
- [ ] If the response contains `notFound` IDs, display a non-blocking warning: "X item(s) could not be found and were skipped"
- [ ] Visual indication (row highlight or checkbox column) that selected rows are selected
- [ ] Typecheck and lint pass

### TASK-016-008: Integrate Bulk Operations into Content Library
**Description:** As an Org Admin or Editor, I want to select multiple content items and perform bulk actions (delete, tag, add to playlist) so that I can organise my media library without repetitive clicks.

**Token Estimate:** ~35k tokens
**Predecessors:** TASK-016-002, TASK-016-004, TASK-016-006
**Successors:** TASK-016-011
**Parallel:** yes — can run alongside TASK-016-007, TASK-016-009

**Acceptance Criteria:**
- [ ] `ContentLibraryComponent` (grid layout) provides `SelectionService` at component level
- [ ] Each content card includes a `SelectionCheckboxComponent` overlaid in the top-left corner (only fully visible on hover or when any item is selected); a "select all" checkbox/button above the grid
- [ ] `BulkActionToolbarComponent` is embedded with actions: "Delete selected" (danger), "Add tags" (default), "Remove tags" (default), "Add to playlist" (default)
- [ ] "Delete selected" opens a confirmation dialog; on success shows toast "X item(s) deleted" and refreshes the grid
- [ ] "Add tags" / "Remove tags" opens a tag-entry modal (tag input field, existing tag suggestions if available); calls the appropriate bulk endpoint; on success shows toast
- [ ] "Add to playlist" opens a playlist picker modal (list of the org's playlists with radio or single-select); calls `POST /api/content/bulk-add-to-playlist`; on success shows "X item(s) added to [playlist name]" toast
- [ ] If response contains `alreadyPresent > 0`, add a note to the success toast: "(X were already in the playlist)"
- [ ] `notFound` handling: non-blocking warning as in TASK-016-007
- [ ] Typecheck and lint pass

### TASK-016-009: Integrate Bulk Operations into Playlists List
**Description:** As an Org Admin or Editor, I want to select multiple playlists and perform bulk actions (delete, assign to screen) so that I can manage scheduling at scale.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-016-002, TASK-016-005, TASK-016-006
**Successors:** TASK-016-011
**Parallel:** yes — can run alongside TASK-016-007, TASK-016-008

**Acceptance Criteria:**
- [ ] `PlaylistsListComponent` provides `SelectionService` at component level
- [ ] Each playlist row includes a `SelectionCheckboxComponent`; a "select all" checkbox in the header
- [ ] `BulkActionToolbarComponent` embedded with actions: "Delete selected" (danger), "Assign to screen(s)" (default)
- [ ] "Delete selected" opens a confirmation dialog; on success shows toast "X playlist(s) deleted" and refreshes the list
- [ ] "Assign to screen(s)" opens a screen-picker modal (multi-select list of screens in the org); calls the bulk assign endpoint; on success shows toast
- [ ] `notFound` handling: non-blocking warning as in TASK-016-007
- [ ] Typecheck and lint pass

### TASK-016-010: Confirmation Dialog for Destructive Bulk Actions
**Description:** As a user, I want a clear confirmation dialog before any destructive bulk action so that I cannot accidentally delete many items at once.

**Token Estimate:** ~15k tokens
**Predecessors:** TASK-016-006
**Successors:** TASK-016-007, TASK-016-008, TASK-016-009
**Parallel:** no — toolbar must exist before dialog is wired up; pages depend on this

**Acceptance Criteria:**
- [ ] `BulkConfirmDialogComponent` standalone component (or reuse an existing confirm dialog if one exists in the app — check before creating a new one)
- [ ] Inputs: `title: string`, `message: string`, `confirmLabel: string` (defaults to "Delete"), `itemCount: number`
- [ ] Shows: title, a message including the count ("You are about to permanently delete 12 items. This cannot be undone."), Cancel and Confirm buttons
- [ ] Confirm button is styled red (danger variant)
- [ ] Returns a `Promise<boolean>` (resolves `true` on confirm, `false` on cancel/dismiss)
- [ ] Accessible: focus traps inside the dialog, Escape key cancels
- [ ] Unit test: confirm resolves true, cancel resolves false
- [ ] Typecheck and lint pass

### TASK-016-011: Audit Log Action Types for Bulk Operations
**Description:** As a system operator, I want bulk operations to produce individual per-resource audit log entries so that the audit trail is granular and searchable.

**Token Estimate:** ~20k tokens
**Predecessors:** TASK-016-007, TASK-016-008, TASK-016-009
**Successors:** none
**Parallel:** no — must run after the backend bulk endpoints are confirmed to emit events

**Acceptance Criteria:**
- [ ] Add new action types to the `AuditEntry` action enum (Feature 011): `screen.bulk_deleted`, `screen.bulk_group_assigned`, `content.bulk_deleted`, `content.bulk_tagged`, `content.bulk_untagged`, `content.bulk_added_to_playlist`, `playlist.bulk_deleted`, `playlist.bulk_screen_assigned`
- [ ] Each bulk endpoint emits one audit event per affected resource (not one event for the whole batch) using the new action types
- [ ] Each audit event `details` JSON includes: `bulkOperationSize` (total number of IDs in the request), so it is clear the action was part of a bulk operation
- [ ] TypeORM migration to add new enum values (or update the column definition if using a string column — consistent with how Feature 011 defined the action field)
- [ ] Existing audit log UI (Feature 011) can display the new action types with human-readable labels: e.g. `screen.bulk_deleted` → "Screen deleted (bulk)"
- [ ] Unit tests for the new event mappings in `AuditListener`
- [ ] Typecheck and lint pass

## Task Dependency Graph

```
TASK-016-001 (SelectionService)
     │
     ├──→ TASK-016-002 (SelectionCheckboxComponent)
     │         │
     │         ├──→ TASK-016-007 (Screens integration) ──→ TASK-016-011 (Audit types)
     │         ├──→ TASK-016-008 (Content integration) ──→       ↑
     │         └──→ TASK-016-009 (Playlists integration) ────────┘
     │
     └──→ TASK-016-006 (BulkActionToolbarComponent)
               │
               └──→ TASK-016-010 (ConfirmDialog)
                         │
                         ├──→ TASK-016-007
                         ├──→ TASK-016-008
                         └──→ TASK-016-009

TASK-016-003 (Backend: Screens) ──→ TASK-016-007
TASK-016-004 (Backend: Content) ──→ TASK-016-008
TASK-016-005 (Backend: Playlists) ──→ TASK-016-009
```

| Task | Estimate | Predecessors | Parallel | Notes |
|------|----------|--------------|----------|-------|
| TASK-016-001 | ~20k | none | yes (with 003, 004, 005) | — |
| TASK-016-002 | ~15k | 001 | yes (with 003, 004, 005) | — |
| TASK-016-003 | ~25k | none | yes (with 001, 002, 004, 005) | — |
| TASK-016-004 | ~30k | none | yes (with 001, 002, 003, 005) | — |
| TASK-016-005 | ~25k | none | yes (with 001, 002, 003, 004) | — |
| TASK-016-006 | ~25k | 001 | no | Wait for service API to be stable |
| TASK-016-010 | ~15k | 006 | no | — |
| TASK-016-007 | ~30k | 002, 003, 006, 010 | yes (with 008, 009) | — |
| TASK-016-008 | ~35k | 002, 004, 006, 010 | yes (with 007, 009) | — |
| TASK-016-009 | ~30k | 002, 005, 006, 010 | yes (with 007, 008) | — |
| TASK-016-011 | ~20k | 007, 008, 009 | no | — |

**Total estimated tokens:** ~270k

## Functional Requirements

- FR-1: Users can select multiple items on the Screens, Content Library, and Playlists pages using checkboxes
- FR-2: Shift-clicking a checkbox selects all items between the last-clicked item and the current item
- FR-3: A "select all" checkbox selects all items currently visible in the list/grid (not items on other pages if the list is paginated)
- FR-4: A bulk action toolbar appears when one or more items are selected; it disappears when the selection is empty
- FR-5: The toolbar shows the selection count and a "Clear selection" control
- FR-6: Bulk delete is available for all three entity types and requires a confirmation dialog
- FR-7: Bulk assign-to-group is available for Screens
- FR-8: Bulk tag and untag are available for Content
- FR-9: Bulk add-to-playlist is available for Content
- FR-10: Bulk assign-to-screen is available for Playlists
- FR-11: After a successful bulk operation the selection is cleared and the list refreshes
- FR-12: If some IDs in a bulk request were not found, the operation still succeeds for the found items and a non-blocking warning is shown
- FR-13: Each bulk operation produces one audit log entry per affected resource
- FR-14: All bulk endpoints enforce organisation scoping — cross-organisation IDs are rejected with HTTP 400

## Non-Goals

- No bulk edit of content metadata (title, description) — too complex for this feature
- No bulk re-order of items within a playlist
- No cross-page (paginated) select-all — "select all" only selects the currently loaded items
- No undo / undo history for bulk operations
- No bulk export or bulk download
- No bulk duplicate/copy
- No drag-to-select (rubber-band selection) on the content grid

## Design Considerations

- The selection checkbox column/overlay should not disrupt the existing visual layout when no selection mode is active. On list pages, reserve a fixed-width first column for the checkbox at all times (avoids layout shift when the first item is selected). On the content grid, show the checkbox overlay only on card hover or when at least one item is already selected.
- The bulk action toolbar must not obscure the last item in the list. Use a sticky bottom bar with enough bottom padding on the list container to ensure the last row is always scrollable into full view.
- Keep the toolbar uncluttered — show only actions relevant to the current entity. Do not show placeholder disabled buttons for unsupported actions.
- On mobile viewports (if the app is expected to be used on mobile), the toolbar should collapse action labels to icons only. If mobile is not a primary target, this can be deferred.
- Confirmation dialog copy should always include the count: "Delete 14 screens?" is clearer than a generic "Are you sure?".

## Technical Considerations

- `SelectionService` must be provided at the page component level (not root) to ensure state is isolated per page and cleaned up when the component is destroyed. Use Angular's `providers` array on the host component, not `providedIn: 'root'`.
- Shift-click range selection requires maintaining a "last clicked index" in the service. The service must receive the ordered list of IDs (the current page's display order) to compute the range correctly. Pass the ordered ID array via a `setOrder(ids: string[])` method or as a parameter to `selectRange`.
- Bulk endpoint max of 200 IDs per request is a safeguard against accidental massive operations and timeout risk. If the UI ever allows selecting more than 200 items (e.g. after a future "select all across all pages" feature), the frontend must batch the requests.
- Backend bulk endpoints should wrap the multi-item operation in a single database transaction where all-or-nothing semantics are desirable (e.g. bulk delete). For partial-success semantics (e.g. skip notFound IDs), use a transaction only for the records that are being modified.
- For `bulk-add-to-playlist`, the order of appended items follows the order of the `ids` array in the request body. The frontend should pass IDs in the selection order (order in which the user selected them, or display order if select-all was used).
- Audit log events for bulk operations: emit events inside the service layer, not the controller, consistent with the existing pattern established in Feature 011.
- The `bulkOperationSize` field in audit `details` allows future analytics to distinguish "deleted as part of a 50-item bulk op" from "deleted individually", which can be useful for investigating accidental bulk deletions.

## Success Metrics

- A user can select 20 screens and delete them in 2 interactions (select all → delete → confirm) rather than 40
- Bulk delete, bulk tag, and bulk assign operations complete in under 2 seconds for batches of up to 50 items
- No existing single-item operations are broken or visually disrupted by the addition of checkboxes
- Audit log shows individual entries for each item affected by a bulk operation, with the `bulkOperationSize` detail present

## Open Questions

1. **Screen/playlist assignment model:** Does the current domain model allow a screen to have multiple playlists assigned simultaneously, or does assigning a new playlist replace the existing one? The implementation of `bulk-assign-screen` on playlists (TASK-016-005) depends on this. The task includes a note to consult the existing model and document the chosen interpretation.

2. **Paginated select-all:** If the Screens or Content Library pages use pagination or infinite scroll, "select all" currently only selects loaded items. Should there be a secondary affordance ("Select all 342 screens") that loads all IDs and selects them? Deferred to a future feature for now — noted in Non-Goals.

3. **Role permissions for bulk tag/untag:** Can Editors tag content, or is tagging an Org Admin privilege? This should be consistent with the existing single-item tag permission. Confirm with the role model defined in Feature 006/007 before implementing TASK-016-004.

4. **Optimistic UI:** Should the UI optimistically remove selected items from the list immediately on confirm (before the API responds) to feel faster, or wait for the API response before refreshing? Recommended: wait for response to avoid confusion if the request fails. But this is a UX trade-off worth deciding before TASK-016-007/008/009 are implemented.
