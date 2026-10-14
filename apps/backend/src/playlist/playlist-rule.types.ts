import type { SlideFormat } from '../content-source/content-source.types';
import type { TransitionType } from './transition-type.enum';

/**
 * Shape of the rule stored on a dynamic playlist. Kept free of runtime imports
 * so `db/schema.ts` can type its jsonb column with it; `PlaylistRuleDto`
 * validates the same shape on the way in.
 */

export const GENRE_MATCH_MODES = ['any', 'all'] as const;
export type GenreMatchMode = (typeof GENRE_MATCH_MODES)[number];

export const RULE_SORT_ORDERS = ['date_asc', 'date_desc'] as const;
export type RuleSortOrder = (typeof RULE_SORT_ORDERS)[number];

/** Lower bound of the date window. `today` keeps every event that has not expired yet. */
export type RuleDateFrom =
  { mode: 'today' } | { mode: 'fixed'; date: string } | { mode: 'relativeDays'; days: number };

/** Upper bound of the date window, inclusive. */
export type RuleDateTo =
  { mode: 'none' } | { mode: 'fixed'; date: string } | { mode: 'relativeDays'; days: number };

export interface PlaylistRule {
  /** Content sources whose event pool feeds the playlist. */
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
  /** How often the scheduler recomputes the playlist. */
  refreshIntervalMinutes: number;
  /** Slide format the playlist shows; events without a slide in it are skipped. */
  format: SlideFormat;
  /** Copied onto every materialised item. */
  itemDurationSeconds: number;
  transition: TransitionType;
  transitionDurationMs: number;
}
