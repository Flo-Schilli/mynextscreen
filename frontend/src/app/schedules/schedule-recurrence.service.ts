import { Injectable } from '@angular/core';
import { ScheduleEntry } from './schedule.model';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'weekdays';

export interface ParsedRrule {
  freq: string;
  byday?: string[];
}

export interface Occurrence {
  start: Date;
  end: Date;
}

export interface RecurrenceForm {
  recurrence: RecurrenceType;
  weekdays: string[];
}

const WEEKDAY_BY_DAY_INDEX: Record<number, string> = {
  0: 'SU',
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
};

/**
 * Pure recurrence logic for schedule entries.
 *
 * Mirrors the semantics of the backend `rrule.util.ts` for the subset of RRULEs
 * the schedule modal can produce (FREQ=DAILY, FREQ=WEEKLY, FREQ=WEEKLY;BYDAY=...).
 * Kept dependency-free (no `rrule` package) so it matches the existing
 * client-side behavior exactly.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleRecurrenceService {
  /** Parses an RRULE string into its FREQ and optional BYDAY parts. */
  parseRrule(rrule: string): ParsedRrule | null {
    const parts = rrule.replace('RRULE:', '').split(';');
    const map: Record<string, string> = {};
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) map[key] = value;
    }
    if (!map['FREQ']) return null;
    return {
      freq: map['FREQ'],
      byday: map['BYDAY']?.split(','),
    };
  }

  /** Builds an RRULE string from the modal's recurrence form, or undefined for none. */
  buildRrule(recurrence: RecurrenceType, weekdays: string[]): string | undefined {
    if (recurrence === 'none') return undefined;
    if (recurrence === 'daily') return 'FREQ=DAILY';
    if (recurrence === 'weekly') return 'FREQ=WEEKLY';
    if (recurrence === 'weekdays' && weekdays.length > 0) {
      return `FREQ=WEEKLY;BYDAY=${weekdays.join(',')}`;
    }
    return undefined;
  }

  /** Derives the modal recurrence form (dropdown + weekday checkboxes) from an entry's RRULE. */
  toRecurrenceForm(rrule: string | null): RecurrenceForm {
    if (!rrule) {
      return { recurrence: 'none', weekdays: [] };
    }
    const rule = this.parseRrule(rrule);
    if (rule?.freq === 'DAILY') {
      return { recurrence: 'daily', weekdays: [] };
    }
    if (rule?.freq === 'WEEKLY' && rule.byday && rule.byday.length > 0) {
      return { recurrence: 'weekdays', weekdays: [...rule.byday] };
    }
    return { recurrence: 'weekly', weekdays: [] };
  }

  /** Whether the given day matches the entry's recurrence pattern. */
  doesDayMatchRrule(day: Date, entryStart: Date, rule: ParsedRrule): boolean {
    if (rule.freq === 'DAILY') return true;

    if (rule.freq === 'WEEKLY') {
      if (rule.byday && rule.byday.length > 0) {
        return rule.byday.includes(WEEKDAY_BY_DAY_INDEX[day.getDay()]);
      }
      // Weekly with no BYDAY: same weekday as original
      return day.getDay() === entryStart.getDay();
    }

    return false;
  }

  /**
   * Returns the concrete occurrences of an entry that fall on the given day.
   * Non-recurring entries return their single range if it overlaps the day;
   * recurring entries are expanded against their RRULE.
   */
  getOccurrencesOnDay(entry: ScheduleEntry, dayStart: Date): Occurrence[] {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const entryStart = new Date(entry.startTime);
    const entryEnd = new Date(entry.endTime);
    const duration = entryEnd.getTime() - entryStart.getTime();

    if (!entry.rrule) {
      // Non-recurring: check if it overlaps this day
      if (entryStart < dayEnd && entryEnd > dayStart) {
        return [{ start: entryStart, end: entryEnd }];
      }
      return [];
    }

    const rule = this.parseRrule(entry.rrule);
    if (!rule) {
      // Fallback: show on original date
      if (entryStart < dayEnd && entryEnd > dayStart) {
        return [{ start: entryStart, end: entryEnd }];
      }
      return [];
    }

    if (this.doesDayMatchRrule(dayStart, entryStart, rule)) {
      const occStart = new Date(dayStart);
      occStart.setHours(entryStart.getHours(), entryStart.getMinutes(), entryStart.getSeconds());
      const occEnd = new Date(occStart.getTime() + duration);

      // Only include if the occurrence start is on or after the original entry start date
      if (
        occStart >= new Date(entryStart.getFullYear(), entryStart.getMonth(), entryStart.getDate())
      ) {
        return [{ start: occStart, end: occEnd }];
      }
    }

    return [];
  }
}
