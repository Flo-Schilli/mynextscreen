export const SCHEDULE_ENTRY_CHANGED = 'schedule-entry.changed';
export const GROUP_SCHEDULE_CHANGED = 'group-schedule.changed';

export class ScheduleEntryChangedEvent {
  constructor(
    public readonly screenId: string,
    public readonly organisationId: string,
  ) {}
}

export class GroupScheduleChangedEvent {
  constructor(
    public readonly groupId: string,
    public readonly organisationId: string,
    public readonly playlistId: string,
  ) {}
}
