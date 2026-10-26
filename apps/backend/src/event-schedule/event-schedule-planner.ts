import { addDays, localDate, zonedTimeToUtc } from '../common/zoned-time.util';
import { canonicalVenue, type VenueAliasMap } from '../content-source/venue-aliases';
import type { GenreVariant } from './event-schedule.types';

/** How far ahead a rule schedules; the hourly reconcile rolls the horizon on. */
export const EVENT_SCHEDULE_HORIZON_DAYS = 90;

/** The parts of a rule the planner reads. */
export interface PlannerRule {
  venues: readonly string[];
  windowStart: string;
  windowEnd: string;
  excludeCancelled: boolean;
  enabled: boolean;
  genreVariants: readonly GenreVariant[];
}

/** The parts of a source event the planner reads. */
export interface PlannerEvent {
  id: string;
  eventDate: string;
  venue: string;
  cancelled: boolean;
  goneAt: Date | null;
  genres: readonly string[];
}

/** Key of one generated entry: the event it is for and the target it plays on. */
export function slotKey(
  sourceEventId: string | null,
  screenId: string | null,
  groupId: string | null,
): string {
  return `${sourceEventId ?? ''}|${screenId ?? ''}|${groupId ?? ''}`;
}

export interface TimeWindow {
  startTime: Date;
  endTime: Date;
}

export interface PlannedSlot<E extends PlannerEvent> extends TimeWindow {
  event: E;
  /** Index of the genre variant the event plays, null for the rule's playlist as it is. */
  variant: number | null;
}

/**
 * The first variant sharing a genre with the event, compared exactly as a
 * playlist rule's genre filter compares them.
 */
export function variantFor(
  eventGenres: readonly string[],
  variants: readonly GenreVariant[],
): number | null {
  const index = variants.findIndex((variant) =>
    variant.genres.some((genre) => eventGenres.includes(genre)),
  );
  return index === -1 ? null : index;
}

/**
 * The instants a rule window covers on `eventDate`, read in `timeZone`. An
 * end at or before the start lies on the next day, so 18:00–01:00 runs past
 * midnight. Each end resolves on its own wall clock, so a DST switch in
 * between changes the duration, not the times shown.
 */
export function windowOf(
  eventDate: string,
  windowStart: string,
  windowEnd: string,
  timeZone: string,
): TimeWindow {
  const endDate = windowEnd <= windowStart ? addDays(eventDate, 1) : eventDate;
  return {
    startTime: zonedTimeToUtc(eventDate, windowStart, timeZone),
    endTime: zonedTimeToUtc(endDate, windowEnd, timeZone),
  };
}

/**
 * The slots a rule wants: one per listed event at one of its venues, inside
 * the horizon and not over yet. Pure: the caller supplies events, the
 * source's aliases, the excluded event ids, the clock and the organisation's
 * time zone. Venues compare by canonical name; a rule venue that got aliased
 * later means its canonical venue too.
 */
export function planEventSlots<E extends PlannerEvent>(
  rule: PlannerRule,
  events: readonly E[],
  aliases: VenueAliasMap,
  excludedEventIds: ReadonlySet<string>,
  now: Date,
  timeZone: string,
): PlannedSlot<E>[] {
  if (!rule.enabled) return [];
  const venues = new Set(rule.venues.map((venue) => canonicalVenue(aliases, venue)));
  const lastDate = addDays(localDate(now, timeZone), EVENT_SCHEDULE_HORIZON_DAYS);

  return events.flatMap((event) => {
    if (event.goneAt) return [];
    if (rule.excludeCancelled && event.cancelled) return [];
    if (excludedEventIds.has(event.id)) return [];
    if (event.eventDate > lastDate) return [];
    if (!venues.has(canonicalVenue(aliases, event.venue))) return [];
    const window = windowOf(event.eventDate, rule.windowStart, rule.windowEnd, timeZone);
    if (window.endTime.getTime() <= now.getTime()) return [];
    return [{ event, ...window, variant: variantFor(event.genres, rule.genreVariants) }];
  });
}
