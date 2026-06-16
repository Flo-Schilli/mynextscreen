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

/** Thumbnail reference for the first item of a screen's current playlist. */
export interface PlaylistThumbnailRef {
  contentId: string;
  type: 'image' | 'video';
  thumbnailSizeBytes: number | null;
}

/**
 * Screen as returned by `GET /api/screens` — enriched with the currently-playing
 * playlist: its name and a thumbnail of its first item (both null when offline
 * or no active playlist).
 */
export interface ScreenListItem extends Screen {
  currentPlaylistName: string | null;
  currentPlaylistThumbnail: PlaylistThumbnailRef | null;
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
