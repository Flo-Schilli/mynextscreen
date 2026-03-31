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
}
export declare class ScreenState {
    readonly screen: ScreenInfo;
    readonly currentPlaylist: Playlist | null;
    readonly scheduleEntries: ScheduleEntry[];
    readonly activeLiveStream: LiveStream | null;
    readonly fallbackPlaylist: Playlist | null;
    constructor(screen: ScreenInfo, currentPlaylist: Playlist | null, scheduleEntries: ScheduleEntry[], activeLiveStream: LiveStream | null, fallbackPlaylist: Playlist | null);
}
