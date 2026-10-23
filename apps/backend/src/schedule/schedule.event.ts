export const SCHEDULE_ENTRY_CHANGED = 'schedule-entry.changed';
export const GROUP_SCHEDULE_CHANGED = 'group-schedule.changed';

export class ScheduleEntryChangedEvent {
  constructor(
    public readonly screenId: string,
    public readonly organisationId: string,
    /** True when an event schedule rule made the change, not a person. */
    public readonly managed = false,
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
    /** True when an event schedule rule made the change, not a person. */
    public readonly managed = false,
  ) {}
}
