import { addDays, localDate, zonedTimeToUtc } from '../common/zoned-time.util';
import type { SlideFormat } from '../content-source/content-source.types';
import type { PlaylistRule, RuleDateFrom, RuleDateTo } from './playlist-rule.types';

const MS_PER_HOUR = 3_600_000;

/** The event fields the resolver reads; the pool query returns a superset. */
export interface RulePoolEvent {
  id: string;
  sourceId: string;
  title: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  eventDate: string;
  startsAt: Date;
  venue: string;
  genres: string[];
  cancelled: boolean;
  soldOut: boolean;
  goneAt: Date | null;
  slides: { format: SlideFormat; contentId: string }[];
}

export interface ResolvedRuleEntry<E extends RulePoolEvent> {
  event: E;
  /** Slide of the event in the rule's format. */
  contentId: string;
}

/**
 * The instant an event drops out: local midnight after the event day plus the
 * grace hours. Resolved in the organisation's zone, so a DST switch on that
 * night shifts the instant, not the wall-clock rule.
 */
export function eventExpiresAt(eventDate: string, graceHours: number, timeZone: string): Date {
  const nextMidnight = zonedTimeToUtc(addDays(eventDate, 1), '00:00', timeZone);
  return new Date(nextMidnight.getTime() + graceHours * MS_PER_HOUR);
}

export function isEventExpired(
  eventDate: string,
  graceHours: number,
  now: Date,
  timeZone: string,
): boolean {
  return now.getTime() >= eventExpiresAt(eventDate, graceHours, timeZone).getTime();
}

/**
 * Earliest event date that can still be live at `now`: with at most 24 grace
 * hours, an event of the day before yesterday has always expired. The pool
 * query uses it as a lower bound.
 */
export function earliestLiveEventDate(now: Date, timeZone: string): string {
  return addDays(localDate(now, timeZone), -1);
}

function lowerBound(dateFrom: RuleDateFrom, today: string): string | null {
  switch (dateFrom.mode) {
    case 'fixed':
      return dateFrom.date;
    case 'relativeDays':
      return addDays(today, dateFrom.days);
    default:
      // `today` relies on the expiry rule alone, so yesterday's late show stays during the grace hours.
      return null;
  }
}

function upperBound(dateTo: RuleDateTo, today: string): string | null {
  switch (dateTo.mode) {
    case 'fixed':
      return dateTo.date;
    case 'relativeDays':
      return addDays(today, dateTo.days);
    default:
      return null;
  }
}

function matchesGenres(event: RulePoolEvent, rule: PlaylistRule): boolean {
  const { match, values } = rule.genres;
  if (values.length === 0) return true;
  return match === 'all'
    ? values.every((genre) => event.genres.includes(genre))
    : values.some((genre) => event.genres.includes(genre));
}

function compareEvents(a: RulePoolEvent, b: RulePoolEvent, descending: boolean): number {
  const byTime = a.startsAt.getTime() - b.startsAt.getTime();
  if (byTime !== 0) return descending ? -byTime : byTime;
  return a.title.localeCompare(b.title, 'de') || a.id.localeCompare(b.id);
}

/**
 * Applies a playlist rule to an event pool and returns the slides to show, in
 * playback order. Pure: the caller supplies the pool, the clock and the
 * organisation's time zone. Events without a slide in the rule's format are
 * skipped before the limit applies, so the limit counts playable items.
 */
export function resolvePlaylistRule<E extends RulePoolEvent>(
  events: readonly E[],
  rule: PlaylistRule,
  now: Date,
  timeZone: string,
): ResolvedRuleEntry<E>[] {
  const today = localDate(now, timeZone);
  const from = lowerBound(rule.dateFrom, today);
  const to = upperBound(rule.dateTo, today);
  const sources = new Set(rule.sourceIds);
  const venues = new Set(rule.venues);

  const candidates = events.filter(
    (event) =>
      sources.has(event.sourceId) &&
      event.goneAt === null &&
      !(rule.excludeCancelled && event.cancelled) &&
      !(rule.excludeSoldOut && event.soldOut) &&
      (venues.size === 0 || venues.has(event.venue)) &&
      matchesGenres(event, rule) &&
      (from === null || event.eventDate >= from) &&
      (to === null || event.eventDate <= to) &&
      !isEventExpired(event.eventDate, rule.graceHours, now, timeZone),
  );
  const descending = rule.sort === 'date_desc';
  const sorted = [...candidates].sort((a, b) => compareEvents(a, b, descending));

  const seen = new Set<string>();
  const result: ResolvedRuleEntry<E>[] = [];
  for (const event of sorted) {
    if (result.length >= rule.limit) break;
    const slide = event.slides.find((candidate) => candidate.format === rule.format);
    if (!slide || seen.has(slide.contentId)) continue;
    seen.add(slide.contentId);
    result.push({ event, contentId: slide.contentId });
  }
  return result;
}
