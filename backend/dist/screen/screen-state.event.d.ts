export declare const SCHEDULE_CHANGED = "schedule.changed";
export declare const PLAYLIST_CHANGED = "playlist.changed";
export declare const CONTENT_CHANGED = "content.changed";
export declare const LIVE_STREAM_STARTED = "live-stream.started";
export declare const LIVE_STREAM_STOPPED = "live-stream.stopped";
export declare class ScreenStateChangeEvent {
    readonly screenId: string;
    readonly organisationId: string;
    constructor(screenId: string, organisationId: string);
}
