import { SourceEvent, SourceEventsQuery } from './content-source.model';

/** Events requested per page of the pool table. */
export const EVENTS_PAGE_SIZE = 100;

/** Filters of the pool table; they stay as they are while paging. */
export interface EventPoolFilters {
  venues: string[];
  genres: string[];
  /** `YYYY-MM-DD` or `''`. */
  from: string;
  /** `YYYY-MM-DD` or `''`. */
  to: string;
  includeGone: boolean;
}

export const EMPTY_POOL_FILTERS: EventPoolFilters = {
  venues: [],
  genres: [],
  from: '',
  to: '',
  includeGone: false,
};

/** The query of one page; empty filters are left out. */
export function eventPoolQuery(
  filters: EventPoolFilters,
  offset: number,
  limit: number = EVENTS_PAGE_SIZE,
): SourceEventsQuery {
  return {
    includeGone: filters.includeGone,
    ...(filters.venues.length > 0 ? { venues: [...filters.venues] } : {}),
    ...(filters.genres.length > 0 ? { genres: [...filters.genres] } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    limit,
    offset,
  };
}

/** True when any filter narrows the pool beyond the default. */
export function hasPoolFilters(filters: EventPoolFilters): boolean {
  return filters.venues.length > 0 || filters.genres.length > 0 || !!filters.from || !!filters.to;
}

/**
 * Appends a further page, skipping events already shown: a sync between two
 * pages can shift the offsets by a few rows.
 */
export function appendPage(
  shown: readonly SourceEvent[],
  page: readonly SourceEvent[],
): SourceEvent[] {
  const ids = new Set(shown.map((event) => event.id));
  return [...shown, ...page.filter((event) => !ids.has(event.id))];
}
