/**
 * Wall-clock helpers for the organisation's time zone, built on `Intl`.
 *
 * The calendar shows the organisation's day, not the browser's: an admin in
 * another zone must see 18:00 where the venue's screens play 18:00. Every day
 * boundary, block position and form value therefore goes through these
 * helpers instead of `Date#getHours`/`setHours`, which read the browser zone.
 * Day keys are local calendar dates as `YYYY-MM-DD`; times are `HH:MM`.
 * Mirrors `apps/backend/src/common/zoned-time.util.ts`.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
export const MINUTES_PER_DAY = 24 * 60;

export interface ZonedParts {
  year: number;
  /** 1–12. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday, as `Date#getDay`. */
  weekday: number;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** The wall clock in `timeZone` at `instant`. */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts['year']),
    month: Number(parts['month']),
    day: Number(parts['day']),
    hour: Number(parts['hour']),
    minute: Number(parts['minute']),
    second: Number(parts['second']),
    weekday: WEEKDAYS[parts['weekday']] ?? 0,
  };
}

/** Local calendar date of `instant` in `timeZone`. */
export function zonedDateKey(instant: Date, timeZone: string): string {
  const { year, month, day } = zonedParts(instant, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Local wall time `HH:MM` of `instant` in `timeZone`. */
export function zonedTimeKey(instant: Date, timeZone: string): string {
  const { hour, minute } = zonedParts(instant, timeZone);
  return `${pad(hour)}:${pad(minute)}`;
}

/** Minutes since local midnight of `instant` in `timeZone`. */
export function zonedMinutesOfDay(instant: Date, timeZone: string): number {
  const { hour, minute } = zonedParts(instant, timeZone);
  return hour * 60 + minute;
}

function offsetMinutes(instant: Date, timeZone: string): number {
  const local = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  );
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / MS_PER_MINUTE);
}

/**
 * The instant at which the wall clock in `timeZone` shows `dateKey` + `time`.
 * A time that happens twice when the clocks go back resolves to the later
 * instant; a time skipped by a DST jump resolves to the instant after it.
 */
export function zonedTimeToInstant(dateKey: string, time: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMinutes(new Date(guess), timeZone) * MS_PER_MINUTE;
  const second = guess - offsetMinutes(new Date(first), timeZone) * MS_PER_MINUTE;
  const matching = [first, second].filter((candidate) => {
    const local = zonedParts(new Date(candidate), timeZone);
    return (
      local.year === year &&
      local.month === month &&
      local.day === day &&
      local.hour === hour &&
      local.minute === minute
    );
  });
  return new Date(Math.max(...(matching.length > 0 ? matching : [first, second])));
}

/** `dateKey` shifted by whole days. */
export function addDaysToKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Local midnight of the day `instant` falls on. */
export function startOfZonedDay(instant: Date, timeZone: string): Date {
  return zonedTimeToInstant(zonedDateKey(instant, timeZone), '00:00', timeZone);
}

/** Local midnight `days` days after the day `instant` falls on. */
export function addZonedDays(instant: Date, days: number, timeZone: string): Date {
  return zonedTimeToInstant(addDaysToKey(zonedDateKey(instant, timeZone), days), '00:00', timeZone);
}

/** Local midnight of the first of the month `months` months after the one `instant` falls in. */
export function addZonedMonths(instant: Date, months: number, timeZone: string): Date {
  const { year, month } = zonedParts(instant, timeZone);
  const index = year * 12 + (month - 1) + months;
  const key = `${Math.floor(index / 12)}-${pad((index % 12) + 1)}-01`;
  return zonedTimeToInstant(key, '00:00', timeZone);
}

/** Two instants fall on the same local day. */
export function isSameZonedDay(a: Date, b: Date, timeZone: string): boolean {
  return zonedDateKey(a, timeZone) === zonedDateKey(b, timeZone);
}

/** Local `HH:MM` for a minute count of the day; 1440 and more clamp to 23:59. */
export function minutesToTime(minutes: number): string {
  const clamped = Math.min(Math.max(Math.floor(minutes), 0), MINUTES_PER_DAY - 1);
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}
