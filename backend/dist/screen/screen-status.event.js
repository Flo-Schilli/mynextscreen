"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCREEN_STATUS_CHANGED = exports.ScreenStatusEvent = void 0;
class ScreenStatusEvent {
    screenId;
    organisationId;
    isOnline;
    constructor(screenId, organisationId, isOnline) {
        this.screenId = screenId;
        this.organisationId = organisationId;
        this.isOnline = isOnline;
    }
}
exports.ScreenStatusEvent = ScreenStatusEvent;
exports.SCREEN_STATUS_CHANGED = 'screen.status.changed';
//# sourceMappingURL=screen-status.event.js.map