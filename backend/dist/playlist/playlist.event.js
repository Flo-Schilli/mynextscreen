"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaylistUpdatedEvent = exports.PLAYLIST_UPDATED = void 0;
exports.PLAYLIST_UPDATED = 'playlist.updated';
class PlaylistUpdatedEvent {
    playlistId;
    organisationId;
    constructor(playlistId, organisationId) {
        this.playlistId = playlistId;
        this.organisationId = organisationId;
    }
}
exports.PlaylistUpdatedEvent = PlaylistUpdatedEvent;
//# sourceMappingURL=playlist.event.js.map