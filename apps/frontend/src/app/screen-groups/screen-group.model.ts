export type ScreenGroupMode = 'mirror' | 'split';

export type SliceStatus = 'queued' | 'processing' | 'completed' | 'failed';

/** Durable split pre-transcoding status for a group's playlist (reload-safe). */
export interface SliceJobStatus {
  groupId: string;
  playlistId: string;
  status: SliceStatus;
  totalItems: number;
  completedItems: number;
  error: string | null;
}

export interface ScreenGroupScreen {
  id: string;
  name: string;
  location: string;
  isOnline: boolean;
  groupId: string | null;
  gridRow: number | null;
  gridColumn: number | null;
}

export interface ScreenGroup {
  id: string;
  organisationId: string;
  name: string;
  mode: ScreenGroupMode;
  gridColumns: number | null;
  gridRows: number | null;
  color: string;
  icon: string;
  screens: ScreenGroupScreen[];
  /** Latest split slicing status; present on detail (findOne), null if never sliced. */
  sliceStatus?: SliceJobStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreenGroupRequest {
  name: string;
  mode: ScreenGroupMode;
  gridColumns?: number;
  gridRows?: number;
  color?: string;
  icon?: string;
}

export interface UpdateScreenGroupRequest {
  name?: string;
  mode?: ScreenGroupMode;
  gridColumns?: number;
  gridRows?: number;
  color?: string;
  icon?: string;
}

export interface AssignScreenRequest {
  gridRow?: number;
  gridColumn?: number;
}

/** Create-modal payload: the group request plus screen ids to assign on create. */
export interface CreateScreenGroupSubmit {
  request: CreateScreenGroupRequest;
  screenIds: string[];
}
