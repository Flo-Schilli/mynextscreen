"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupScheduleChangedEvent = exports.ScheduleEntryChangedEvent = exports.GROUP_SCHEDULE_CHANGED = exports.SCHEDULE_ENTRY_CHANGED = void 0;
exports.SCHEDULE_ENTRY_CHANGED = 'schedule-entry.changed';
exports.GROUP_SCHEDULE_CHANGED = 'group-schedule.changed';
class ScheduleEntryChangedEvent {
    screenId;
    organisationId;
    constructor(screenId, organisationId) {
        this.screenId = screenId;
        this.organisationId = organisationId;
    }
}
exports.ScheduleEntryChangedEvent = ScheduleEntryChangedEvent;
class GroupScheduleChangedEvent {
    groupId;
    organisationId;
    playlistId;
    constructor(groupId, organisationId, playlistId) {
        this.groupId = groupId;
        this.organisationId = organisationId;
        this.playlistId = playlistId;
    }
}
exports.GroupScheduleChangedEvent = GroupScheduleChangedEvent;
//# sourceMappingURL=schedule.event.js.map