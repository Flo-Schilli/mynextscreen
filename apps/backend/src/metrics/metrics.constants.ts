/** How often the scheduler captures a metric snapshot for every org + the host. */
export const SNAPSHOT_INTERVAL_MS = 5 * 60_000;

/** Snapshots older than this are pruned on each capture tick. */
export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** Trailing window the history endpoints expose to the dashboards. */
export const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Bucket stride the history endpoints downsample to (a Postgres `interval`
 * literal). Finer than the 1-hour first cut so the charts fill with real data
 * within a couple of capture cycles instead of waiting to cross an hour
 * boundary. At a 5-minute snapshot cadence this averages ~3 samples per bucket
 * and yields up to 96 points across the 24h window.
 */
export const HISTORY_BUCKET = '15 minutes';
