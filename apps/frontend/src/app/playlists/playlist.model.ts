import type { SlideFormat } from '../sources/content-source.model';

/** `static`: items curated by hand. `dynamic`: items computed from a rule. */
export type PlaylistKind = 'static' | 'dynamic';

export interface Playlist {
  id: string;
  organisationId: string;
  name: string;
  color: string;
  /** Missing on payloads from before dynamic playlists; treat as `static`. */
  kind?: PlaylistKind;
  /** Filter rule of a dynamic playlist; null for static ones. */
  rule?: PlaylistRule | null;
  nextResolveAt?: string | null;
  lastResolvedAt?: string | null;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}

export function isDynamicPlaylist(playlist: Pick<Playlist, 'kind'>): boolean {
  return playlist.kind === 'dynamic';
}

export type GenreMatchMode = 'any' | 'all';
export type RuleSortOrder = 'date_asc' | 'date_desc';

/** Lower bound of the date window. `today` keeps every event that has not expired yet. */
export type RuleDateFrom =
  { mode: 'today' } | { mode: 'fixed'; date: string } | { mode: 'relativeDays'; days: number };

/** Upper bound of the date window, inclusive. */
export type RuleDateTo =
  { mode: 'none' } | { mode: 'fixed'; date: string } | { mode: 'relativeDays'; days: number };

/** Rule of a dynamic playlist, as stored and as sent (mirrors the backend `PlaylistRule`). */
export interface PlaylistRule {
  sourceIds: string[];
  /** Empty `values` means every genre. */
  genres: { match: GenreMatchMode; values: string[] };
  /** Exact venue names; empty means every venue. */
  venues: string[];
  dateFrom: RuleDateFrom;
  dateTo: RuleDateTo;
  excludeCancelled: boolean;
  excludeSoldOut: boolean;
  sort: RuleSortOrder;
  limit: number;
  /** Hours after the local end of the event day until the event drops out. */
  graceHours: number;
  refreshIntervalMinutes: number;
  format: SlideFormat;
  itemDurationSeconds: number;
  transition: TransitionType;
  transitionDurationMs: number;
}

/** Bounds of the rule fields (backend `PlaylistRuleDto`). */
export const RULE_BOUNDS = {
  maxSources: 20,
  limit: { min: 1, max: 200, default: 50 },
  graceHours: { min: 0, max: 24, default: 4 },
  refreshIntervalMinutes: { min: 5, max: 1440, default: 15 },
  itemDurationSeconds: { min: 1, max: 3600, default: 10 },
  transitionDurationMs: { min: 0, max: 3000, default: 500 },
  relativeDays: { min: 0, max: 730 },
} as const;

export interface RulePreviewItem {
  sourceEventId: string;
  sourceId: string;
  contentId: string;
  /** `updatedAt` of the slide content, ISO; versions the thumbnail URL. */
  contentUpdatedAt: string | null;
  title: string;
  eventDate: string;
  startTime: string | null;
  venue: string;
  city: string | null;
  genres: string[];
  statusLabels: string[];
  cancelled: boolean;
  soldOut: boolean;
  /** When the event drops out of the playlist (end of day + grace hours), ISO. */
  expiresAt: string;
}

export interface RulePreviewResult {
  items: RulePreviewItem[];
  totalDurationSeconds: number;
}

/** The seven accent swatches offered when creating/editing a playlist. */
export const PLAYLIST_COLORS = [
  '#6d6cf6',
  '#0ea5e9',
  '#ec4899',
  '#14b8a6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
] as const;

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
    thumbnailSizeBytes: number | null;
    /** Versions media URLs: a re-upload or re-rendered slide keeps its id. */
    updatedAt?: string;
  };
}

export interface CreatePlaylistRequest {
  name: string;
  color?: string;
  kind?: PlaylistKind;
  /** Required for `dynamic`. */
  rule?: PlaylistRule;
}

export interface UpdatePlaylistRequest {
  name: string;
  color?: string;
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

/** Patch applied to every item; `durationSeconds` only reaches image items. */
export type UpdateAllPlaylistItemsRequest = UpdatePlaylistItemRequest;

export interface UpdateAllPlaylistItemsResponse {
  updated: number;
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
