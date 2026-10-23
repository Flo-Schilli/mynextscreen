/**
 * Wall-clock helpers for an IANA time zone, built on `Intl` so the backend needs
 * no time-zone library. Dates are local calendar dates as `YYYY-MM-DD`.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
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

function wallClock(instant: Date, timeZone: string): WallClock {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

const pad = (value: number): string => String(value).padStart(2, '0');

/** Offset of the zone from UTC at `instant`, in minutes (Berlin summer: +120). */
function offsetMinutes(instant: Date, timeZone: string): number {
  const local = wallClock(instant, timeZone);
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

/** Local calendar date of `instant` in `timeZone`. */
export function localDate(instant: Date, timeZone: string): string {
  const { year, month, day } = wallClock(instant, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * The instant at which the wall clock in `timeZone` shows `date` + `time`
 * (`HH:MM`, midnight when null). A time that happens twice when the clocks go
 * back resolves to the later instant; a time skipped by a DST jump resolves
 * to the instant after the jump.
 */
export function zonedTimeToUtc(date: string, time: string | null, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = (time ?? '00:00').split(':').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMinutes(new Date(guess), timeZone) * MS_PER_MINUTE;
  // Re-evaluate at the candidate: the offset differs when a DST change lies in between.
  const second = guess - offsetMinutes(new Date(first), timeZone) * MS_PER_MINUTE;
  // Near a switch only one candidate may show the wanted wall clock (e.g. 01:30
  // just before the clocks go back); take that one. None does inside a gap.
  const matching = [first, second].filter((candidate) => {
    const local = wallClock(new Date(candidate), timeZone);
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

/** `date` shifted by whole days. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY).toISOString().slice(0, 10);
}
