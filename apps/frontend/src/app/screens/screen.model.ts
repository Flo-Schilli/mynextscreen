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

/**
 * Screen as returned by `GET /api/screens` — enriched with the name of the
 * currently-playing playlist (null when offline or no active playlist).
 */
export interface ScreenListItem extends Screen {
  currentPlaylistName: string | null;
}

export interface CreateScreenRequest {
  name: string;
  resolution: string;
  location: string;
  /** 6-digit numeric pairing code shown by the display being paired. */
  pairingCode: string;
}

export interface UpdateScreenRequest {
  name?: string;
  resolution?: string;
  location?: string;
}

export interface BulkDeleteResponse {
  deleted: number;
  notFound: string[];
}

export interface BulkAssignGroupResponse {
  updated: number;
  notFound: string[];
}
