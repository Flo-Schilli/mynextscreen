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
  screens: ScreenGroupScreen[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreenGroupRequest {
  name: string;
  mode: ScreenGroupMode;
  gridColumns?: number;
  gridRows?: number;
}

export interface UpdateScreenGroupRequest {
  name?: string;
  mode?: ScreenGroupMode;
  gridColumns?: number;
  gridRows?: number;
}

export interface AssignScreenRequest {
  gridRow?: number;
  gridColumn?: number;
}
