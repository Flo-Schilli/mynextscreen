export type ScreenGroupMode = 'mirror' | 'split';

export interface ScreenGroupScreen {
  id: string;
  name: string;
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
