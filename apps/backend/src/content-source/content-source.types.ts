/**
 * Types shared by the content-source domain and the Drizzle schema. Kept free of
 * imports so `db/schema.ts` can depend on it without a cycle.
 */

/** Slide sizes a source can render, as `<width>x<height>`. */
export const SLIDE_FORMATS = ['1920x1080', '1080x1920', '3840x2160'] as const;
export type SlideFormat = (typeof SLIDE_FORMATS)[number];

export const SLIDE_BACKGROUNDS = ['black', 'blur'] as const;
export type SlideBackground = (typeof SLIDE_BACKGROUNDS)[number];

/** Visual style of a source's slides. */
export interface SlideStyle {
  /** `black`: image fitted with black bars. `blur`: blurred, darkened copy behind it. */
  background: SlideBackground;
  /** `#rrggbb`, used for the status badge. */
  accentColor: string;
}

export const DEFAULT_SLIDE_STYLE: SlideStyle = { background: 'black', accentColor: '#e30613' };

export type ContentSourceSyncStatus = 'running' | 'success' | 'partial' | 'failed';

/** Outcome of one sync run, stored on the source and shown in the dashboard. */
export interface ContentSourceSyncSummary {
  /** Events the adapter listed. */
  listed: number;
  /** Events seen for the first time. */
  created: number;
  /** Known events whose listing data changed. */
  updated: number;
  /** Known events that are no longer listed. */
  gone: number;
  /** Slides rendered (new or re-rendered). */
  rendered: number;
  /** Events or slides that failed; details in `errors`. */
  failed: number;
  /** Human-readable problems, capped to keep the row small. */
  errors: string[];
}

/** Adapter parameters as stored on the source (validated by the adapter). */
export type ContentSourceParams = Record<string, string | number | boolean>;
