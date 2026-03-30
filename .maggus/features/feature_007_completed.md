# Feature 007: Content Library & Transcoding

## Introduction

Implement the per-organisation content library with file upload, metadata management, and background transcoding via FFmpeg and BullMQ. Storage usage is tracked and enforced against per-organisation limits.

### Architecture Context

- **Vision alignment:** "Per-organisation library of uploaded images and videos", "server transcodes to a single target format", "original files are kept alongside transcoded versions", "storage limits enforced per organisation"
- **Components involved:** ContentModule (new), TranscodingModule (new), BullMQ workers, filesystem storage
- **New patterns:** File upload handling, BullMQ job processing, FFmpeg child process, storage accounting

## Goals

- Users (Editor+) can upload images and videos with metadata
- Server transcodes uploads in the background (video → H.264 MP4, image → WebP)
- Original and transcoded files stored on filesystem, tracked per organisation
- Storage limits enforced on upload
- Transcoding progress visible in the frontend

## Tasks

### TASK-007-001: Content Entity & File Storage
**Description:** As the system, I want a Content entity and filesystem storage structure so that uploaded files are persisted and tracked.

**Token Estimate:** ~30k tokens
**Predecessors:** none
**Successors:** TASK-007-002, TASK-007-003
**Parallel:** yes — can run alongside nothing (first task)

**Acceptance Criteria:**
- [x] `Content` entity: `id` (UUID, PK), `organisationId` (FK), `title` (string), `description` (string, nullable), `tags` (simple JSON array of strings), `type` (enum: `image`, `video`), `originalFilename` (string), `originalMimeType` (string), `originalSizeBytes` (bigint), `transcodedSizeBytes` (bigint, nullable), `transcodingStatus` (enum: `pending`, `processing`, `completed`, `failed`), `transcodingError` (string, nullable), `createdAt`, `updatedAt`
- [x] Filesystem structure: `{MEDIA_BASE_PATH}/{organisationId}/originals/{contentId}.{ext}` and `{MEDIA_BASE_PATH}/{organisationId}/transcoded/{contentId}.{target_ext}`
- [x] TypeORM migration creates the table
- [x] Unit tests for entity
- [x] Typecheck and lint pass

### TASK-007-002: Content Service & Upload API
**Description:** As an Editor, I want to upload files and manage content metadata so that I can build a content library for my organisation.

**Token Estimate:** ~55k tokens
**Predecessors:** TASK-007-001
**Successors:** TASK-007-003, TASK-007-005
**Parallel:** no

**Acceptance Criteria:**
- [x] `ContentService` with methods: `upload`, `findAll(orgId)`, `findOne(id, orgId)`, `updateMetadata`, `delete`, `reUpload`
- [x] `ContentController` with routes:
  - `POST /api/content/upload` — multipart file upload (Editor+), accepts file + title + description + tags
  - `GET /api/content` — list content in current org (all roles), filterable by tags and type
  - `GET /api/content/:id` — content detail (all roles)
  - `PATCH /api/content/:id` — update metadata (Editor+)
  - `DELETE /api/content/:id` — delete content + files (Editor+)
  - `POST /api/content/:id/reupload` — replace file (Editor+)
- [x] On upload: check storage limit (original size + current usage ≤ org limit), save original to filesystem, create Content record with `transcodingStatus: pending`, enqueue BullMQ transcoding job
- [x] On delete: remove both files from filesystem, subtract sizes from org storage counters
- [x] On re-upload: overwrite original file, reset transcoding status, enqueue new job, update storage counters
- [x] Input validation: file size limit (configurable), allowed MIME types (image/*, video/*)
- [x] Unit tests for upload flow, storage limit check, delete cleanup
- [x] Typecheck and lint pass

### TASK-007-003: Transcoding Worker (BullMQ + FFmpeg)
**Description:** As the system, I want background workers that transcode uploaded files so that content is optimised for screen playback.

**Token Estimate:** ~60k tokens
**Predecessors:** TASK-007-001, TASK-007-002
**Successors:** TASK-007-005
**Parallel:** no
**Model:** opus

**Acceptance Criteria:**
- [x] `TranscodingProcessor` — BullMQ processor registered for a `transcoding` queue
- [x] On job pickup: update Content status to `processing`
- [x] Video transcoding: spawns FFmpeg child process with args for H.264 MP4 output (configurable bitrate, resolution maintained)
- [x] Image transcoding: spawns FFmpeg (or sharp) for WebP conversion with JPEG fallback
- [x] FFmpeg progress parsing: reads stderr output to extract percentage, reports to BullMQ job progress
- [x] On completion: save transcoded file, update Content record (`transcodedSizeBytes`, `transcodingStatus: completed`), add transcoded size to org storage counter
- [x] On failure: update Content record (`transcodingStatus: failed`, `transcodingError`), log error
- [x] Emit event on completion/failure for dashboard real-time updates
- [x] Job retry: 2 retries with exponential backoff on failure
- [x] Unit tests for progress parsing, status updates
- [x] Typecheck and lint pass

### TASK-007-004: Storage Limit Enforcement
**Description:** As the system, I want to enforce storage limits so that organisations cannot exceed their allocated space.

**Token Estimate:** ~20k tokens
**Predecessors:** TASK-007-002
**Successors:** TASK-007-005
**Parallel:** yes — can run alongside TASK-007-003

**Acceptance Criteria:**
- [x] `StorageService` with methods: `checkOriginalLimit(orgId, additionalBytes)`, `checkTranscodedLimit(orgId, additionalBytes)`, `addOriginalUsage(orgId, bytes)`, `subtractOriginalUsage(orgId, bytes)`, same for transcoded
- [x] Upload endpoint checks original limit before accepting the file
- [x] Transcoding worker checks transcoded limit before saving (if exceeded: mark as failed with clear error, don't save transcoded file)
- [x] `GET /api/organisations/:orgId/storage` — returns current usage vs limits (all roles)
- [x] Unit tests for limit checking, usage tracking
- [x] Typecheck and lint pass

### TASK-007-005: Content Library UI
**Description:** As an Editor, I want a content library page to upload, browse, and manage media files.

**Token Estimate:** ~65k tokens
**Predecessors:** TASK-007-002, TASK-007-003, TASK-007-004
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] `/content` route showing grid view with thumbnails
- [x] Filterable by tags (chips/pills) and type (image/video toggle)
- [x] Upload area: drag-and-drop zone + file picker button, supports multiple files
- [x] Upload progress bar per file, then transcoding status indicator (pending → processing with progress % → completed/failed)
- [x] Content detail view: preview (image rendered, video with HTML5 player), metadata editing (title, description, tags), file sizes (original + transcoded), transcoding status
- [x] Delete button with confirmation dialog
- [x] Re-upload button on detail view
- [x] Real-time transcoding progress updates via Socket.IO
- [x] Storage usage bar showing original and transcoded usage vs limits
- [x] Dark-themed, consistent styling
- [x] ⚠️ BLOCKED: Verify in browser: can upload a file, see transcoding progress, view in grid, edit metadata, delete — Cannot verify in browser in automated mode (requires running backend with Redis, DB, and FFmpeg)

## Task Dependency Graph

```
TASK-007-001 ──→ TASK-007-002 ──→ TASK-007-003 ──→ TASK-007-005
                      │                               ↑
                      └──→ TASK-007-004 ─────────────┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-007-001 | ~30k | none | — | — |
| TASK-007-002 | ~55k | 001 | no | — |
| TASK-007-003 | ~60k | 001, 002 | no | opus |
| TASK-007-004 | ~20k | 002 | yes (with 003) | — |
| TASK-007-005 | ~65k | 002, 003, 004 | no | — |

**Total estimated tokens:** ~230k

## Functional Requirements

- FR-1: Editors and Org Admins can upload images and videos
- FR-2: Uploaded files are transcoded in the background (video → H.264 MP4, image → WebP)
- FR-3: Original files are always kept alongside transcoded versions
- FR-4: Storage usage is tracked per organisation (originals and transcoded separately)
- FR-5: Uploads are rejected if they would exceed the organisation's storage limit
- FR-6: Re-uploading a content item overwrites the previous version (no versioning)
- FR-7: Transcoding progress is visible in real time on the dashboard
- FR-8: Content is filterable by tags and type

## Non-Goals

- No automatic thumbnail generation (use the transcoded file or first video frame later)
- No bulk upload progress (individual file progress only)
- No content versioning
- No configurable transcoding profiles (single target format for now)

## Technical Considerations

- Use NestJS `FileInterceptor` (multer) for multipart upload handling
- FFmpeg must be available in the Docker container — add to Dockerfile
- Large video uploads may need increased request size limits in NestJS config
- Transcoding progress is approximate (FFmpeg reports percentage based on duration)
- Consider using `sharp` instead of FFmpeg for image transcoding — it's faster and has a native Node.js API. FFmpeg works too but is heavier for images.
- The `transcoding` BullMQ queue should have concurrency set to limit simultaneous FFmpeg processes (e.g. 2)

## Success Metrics

- Files can be uploaded and are transcoded within a reasonable time
- Storage usage accurately reflects uploaded and transcoded file sizes
- Uploads exceeding the storage limit are rejected with a clear error message

## Open Questions

None — all resolved.
