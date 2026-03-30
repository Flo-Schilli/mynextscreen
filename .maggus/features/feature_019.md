# Feature 019: Accurate Video Duration in Playlists

## Introduction

When a video is added to a playlist, the system currently assigns a hardcoded 30-second default duration, even though the player ignores this value and plays videos to completion. This creates a misleading UI — the playlist editor shows an editable 30s duration for a 58-second video. This feature extracts actual video duration via ffprobe during transcoding (with lazy backfill for existing videos), displays it as read-only in the playlist editor, and uses it for accurate total playlist duration calculations.

### Architecture Context

- **Vision alignment:** VISION.md states "videos play their full length" — the duration display should reflect this
- **Components involved:**
  - `Content` entity (backend) — new `durationSeconds` column
  - `TranscodingProcessor` (backend) — ffprobe extraction after transcoding
  - `ContentService` (backend) — lazy backfill on access
  - `PlaylistService` (backend) — accurate total duration using real video duration
  - `ScreenStateService` (backend) — expose real duration in protocol
  - Frontend playlist editor — read-only duration for videos
  - Player models — no change needed (player already ignores duration for videos)
- **New patterns:** ffprobe utility for metadata extraction (reusable for future metadata needs)

## Goals

- Extract and persist actual video duration during transcoding
- Lazily backfill duration for existing videos on first access
- Display actual video duration as read-only in the playlist editor
- Calculate accurate total playlist duration using real video lengths
- Use real video duration as the default when adding a video to a playlist

## Tasks

### TASK-019-001: Backend — Add durationSeconds column to Content entity and ffprobe extraction
**Description:** As a developer, I want the Content entity to store video duration and have it extracted via ffprobe during transcoding so that the system knows the actual length of every video.

**Token Estimate:** ~50k tokens
**Predecessors:** none
**Successors:** TASK-019-002, TASK-019-003
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] `Content` entity gets a new column: `durationSeconds` — integer, nullable, default `null`
  - For videos: populated with actual duration in seconds, rounded to nearest integer (e.g. `58`)
  - For images: remains `null` (images have no intrinsic duration)
- [x] New utility function `ffprobeDuration(filePath: string): Promise<number>` that spawns ffprobe to extract duration
  - Uses `ffprobe -v error -show_entries format=duration -of csv=p=0 <file>`
  - Returns duration as an integer (rounded) in seconds
  - Throws on failure (non-zero exit code or unparseable output)
  - Derives ffprobe path from the existing `FFMPEG_PATH` config by replacing `ffmpeg` with `ffprobe` in the binary name
- [x] `TranscodingProcessor.process()` calls ffprobe on the **transcoded** file after successful transcoding and saves `durationSeconds` on the Content entity alongside `transcodedSizeBytes`
- [x] `ContentService` exposes a method `ensureDuration(content: Content): Promise<number | null>` for lazy backfill:
  - If `content.type !== 'video'`, returns `null`
  - If `content.durationSeconds` is already set, returns it
  - Otherwise, runs ffprobe on the transcoded file, saves the result, and returns it
- [x] Content API responses (GET endpoints) include `durationSeconds` field
- [x] Unit tests: ffprobe utility, transcoding processor saves duration, lazy backfill logic
- [x] Typecheck/lint passes

### TASK-019-002: Backend — Use real video duration in playlists and screen protocol
**Description:** As a system, I want playlist total duration and screen state to use real video durations so that duration calculations are accurate.

**Token Estimate:** ~35k tokens
**Predecessors:** TASK-019-001
**Successors:** TASK-019-004
**Parallel:** yes — can run alongside TASK-019-003

**Acceptance Criteria:**
- [ ] `PlaylistService.addItem()`: when adding a video, if `Content.durationSeconds` is available, use it as the `PlaylistItem.durationSeconds` value regardless of what the DTO sends; if not available (backfill pending), use the DTO value as fallback
- [ ] `PlaylistService.getTotalDuration()`: for video items, prefer `item.content.durationSeconds` (from Content entity) over `item.durationSeconds` (from PlaylistItem)
- [ ] `ScreenStateService.mapPlaylist()`: for video items, use `item.content.durationSeconds` if available, falling back to `item.durationSeconds`
- [ ] `AddPlaylistItemDto`: make `durationSeconds` optional (default to content's actual duration for videos, 10 for images)
- [ ] Unit tests for PlaylistService and ScreenStateService updated
- [ ] Typecheck/lint passes

### TASK-019-003: Frontend — Read-only video duration in playlist editor
**Description:** As an editor, I want the duration field for video items to show the actual video length and be non-editable so that I'm not misled by a wrong number.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-019-001
**Successors:** none
**Parallel:** yes — can run alongside TASK-019-002

**Acceptance Criteria:**
- [ ] Frontend `Content` model includes `durationSeconds: number | null` field
- [ ] When adding a video to a playlist, use `content.durationSeconds` as the duration (fall back to 30 if null)
- [ ] Duration input for video items is **disabled** (greyed out) with the label changed to "video length" instead of "Duration"
- [ ] Duration input for image items remains editable with the "Duration" label as before
- [ ] If a video's `durationSeconds` is `null` (not yet backfilled), show the current playlist item value with a "~" prefix as a subtle indicator of approximation
- [ ] Verify in browser: video items show real duration as read-only with "video length" label, image items remain editable with "Duration" label
- [ ] Typecheck/lint passes

### TASK-019-004: Backend — Update existing video playlist items with real durations
**Description:** As a system, I want existing playlist items for videos to be updated when the video's real duration becomes available (via lazy backfill) so that totals are accurate for old playlists too.

**Token Estimate:** ~25k tokens
**Predecessors:** TASK-019-002
**Successors:** none
**Parallel:** yes — can run alongside TASK-019-003

**Acceptance Criteria:**
- [ ] When `ContentService.ensureDuration()` successfully backfills a video's duration, emit an event (e.g. `content.duration_resolved`)
- [ ] `PlaylistService` listens for this event and updates all `PlaylistItem` records referencing that `contentId` where the item's `durationSeconds` differs from the real duration
- [ ] This ensures old playlists with the 30s default get corrected automatically
- [ ] Unit tests for event handling and bulk update
- [ ] Typecheck/lint passes

## Task Dependency Graph

```
TASK-019-001 ──→ TASK-019-002 ──→ TASK-019-004
             └──→ TASK-019-003
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-019-001 | ~50k | none | — | — |
| TASK-019-002 | ~35k | 001 | yes (with 003) | — |
| TASK-019-003 | ~30k | 001 | yes (with 002) | — |
| TASK-019-004 | ~25k | 002 | yes (with 003) | — |

**Total estimated tokens:** ~140k

## Functional Requirements

- FR-1: The system must extract video duration via ffprobe during transcoding and store it as an integer (rounded seconds) on the Content entity
- FR-2: For existing videos without stored duration, the system must lazily extract duration on first access via ffprobe
- FR-3: When a video is added to a playlist, the system must use the actual video duration, not a hardcoded default
- FR-4: The playlist editor must display video duration as a read-only disabled field labeled "video length"
- FR-5: The playlist editor must keep the duration field editable with the "Duration" label for image items
- FR-6: Total playlist duration must use real video durations for accurate calculation
- FR-7: The screen protocol response must include real video duration per playlist item
- FR-8: When a video's duration is backfilled, all existing playlist items referencing it must be updated

## Non-Goals

- No re-extraction of duration if a video is re-transcoded with different settings (duration won't change)
- No duration extraction for images (images have no intrinsic duration)
- No UI for manually overriding video duration (videos always play to completion)
- No changes to player playback logic (player already plays videos to completion via `ended` event)
- No fractional second display (all durations shown as integer seconds)

## Technical Considerations

- **ffprobe path:** ffprobe ships alongside ffmpeg — derive the path from the existing `FFMPEG_PATH` config by replacing `ffmpeg` with `ffprobe` in the binary name
- **Duration precision:** Extract as float from ffprobe, round to nearest integer for storage and display
- **Lazy backfill trigger:** `ensureDuration()` should be called when content is fetched for playlist display or screen state rendering; this avoids a migration script while ensuring all accessed videos get backfilled
- **Schema:** Adding a nullable integer column with default `null` is safe for SQLite — existing rows get `null` automatically
- **TranscodingProcessor already parses duration** from FFmpeg stderr (via `parseDuration` in `ffmpeg-progress.util.ts`) for progress tracking — but ffprobe on the transcoded file is more reliable for the final stored value

## Success Metrics

- A newly uploaded 58-second video shows "58s" (read-only, labeled "video length") in the playlist editor
- Existing videos get their real duration backfilled on first playlist view
- Total playlist duration accurately reflects actual video lengths
- Image duration remains editable with "Duration" label and unaffected

## Open Questions

*None — all questions resolved during clarification.*
