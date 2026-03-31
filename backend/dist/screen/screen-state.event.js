"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenStateChangeEvent = exports.LIVE_STREAM_STOPPED = exports.LIVE_STREAM_STARTED = exports.CONTENT_CHANGED = exports.PLAYLIST_CHANGED = exports.SCHEDULE_CHANGED = void 0;
exports.SCHEDULE_CHANGED = 'schedule.changed';
exports.PLAYLIST_CHANGED = 'playlist.changed';
exports.CONTENT_CHANGED = 'content.changed';
exports.LIVE_STREAM_STARTED = 'live-stream.started';
exports.LIVE_STREAM_STOPPED = 'live-stream.stopped';
class ScreenStateChangeEvent {
    screenId;
    organisationId;
    constructor(screenId, organisationId) {
        this.screenId = screenId;
        this.organisationId = organisationId;
    }
}
exports.ScreenStateChangeEvent = ScreenStateChangeEvent;
//# sourceMappingURL=screen-state.event.js.map