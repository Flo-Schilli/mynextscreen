export interface ScheduleEntry {
  id: string;
  organisationId: string;
  screenId: string;
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
}

export interface CreateScheduleEntryRequest {
  screenId: string;
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
