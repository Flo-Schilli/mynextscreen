export interface Screen {
  id: string;
  organisationId: string;
  name: string;
  resolution: string;
  location: string;
  isOnline: boolean;
  lastHeartbeat: string | null;
  groupId: string | null;
  gridRow: number | null;
  gridColumn: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScreenRequest {
  name: string;
  resolution: string;
  location: string;
}

export interface UpdateScreenRequest {
  name?: string;
  resolution?: string;
  location?: string;
}

export interface ScreenWithApiKey {
  screen: Screen;
  apiKey: string;
}
