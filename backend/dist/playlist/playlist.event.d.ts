export declare const PLAYLIST_UPDATED = "playlist.updated";
export declare class PlaylistUpdatedEvent {
    readonly playlistId: string;
    readonly organisationId: string;
    constructor(playlistId: string, organisationId: string);
}
