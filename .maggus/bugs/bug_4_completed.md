# Bug: Split-mode screen groups serve original unsliced content — all screens show identical full content

## Summary

When a schedule is assigned to a split-mode screen group, all screens receive URLs pointing to the original full content (`/api/media/${organisationId}/${contentId}`) instead of their per-screen sliced renditions. The `SliceContentProcessor` creates cropped files and `SlicedRendition` records, but the state assembly pipeline never consumes them. There is also no media endpoint to serve the sliced files. The result is that all screens in a split group display the same full image/video instead of their respective cropped portion.

## Steps to Reproduce

1. Create a screen group in `split` mode with a 1x2 grid (1 row, 2 columns)
2. Add two screens to the group at positions (0,0) and (0,1)
3. Create a playlist with a video or image content item
4. Assign a schedule to the **screen group** (not individual screens) with that playlist
5. Both screens connect via SSE and fetch their state via `GET /screens/{id}/state`
6. Observe: both screens receive identical playlist items with `url: /api/media/{orgId}/{contentId}` — the original unsliced content

## Expected Behavior

- Screen at (0,0) should receive `url: /api/media/slices/{groupId}/{screenId_0}/{contentId}`
- Screen at (0,1) should receive `url: /api/media/slices/{groupId}/{screenId_1}/{contentId}`
- Each screen displays only its cropped portion of the content

## Root Cause

Three disconnected pieces form the bug:

**1. `assembleState` is group-unaware (`backend/src/screen/screen-state.service.ts:83-163`)**

`assembleState` calls `mapPlaylist()` (line 123) which sets `contentUrl: ''` for every item (line 187). It never checks whether the screen belongs to a split group and never queries `SlicedRendition` records. The group info and grid position are included in the state response, but the playlist URLs are not adjusted.

**2. `JsonProtocolAdapter.renderPlaylistItem` always generates the original URL (`backend/src/screen-protocol/json-protocol-adapter.ts:63-74`)**

`renderPlaylistItem` unconditionally builds `/api/media/${organisationId}/${item.contentId}` (line 68). It has no access to screen or group context, so it cannot substitute sliced rendition URLs even if they existed on the playlist item.

**3. No media endpoint for sliced content (`backend/src/media/media.controller.ts`)**

The `MediaController` only has `GET /media/:organisationId/:contentId` which serves from the `transcoded/` directory. There is no route matching `/media/slices/:groupId/:screenId/:contentId`. The `ScreenProtocolService.fanOutSplitPlay` (line 281 of `screen-protocol.service.ts`) already generates URLs in this shape, but nothing can serve them.

## User Stories

### BUG-004-001: Serve sliced rendition URLs in screen state for split-mode groups

**Description:** As a screen in a split-mode group, I want my state response to contain URLs pointing to my sliced content renditions so that I display only my cropped portion of the content.

**Acceptance Criteria:**
- [x] `assembleState` (or `mapPlaylist`) checks if the screen belongs to a split-mode group
- [x] When sliced renditions exist for a content item + screen + group, the playlist item's URL points to the sliced file (e.g., `/api/media/slices/{groupId}/{screenId}/{contentId}`)
- [x] When no sliced rendition exists yet (job still processing), the original URL is used as fallback
- [x] Mirror-mode groups and ungrouped screens are unaffected — they still receive original URLs
- [x] Existing tests pass, new tests cover split-mode URL substitution
- [x] `npm run lint` and `npm run test` pass

### BUG-004-002: Add media endpoint to serve sliced rendition files

**Description:** As a screen player fetching sliced content, I want a media endpoint that serves cropped rendition files so that split-mode playback works end-to-end.

**Acceptance Criteria:**
- [x] New route `GET /media/slices/:groupId/:screenId/:contentId` in `MediaController`
- [x] Endpoint is protected with `@ScreenAuth()` and validates the screen belongs to the requested group and organisation
- [x] Serves the file from the `SlicedRendition.filePath` stored in the database
- [x] Returns 404 if the rendition does not exist
- [x] Sets appropriate `Content-Type` and caching headers (consistent with existing media endpoint)
- [x] Existing tests pass, new tests cover the sliced media endpoint
- [x] `npm run lint` and `npm run test` pass
