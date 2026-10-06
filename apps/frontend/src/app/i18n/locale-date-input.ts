/**
 * Formatting and parsing behind the app's own date and time fields.
 *
 * Native `<input type="date|time">` renders in the browser's UI language:
 * Chromium ignores `<html lang>` entirely, so a German interface showed
 * `mm/dd/yyyy` and `AM/PM` whenever the browser itself ran in English. These
 * helpers let a plain text field show the active app locale instead, while the
 * value the rest of the app sees stays the ISO form the native inputs produced
 * (`YYYY-MM-DD`, `HH:mm`), so no call site has to change what it stores.
 */

export type DatePart = 'day' | 'month' | 'year';

export interface DatePattern {
  /** Order the parts appear in for this locale, e.g. day-month-year for de-DE. */
  order: DatePart[];
  separator: string;
}

/** One cell of a month grid. */
export interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_TIME = /^(\d{2}):(\d{2})$/;
const TIME_INPUT = /^(\d{1,2})(?:[:.]?(\d{2}))?\s*([ap])\.?\s*m?\.?$|^(\d{1,2})(?:[:.]?(\d{2}))?$/i;
/** Two-digit years are read as this century; a schedule in 1926 is never meant. */
const CENTURY = 2000;
const DAYS_PER_WEEK = 7;
/** Six weeks covers every month whichever weekday it starts on. */
const GRID_WEEKS = 6;
/** A date whose parts are all distinct, so the locale's order can be read off it. */
const PROBE_DATE = new Date(2006, 10, 22);

const patternCache = new Map<string, DatePattern>();

export function datePattern(locale: string): DatePattern {
  const cached = patternCache.get(locale);
  if (cached) return cached;
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(PROBE_DATE);
  const order = parts
    .map((p) => p.type)
    .filter((t): t is DatePart => t === 'day' || t === 'month' || t === 'year');
  const separator = parts.find((p) => p.type === 'literal')?.value ?? '/';
  const pattern = { order, separator };
  patternCache.set(locale, pattern);
  return pattern;
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** Splits an ISO date into numbers, or null when it is not one. */
export function splitIsoDate(iso: string): { year: number; month: number; day: number } | null {
  const m = ISO_DATE.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return isRealDate(year, month, day) ? { year, month, day } : null;
}

/** `2026-03-09` → `09.03.2026` (de-DE) / `03/09/2026` (en-US). Empty for anything else. */
export function formatIsoDate(iso: string, locale: string): string {
  const parts = splitIsoDate(iso);
  if (!parts) return '';
  const { order, separator } = datePattern(locale);
  const text: Record<DatePart, string> = {
    day: pad2(parts.day),
    month: pad2(parts.month),
    year: String(parts.year),
  };
  return order.map((p) => text[p]).join(separator);
}

/**
 * Reads what someone typed in the locale's own order. Any non-digit separates
 * the parts, so `9.3.26`, `09/03/2026` and `9 3 2026` all work; an ISO date is
 * accepted too, since pasting one is common. Returns null for anything that is
 * not a real calendar date.
 */
export function parseLocalDate(text: string, locale: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (ISO_DATE.test(trimmed)) return splitIsoDate(trimmed) ? trimmed : null;

  const numbers = trimmed.split(/\D+/).filter(Boolean);
  if (numbers.length !== 3) return null;
  const { order } = datePattern(locale);
  const value: Record<DatePart, number> = { day: 0, month: 0, year: 0 };
  order.forEach((part, i) => {
    value[part] = Number(numbers[i]);
  });
  const yearDigits = numbers[order.indexOf('year')].length;
  if (yearDigits === 2) value.year += CENTURY;
  else if (yearDigits !== 4) return null;

  return isRealDate(value.year, value.month, value.day)
    ? toIsoDate(value.year, value.month, value.day)
    : null;
}

/** Whether the locale writes times with AM/PM. */
export function uses12HourClock(locale: string): boolean {
  const cycle = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle;
  return cycle === 'h11' || cycle === 'h12';
}

/** `14:30` → `14:30` (de-DE) / `2:30 PM` (en-US). Empty for anything else. */
export function formatIsoTime(iso: string, locale: string): string {
  const m = ISO_TIME.exec(iso);
  if (!m) return '';
  const hours = Number(m[1]);
  const minutes = m[2];
  if (hours > 23 || Number(minutes) > 59) return '';
  if (!uses12HourClock(locale)) return `${pad2(hours)}:${minutes}`;
  const suffix = hours < 12 ? 'AM' : 'PM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${minutes} ${suffix}`;
}

/**
 * Reads a typed time: `14:30`, `14.30`, `1430`, `9`, `2:30 pm`, `2pm`. An
 * AM/PM suffix is honoured whatever the locale, because someone typing it
 * means it. Returns `HH:mm`, or null when it is not a time of day.
 */
export function parseLocalTime(text: string): string | null {
  const m = TIME_INPUT.exec(text.trim());
  if (!m) return null;
  const meridiem = m[3]?.toLowerCase();
  let hours = Number(m[1] ?? m[4]);
  const minutes = Number(m[2] ?? m[5] ?? '0');
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === 'p' ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }
  return `${pad2(hours)}:${pad2(minutes)}`;
}

/**
 * The weeks shown for a month, starting on `weekStart` (0 = Sunday,
 * 1 = Monday). Always six rows, so the popover does not change height while
 * paging through months.
 */
export function monthGrid(year: number, month: number, weekStart: number): CalendarDay[][] {
  const first = new Date(year, month - 1, 1);
  const lead = (first.getDay() - weekStart + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < GRID_WEEKS; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const date = new Date(year, month - 1, 1 - lead + w * DAYS_PER_WEEK + d);
      week.push({
        iso: toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate()),
        day: date.getDate(),
        inMonth: date.getMonth() === month - 1,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

/** Short weekday names in grid order, e.g. `Mo Di Mi …` for de-DE. */
export function weekdayNames(locale: string, weekStart: number): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 2006-01-01 was a Sunday.
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) =>
    fmt.format(new Date(2006, 0, 1 + ((weekStart + i) % DAYS_PER_WEEK))),
  );
}

export function monthLabel(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
}

/** Full spoken date for a day button's accessible name. */
export function fullDateLabel(iso: string, locale: string): string {
  const parts = splitIsoDate(iso);
  if (!parts) return iso;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(
    new Date(parts.year, parts.month - 1, parts.day),
  );
}

export function todayIso(): string {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
