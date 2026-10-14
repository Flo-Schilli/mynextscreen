/** BullMQ queue that recomputes the items of one dynamic playlist per job. */
export const PLAYLIST_RESOLVE_QUEUE = 'playlist-resolve';
export const PLAYLIST_RESOLVE_JOB = 'resolve';

/**
 * One job id per playlist, so a resolve that is still waiting absorbs further
 * requests, also across instances. BullMQ rejects `:` in custom ids.
 */
export const resolveJobId = (playlistId: string): string => `resolve-${playlistId}`;

export interface PlaylistResolveJobData {
  playlistId: string;
}
