import {
  datePattern,
  formatIsoDate,
  formatIsoTime,
  fullDateLabel,
  monthGrid,
  monthLabel,
  parseLocalDate,
  parseLocalTime,
  uses12HourClock,
  weekdayNames,
} from './locale-date-input';

describe('locale-date-input', () => {
  describe('datePattern', () => {
    it('reads day-month-year with dots for de-DE', () => {
      expect(datePattern('de-DE')).toEqual({ order: ['day', 'month', 'year'], separator: '.' });
    });

    it('reads month-day-year with slashes for en-US', () => {
      expect(datePattern('en-US')).toEqual({ order: ['month', 'day', 'year'], separator: '/' });
    });
  });

  describe('formatIsoDate', () => {
    it('formats an ISO date in the locale order', () => {
      expect(formatIsoDate('2026-03-09', 'de-DE')).toBe('09.03.2026');
      expect(formatIsoDate('2026-03-09', 'en-US')).toBe('03/09/2026');
    });

    it('returns empty for empty or invalid input', () => {
      expect(formatIsoDate('', 'de-DE')).toBe('');
      expect(formatIsoDate('2026-02-30', 'de-DE')).toBe('');
      expect(formatIsoDate('09.03.2026', 'de-DE')).toBe('');
    });
  });

  describe('parseLocalDate', () => {
    it('reads German input in day-month-year order', () => {
      expect(parseLocalDate('09.03.2026', 'de-DE')).toBe('2026-03-09');
      expect(parseLocalDate('9.3.2026', 'de-DE')).toBe('2026-03-09');
      expect(parseLocalDate('9.3.26', 'de-DE')).toBe('2026-03-09');
    });

    it('reads US input in month-day-year order', () => {
      expect(parseLocalDate('03/09/2026', 'en-US')).toBe('2026-03-09');
      expect(parseLocalDate('3/9/26', 'en-US')).toBe('2026-03-09');
    });

    it('accepts a pasted ISO date in either locale', () => {
      expect(parseLocalDate('2026-03-09', 'de-DE')).toBe('2026-03-09');
      expect(parseLocalDate('2026-03-09', 'en-US')).toBe('2026-03-09');
    });

    it('rejects dates that do not exist', () => {
      expect(parseLocalDate('30.02.2026', 'de-DE')).toBeNull();
      expect(parseLocalDate('13/01/2026', 'en-US')).toBeNull();
      expect(parseLocalDate('2026-13-01', 'de-DE')).toBeNull();
    });

    it('rejects incomplete or malformed input', () => {
      expect(parseLocalDate('', 'de-DE')).toBeNull();
      expect(parseLocalDate('09.03', 'de-DE')).toBeNull();
      expect(parseLocalDate('09.03.202', 'de-DE')).toBeNull();
      expect(parseLocalDate('heute', 'de-DE')).toBeNull();
    });
  });

  describe('time', () => {
    it('knows which locales use a 12-hour clock', () => {
      expect(uses12HourClock('de-DE')).toBe(false);
      expect(uses12HourClock('en-US')).toBe(true);
    });

    it('formats 24-hour for de-DE and AM/PM for en-US', () => {
      expect(formatIsoTime('14:30', 'de-DE')).toBe('14:30');
      expect(formatIsoTime('14:30', 'en-US')).toBe('2:30 PM');
      expect(formatIsoTime('00:05', 'en-US')).toBe('12:05 AM');
      expect(formatIsoTime('12:00', 'en-US')).toBe('12:00 PM');
    });

    it('returns empty for an invalid stored time', () => {
      expect(formatIsoTime('', 'de-DE')).toBe('');
      expect(formatIsoTime('25:00', 'de-DE')).toBe('');
    });

    it('parses the common ways of typing a time', () => {
      expect(parseLocalTime('14:30')).toBe('14:30');
      expect(parseLocalTime('14.30')).toBe('14:30');
      expect(parseLocalTime('1430')).toBe('14:30');
      expect(parseLocalTime('9')).toBe('09:00');
      expect(parseLocalTime('2:30 pm')).toBe('14:30');
      expect(parseLocalTime('2pm')).toBe('14:00');
      expect(parseLocalTime('12:15 AM')).toBe('00:15');
      expect(parseLocalTime('12 PM')).toBe('12:00');
    });

    it('rejects times that do not exist', () => {
      expect(parseLocalTime('24:00')).toBeNull();
      expect(parseLocalTime('12:60')).toBeNull();
      expect(parseLocalTime('13 pm')).toBeNull();
      expect(parseLocalTime('abc')).toBeNull();
      expect(parseLocalTime('')).toBeNull();
    });
  });

  describe('calendar', () => {
    it('starts a Monday-first grid on the Monday before the 1st', () => {
      // 1 March 2026 is a Sunday.
      const grid = monthGrid(2026, 3, 1);
      expect(grid).toHaveLength(6);
      expect(grid[0][0]).toEqual({ iso: '2026-02-23', day: 23, inMonth: false });
      expect(grid[0][6]).toEqual({ iso: '2026-03-01', day: 1, inMonth: true });
    });

    it('starts a Sunday-first grid on the 1st when it is a Sunday', () => {
      const grid = monthGrid(2026, 3, 0);
      expect(grid[0][0]).toEqual({ iso: '2026-03-01', day: 1, inMonth: true });
    });

    it('names weekdays and months in the locale', () => {
      expect(weekdayNames('de-DE', 1)[0]).toBe('Mo');
      expect(weekdayNames('en-US', 0)[0]).toBe('Sun');
      expect(monthLabel(2026, 3, 'de-DE')).toBe('März 2026');
      expect(monthLabel(2026, 3, 'en-US')).toBe('March 2026');
    });

    it('spells out a full date for screen readers', () => {
      expect(fullDateLabel('2026-03-09', 'de-DE')).toBe('Montag, 9. März 2026');
    });
  });
});
