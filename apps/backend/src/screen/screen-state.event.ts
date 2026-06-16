export const SCHEDULE_CHANGED = 'schedule.changed';
export const PLAYLIST_CHANGED = 'playlist.changed';
export const CONTENT_CHANGED = 'content.changed';
export const LIVE_STREAM_STARTED = 'live-stream.started';
export const LIVE_STREAM_STOPPED = 'live-stream.stopped';
/** A screen's player UI settings changed — push a state refresh to that screen. */
export const SCREEN_SETTINGS_CHANGED = 'screen.settings.changed';
/** Admin asked a screen to reload its player (like hitting F5). */
export const SCREEN_REFRESH_REQUESTED = 'screen.refresh.requested';

export class ScreenStateChangeEvent {
  constructor(
    public readonly screenId: string,
    public readonly organisationId: string,
  ) {}
}
