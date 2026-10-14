/** BullMQ queue that runs one sync of one content source per job. */
export const CONTENT_SOURCE_SYNC_QUEUE = 'content-source-sync';
export const CONTENT_SOURCE_SYNC_JOB = 'sync';

/**
 * One job id per source, so a sync that is still waiting or running absorbs
 * every further request, also across instances. BullMQ rejects `:` in custom
 * ids, hence the dash.
 */
export const syncJobId = (sourceId: string): string => `sync-${sourceId}`;

export interface ContentSourceSyncJobData {
  sourceId: string;
  /** User who pressed "sync now"; null for the scheduler. */
  triggeredBy: string | null;
}

/** Daily housekeeping job on the same queue; see `ContentSourceCleanupService`. */
export const CONTENT_SOURCE_CLEANUP_JOB = 'cleanup';

/**
 * One job id per UTC day. The finished job is kept for two days, so the id
 * stays taken and every further add of that day, from any instance, is a no-op.
 */
export const cleanupJobId = (day: string): string => `cleanup-${day}`;
export const CLEANUP_JOB_RETENTION_SECONDS = 2 * 24 * 60 * 60;

export interface ContentSourceCleanupJobData {
  /** UTC day (`YYYY-MM-DD`) the run belongs to. */
  day: string;
}

export type ContentSourceJobData = ContentSourceSyncJobData | ContentSourceCleanupJobData;

/**
 * Emitted after a sync stored its events and slides. Consumers that derive
 * state from the event pool (dynamic playlists) refresh on it.
 */
export const CONTENT_SOURCE_SYNCED = 'content_source.synced';

export class ContentSourceSyncedEvent {
  constructor(
    public readonly sourceId: string,
    public readonly organisationId: string,
  ) {}
}
