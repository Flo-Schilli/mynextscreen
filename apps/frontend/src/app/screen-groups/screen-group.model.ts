export type ScreenGroupMode = 'mirror' | 'split';

export interface ScreenGroupScreen {
  id: string;
  name: string;
  location: string;
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
