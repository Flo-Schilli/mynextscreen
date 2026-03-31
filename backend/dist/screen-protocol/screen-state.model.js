"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenState = void 0;
class ScreenState {
    screen;
    currentPlaylist;
    scheduleEntries;
    activeLiveStream;
    fallbackPlaylist;
    constructor(screen, currentPlaylist, scheduleEntries, activeLiveStream, fallbackPlaylist) {
        this.screen = screen;
        this.currentPlaylist = currentPlaylist;
        this.scheduleEntries = scheduleEntries;
        this.activeLiveStream = activeLiveStream;
        this.fallbackPlaylist = fallbackPlaylist;
    }
}
exports.ScreenState = ScreenState;
//# sourceMappingURL=screen-state.model.js.map