export interface PlaylistItem {
  contentId: string;
  contentUrl: string;
  duration: number;
  type: string;
  order: number;
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
  recurrenceRule?: string;
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

export class ScreenState {
  constructor(
    public readonly screen: ScreenInfo,
    public readonly currentPlaylist: Playlist | null,
    public readonly scheduleEntries: ScheduleEntry[],
    public readonly activeLiveStream: LiveStream | null,
    public readonly fallbackPlaylist: Playlist | null,
    public readonly group: GroupInfo | null = null,
  ) {}
}
