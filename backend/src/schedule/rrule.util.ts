import { rrulestr } from 'rrule';

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Expands an RRULE string into concrete date ranges within a bounded window.
 *
 * Each occurrence gets the same duration as the original entry
 * (endTime - startTime), shifted to the recurrence date.
 */
export function expandRRule(
  rruleString: string,
  entryStart: Date,
  entryEnd: Date,
  windowStart: Date,
  windowEnd: Date,
): DateRange[] {
  const durationMs = entryEnd.getTime() - entryStart.getTime();
  const rule = rrulestr(rruleString, { dtstart: entryStart });

  // Look back by one occurrence duration so an occurrence that *starts* just
  // before windowStart but whose interval extends into the window is still
  // included (rangesOverlap filters out any that don't actually overlap).
  const lookbackStart = new Date(windowStart.getTime() - durationMs);
  const occurrences = rule.between(lookbackStart, windowEnd, true);

  return occurrences.map((occStart) => ({
    start: occStart,
    end: new Date(occStart.getTime() + durationMs),
  }));
}

/**
 * Returns concrete date ranges for a schedule entry within a window.
 * For non-recurring entries, returns the single range if it overlaps the window.
 * For recurring entries, expands the RRULE.
 */
export function getOccurrences(
  entryStart: Date,
  entryEnd: Date,
  rruleString: string | null,
  windowStart: Date,
  windowEnd: Date,
): DateRange[] {
  if (!rruleString) {
    if (entryStart < windowEnd && entryEnd > windowStart) {
      return [{ start: entryStart, end: entryEnd }];
    }
    return [];
  }

  return expandRRule(rruleString, entryStart, entryEnd, windowStart, windowEnd);
}
