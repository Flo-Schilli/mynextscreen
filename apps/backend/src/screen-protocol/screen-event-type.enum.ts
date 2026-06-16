export enum ScreenEventType {
  ScheduleUpdate = 'schedule_update',
  PlaylistUpdate = 'playlist_update',
  ContentUpdate = 'content_update',
  LiveStreamStart = 'live_stream_start',
  LiveStreamStop = 'live_stream_stop',
  GroupPlay = 'group_play',
  Pending = 'pending',
  /** Per-screen UI settings changed — the player re-fetches its state. */
  SettingsUpdate = 'settings_update',
  /** One-off command: the player reloads itself (like hitting F5). */
  ScreenRefresh = 'refresh',
}
