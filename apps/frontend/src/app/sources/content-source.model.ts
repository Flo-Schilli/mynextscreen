/** Slide sizes a source can render, as `<width>x<height>` (mirrors the backend). */
export const SLIDE_FORMATS = ['1920x1080', '1080x1920', '3840x2160'] as const;
export type SlideFormat = (typeof SLIDE_FORMATS)[number];

export const SLIDE_BACKGROUNDS = ['black', 'blur'] as const;
export type SlideBackground = (typeof SLIDE_BACKGROUNDS)[number];

export interface SlideStyle {
  background: SlideBackground;
  /** `#rrggbb`, used for the status badge on the slide. */
  accentColor: string;
}

export const DEFAULT_SLIDE_STYLE: SlideStyle = { background: 'black', accentColor: '#e30613' };

/** Bounds of `syncIntervalMinutes` (backend `CreateContentSourceDto`). */
export const SYNC_INTERVAL_MIN_MINUTES = 15;
export const SYNC_INTERVAL_MAX_MINUTES = 10_080;
export const DEFAULT_SYNC_INTERVAL_MINUTES = 360;

export type ContentSourceSyncStatus = 'running' | 'success' | 'partial' | 'failed';

export interface ContentSourceSyncSummary {
  listed: number;
  created: number;
  updated: number;
  gone: number;
  rendered: number;
  failed: number;
  errors: string[];
}

export type ContentSourceParams = Record<string, string | number | boolean>;

export interface ContentSource {
  id: string;
  organisationId: string;
  name: string;
  adapterType: string;
  params: ContentSourceParams;
  formats: SlideFormat[];
  style: SlideStyle;
  syncIntervalMinutes: number;
  enabled: boolean;
  nextSyncAt: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: ContentSourceSyncStatus | null;
  lastSyncError: string | null;
  lastSyncSummary: ContentSourceSyncSummary | null;
  createdAt: string;
  updatedAt: string;
}

/** One adapter parameter; the form is rendered from these. */
export interface ParamField {
  key: string;
  type: 'integer';
  label: string;
  min: number;
  max: number;
  default: number;
}

export interface AdapterDescriptor {
  type: string;
  label: string;
  paramsSchema: ParamField[];
}

export interface SourceFacets {
  venues: string[];
  genres: string[];
}

export interface SourceEventSlide {
  format: SlideFormat;
  contentId: string;
  /** Of the slide's content, ISO. A re-render keeps the id, so this versions the URLs. */
  updatedAt: string;
}

export interface SourceEvent {
  id: string;
  sourceId: string;
  externalId: string;
  title: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  eventDate: string;
  /** Local start time `HH:MM`, or null. */
  startTime: string | null;
  venue: string;
  city: string | null;
  genres: string[];
  statusLabels: string[];
  cancelled: boolean;
  soldOut: boolean;
  detailUrl: string | null;
  ticketUrl: string | null;
  goneAt: string | null;
  slides: SourceEventSlide[];
}

export interface CreateContentSourceRequest {
  name: string;
  adapterType: string;
  params: ContentSourceParams;
  formats: SlideFormat[];
  style: SlideStyle;
  syncIntervalMinutes: number;
  enabled: boolean;
}

/** The adapter type is fixed once a source exists. */
export type UpdateContentSourceRequest = Partial<Omit<CreateContentSourceRequest, 'adapterType'>>;

export interface SourceEventsQuery {
  from?: string;
  to?: string;
  venues?: string[];
  genres?: string[];
  includeGone?: boolean;
  limit?: number;
  offset?: number;
}
