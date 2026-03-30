export interface Playlist {
  id: string;
  organisationId: string;
  name: string;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  contentId: string;
  position: number;
  durationSeconds: number;
  content?: {
    id: string;
    title: string;
    type: 'image' | 'video';
    originalFilename: string;
    transcodingStatus: string;
  };
}

export interface CreatePlaylistRequest {
  name: string;
}

export interface AddPlaylistItemRequest {
  contentId: string;
  durationSeconds: number;
  position?: number;
}

export interface ReorderPlaylistItemsRequest {
  itemIds: string[];
}

export interface BulkDeletePlaylistsResponse {
  deleted: number;
  notFound: string[];
}

export interface BulkAssignScreenResponse {
  assigned: number;
  notFound: string[];
}
