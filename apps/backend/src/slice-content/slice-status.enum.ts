/**
 * Lifecycle of a split-group pre-transcoding (slicing) run for one
 * (group, playlist) pair. Mirrors {@link TranscodingStatus} so the frontend can
 * reuse the same status-pill / progress-bar patterns.
 */
export enum SliceStatus {
  Queued = 'queued',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}
