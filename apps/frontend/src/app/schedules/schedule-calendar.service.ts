import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { DisplacedSlot, ScheduleEntry, entryGenres, entryPlaylistName } from './schedule.model';
import { ScheduleRecurrenceService } from './schedule-recurrence.service';
import { ScheduleOccurrence } from './schedule-conflicts';
import { LanguageService } from '../i18n/language.service';
import {
  MINUTES_PER_DAY,
  addZonedDays,
  addZonedMonths,
  minutesToTime,
  startOfZonedDay,
  zonedDateKey,
  zonedMinutesOfDay,
  zonedParts,
  zonedTimeToInstant,
} from './org-time';

export type ScheduleViewMode = 'day' | 'week' | 'month' | 'list';

/** How many days the list view shows at first, and adds each time it scrolls to its end. */
export const LIST_VIEW_DAYS = 14;
/** The furthest the list view scrolls ahead of its start. */
export const LIST_MAX_DAYS = 366;

/** One day of the list view with the occurrences and displaced slots that start on it. */
export interface ListDay {
  date: Date;
  occurrences: ScheduleOccurrence[];
  displaced: DisplacedSlot[];
}

/** A displaced slot positioned in a day column, like a {@link CalendarBlock}. */
export interface GhostBlock {
  slot: DisplacedSlot;
  top: number;
  height: number;
  dayIndex: number;
}

export interface CalendarBlock {
  entry: ScheduleEntry;
  top: number;
  height: number;
  dayIndex: number;
  isRecurring: boolean;
  occurrenceStart: Date;
  occurrenceEnd: Date;
}

export interface GapBlock {
  top: number;
  height: number;
  dayIndex: number;
}

export interface MonthDayCell {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  blocks: CalendarBlock[];
  /** Displaced slots starting that day; filled by `withMonthGhosts`. */
  ghosts?: DisplacedSlot[];
}

export interface DayTimeline {
  playlistName: string;
  /** The genre group the event matched, as "Rock, Metal"; null when none did. */
  genres: string | null;
  colour: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  isGroup: boolean;
  targetName: string;
}

export interface TimeGridBlocks {
  blocks: CalendarBlock[];
  gaps: GapBlock[];
}

export interface DateRangeQuery {
  from: string;
  to: string;
}

const MIN_BLOCK_HEIGHT = 20;
const GAP_THRESHOLD_PX = 5;

/**
 * Pure calendar-layout math for the schedules view.
 *
 * Converts schedule entries (expanded via {@link ScheduleRecurrenceService}) into
 * the positioned blocks, gap indicators, month grid, and day timeline the template
 * renders. Holds no UI state — every method takes its inputs explicitly.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleCalendarService {
  private recurrence = inject(ScheduleRecurrenceService);
  private transloco = inject(TranslocoService);
  private language = inject(LanguageService);

  /** Monday-based start of the week containing `date`, at local midnight in `timeZone`. */
  getWeekStart(date: Date, timeZone: string): Date {
    const day = zonedParts(date, timeZone).weekday;
    const diff = day === 0 ? -6 : 1 - day; // Monday as first day
    return addZonedDays(date, diff, timeZone);
  }

  /** The days rendered as columns for the current view (1 for day, 7 for week), as local midnights. */
  getVisibleDays(viewMode: ScheduleViewMode, currentDate: Date, timeZone: string): Date[] {
    if (viewMode === 'day') {
      return [startOfZonedDay(currentDate, timeZone)];
    }
    if (viewMode === 'list') {
      return this.getListDays(currentDate, LIST_VIEW_DAYS, timeZone);
    }
    // week (month view does not use day columns)
    const start = this.getWeekStart(currentDate, timeZone);
    return Array.from({ length: 7 }, (_, i) => addZonedDays(start, i, timeZone));
  }

  /** The ISO from/to window to request entries for, per view. */
  getQueryRange(viewMode: ScheduleViewMode, currentDate: Date, timeZone: string): DateRangeQuery {
    if (viewMode === 'day') {
      const start = startOfZonedDay(currentDate, timeZone);
      const end = addZonedDays(start, 1, timeZone);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    if (viewMode === 'week') {
      const start = this.getWeekStart(currentDate, timeZone);
      const end = addZonedDays(start, 7, timeZone);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    if (viewMode === 'list') {
      const start = startOfZonedDay(currentDate, timeZone);
      const end = addZonedDays(start, LIST_MAX_DAYS, timeZone);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    // month: fetch wider range
    const start = addZonedDays(addZonedMonths(currentDate, 0, timeZone), -7, timeZone);
    const end = addZonedDays(addZonedMonths(currentDate, 1, timeZone), 6, timeZone);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  /**
   * Positions entries as absolute blocks within the day columns and computes
   * fallback gaps. `days` are local midnights in `timeZone`; positions follow
   * the organisation's wall clock, like the hour labels.
   */
  buildTimeGridBlocks(
    entries: ScheduleEntry[],
    days: Date[],
    hourHeight: number,
    timeZone: string,
  ): TimeGridBlocks {
    const blocks: CalendarBlock[] = [];
    const gaps: GapBlock[] = [];

    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      const dayStart = startOfZonedDay(days[dayIdx], timeZone);
      const dayEnd = addZonedDays(dayStart, 1, timeZone);

      const dayBlocks: CalendarBlock[] = [];

      for (const entry of entries) {
        for (const occ of this.occurrencesTouchingDay(entry, dayStart, timeZone)) {
          const clippedStart = occ.start < dayStart ? dayStart : occ.start;
          const clippedEnd = occ.end > dayEnd ? dayEnd : occ.end;

          const startMinutes = zonedMinutesOfDay(clippedStart, timeZone);
          const endMinutes =
            clippedEnd.getTime() >= dayEnd.getTime()
              ? MINUTES_PER_DAY
              : zonedMinutesOfDay(clippedEnd, timeZone);
          const top = (startMinutes / 60) * hourHeight;
          const height = Math.max(
            ((endMinutes - startMinutes) / 60) * hourHeight,
            MIN_BLOCK_HEIGHT,
          );

          const block: CalendarBlock = {
            entry,
            top,
            height,
            dayIndex: dayIdx,
            isRecurring: !!entry.rrule,
            occurrenceStart: clippedStart,
            occurrenceEnd: clippedEnd,
          };
          dayBlocks.push(block);
          blocks.push(block);
        }
      }

      // Build gaps between blocks (fallback playlist indicators)
      const sorted = [...dayBlocks].sort((a, b) => a.top - b.top);
      let lastEnd = 0;
      const dayHeight = 24 * hourHeight;
      for (const block of sorted) {
        if (block.top > lastEnd + GAP_THRESHOLD_PX) {
          gaps.push({ top: lastEnd, height: block.top - lastEnd, dayIndex: dayIdx });
        }
        lastEnd = Math.max(lastEnd, block.top + block.height);
      }
      if (lastEnd < dayHeight - GAP_THRESHOLD_PX) {
        gaps.push({ top: lastEnd, height: dayHeight - lastEnd, dayIndex: dayIdx });
      }
    }

    return { blocks, gaps };
  }

  /** Builds the 6-week month grid (Monday-first) with per-day entry chips, in `timeZone`. */
  buildMonthWeeks(entries: ScheduleEntry[], currentDate: Date, timeZone: string): MonthDayCell[][] {
    const firstOfMonth = addZonedMonths(currentDate, 0, timeZone);
    const month = zonedParts(firstOfMonth, timeZone).month;
    const todayKey = zonedDateKey(new Date(), timeZone);

    const weeks: MonthDayCell[][] = [];
    let current = this.getWeekStart(firstOfMonth, timeZone);

    for (let w = 0; w < 6; w++) {
      const week: MonthDayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = current;
        const parts = zonedParts(cellDate, timeZone);

        const blocks: CalendarBlock[] = [];
        for (const entry of entries) {
          for (const occ of this.occurrencesTouchingDay(entry, cellDate, timeZone)) {
            blocks.push({
              entry,
              top: 0,
              height: 0,
              dayIndex: d,
              isRecurring: !!entry.rrule,
              occurrenceStart: occ.start,
              occurrenceEnd: occ.end,
            });
          }
        }

        week.push({
          date: cellDate,
          dayNumber: parts.day,
          isCurrentMonth: parts.month === month,
          isToday: zonedDateKey(cellDate, timeZone) === todayKey,
          blocks,
        });
        current = addZonedDays(current, 1, timeZone);
      }
      weeks.push(week);
      // Stop if we've passed the month
      const next = zonedParts(current, timeZone);
      if (next.month !== month && next.day > 7) break;
    }

    return weeks;
  }

  /** Ordered list of entries occurring on `selectedDate`, formatted for the side panel. */
  buildDayTimeline(
    entries: ScheduleEntry[],
    selectedDate: Date,
    orgTimeZone: string,
  ): DayTimeline[] {
    const dayStart = startOfZonedDay(selectedDate, orgTimeZone);

    const items: DayTimeline[] = [];
    for (const entry of entries) {
      for (const occ of this.occurrencesTouchingDay(entry, dayStart, orgTimeZone)) {
        const isGroup = !!entry.groupId;
        let targetName = '';
        if (isGroup && entry.group) {
          targetName = entry.group.name;
        } else if (entry.screen) {
          targetName = entry.screen.name;
        }
        items.push({
          playlistName:
            entryPlaylistName(entry) || this.transloco.translate('schedules.grid.playlistFallback'),
          genres: entryGenres(entry),
          colour: entry.colour,
          startTime: this.formatTimeInTz(occ.start, orgTimeZone),
          endTime: this.formatTimeInTz(occ.end, orgTimeZone),
          isRecurring: !!entry.rrule,
          isGroup,
          targetName,
        });
      }
    }
    items.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return items;
  }

  /** Displaced slots positioned in the day columns, split at midnight like entries. */
  buildGhostBlocks(
    slots: readonly DisplacedSlot[],
    days: Date[],
    hourHeight: number,
    timeZone: string,
  ): GhostBlock[] {
    return days.flatMap((day, dayIndex) => {
      const dayStart = startOfZonedDay(day, timeZone);
      const dayEnd = addZonedDays(dayStart, 1, timeZone);
      return slots.flatMap((slot) => {
        const start = new Date(slot.startTime);
        const end = new Date(slot.endTime);
        if (start >= dayEnd || end <= dayStart) return [];
        const startMinutes = start <= dayStart ? 0 : zonedMinutesOfDay(start, timeZone);
        const endMinutes = end >= dayEnd ? MINUTES_PER_DAY : zonedMinutesOfDay(end, timeZone);
        return [
          {
            slot,
            dayIndex,
            top: (startMinutes / 60) * hourHeight,
            height: Math.max(((endMinutes - startMinutes) / 60) * hourHeight, MIN_BLOCK_HEIGHT),
          },
        ];
      });
    });
  }

  /** The month grid with each day's displaced slots attached. */
  withMonthGhosts(
    weeks: MonthDayCell[][],
    slots: readonly DisplacedSlot[],
    timeZone: string,
  ): MonthDayCell[][] {
    if (slots.length === 0) return weeks;
    return weeks.map((week) =>
      week.map((cell) => {
        const key = zonedDateKey(cell.date, timeZone);
        const ghosts = slots.filter(
          (slot) => zonedDateKey(new Date(slot.startTime), timeZone) === key,
        );
        return ghosts.length > 0 ? { ...cell, ghosts } : cell;
      }),
    );
  }

  /** `count` consecutive local midnights from the day of `start`, as the list view shows them. */
  getListDays(start: Date, count: number, timeZone: string): Date[] {
    const first = startOfZonedDay(start, timeZone);
    return Array.from({ length: count }, (_, i) => addZonedDays(first, i, timeZone));
  }

  /**
   * Whether scrolling the list past `days` can still turn up anything: a
   * recurring entry repeats, or a one-off one ends after the last day. Never
   * beyond {@link LIST_MAX_DAYS}.
   */
  listHasMore(
    entries: readonly { endTime: string; rrule?: string | null }[],
    days: Date[],
    timeZone: string,
  ): boolean {
    const last = days[days.length - 1];
    if (!last || days.length >= LIST_MAX_DAYS) return false;
    const end = addZonedDays(last, 1, timeZone);
    return entries.some((entry) => !!entry.rrule || new Date(entry.endTime) > end);
  }

  /**
   * The occurrences of `entries` within `days`, each listed once under the day
   * it starts on (one that began before the first day goes under that day),
   * sorted by start. Days without any are left out.
   */
  buildListDays(
    entries: ScheduleEntry[],
    days: Date[],
    timeZone: string,
    displaced: readonly DisplacedSlot[] = [],
  ): ListDay[] {
    if (days.length === 0) return [];
    const byKey = new Map<string, ScheduleOccurrence>();
    for (const day of days) {
      for (const entry of entries) {
        for (const occ of this.recurrence.getOccurrencesOnDay(entry, day, timeZone)) {
          const key = `${entry.id}@${occ.start.getTime()}`;
          if (!byKey.has(key)) byKey.set(key, { key, entry, start: occ.start, end: occ.end });
        }
      }
    }
    const firstKey = zonedDateKey(days[0], timeZone);
    const listed = days.map((date) => ({
      date,
      key: zonedDateKey(date, timeZone),
      occurrences: [] as ScheduleOccurrence[],
      displaced: [] as DisplacedSlot[],
    }));
    const dayOf = (start: Date) => {
      const startKey = zonedDateKey(start, timeZone);
      return listed.find((d) => d.key === (startKey < firstKey ? firstKey : startKey));
    };
    const lastEnd = addZonedDays(days[days.length - 1], 1, timeZone);
    for (const slot of [...displaced].sort((a, b) => a.startTime.localeCompare(b.startTime))) {
      const start = new Date(slot.startTime);
      if (start >= lastEnd || new Date(slot.endTime) <= days[0]) continue;
      dayOf(start)?.displaced.push(slot);
    }
    const sorted = [...byKey.values()].sort(
      (a, b) => a.start.getTime() - b.start.getTime() || a.key.localeCompare(b.key),
    );
    for (const occurrence of sorted) {
      dayOf(occurrence.start)?.occurrences.push(occurrence);
    }
    return listed
      .filter((day) => day.occurrences.length > 0 || day.displaced.length > 0)
      .map(({ date, occurrences, displaced: onDay }) => ({ date, occurrences, displaced: onDay }));
  }

  /**
   * Converts a block's pixel position back into a concrete start/end time on
   * `dayDate`, reading the pixels as the organisation's wall clock. A bottom
   * edge at the end of the grid means local midnight of the next day.
   */
  pixelsToTimeRange(
    top: number,
    height: number,
    dayDate: Date,
    hourHeight: number,
    timeZone: string,
  ): { start: Date; end: Date } {
    const startMinutes = (top / hourHeight) * 60;
    const endMinutes = ((top + height) / hourHeight) * 60;
    const dayKey = zonedDateKey(dayDate, timeZone);

    const start = zonedTimeToInstant(dayKey, minutesToTime(startMinutes), timeZone);
    const end =
      endMinutes >= MINUTES_PER_DAY
        ? addZonedDays(dayDate, 1, timeZone)
        : zonedTimeToInstant(dayKey, minutesToTime(endMinutes), timeZone);

    return { start, end };
  }

  /**
   * Occurrences that overlap the local day starting at `dayStart`: those that
   * start on it plus a recurring one from the day before that runs past
   * midnight, so a 22:00–02:00 block shows on both days.
   */
  private occurrencesTouchingDay(
    entry: ScheduleEntry,
    dayStart: Date,
    timeZone: string,
  ): { start: Date; end: Date }[] {
    const today = this.recurrence.getOccurrencesOnDay(entry, dayStart, timeZone);
    if (!entry.rrule) return today;
    const yesterday = this.recurrence
      .getOccurrencesOnDay(entry, addZonedDays(dayStart, -1, timeZone), timeZone)
      .filter((occ) => occ.end > dayStart);
    return [...yesterday, ...today];
  }

  private formatTimeInTz(date: Date, orgTimeZone: string): string {
    return date.toLocaleTimeString(this.language.locale(), {
      timeZone: orgTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
