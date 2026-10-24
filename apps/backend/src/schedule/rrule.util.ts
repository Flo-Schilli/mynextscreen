import { RRule, RRuleSet, rrulestr } from 'rrule';
import { fromWallClock, toWallClock } from '../common/zoned-time.util';

export interface DateRange {
  start: Date;
  end: Date;
}

/** Widest UTC offset of any zone (UTC+14), padding the wall-clock search window. */
const MAX_ZONE_OFFSET_MS = 14 * 60 * 60 * 1000;

/**
 * Expands an RRULE string into concrete date ranges within a bounded window.
 *
 * Occurrences repeat at the entry's wall time in `timeZone`, the organisation's
 * zone, so a 20:00 entry stays at 20:00 local across a DST switch. Each
 * occurrence gets the same duration as the original entry (endTime - startTime).
 */
export function expandRRule(
  rruleString: string,
  entryStart: Date,
  entryEnd: Date,
  windowStart: Date,
  windowEnd: Date,
  timeZone: string,
): DateRange[] {
  const durationMs = entryEnd.getTime() - entryStart.getTime();
  // rrule only knows UTC: expand on the local wall clock, then map each
  // occurrence back to its real instant.
  const rule = wallClockRule(rruleString, entryStart, timeZone);

  // Look back by one occurrence duration so an occurrence that *starts* just
  // before windowStart but whose interval extends into the window is still
  // included (rangesOverlap filters out any that don't actually overlap).
  const lookbackStart = new Date(windowStart.getTime() - durationMs);
  const occurrences = rule.between(
    new Date(lookbackStart.getTime() - MAX_ZONE_OFFSET_MS),
    new Date(windowEnd.getTime() + MAX_ZONE_OFFSET_MS),
    true,
  );

  // Distinct wall times can map to one instant (a skipped hour), so dedupe.
  const startMs = new Set(
    occurrences
      .map((wallStart) => fromWallClock(wallStart, timeZone).getTime())
      .filter((ms) => ms >= lookbackStart.getTime() && ms <= windowEnd.getTime()),
  );
  return [...startMs].map((ms) => ({ start: new Date(ms), end: new Date(ms + durationMs) }));
}

/**
 * The rule anchored on the entry's local wall clock. UNTIL is a real UTC
 * instant in the RRULE string, so it moves onto the wall clock as well.
 */
function wallClockRule(rruleString: string, entryStart: Date, timeZone: string): RRule | RRuleSet {
  const rule = rrulestr(rruleString, { dtstart: toWallClock(entryStart, timeZone) });
  if (!(rule instanceof RRule) || !rule.origOptions.until) return rule;
  return new RRule({ ...rule.origOptions, until: toWallClock(rule.origOptions.until, timeZone) });
}

/**
 * Returns concrete date ranges for a schedule entry within a window.
 * For non-recurring entries, returns the single range if it overlaps the window.
 * For recurring entries, expands the RRULE in the organisation's `timeZone`.
 */
export function getOccurrences(
  entryStart: Date,
  entryEnd: Date,
  rruleString: string | null,
  windowStart: Date,
  windowEnd: Date,
  timeZone: string,
): DateRange[] {
  if (!rruleString) {
    if (entryStart < windowEnd && entryEnd > windowStart) {
      return [{ start: entryStart, end: entryEnd }];
    }
    return [];
  }

  return expandRRule(rruleString, entryStart, entryEnd, windowStart, windowEnd, timeZone);
}
