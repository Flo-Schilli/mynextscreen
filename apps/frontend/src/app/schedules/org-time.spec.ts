import {
  addDaysToKey,
  addZonedDays,
  addZonedMonths,
  isSameZonedDay,
  minutesToTime,
  startOfZonedDay,
  zonedDateKey,
  zonedMinutesOfDay,
  zonedParts,
  zonedTimeKey,
  zonedTimeToInstant,
} from './org-time';

const BERLIN = 'Europe/Berlin';
const NEW_YORK = 'America/New_York';

describe('org-time', () => {
  it('reads the wall clock and weekday of the organisation, not the browser', () => {
    // 22:30 UTC on a Friday is already Saturday 00:30 in Berlin.
    const instant = new Date('2026-10-23T22:30:00Z');

    expect(zonedParts(instant, BERLIN)).toMatchObject({ day: 24, hour: 0, minute: 30, weekday: 6 });
    expect(zonedParts(instant, NEW_YORK)).toMatchObject({ day: 23, hour: 18, weekday: 5 });
    expect(zonedDateKey(instant, BERLIN)).toBe('2026-10-24');
    expect(zonedTimeKey(instant, BERLIN)).toBe('00:30');
    expect(zonedMinutesOfDay(instant, BERLIN)).toBe(30);
  });

  it('converts a local date and time to the instant', () => {
    expect(zonedTimeToInstant('2026-07-01', '20:00', BERLIN).toISOString()).toBe(
      '2026-07-01T18:00:00.000Z',
    );
    expect(zonedTimeToInstant('2026-12-01', '20:00', BERLIN).toISOString()).toBe(
      '2026-12-01T19:00:00.000Z',
    );
  });

  it('resolves the hours around the DST switches', () => {
    // The hour before the clocks go back is still summer time.
    expect(zonedTimeToInstant('2026-10-25', '01:30', BERLIN).toISOString()).toBe(
      '2026-10-24T23:30:00.000Z',
    );
    // 02:30 happens twice; the later one is taken.
    expect(zonedTimeToInstant('2026-10-25', '02:30', BERLIN).toISOString()).toBe(
      '2026-10-25T01:30:00.000Z',
    );
    // 02:30 does not exist in spring and resolves past the jump.
    expect(zonedTimeToInstant('2026-03-29', '02:30', BERLIN).toISOString()).toBe(
      '2026-03-29T01:30:00.000Z',
    );
  });

  it('finds local midnight and steps whole local days across a DST night', () => {
    const evening = new Date('2026-10-24T20:00:00Z');

    expect(startOfZonedDay(evening, BERLIN).toISOString()).toBe('2026-10-23T22:00:00.000Z');
    // Midnight of 25 October is still summer time; that day lasts 25 hours.
    expect(addZonedDays(evening, 1, BERLIN).toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(addZonedDays(evening, 2, BERLIN).toISOString()).toBe('2026-10-25T23:00:00.000Z');
    expect(addZonedDays(evening, -1, BERLIN).toISOString()).toBe('2026-10-22T22:00:00.000Z');
  });

  it('steps months to the first of the month', () => {
    const instant = new Date('2026-12-15T12:00:00Z');

    expect(addZonedMonths(instant, 1, BERLIN).toISOString()).toBe('2026-12-31T23:00:00.000Z');
    expect(addZonedMonths(instant, -12, BERLIN).toISOString()).toBe('2025-11-30T23:00:00.000Z');
    expect(addZonedMonths(instant, 0, BERLIN).toISOString()).toBe('2026-11-30T23:00:00.000Z');
  });

  it('compares local days', () => {
    expect(
      isSameZonedDay(new Date('2026-10-23T21:00:00Z'), new Date('2026-10-23T23:00:00Z'), BERLIN),
    ).toBe(false);
    expect(
      isSameZonedDay(new Date('2026-10-23T21:00:00Z'), new Date('2026-10-23T23:00:00Z'), NEW_YORK),
    ).toBe(true);
  });

  it('shifts day keys and formats minute counts', () => {
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(18 * 60 + 30.7)).toBe('18:30');
    expect(minutesToTime(24 * 60)).toBe('23:59');
  });
});
