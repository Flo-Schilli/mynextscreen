import { addDays, localDate, zonedTimeToUtc } from './zoned-time.util';

describe('zoned-time util', () => {
  describe('localDate', () => {
    it('returns the calendar date in the zone, not in UTC', () => {
      const instant = new Date('2026-10-09T22:30:00Z');

      expect(localDate(instant, 'Europe/Berlin')).toBe('2026-10-10');
      expect(localDate(instant, 'UTC')).toBe('2026-10-09');
      expect(localDate(instant, 'America/New_York')).toBe('2026-10-09');
    });
  });

  describe('zonedTimeToUtc', () => {
    it('converts summer and winter time in Berlin', () => {
      expect(zonedTimeToUtc('2026-07-01', '20:00', 'Europe/Berlin').toISOString()).toBe(
        '2026-07-01T18:00:00.000Z',
      );
      expect(zonedTimeToUtc('2026-12-01', '20:00', 'Europe/Berlin').toISOString()).toBe(
        '2026-12-01T19:00:00.000Z',
      );
    });

    it('uses local midnight without a time', () => {
      expect(zonedTimeToUtc('2026-11-02', null, 'Europe/Berlin').toISOString()).toBe(
        '2026-11-01T23:00:00.000Z',
      );
    });

    it('handles the day of the DST change', () => {
      // 25 Oct 2026: clocks go back at 03:00 CEST → 02:00 CET.
      expect(zonedTimeToUtc('2026-10-25', '20:00', 'Europe/Berlin').toISOString()).toBe(
        '2026-10-25T19:00:00.000Z',
      );
      // 25 Oct 2026, the hour before the switch at 03:00 CEST is still summer time.
      expect(zonedTimeToUtc('2026-10-25', '01:00', 'Europe/Berlin').toISOString()).toBe(
        '2026-10-24T23:00:00.000Z',
      );
      expect(zonedTimeToUtc('2026-10-25', '01:59', 'Europe/Berlin').toISOString()).toBe(
        '2026-10-24T23:59:00.000Z',
      );
      // 02:30 happens twice that night; the later one (winter time) is taken.
      expect(zonedTimeToUtc('2026-10-25', '02:30', 'Europe/Berlin').toISOString()).toBe(
        '2026-10-25T01:30:00.000Z',
      );
      // 29 Mar 2026: 02:30 does not exist and resolves past the jump.
      expect(zonedTimeToUtc('2026-03-29', '02:30', 'Europe/Berlin').toISOString()).toBe(
        '2026-03-29T01:30:00.000Z',
      );
    });

    it('is the identity in UTC', () => {
      expect(zonedTimeToUtc('2026-01-31', '23:59', 'UTC').toISOString()).toBe(
        '2026-01-31T23:59:00.000Z',
      );
    });
  });

  describe('addDays', () => {
    it('crosses month and year boundaries', () => {
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    });
  });
});
