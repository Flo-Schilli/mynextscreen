export const SCHEDULE_ENTRY_CHANGED = 'schedule-entry.changed';

export class ScheduleEntryChangedEvent {
  constructor(
    public readonly screenId: string,
    public readonly organisationId: string,
  ) {}
}
