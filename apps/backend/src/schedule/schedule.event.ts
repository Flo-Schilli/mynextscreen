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
    /**
     * Nullable because a group entry can roll into the organisation fallback,
     * which has no playlist. No consumer reads this today — listeners re-resolve
     * the group's current playlist themselves — so it is carried for logging and
     * as a hint, not as the source of truth.
     */
    public readonly playlistId: string | null,
  ) {}
}
