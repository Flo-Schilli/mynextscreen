# Feature 021: Admin-Configurable FFmpeg Transcoding Presets for Live Streams

## Introduction

Allow admins to select a transcoding quality preset and toggle audio when creating or editing a live stream. The selected preset determines the FFmpeg arguments used during HLS transcoding. This removes the need for developers to hardcode transcoding settings and gives venue operators control over the quality/performance trade-off based on their network and hardware constraints.

### Architecture Context

- **Vision alignment:** VISION.md states live streams are managed by Admin or Editor roles with server-side transcoding. Configurable presets make this practical for non-technical venue staff.
- **Components involved:** `LiveStreamModule` (entity, DTOs, service), `FfmpegLiveService` (arg builder), frontend `live-streams` page (create/edit modals)
- **No new modules** — this extends existing components with two new columns and a preset lookup map

## Goals

- Provide 5 predefined quality presets: Low (480p), Medium (720p), High (1080p), Full HD+ (1440p), Passthrough
- Allow toggling audio on/off per stream (on = AAC 128k, off = strip audio)
- Passthrough preset auto-detects incompatible source codecs after activation and warns the admin
- Store preset and audio settings per live stream in the database
- `FfmpegLiveService.buildArgs()` uses the stored settings instead of hardcoded values

## Tasks

### TASK-021-001: Backend — Add preset enum, entity columns, DTOs, and migration
**Description:** As a developer, I want to add `transcodingPreset` and `audioEnabled` columns to the `LiveStream` entity so that each stream stores its transcoding configuration.

**Token Estimate:** ~35k tokens
**Predecessors:** none
**Successors:** TASK-021-002, TASK-021-003
**Parallel:** yes — can run alongside TASK-021-004

**Acceptance Criteria:**
- [x] New enum `TranscodingPreset` with values: `low_480p`, `medium_720p`, `high_1080p`, `full_hd_plus_1440p`, `passthrough`
- [x] `LiveStream` entity has new column `transcodingPreset` (varchar, default `high_1080p`)
- [x] `LiveStream` entity has new column `audioEnabled` (boolean, default `true`)
- [x] `CreateLiveStreamDto` accepts optional `transcodingPreset` and `audioEnabled` fields with validation
- [x] `UpdateLiveStreamDto` accepts optional `transcodingPreset` and `audioEnabled` fields with validation
- [x] New migration `AddTranscodingPresetToLiveStream` adds both columns with defaults
- [x] Typecheck/lint passes
- [x] Unit tests cover DTO validation (invalid preset rejected, valid preset accepted)

### TASK-021-002: Backend — Update FfmpegLiveService.buildArgs() to use presets
**Description:** As a developer, I want `buildArgs()` to read the stream's preset and audio settings so that FFmpeg uses the correct transcoding parameters.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-021-001
**Successors:** TASK-021-005
**Parallel:** no
**Model:** opus — FFmpeg arg logic is subtle

**Acceptance Criteria:**
- [x] Preset map defines per-preset settings: scale filter, video bitrate, maxrate, bufsize, pixel format
  - `low_480p`: scale=854:-2, 1000k bitrate, 1200k maxrate
  - `medium_720p`: scale=1280:-2, 2000k bitrate, 2400k maxrate
  - `high_1080p`: scale=1920:-2, 2500k bitrate, 3000k maxrate (current default)
  - `full_hd_plus_1440p`: scale=2560:-2, 5000k bitrate, 6000k maxrate
  - `passthrough`: `-c:v copy` (no re-encode), no scale filter, no pixel format conversion
- [x] When `audioEnabled` is `false`, args include `-an` (no audio) instead of AAC encoding
- [x] When `audioEnabled` is `true`, args include `-c:a aac -b:a 128k` (current behaviour)
- [x] All presets except passthrough include `format=yuv420p` in the video filter
- [x] All presets except passthrough include `-preset ultrafast -tune zerolatency -g 60`
- [x] Passthrough still wraps in HLS container (`-f hls` with same hls_time/hls_list_size/hls_flags)
- [x] Existing `buildArgs` unit tests updated, new tests cover each preset and audio toggle
- [x] Typecheck/lint passes

### TASK-021-003: Backend — Passthrough compatibility detection
**Description:** As an admin, I want the system to detect incompatible source codecs when using passthrough mode so that I'm warned if playback may fail in browsers.

**Token Estimate:** ~45k tokens
**Predecessors:** TASK-021-001
**Successors:** TASK-021-005
**Parallel:** yes — can run alongside TASK-021-002

**Acceptance Criteria:**
- [x] New method `probeSourceStream(sourceUrl: string, protocol: LiveStreamProtocol): Promise<{ videoCodec: string, pixelFormat: string, audioCodec: string }>` in `FfmpegLiveService`
- [x] Uses `ffprobe` (same binary path config as ffmpeg) with JSON output to extract codec info
- [x] New method `checkPassthroughCompatibility(probeResult)` returns `{ compatible: boolean, warnings: string[] }`
- [x] Incompatible conditions: video codec not `h264`, pixel format contains `10le` or `10be` (10-bit), audio codec not `aac`
- [x] The `activateStream` method in `LiveStreamService` calls probe + check when preset is `passthrough`, and includes `warnings` array in the response
- [x] Warnings are informational — activation still proceeds (admin decides)
- [x] Typecheck/lint passes
- [x] Unit tests for probe parsing and compatibility checking

### TASK-021-004: Frontend — Add preset and audio fields to models, service, and create/edit modals
**Description:** As an admin, I want to select a transcoding preset and toggle audio when creating or editing a live stream so that I can control the stream quality.

**Token Estimate:** ~50k tokens
**Predecessors:** none
**Successors:** TASK-021-005
**Parallel:** yes — can run alongside TASK-021-001

**Acceptance Criteria:**
- [x] `LiveStream` model interface includes `transcodingPreset` and `audioEnabled` fields
- [x] `CreateLiveStreamRequest` and `UpdateLiveStreamRequest` include optional `transcodingPreset` and `audioEnabled` fields
- [x] New type `TranscodingPreset = 'low_480p' | 'medium_720p' | 'high_1080p' | 'full_hd_plus_1440p' | 'passthrough'`
- [x] Create modal has a "Quality Preset" dropdown with human-readable labels (e.g. "Low (480p)", "Medium (720p)", etc.), default "High (1080p)"
- [x] Create modal has an "Audio" toggle/checkbox, default checked
- [x] Edit modal includes the same fields, pre-populated from the stream's current values
- [x] Streams table shows the preset in a new "Quality" column with readable labels
- [x] Typecheck/lint passes
- [x] ⚠️ BLOCKED: Verify in browser: create modal shows preset dropdown and audio toggle, edit modal pre-fills values — requires running dev server and manual browser verification

### TASK-021-005: Frontend — Show passthrough warnings after activation
**Description:** As an admin, I want to see compatibility warnings when activating a passthrough stream so that I know if the source may not play in browsers.

**Token Estimate:** ~25k tokens
**Predecessors:** TASK-021-003, TASK-021-004
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] Activate response model updated to include optional `warnings: string[]`
- [x] After successful activation, if warnings are present, show a warning banner/alert listing each warning
- [x] Warning banner is dismissible and uses the existing warning styling (amber/yellow)
- [x] No warning shown for non-passthrough presets
- [x] Typecheck/lint passes
- [x] ⚠️ BLOCKED: Verify in browser: activating a passthrough stream with incompatible source shows warning — requires running dev server and manual browser verification

## Task Dependency Graph

```
TASK-021-001 ──→ TASK-021-002 ──→ TASK-021-005
             ──→ TASK-021-003 ──┘
TASK-021-004 ──────────────────┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-021-001 | ~35k | none | yes (with 004) | — |
| TASK-021-002 | ~40k | 001 | no | opus |
| TASK-021-003 | ~45k | 001 | yes (with 002) | — |
| TASK-021-004 | ~50k | none | yes (with 001) | — |
| TASK-021-005 | ~25k | 003, 004 | no | — |

**Total estimated tokens:** ~195k

## Functional Requirements

- FR-1: The system must store a `transcodingPreset` per live stream, with values: `low_480p`, `medium_720p`, `high_1080p`, `full_hd_plus_1440p`, `passthrough`
- FR-2: The system must store an `audioEnabled` boolean per live stream
- FR-3: When `audioEnabled` is false, FFmpeg must strip all audio from the HLS output (`-an`)
- FR-4: When `audioEnabled` is true, FFmpeg must encode audio as AAC at 128 kbps
- FR-5: The `passthrough` preset must use `-c:v copy` (no video re-encoding) and still wrap output in HLS
- FR-6: All non-passthrough presets must force `yuv420p` pixel format for browser compatibility
- FR-7: When activating a stream with `passthrough` preset, the system must probe the source and return compatibility warnings if the video codec is not H.264, the pixel format is 10-bit, or the audio codec is not AAC
- FR-8: The create and edit modals must include a quality preset dropdown and an audio toggle
- FR-9: The streams table must display the quality preset in a readable format
- FR-10: Default preset for new streams is `high_1080p` with audio enabled

## Non-Goals

- No custom bitrate or resolution input fields — strictly predefined presets
- No per-preset audio bitrate choices — audio is always AAC 128k or off
- No adaptive bitrate streaming (ABR/multi-quality HLS) — single quality per stream
- No hardware-accelerated encoding options (NVENC, VAAPI) — software encoding only for now
- No live preview of the transcoded stream in the admin UI

## Design Considerations

- Preset dropdown should show human-readable labels: "Low (480p)", "Medium (720p)", "High (1080p)", "Full HD+ (1440p)", "Passthrough (no re-encode)"
- Passthrough option should have a subtle note: "Uses source codec directly — may not work in all browsers"
- Audio toggle should be a simple checkbox with label "Enable audio"

## Technical Considerations

- The `buildArgs()` method currently hardcodes all transcoding params — this will be refactored to a lookup table
- Passthrough mode must still use `-f hls` with the same segment settings; only video/audio encoding changes
- The `ffprobe` call for passthrough detection should have a timeout (5 seconds) to avoid blocking activation if the source is slow
- Existing streams without the new columns will default to `high_1080p` + audio enabled (migration sets defaults)
- ARCHITECTURE.md Live Streaming section should be updated to mention configurable presets

## Success Metrics

- Admin can create a stream with any of the 5 presets and toggle audio
- FFmpeg args change correctly based on the selected preset
- Passthrough streams show a warning when the source is not browser-compatible
- Existing streams continue to work unchanged after migration

## Open Questions

None — all questions resolved.
