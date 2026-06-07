import { expandRRule, getOccurrences } from './rrule.util';

describe('RRULE expansion utilities', () => {
  const entryStart = new Date('2026-04-01T09:00:00Z'); // Wednesday
  const entryEnd = new Date('2026-04-01T10:00:00Z');

  describe('expandRRule', () => {
    it('should expand a daily rule into occurrences within the window', () => {
      const windowStart = new Date('2026-04-01T00:00:00Z');
      const windowEnd = new Date('2026-04-04T23:59:59Z');

      const ranges = expandRRule('FREQ=DAILY', entryStart, entryEnd, windowStart, windowEnd);

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

      const ranges = expandRRule('FREQ=WEEKLY', entryStart, entryEnd, windowStart, windowEnd);

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
      );

      expect(ranges).toHaveLength(0);
    });

    it('should preserve duration for multi-hour entries', () => {
      const longEnd = new Date('2026-04-01T12:00:00Z'); // 3 hours
      const windowStart = new Date('2026-04-01T00:00:00Z');
      const windowEnd = new Date('2026-04-03T23:59:59Z');

      const ranges = expandRRule('FREQ=DAILY', entryStart, longEnd, windowStart, windowEnd);

      for (const range of ranges) {
        expect(range.end.getTime() - range.start.getTime()).toBe(3 * 60 * 60 * 1000);
      }
    });
  });

  describe('getOccurrences', () => {
    it('should return single range for non-recurring entry within window', () => {
      const windowStart = new Date('2026-04-01T00:00:00Z');
      const windowEnd = new Date('2026-04-01T23:59:59Z');

      const ranges = getOccurrences(entryStart, entryEnd, null, windowStart, windowEnd);

      expect(ranges).toHaveLength(1);
      expect(ranges[0].start).toEqual(entryStart);
      expect(ranges[0].end).toEqual(entryEnd);
    });

    it('should return empty array for non-recurring entry outside window', () => {
      const windowStart = new Date('2026-05-01T00:00:00Z');
      const windowEnd = new Date('2026-05-01T23:59:59Z');

      const ranges = getOccurrences(entryStart, entryEnd, null, windowStart, windowEnd);

      expect(ranges).toHaveLength(0);
    });

    it('should expand recurring entry using rrule', () => {
      const windowStart = new Date('2026-04-01T00:00:00Z');
      const windowEnd = new Date('2026-04-07T23:59:59Z');

      const ranges = getOccurrences(entryStart, entryEnd, 'FREQ=DAILY', windowStart, windowEnd);

      expect(ranges.length).toBe(7);
    });
  });
});
