export interface Screen {
  id: string;
  organisationId: string;
  name: string;
  resolution: string;
  location: string;
  isOnline: boolean;
  lastHeartbeat: string | null;
  /**
   * Reported by the player on its heartbeat. Optional: absent from an older
   * backend, null when a screen has never reported one — both mean "unknown".
   */
  playerVersion?: string | null;
  groupId: string | null;
  gridRow: number | null;
  gridColumn: number | null;
  /** Show the "Click to unmute" overlay on the player (defaults to shown). */
  showUnmuteButton?: boolean;
  /** Show the "Disconnect" button on the player (defaults to shown). */
  showDisconnectButton?: boolean;
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
  /**
   * Which site agent looks after this screen, and what it last saw on the
   * network. Null for a screen no agent manages — which is most of them, and
   * for which the tile falls back to what the heartbeat alone can say.
   */
  agentId: string | null;
  reachability: 'unknown' | 'reachable' | 'unreachable' | null;
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
  showUnmuteButton?: boolean;
  showDisconnectButton?: boolean;
}

export interface BulkDeleteResponse {
  deleted: number;
  notFound: string[];
}

export interface BulkAssignGroupResponse {
  updated: number;
  notFound: string[];
}
