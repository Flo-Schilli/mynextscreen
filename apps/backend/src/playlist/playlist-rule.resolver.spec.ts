import { TransitionType } from './transition-type.enum';
import type { PlaylistRule } from './playlist-rule.types';
import {
  earliestLiveEventDate,
  eventExpiresAt,
  isEventExpired,
  resolvePlaylistRule,
  type RulePoolEvent,
} from './playlist-rule.resolver';

const BERLIN = 'Europe/Berlin';
const SOURCE = 'source-1';

function rule(overrides: Partial<PlaylistRule> = {}): PlaylistRule {
  return {
    sourceIds: [SOURCE],
    genres: { match: 'any', values: [] },
    venues: [],
    dateFrom: { mode: 'today' },
    dateTo: { mode: 'none' },
    excludeCancelled: true,
    excludeSoldOut: false,
    sort: 'date_asc',
    limit: 50,
    graceHours: 4,
    refreshIntervalMinutes: 15,
    format: '1920x1080',
    itemDurationSeconds: 10,
    transition: TransitionType.Fade,
    transitionDurationMs: 500,
    ...overrides,
  };
}

let counter = 0;
function event(eventDate: string, overrides: Partial<RulePoolEvent> = {}): RulePoolEvent {
  counter += 1;
  const id = overrides.id ?? `event-${counter}`;
  return {
    id,
    sourceId: SOURCE,
    title: `Band ${counter}`,
    eventDate,
    startsAt: new Date(`${eventDate}T19:00:00Z`),
    venue: 'Löwensaal',
    genres: ['Metal'],
    cancelled: false,
    soldOut: false,
    goneAt: null,
    slides: [
      { format: '1920x1080', contentId: `${id}-landscape` },
      { format: '1080x1920', contentId: `${id}-portrait` },
    ],
    ...overrides,
  };
}

const ids = (entries: { event: RulePoolEvent }[]): string[] =>
  entries.map((entry) => entry.event.id);

describe('eventExpiresAt / isEventExpired', () => {
  it('expires at local midnight after the event day plus the grace hours', () => {
    // CET (+1): 2026-11-11 00:00 local is 2026-11-10T23:00Z.
    expect(eventExpiresAt('2026-11-10', 4, BERLIN)).toEqual(new Date('2026-11-11T03:00:00Z'));
  });

  it('keeps a late show across midnight until the grace period ends', () => {
    expect(isEventExpired('2026-11-10', 4, new Date('2026-11-11T02:59:59Z'), BERLIN)).toBe(false);
    expect(isEventExpired('2026-11-10', 4, new Date('2026-11-11T03:00:00Z'), BERLIN)).toBe(true);
  });

  it('expires exactly at local midnight without grace', () => {
    expect(isEventExpired('2026-11-10', 0, new Date('2026-11-10T22:59:59Z'), BERLIN)).toBe(false);
    expect(isEventExpired('2026-11-10', 0, new Date('2026-11-10T23:00:00Z'), BERLIN)).toBe(true);
  });

  it('uses the organisation’s zone, not UTC', () => {
    const now = new Date('2026-11-10T23:30:00Z');
    expect(isEventExpired('2026-11-10', 0, now, 'UTC')).toBe(false);
    expect(isEventExpired('2026-11-10', 0, now, BERLIN)).toBe(true);
  });

  it('follows the summer-time offset before the DST switch night', () => {
    // 2026-10-25 00:00 is still CEST (+2): 2026-10-24T22:00Z, plus 4 h.
    expect(eventExpiresAt('2026-10-24', 4, BERLIN)).toEqual(new Date('2026-10-25T02:00:00Z'));
    // Spring forward: 2026-03-29 00:00 is CET (+1).
    expect(eventExpiresAt('2026-03-28', 24, BERLIN)).toEqual(new Date('2026-03-29T23:00:00Z'));
  });

  it('bounds the pool at yesterday’s local date', () => {
    expect(earliestLiveEventDate(new Date('2026-11-10T23:30:00Z'), BERLIN)).toBe('2026-11-10');
    expect(earliestLiveEventDate(new Date('2026-11-10T23:30:00Z'), 'UTC')).toBe('2026-11-09');
  });
});

describe('resolvePlaylistRule', () => {
  // 2026-11-10 12:00 in Berlin.
  const noon = new Date('2026-11-10T11:00:00Z');

  it('returns the slide of the rule’s format for every matching event', () => {
    const a = event('2026-11-12', { id: 'a' });

    const result = resolvePlaylistRule([a], rule({ format: '1080x1920' }), noon, BERLIN);

    expect(result).toEqual([{ event: a, contentId: 'a-portrait' }]);
  });

  describe('date window', () => {
    const pool = [
      event('2026-11-09', { id: 'yesterday' }),
      event('2026-11-10', { id: 'today' }),
      event('2026-11-12', { id: 'in2' }),
      event('2026-11-20', { id: 'in10' }),
    ];

    it('today: drops expired events only', () => {
      expect(ids(resolvePlaylistRule(pool, rule(), noon, BERLIN))).toEqual([
        'today',
        'in2',
        'in10',
      ]);
    });

    it('today: keeps yesterday’s event during its grace hours', () => {
      const lateNight = new Date('2026-11-10T01:30:00Z'); // 02:30 local
      expect(ids(resolvePlaylistRule(pool, rule(), lateNight, BERLIN))).toEqual([
        'yesterday',
        'today',
        'in2',
        'in10',
      ]);
    });

    it('fixed: starts at the given date', () => {
      const result = resolvePlaylistRule(
        pool,
        rule({ dateFrom: { mode: 'fixed', date: '2026-11-12' } }),
        noon,
        BERLIN,
      );
      expect(ids(result)).toEqual(['in2', 'in10']);
    });

    it('fixed: never brings back an expired event', () => {
      const result = resolvePlaylistRule(
        pool,
        rule({ dateFrom: { mode: 'fixed', date: '2026-01-01' } }),
        noon,
        BERLIN,
      );
      expect(ids(result)).toEqual(['today', 'in2', 'in10']);
    });

    it('relativeDays: counts from the local date', () => {
      const result = resolvePlaylistRule(
        pool,
        rule({ dateFrom: { mode: 'relativeDays', days: 2 } }),
        noon,
        BERLIN,
      );
      expect(ids(result)).toEqual(['in2', 'in10']);
    });

    it('dateTo fixed and relative are inclusive', () => {
      expect(
        ids(
          resolvePlaylistRule(
            pool,
            rule({ dateTo: { mode: 'fixed', date: '2026-11-12' } }),
            noon,
            BERLIN,
          ),
        ),
      ).toEqual(['today', 'in2']);
      expect(
        ids(
          resolvePlaylistRule(
            pool,
            rule({ dateTo: { mode: 'relativeDays', days: 0 } }),
            noon,
            BERLIN,
          ),
        ),
      ).toEqual(['today']);
    });

    it('reads today from the organisation’s zone', () => {
      // 23:30 UTC is already 2026-11-11 in Berlin.
      const now = new Date('2026-11-10T23:30:00Z');
      const window = rule({ dateFrom: { mode: 'relativeDays', days: 1 }, graceHours: 0 });
      expect(ids(resolvePlaylistRule(pool, window, now, 'UTC'))).toEqual(['in2', 'in10']);
      expect(ids(resolvePlaylistRule(pool, window, now, BERLIN))).toEqual(['in2', 'in10']);
      const today = rule({ graceHours: 0 });
      expect(ids(resolvePlaylistRule(pool, today, now, 'UTC'))).toEqual(['today', 'in2', 'in10']);
      expect(ids(resolvePlaylistRule(pool, today, now, BERLIN))).toEqual(['in2', 'in10']);
    });
  });

  describe('filters', () => {
    it('genres any matches one, all matches every value', () => {
      const pool = [
        event('2026-11-12', { id: 'metal', genres: ['Metal'] }),
        event('2026-11-13', { id: 'both', genres: ['Metal', 'Rock'] }),
        event('2026-11-14', { id: 'pop', genres: ['Pop'] }),
      ];

      const any = rule({ genres: { match: 'any', values: ['Metal', 'Rock'] } });
      const all = rule({ genres: { match: 'all', values: ['Metal', 'Rock'] } });

      expect(ids(resolvePlaylistRule(pool, any, noon, BERLIN))).toEqual(['metal', 'both']);
      expect(ids(resolvePlaylistRule(pool, all, noon, BERLIN))).toEqual(['both']);
    });

    it('venues IN, sources, gone events', () => {
      const pool = [
        event('2026-11-12', { id: 'hirsch', venue: 'Hirsch' }),
        event('2026-11-13', { id: 'zbau', venue: 'Z-Bau' }),
        event('2026-11-14', { id: 'other-source', venue: 'Hirsch', sourceId: 'source-2' }),
        event('2026-11-15', { id: 'gone', venue: 'Hirsch', goneAt: new Date() }),
        event('2026-11-16', { id: 'saal' }),
      ];

      const result = resolvePlaylistRule(pool, rule({ venues: ['Hirsch', 'Z-Bau'] }), noon, BERLIN);

      expect(ids(result)).toEqual(['hirsch', 'zbau']);
    });

    it("matches venues by their canonical name under each source's aliases", () => {
      const pool = [
        event('2026-11-12', { id: 'plain', venue: 'Hirsch' }),
        event('2026-11-13', { id: 'aliased', venue: 'Der Hirsch' }),
        event('2026-11-14', { id: 'unaliased-source', venue: 'Der Hirsch', sourceId: 'source-2' }),
        event('2026-11-15', { id: 'zbau', venue: 'Z-Bau' }),
      ];
      const aliases = new Map([[SOURCE, new Map([['Der Hirsch', 'Hirsch']])]]);
      const both = rule({ sourceIds: [SOURCE, 'source-2'] });

      const canonical = resolvePlaylistRule(
        pool,
        { ...both, venues: ['Hirsch'] },
        noon,
        BERLIN,
        aliases,
      );
      // A rule that still names the aliased spelling means the canonical venue.
      const legacy = resolvePlaylistRule(
        pool,
        { ...both, venues: ['Der Hirsch'] },
        noon,
        BERLIN,
        aliases,
      );

      expect(ids(canonical)).toEqual(['plain', 'aliased']);
      expect(ids(legacy)).toEqual(['plain', 'aliased', 'unaliased-source']);
      expect(
        ids(resolvePlaylistRule(pool, { ...both, venues: [] }, noon, BERLIN, aliases)),
      ).toEqual(['plain', 'aliased', 'unaliased-source', 'zbau']);
    });

    it('excludes cancelled by default and sold out on request', () => {
      const pool = [
        event('2026-11-12', { id: 'cancelled', cancelled: true }),
        event('2026-11-13', { id: 'soldout', soldOut: true }),
        event('2026-11-14', { id: 'ok' }),
      ];

      expect(ids(resolvePlaylistRule(pool, rule(), noon, BERLIN))).toEqual(['soldout', 'ok']);
      expect(
        ids(
          resolvePlaylistRule(
            pool,
            rule({ excludeCancelled: false, excludeSoldOut: true }),
            noon,
            BERLIN,
          ),
        ),
      ).toEqual(['cancelled', 'ok']);
    });
  });

  describe('order and limit', () => {
    const pool = [
      event('2026-11-14', { id: 'late' }),
      event('2026-11-12', { id: 'b-early', title: 'Beta' }),
      event('2026-11-12', { id: 'a-early', title: 'Alpha' }),
      event('2026-11-13', { id: 'middle' }),
    ];

    it('sorts by start, then title', () => {
      expect(ids(resolvePlaylistRule(pool, rule(), noon, BERLIN))).toEqual([
        'a-early',
        'b-early',
        'middle',
        'late',
      ]);
    });

    it('sorts descending by start, ties still by title', () => {
      expect(ids(resolvePlaylistRule(pool, rule({ sort: 'date_desc' }), noon, BERLIN))).toEqual([
        'late',
        'middle',
        'a-early',
        'b-early',
      ]);
    });

    it('applies the limit after skipping events without a slide in the format', () => {
      const withoutSlide = event('2026-11-11', { id: 'no-slide', slides: [] });

      const result = resolvePlaylistRule([withoutSlide, ...pool], rule({ limit: 2 }), noon, BERLIN);

      expect(ids(result)).toEqual(['a-early', 'b-early']);
    });

    it('lists a shared slide only once', () => {
      const shared = [{ format: '1920x1080' as const, contentId: 'same' }];
      const pool2 = [
        event('2026-11-12', { id: 'x', slides: shared }),
        event('2026-11-13', { id: 'y', slides: shared }),
      ];

      expect(ids(resolvePlaylistRule(pool2, rule(), noon, BERLIN))).toEqual(['x']);
    });
  });
});
