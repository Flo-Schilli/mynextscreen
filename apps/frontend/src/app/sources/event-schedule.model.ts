/** A generated entry the server left out because another entry holds the slot. */
export interface EventScheduleConflict {
  sourceEventId: string;
  eventTitle: string;
  eventDate: string;
  screenId: string | null;
  groupId: string | null;
  blockingEntryId: string;
}

export interface EventScheduleReconcileSummary {
  created: number;
  updated: number;
  removed: number;
  conflicts: EventScheduleConflict[];
}

/** "Schedule the playlist from windowStart to windowEnd on every event day at these venues." */
export interface EventScheduleRule {
  id: string;
  organisationId: string;
  sourceId: string;
  name: string;
  venues: string[];
  playlistId: string;
  /** Local `HH:MM`. */
  windowStart: string;
  /** Local `HH:MM`; at or before `windowStart` means the next day. */
  windowEnd: string;
  excludeCancelled: boolean;
  colour: string;
  enabled: boolean;
  screenIds: string[];
  groupIds: string[];
  lastReconciledAt: string | null;
  lastReconcileSummary: EventScheduleReconcileSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventScheduleRuleRequest {
  name: string;
  venues: string[];
  playlistId: string;
  windowStart: string;
  windowEnd: string;
  screenIds: string[];
  groupIds: string[];
  excludeCancelled: boolean;
  colour: string;
  enabled: boolean;
}

export type PreviewTargetStatus = 'scheduled' | 'conflict' | 'pending' | 'excluded';

export interface EventSchedulePreviewItem {
  sourceEventId: string;
  title: string;
  eventDate: string;
  venue: string;
  cancelled: boolean;
  startTime: string;
  endTime: string;
  excluded: boolean;
  targets: { screenId: string | null; groupId: string | null; status: PreviewTargetStatus }[];
}
