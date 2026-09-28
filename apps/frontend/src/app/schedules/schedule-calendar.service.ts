import { Injectable, inject } from '@angular/core';
import { ScheduleEntry } from './schedule.model';
import { ScheduleRecurrenceService } from './schedule-recurrence.service';
import { UI_LOCALE } from '../shared/locale';

export type ScheduleViewMode = 'day' | 'week' | 'month';

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
}

export interface DayTimeline {
  playlistName: string;
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

  /** Monday-based start of the week containing `date`, at 00:00 local. */
  getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday as first day
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** The days rendered as columns for the current view (1 for day, 7 for week). */
  getVisibleDays(viewMode: ScheduleViewMode, currentDate: Date): Date[] {
    if (viewMode === 'day') {
      return [new Date(currentDate)];
    }
    // week (month view does not use day columns)
    const start = this.getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  /** The ISO from/to window to request entries for, per view. */
  getQueryRange(viewMode: ScheduleViewMode, currentDate: Date): DateRangeQuery {
    if (viewMode === 'day') {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    if (viewMode === 'week') {
      const start = this.getWeekStart(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    // month: fetch wider range
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    start.setDate(start.getDate() - 7);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 7);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  /** Positions entries as absolute blocks within the day columns and computes fallback gaps. */
  buildTimeGridBlocks(entries: ScheduleEntry[], days: Date[], hourHeight: number): TimeGridBlocks {
    const blocks: CalendarBlock[] = [];
    const gaps: GapBlock[] = [];

    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      const dayStart = new Date(days[dayIdx]);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayBlocks: CalendarBlock[] = [];

      for (const entry of entries) {
        const occurrences = this.recurrence.getOccurrencesOnDay(entry, dayStart);
        for (const occ of occurrences) {
          const clippedStart = occ.start < dayStart ? dayStart : occ.start;
          const clippedEnd = occ.end > dayEnd ? dayEnd : occ.end;

          const startMinutes = clippedStart.getHours() * 60 + clippedStart.getMinutes();
          const endMinutes = clippedEnd.getHours() * 60 + clippedEnd.getMinutes();
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

  /** Builds the 6-week month grid (Monday-first) with per-day entry chips. */
  buildMonthWeeks(entries: ScheduleEntry[], currentDate: Date): MonthDayCell[][] {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);

    // Find Monday of the first week
    const start = new Date(firstOfMonth);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diff);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeks: MonthDayCell[][] = [];
    const current = new Date(start);

    for (let w = 0; w < 6; w++) {
      const week: MonthDayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(current);
        const dayStart = new Date(cellDate);
        dayStart.setHours(0, 0, 0, 0);

        const blocks: CalendarBlock[] = [];
        for (const entry of entries) {
          const occurrences = this.recurrence.getOccurrencesOnDay(entry, dayStart);
          for (const occ of occurrences) {
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
          dayNumber: cellDate.getDate(),
          isCurrentMonth: cellDate.getMonth() === month,
          isToday: cellDate.getTime() === today.getTime(),
          blocks,
        });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
      // Stop if we've passed the month
      if (current.getMonth() !== month && current.getDate() > 7) break;
    }

    return weeks;
  }

  /** Ordered list of entries occurring on `selectedDate`, formatted for the side panel. */
  buildDayTimeline(
    entries: ScheduleEntry[],
    selectedDate: Date,
    orgTimeZone: string,
  ): DayTimeline[] {
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);

    const items: DayTimeline[] = [];
    for (const entry of entries) {
      const occurrences = this.recurrence.getOccurrencesOnDay(entry, dayStart);
      for (const occ of occurrences) {
        const isGroup = !!entry.groupId;
        let targetName = '';
        if (isGroup && entry.group) {
          targetName = entry.group.name;
        } else if (entry.screen) {
          targetName = entry.screen.name;
        }
        items.push({
          playlistName: entry.playlist?.name || 'Playlist',
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

  /** Converts a block's pixel position back into a concrete start/end time on `dayDate`. */
  pixelsToTimeRange(
    top: number,
    height: number,
    dayDate: Date,
    hourHeight: number,
  ): { start: Date; end: Date } {
    const startMinutes = (top / hourHeight) * 60;
    const endMinutes = ((top + height) / hourHeight) * 60;

    const start = new Date(dayDate);
    start.setHours(0, 0, 0, 0);
    start.setMinutes(startMinutes);

    const end = new Date(dayDate);
    end.setHours(0, 0, 0, 0);
    end.setMinutes(endMinutes);

    return { start, end };
  }

  private formatTimeInTz(date: Date, orgTimeZone: string): string {
    return date.toLocaleTimeString(UI_LOCALE, {
      timeZone: orgTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
