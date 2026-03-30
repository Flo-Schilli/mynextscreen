export const SCHEDULE_CHANGED = 'schedule.changed';
export const PLAYLIST_CHANGED = 'playlist.changed';
export const CONTENT_CHANGED = 'content.changed';
export const LIVE_STREAM_STARTED = 'live-stream.started';
export const LIVE_STREAM_STOPPED = 'live-stream.stopped';

export class ScreenStateChangeEvent {
  constructor(
    public readonly screenId: string,
    public readonly organisationId: string,
  ) {}
}
