import { Component, input, output } from '@angular/core';
import { ScheduleEntry } from './schedule.model';
import {
  CalendarBlock,
  GapBlock,
  MonthDayCell,
  ScheduleViewMode,
} from './schedule-calendar.service';

export interface CreateSlot {
  start: Date;
  end: Date;
}

export interface BlockPointerEvent {
  event: MouseEvent;
  block: CalendarBlock;
}

export interface ResizePointerEvent extends BlockPointerEvent {
  edge: 'top' | 'bottom';
}

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Presentational calendar grid — renders the month grid or the day/week time
 * grid for a set of pre-positioned {@link CalendarBlock}s. Owns only display
 * formatting and the slot-click DOM math; all schedule state, drag handling,
 * and persistence stay in the parent, which receives the emitted intents.
 */
@Component({
  selector: 'app-schedule-calendar-grid',
  standalone: true,
  template: `
    @if (viewMode() === 'month') {
      <!-- Month View -->
      <div class="month-grid">
        <div class="month-header-row">
          @for (dayName of weekdayNames; track dayName) {
            <div class="month-header-cell">{{ dayName }}</div>
          }
        </div>
        @for (week of monthWeeks(); track $index) {
          <div class="month-week-row">
            @for (day of week; track $index) {
              <div
                class="month-day-cell"
                [class.other-month]="!day.isCurrentMonth"
                [class.today]="day.isToday"
                (click)="monthDayClick.emit(day.date)"
                role="button"
                tabindex="0"
                (keydown.enter)="monthDayClick.emit(day.date)"
              >
                <span class="month-day-number">{{ day.dayNumber }}</span>
                <div class="month-day-entries">
                  @for (block of day.blocks; track block.entry.id) {
                    <div
                      class="month-entry-chip"
                      [style.background]="block.entry.colour"
                      [title]="getEntryLabel(block.entry)"
                    >
                      @if (block.entry.groupId) {
                        <span class="group-badge-sm">G</span>
                      }
                      @if (block.isRecurring) {
                        <span class="repeat-icon">&#8634;</span>
                      }
                      {{ getEntryLabel(block.entry) }}
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    } @else {
      <!-- Day / Week View -->
      <div class="time-grid">
        <div class="time-grid-header">
          <div class="time-gutter-header"></div>
          @for (day of visibleDays(); track $index) {
            <div class="day-column-header" [class.today]="isDayToday(day)">
              <span class="day-name">{{ formatDayHeader(day) }}</span>
            </div>
          }
        </div>
        <div
          class="time-grid-body"
          (click)="onTimeGridClick($event)"
          (keydown.enter)="$event.preventDefault()"
          role="grid"
          tabindex="0"
        >
          <div class="time-gutter">
            @for (hour of hours; track hour) {
              <div class="time-label" [style.height.px]="hourHeight()">{{ formatHour(hour) }}</div>
            }
          </div>
          <div class="day-columns">
            @for (day of visibleDays(); track $index; let dayIdx = $index) {
              <div class="day-column" [attr.data-day-index]="dayIdx">
                @for (hour of hours; track hour) {
                  <div class="hour-slot" [style.height.px]="hourHeight()"></div>
                }
                <!-- Gap indicators -->
                @for (gap of getGapsForDay(dayIdx); track $index) {
                  <div
                    class="gap-indicator"
                    [style.top.px]="gap.top"
                    [style.height.px]="gap.height"
                  >
                    <span class="gap-label">Fallback playlist</span>
                  </div>
                }
                <!-- Schedule blocks -->
                @for (block of getBlocksForDay(dayIdx); track block.entry.id) {
                  <div
                    class="schedule-block"
                    [style.top.px]="block.top"
                    [style.height.px]="block.height"
                    [style.background]="block.entry.colour"
                    [class.dragging]="draggingEntryId() === block.entry.id"
                    (mousedown)="blockMouseDown.emit({ event: $event, block })"
                    (click)="blockClick.emit({ event: $event, block })"
                    (keydown.enter)="blockEnter.emit(block.entry)"
                    role="button"
                    tabindex="0"
                  >
                    <div
                      class="resize-handle resize-handle-top"
                      (mousedown)="resizeMouseDown.emit({ event: $event, block, edge: 'top' })"
                      (keydown.enter)="$event.preventDefault()"
                      role="separator"
                      tabindex="0"
                      aria-label="Resize top"
                      aria-valuenow="0"
                    ></div>
                    <div class="block-content">
                      @if (block.entry.groupId) {
                        <span class="group-badge">Group</span>
                      }
                      @if (block.isRecurring) {
                        <span class="repeat-icon">&#8634;</span>
                      }
                      <span class="block-title">{{ getEntryLabel(block.entry) }}</span>
                      <span class="block-time">
                        {{ formatBlockTime(block.occurrenceStart) }} -
                        {{ formatBlockTime(block.occurrenceEnd) }}
                      </span>
                    </div>
                    <div
                      class="resize-handle resize-handle-bottom"
                      (mousedown)="resizeMouseDown.emit({ event: $event, block, edge: 'bottom' })"
                      (keydown.enter)="$event.preventDefault()"
                      role="separator"
                      tabindex="0"
                      aria-label="Resize bottom"
                      aria-valuenow="0"
                    ></div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    /* ── Time grid ─────────────────────────────────────────────── */
    .time-grid {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-xl, 14px);
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .time-grid-header {
      display: flex;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .time-gutter-header {
      width: 3.5rem;
      flex-shrink: 0;
      border-right: 1px solid var(--border);
    }
    .day-column-header {
      flex: 1;
      text-align: center;
      padding: 0.625rem 0.5rem;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-muted);
      border-left: 1px solid var(--border);
    }
    .day-column-header.today {
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, transparent);
    }
    .time-grid-body {
      display: flex;
      max-height: calc(100vh - 14rem);
      overflow-y: auto;
      position: relative;
    }
    .time-gutter {
      width: 3.5rem;
      flex-shrink: 0;
      border-right: 1px solid var(--border);
    }
    .time-label {
      font-size: 0.6875rem;
      font-weight: 600;
      font-family: var(--mono, ui-monospace, monospace);
      color: var(--text-faint);
      text-align: right;
      padding-right: 0.5rem;
      box-sizing: border-box;
      position: relative;
      top: -0.5em;
    }
    .day-columns {
      display: flex;
      flex: 1;
    }
    .day-column {
      flex: 1;
      position: relative;
      border-left: 1px solid var(--border);
    }
    .hour-slot {
      border-bottom: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
      box-sizing: border-box;
    }

    /* ── Schedule Blocks ───────────────────────────────────────── */
    .schedule-block {
      position: absolute;
      left: 2px;
      right: 2px;
      border-radius: 8px;
      cursor: grab;
      z-index: 2;
      overflow: hidden;
      min-height: 1.25rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
      transition:
        box-shadow 0.15s,
        opacity 0.15s;
      user-select: none;
      border-left-width: 3px;
      border-left-style: solid;
    }
    .schedule-block:hover {
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
      z-index: 3;
    }
    .schedule-block.dragging {
      opacity: 0.7;
      cursor: grabbing;
      z-index: 10;
    }
    .block-content {
      padding: 0.3rem 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      height: 100%;
      box-sizing: border-box;
    }
    .block-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
      line-height: 1.2;
    }
    .block-time {
      font-size: 0.625rem;
      font-family: var(--mono, ui-monospace, monospace);
      color: rgba(255, 255, 255, 0.82);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
    .repeat-icon {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.9);
      margin-right: 0.125rem;
    }

    /* ── Group Badge ───────────────────────────────────────────── */
    .group-badge {
      display: inline-block;
      font-size: 0.5625rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: rgba(255, 255, 255, 0.22);
      color: #fff;
      padding: 0.0625rem 0.3rem;
      border-radius: 4px;
      width: fit-content;
    }
    .group-badge-sm {
      display: inline-block;
      font-size: 0.5rem;
      font-weight: 800;
      background: rgba(255, 255, 255, 0.28);
      color: #fff;
      padding: 0 0.2rem;
      border-radius: 3px;
      margin-right: 0.125rem;
      line-height: 1.25;
    }

    /* ── Resize Handles ────────────────────────────────────────── */
    .resize-handle {
      position: absolute;
      left: 0;
      right: 0;
      height: 6px;
      cursor: ns-resize;
      z-index: 5;
    }
    .resize-handle-top {
      top: 0;
    }
    .resize-handle-bottom {
      bottom: 0;
    }

    /* ── Gap Indicators ────────────────────────────────────────── */
    .gap-indicator {
      position: absolute;
      left: 2px;
      right: 2px;
      background: color-mix(in srgb, var(--warn) 8%, transparent);
      border: 1px dashed color-mix(in srgb, var(--warn) 28%, transparent);
      border-radius: 6px;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .gap-label {
      font-size: 0.625rem;
      color: color-mix(in srgb, var(--warn) 60%, transparent);
      font-style: italic;
    }

    /* ── Month View ────────────────────────────────────────────── */
    .month-grid {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r-xl, 14px);
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .month-header-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 1px solid var(--border);
    }
    .month-header-cell {
      padding: 0.625rem 0.5rem;
      text-align: center;
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-muted);
    }
    .month-week-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
    }
    .month-day-cell {
      min-height: 5rem;
      padding: 0.375rem;
      border-bottom: 1px solid var(--border);
      border-right: 1px solid var(--border);
      cursor: pointer;
      transition: background 0.12s;
    }
    .month-day-cell:nth-child(7n) {
      border-right: none;
    }
    .month-day-cell:hover {
      background: var(--surface-2);
    }
    .month-day-cell.other-month {
      opacity: 0.38;
    }
    .month-day-cell.today .month-day-number {
      background: var(--accent);
      color: #fff;
      border-radius: 9999px;
      width: 1.5rem;
      height: 1.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .month-day-number {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      display: inline-block;
      margin-bottom: 0.1875rem;
    }
    .month-day-entries {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .month-entry-chip {
      font-size: 0.625rem;
      font-weight: 600;
      color: #fff;
      padding: 0.125rem 0.3125rem;
      border-radius: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }
  `,
})
export class ScheduleCalendarGrid {
  readonly viewMode = input.required<ScheduleViewMode>();
  readonly visibleDays = input.required<Date[]>();
  readonly monthWeeks = input.required<MonthDayCell[][]>();
  readonly blocks = input.required<CalendarBlock[]>();
  readonly gaps = input.required<GapBlock[]>();
  readonly hourHeight = input.required<number>();
  readonly orgTimeZone = input.required<string>();
  readonly draggingEntryId = input<string | null>(null);

  readonly monthDayClick = output<Date>();
  readonly createSlot = output<CreateSlot>();
  readonly blockMouseDown = output<BlockPointerEvent>();
  readonly resizeMouseDown = output<ResizePointerEvent>();
  readonly blockClick = output<BlockPointerEvent>();
  readonly blockEnter = output<ScheduleEntry>();

  readonly weekdayNames = WEEKDAY_NAMES;
  readonly hours = HOURS;

  getBlocksForDay(dayIndex: number): CalendarBlock[] {
    return this.blocks().filter((b) => b.dayIndex === dayIndex);
  }

  getGapsForDay(dayIndex: number): GapBlock[] {
    return this.gaps().filter((g) => g.dayIndex === dayIndex);
  }

  getEntryLabel(entry: ScheduleEntry): string {
    const playlistName = entry.playlist?.name || 'Playlist';
    if (entry.groupId && entry.group) {
      return `${playlistName} - ${entry.group.name}`;
    }
    return playlistName;
  }

  isDayToday(day: Date): boolean {
    const today = new Date();
    return (
      day.getFullYear() === today.getFullYear() &&
      day.getMonth() === today.getMonth() &&
      day.getDate() === today.getDate()
    );
  }

  formatHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  formatDayHeader(day: Date): string {
    return day.toLocaleDateString(undefined, {
      timeZone: this.orgTimeZone(),
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  formatBlockTime(date: Date): string {
    return date.toLocaleTimeString(undefined, {
      timeZone: this.orgTimeZone(),
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  onTimeGridClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Only handle clicks on hour slots (not on blocks)
    if (!target.classList.contains('hour-slot')) return;

    const dayColumn = target.closest('.day-column') as HTMLElement;
    if (!dayColumn) return;
    const dayIndex = parseInt(dayColumn.getAttribute('data-day-index') || '0', 10);
    const day = this.visibleDays()[dayIndex];
    if (!day) return;

    const rect = dayColumn.getBoundingClientRect();
    const y = event.clientY - rect.top + dayColumn.scrollTop;
    const hour = Math.floor(y / this.hourHeight());
    const clampedHour = Math.max(0, Math.min(23, hour));

    const start = new Date(day);
    start.setHours(clampedHour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(clampedHour + 1);

    this.createSlot.emit({ start, end });
  }
}
