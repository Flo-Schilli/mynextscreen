import { ScreenGroupMode } from '../screen-groups/screen-group.model';

export interface ScheduleEntry {
  id: string;
  organisationId: string;
  screenId: string | null;
  groupId: string | null;
  playlistId: string;
  startTime: string;
  endTime: string;
  rrule: string | null;
  colour: string;
  createdAt: string;
  updatedAt: string;
  playlist?: {
    id: string;
    name: string;
  };
  screen?: {
    id: string;
    name: string;
  };
  group?: {
    id: string;
    name: string;
    mode: ScreenGroupMode;
  };
}

export interface CreateScheduleEntryRequest {
  screenId?: string;
  groupId?: string;
  playlistId: string;
  startTime: string;
  endTime: string;
  rrule?: string;
  colour: string;
}

export interface UpdateScheduleEntryRequest {
  playlistId?: string;
  startTime?: string;
  endTime?: string;
  rrule?: string | null;
  colour?: string;
}

/** A schedule target shown in the selectors: a single screen or a screen group. */
export interface TargetOption {
  id: string;
  name: string;
  type: 'screen' | 'group';
  mode?: ScreenGroupMode;
}
