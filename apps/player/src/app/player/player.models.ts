export interface PlaylistItem {
  url: string;
  duration: number;
  type: string;
  transition: string;
  transitionDurationMs: number;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
}

export interface ScheduleEntry {
  id: string;
  playlistId: string;
  startTime: string;
  endTime: string;
  recurrenceRule: string | null;
}

export interface LiveStream {
  id: string;
  streamUrl: string;
  startedAt: string;
}

export interface ScreenInfo {
  id: string;
  name: string;
  organisationId: string;
  resolution: string;
  location: string;
  groupId: string | null;
  gridRow: number | null;
  gridColumn: number | null;
}

export interface GroupInfo {
  id: string;
  name: string;
  mode: 'mirror' | 'split';
  gridRows: number | null;
  gridColumns: number | null;
}

export interface ScreenStateResponse {
  screen: ScreenInfo;
  currentPlaylist: Playlist | null;
  schedule: ScheduleEntry[];
  fallbackPlaylist: Playlist | null;
  liveStream: LiveStream | null;
  group: GroupInfo | null;
  /**
   * Shared playback anchor (epoch ms) for the active playlist — identical for
   * every screen in a group, so deterministic positions stay in lockstep.
   */
  epoch: number;
}

export type ScreenEventType =
  | 'schedule_update'
  | 'playlist_update'
  | 'content_update'
  | 'live_stream_start'
  | 'live_stream_stop'
  | 'group_play'
  | 'pending';

export interface ScreenEvent {
  type: ScreenEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface LiveStreamStartEvent {
  screenId: string;
  organisationId: string;
  groupId?: string;
  syncToken: string;
  streamUrl: string;
  type: string;
}

export interface GroupPlayEvent {
  contentUrl: string;
  contentItemId: string;
  contentType: 'video' | 'image';
  groupId: string;
  syncToken: string;
  screenId: string;
  organisationId: string;
}

export interface PendingEvent {
  contentItemId: string;
  groupId: string;
  syncToken: string;
  screenId: string;
  organisationId: string;
  reason: string;
}
