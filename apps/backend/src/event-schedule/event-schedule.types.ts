/** A generated entry the reconcile left out because another entry holds the slot. */
export interface EventScheduleConflict {
  sourceEventId: string;
  eventTitle: string;
  eventDate: string;
  screenId: string | null;
  groupId: string | null;
  /** The entry that holds the slot. */
  blockingEntryId: string;
}

/** Outcome of the last reconcile of a rule, shown next to the rule. */
export interface EventScheduleReconcileSummary {
  created: number;
  updated: number;
  removed: number;
  conflicts: EventScheduleConflict[];
}
