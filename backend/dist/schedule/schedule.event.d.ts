export declare const SCHEDULE_ENTRY_CHANGED = "schedule-entry.changed";
export declare const GROUP_SCHEDULE_CHANGED = "group-schedule.changed";
export declare class ScheduleEntryChangedEvent {
    readonly screenId: string;
    readonly organisationId: string;
    constructor(screenId: string, organisationId: string);
}
export declare class GroupScheduleChangedEvent {
    readonly groupId: string;
    readonly organisationId: string;
    readonly playlistId: string;
    constructor(groupId: string, organisationId: string, playlistId: string);
}
