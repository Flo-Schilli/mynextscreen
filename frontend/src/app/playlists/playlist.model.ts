export interface Playlist {
  id: string;
  organisationId: string;
  name: string;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}

export type TransitionType =
  | 'cut'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out';

export const TRANSITION_OPTIONS: { value: TransitionType; label: string }[] = [
  { value: 'cut', label: 'Cut' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
];

export interface PlaylistItem {
  id: string;
  playlistId: string;
  contentId: string;
  position: number;
  durationSeconds: number;
  transition: TransitionType;
  transitionDurationMs: number;
  content?: {
    id: string;
    title: string;
    type: 'image' | 'video';
    originalFilename: string;
    transcodingStatus: string;
    durationSeconds: number | null;
  };
}

export interface CreatePlaylistRequest {
  name: string;
}

export interface AddPlaylistItemRequest {
  contentId: string;
  durationSeconds: number;
  position?: number;
  transition?: TransitionType;
  transitionDurationMs?: number;
}

export interface UpdatePlaylistItemRequest {
  transition?: TransitionType;
  transitionDurationMs?: number;
  durationSeconds?: number;
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
