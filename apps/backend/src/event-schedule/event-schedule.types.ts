/** A generated entry the reconcile left out because another entry holds the slot. */
export interface EventScheduleConflict {
  sourceEventId: string;
  eventTitle: string;
  eventDate: string;
  screenId: string | null;
  groupId: string | null;
  /** The entry that holds the slot. */
  blockingEntryId: string;
  /**
   * The slot the rule would have filled, and with which playlist. Absent in
   * summaries stored before they were recorded.
   */
  startTime?: string;
  endTime?: string;
  playlistId?: string;
}

/** Outcome of the last reconcile of a rule, shown next to the rule. */
export interface EventScheduleReconcileSummary {
  created: number;
  updated: number;
  removed: number;
  conflicts: EventScheduleConflict[];
}

/**
 * A group of genres on a rule. An event with one of them plays the rule's
 * playlist narrowed to these genres.
 */
export interface GenreVariant {
  genres: string[];
}
