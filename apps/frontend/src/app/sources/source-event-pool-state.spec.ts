import { SourceEvent } from './content-source.model';
import {
  EMPTY_POOL_FILTERS,
  EVENTS_PAGE_SIZE,
  appendPage,
  eventPoolQuery,
  hasPoolFilters,
} from './source-event-pool-state';

const event = (id: string): SourceEvent => ({ id }) as SourceEvent;

describe('event pool state', () => {
  it('asks for the first page without empty filters', () => {
    expect(eventPoolQuery(EMPTY_POOL_FILTERS, 0)).toEqual({
      includeGone: false,
      limit: EVENTS_PAGE_SIZE,
      offset: 0,
    });
  });

  it('keeps every filter on later pages', () => {
    const filters = {
      venues: ['Hirsch'],
      genres: ['Metal'],
      from: '2026-11-01',
      to: '2026-12-31',
      includeGone: true,
    };

    expect(eventPoolQuery(filters, 200, 100)).toEqual({
      venues: ['Hirsch'],
      genres: ['Metal'],
      from: '2026-11-01',
      to: '2026-12-31',
      includeGone: true,
      limit: 100,
      offset: 200,
    });
  });

  it('tells whether a filter narrows the pool', () => {
    expect(hasPoolFilters(EMPTY_POOL_FILTERS)).toBe(false);
    expect(hasPoolFilters({ ...EMPTY_POOL_FILTERS, includeGone: true })).toBe(false);
    expect(hasPoolFilters({ ...EMPTY_POOL_FILTERS, venues: ['Hirsch'] })).toBe(true);
    expect(hasPoolFilters({ ...EMPTY_POOL_FILTERS, to: '2026-12-31' })).toBe(true);
  });

  it('appends a page without repeating events a shifted offset returns again', () => {
    const shown = [event('a'), event('b')];

    expect(appendPage(shown, [event('b'), event('c')]).map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(shown).toHaveLength(2);
  });
});
