import { expandRRule, getOccurrences } from './rrule.util';

describe('RRULE expansion utilities', () => {
  const entryStart = new Date('2026-04-01T09:00:00Z'); // Wednesday
  const entryEnd = new Date('2026-04-01T10:00:00Z');

  describe('expandRRule', () => {
    it('should expand a daily rule into occurrences within the window', () => {
      const windowStart = new Date('2026-04-01T00:00:00Z');
      const windowEnd = new Date('2026-04-04T23:59:59Z');

      const ranges = expandRRule('FREQ=DAILY', entryStart, entryEnd, windowStart, windowEnd, 'UTC');

      expect(ranges.length).toBe(4); // Apr 1, 2, 3, 4
      for (const range of ranges) {
        expect(range.end.getTime() - range.start.getTime()).toBe(60 * 60 * 1000); // 1 hour duration preserved
      }
      expect(ranges[0].start).toEqual(new Date('2026-04-01T09:00:00Z'));
      expect(ranges[1].start).toEqual(new Date('2026-04-02T09:00:00Z'));
      expect(ranges[2].start).toEqual(new Date('2026-04-03T09:00:00Z'));
      expect(ranges[3].start).toEqual(new Date('2026-04-04T09:00:00Z'));
    });

    it('should expand a weekly rule', () => {
      const windowStart = new Date('2026-04-01T00:00:00Z');
      const windowEnd = new Date('2026-04-30T23:59:59Z');

      const ranges = expandRRule(
        'FREQ=WEEKLY',
        entryStart,
        entryEnd,
        windowStart,
        windowEnd,
        'UTC',
      );

      // Apr 1, 8, 15, 22, 29 — all Wednesdays
      expect(ranges.length).toBe(5);
      expect(ranges[0].start).toEqual(new Date('2026-04-01T09:00:00Z'));
      expect(ranges[1].start).toEqual(new Date('2026-04-08T09:00:00Z'));
      expect(ranges[4].start).toEqual(new Date('2026-04-29T09:00:00Z'));
    });

    it('should expand a rule with specific weekdays (MO, WE, FR)', () => {
      const windowStart = new Date('2026-04-06T00:00:00Z'); // Monday
      const windowEnd = new Date('2026-04-12T23:59:59Z'); // Sunday

      const ranges = expandRRule(
        'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        entryStart,
        entryEnd,
        windowStart,
        windowEnd,
        'UTC',
      );

      expect(ranges.length).toBe(3);
      // Monday Apr 6, Wednesday Apr 8, Friday Apr 10
      expect(ranges[0].start.getUTCDay()).toBe(1); // Monday
      expect(ranges[1].start.getUTCDay()).toBe(3); // Wednesday
      expect(ranges[2].start.getUTCDay()).toBe(5); // Friday
    });

    it('should return empty array when no occurrences in window', () => {
      const windowStart = new Date('2025-01-01T00:00:00Z');
      const windowEnd = new Date('2025-01-02T00:00:00Z');

      const ranges = expandRRule(
        'FREQ=DAILY;COUNT=1',
        entryStart,
        entryEnd,
        windowStart,
        windowEnd,
        'UTC',
      );

      expect(ranges).toHaveLength(0);
    });

    it('should preserve duration for multi-hour entries', () => {
      const longEnd = new Date('2026-04-01T12:00:00Z'); // 3 hours
      const windowStart = new Date('2026-04-01T00:00:00Z');
      const windowEnd = new Date('2026-04-03T23:59:59Z');

      const ranges = expandRRule('FREQ=DAILY', entryStart, longEnd, windowStart, windowEnd, 'UTC');

      for (const range of ranges) {
        expect(range.end.getTime() - range.start.getTime()).toBe(3 * 60 * 60 * 1000);
      }
    });
  });

  describe('getOccurrences', () => {
    it('should return single range for non-recurring entry within window', () => {
      const windowStart = new Date('2026-04-01T00:00:00Z');
      const windowEnd = new Date('2026-04-01T23:59:59Z');

      const ranges = getOccurrences(entryStart, entryEnd, null, windowStart, windowEnd, 'UTC');

      expect(ranges).toHaveLength(1);
      expect(ranges[0].start).toEqual(entryStart);
      expect(ranges[0].end).toEqual(entryEnd);
    });

    it('should return empty array for non-recurring entry outside window', () => {
      const windowStart = new Date('2026-05-01T00:00:00Z');
      const windowEnd = new Date('2026-05-01T23:59:59Z');

      const ranges = getOccurrences(entryStart, entryEnd, null, windowStart, windowEnd, 'UTC');

      expect(ranges).toHaveLength(0);
    });

    it('should expand recurring entry using rrule', () => {
      const windowStart = new Date('2026-04-01T00:00:00Z');
      const windowEnd = new Date('2026-04-07T23:59:59Z');

      const ranges = getOccurrences(
        entryStart,
        entryEnd,
        'FREQ=DAILY',
        windowStart,
        windowEnd,
        'UTC',
      );

      expect(ranges.length).toBe(7);
    });
  });
  describe("in the organisation's time zone", () => {
    const berlin = 'Europe/Berlin';
    const starts = (ranges: { start: Date }[]): string[] =>
      ranges.map((range) => range.start.toISOString());

    it('keeps the local wall time when summer time starts', () => {
      // 20:00 CET on Friday, 2026-03-27; the clocks go forward on Sunday the 29th.
      const start = new Date('2026-03-27T19:00:00Z');
      const end = new Date('2026-03-27T21:00:00Z');

      const ranges = expandRRule(
        'FREQ=DAILY',
        start,
        end,
        new Date('2026-03-27T00:00:00Z'),
        new Date('2026-03-30T23:00:00Z'),
        berlin,
      );

      expect(starts(ranges)).toEqual([
        '2026-03-27T19:00:00.000Z',
        '2026-03-28T19:00:00.000Z',
        '2026-03-29T18:00:00.000Z',
        '2026-03-30T18:00:00.000Z',
      ]);
    });

    it('keeps the local wall time when summer time ends', () => {
      // 20:00 CEST on Friday, 2026-10-23; the clocks go back on Sunday the 25th.
      const start = new Date('2026-10-23T18:00:00Z');
      const end = new Date('2026-10-23T19:00:00Z');

      const ranges = expandRRule(
        'FREQ=DAILY',
        start,
        end,
        new Date('2026-10-23T00:00:00Z'),
        new Date('2026-10-26T23:00:00Z'),
        berlin,
      );

      expect(starts(ranges)).toEqual([
        '2026-10-23T18:00:00.000Z',
        '2026-10-24T18:00:00.000Z',
        '2026-10-25T19:00:00.000Z',
        '2026-10-26T19:00:00.000Z',
      ]);
    });

    it('picks the later 02:30 when that hour happens twice', () => {
      // 02:30 CEST daily; on 2026-10-25 02:30 local happens at 00:30Z and 01:30Z.
      const start = new Date('2026-10-24T00:30:00Z');
      const end = new Date('2026-10-24T01:00:00Z');

      const ranges = expandRRule(
        'FREQ=DAILY',
        start,
        end,
        new Date('2026-10-24T00:00:00Z'),
        new Date('2026-10-26T12:00:00Z'),
        berlin,
      );

      expect(starts(ranges)).toEqual([
        '2026-10-24T00:30:00.000Z',
        '2026-10-25T01:30:00.000Z',
        '2026-10-26T01:30:00.000Z',
      ]);
    });

    it('moves an occurrence in the skipped hour to just after the jump', () => {
      // 02:30 CET daily; on 2026-03-29 the clocks jump from 02:00 to 03:00.
      const start = new Date('2026-03-28T01:30:00Z');
      const end = new Date('2026-03-28T02:00:00Z');

      const ranges = expandRRule(
        'FREQ=DAILY',
        start,
        end,
        new Date('2026-03-29T00:00:00Z'),
        new Date('2026-03-29T12:00:00Z'),
        berlin,
      );

      expect(starts(ranges)).toEqual(['2026-03-29T01:30:00.000Z']);
    });

    it('ends at the UNTIL instant, not at the same wall time in UTC', () => {
      // 23:30 CET daily; UNTIL is 23:59:59 CET on 2026-12-31 (22:59:59Z).
      const start = new Date('2026-12-29T22:30:00Z');
      const end = new Date('2026-12-29T23:00:00Z');

      const ranges = expandRRule(
        'FREQ=DAILY;UNTIL=20261231T225959Z',
        start,
        end,
        new Date('2026-12-29T00:00:00Z'),
        new Date('2027-01-03T00:00:00Z'),
        berlin,
      );

      expect(starts(ranges)).toEqual([
        '2026-12-29T22:30:00.000Z',
        '2026-12-30T22:30:00.000Z',
        '2026-12-31T22:30:00.000Z',
      ]);
    });

    it('yields each instant once when hourly wall times fall into the skipped hour', () => {
      // Hourly from 00:00 CET on 2026-03-29; 02:00 local does not exist.
      const start = new Date('2026-03-28T23:00:00Z');
      const end = new Date('2026-03-28T23:30:00Z');

      const ranges = expandRRule(
        'FREQ=HOURLY;COUNT=5',
        start,
        end,
        new Date('2026-03-28T23:00:00Z'),
        new Date('2026-03-29T06:00:00Z'),
        berlin,
      );

      expect(starts(ranges)).toEqual([
        '2026-03-28T23:00:00.000Z',
        '2026-03-29T00:00:00.000Z',
        '2026-03-29T01:00:00.000Z',
        '2026-03-29T02:00:00.000Z',
      ]);
    });

    it('matches BYDAY against the local weekday, not the UTC one', () => {
      // 00:30 CEST on Tuesday, 2026-06-02, is still Monday in UTC.
      const start = new Date('2026-06-01T22:30:00Z');
      const end = new Date('2026-06-01T23:30:00Z');

      const ranges = getOccurrences(
        start,
        end,
        'FREQ=WEEKLY;BYDAY=TU',
        new Date('2026-06-01T00:00:00Z'),
        new Date('2026-06-15T00:00:00Z'),
        berlin,
      );

      expect(starts(ranges)).toEqual(['2026-06-01T22:30:00.000Z', '2026-06-08T22:30:00.000Z']);
    });

    it('includes an occurrence that started before the window and still runs', () => {
      const start = new Date('2026-06-01T18:00:00Z'); // 20:00 CEST
      const end = new Date('2026-06-02T00:00:00Z'); // 02:00 CEST next day

      const ranges = getOccurrences(
        start,
        end,
        'FREQ=DAILY',
        new Date('2026-06-03T23:00:00Z'),
        new Date('2026-06-04T01:00:00Z'),
        berlin,
      );

      expect(starts(ranges)).toEqual(['2026-06-03T18:00:00.000Z']);
    });
  });
});
