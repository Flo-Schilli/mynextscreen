import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ScheduleEntry } from './schedule.model';
import { CalendarBlock } from './schedule-calendar.service';
import { BtnComponent, IconComponent } from '../ui';

/**
 * Presentational mobile agenda for a single day. Renders the day's schedule
 * blocks as a tap-to-edit chronological list with an "add slot" affordance and
 * an optional prev/next day switcher (used when a week is collapsed to one day
 * on small screens). Holds no state — emits the user's intent and lets the
 * parent grid/container own the data and navigation.
 */
@Component({
  selector: 'app-schedule-agenda-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BtnComponent, IconComponent],
  template: `
    <div class="agenda-list border-t border-border px-[var(--card-pad)] py-3.5">
      @if (showDaySwitcher()) {
        <div class="flex items-center justify-between gap-2 mb-3.5">
          <button
            type="button"
            class="touch-target grid place-items-center rounded-lg border border-border-strong bg-surface text-muted transition-colors duration-[150ms] hover:bg-surface-3 hover:text-text"
            title="Previous day"
            aria-label="Previous day"
            (click)="prevDay.emit()"
          >
            <span class="inline-grid place-items-center rotate-180">
              <mns-icon name="Chevron" [size]="18" />
            </span>
          </button>
          <span class="agenda-day-label text-sm font-bold text-text text-center truncate">
            {{ dayLabel() }}
          </span>
          <button
            type="button"
            class="touch-target grid place-items-center rounded-lg border border-border-strong bg-surface text-muted transition-colors duration-[150ms] hover:bg-surface-3 hover:text-text"
            title="Next day"
            aria-label="Next day"
            (click)="nextDay.emit()"
          >
            <mns-icon name="Chevron" [size]="18" />
          </button>
        </div>
      } @else {
        <span class="agenda-day-label block text-sm font-bold text-text mb-3.5">
          {{ dayLabel() }}
        </span>
      }

      @if (sortedBlocks().length === 0) {
        <p class="agenda-empty text-[13px] text-faint py-2">No schedule entries for this day.</p>
      }

      <div class="agenda-items flex flex-col gap-2">
        @for (block of sortedBlocks(); track block.entry.id) {
          <button
            type="button"
            class="agenda-item flex items-stretch gap-2.5 w-full text-left rounded-[10px] border border-border bg-surface px-3 py-2.5 transition-colors duration-[150ms] hover:bg-surface-2 active:bg-surface-3"
            (click)="blockSelect.emit(block.entry)"
          >
            <span
              class="agenda-colour w-[3px] rounded-sm flex-shrink-0 self-stretch"
              [style.background]="colour(block.entry)"
            ></span>
            <span class="agenda-info flex flex-col gap-0.5 min-w-0 flex-1">
              <span
                class="agenda-title text-sm font-bold text-text truncate flex items-center gap-1.5"
              >
                @if (block.entry.groupId) {
                  <span class="agenda-group-badge text-[9px] font-extrabold uppercase text-accent">
                    Group
                  </span>
                }
                @if (block.isRecurring) {
                  <mns-icon name="Refresh" [size]="12" class="text-muted flex-shrink-0" />
                }
                <span class="truncate">{{ label(block.entry) }}</span>
              </span>
              <span class="agenda-time text-[12px] font-mono font-semibold text-muted">
                {{ formatTime(block.occurrenceStart) }} - {{ formatTime(block.occurrenceEnd) }}
              </span>
            </span>
            <span class="self-center text-faint flex-shrink-0">
              <mns-icon name="Chevron" [size]="16" />
            </span>
          </button>
        }
      </div>

      <div class="mt-3.5">
        <mns-btn variant="outline" icon="Plus" [full]="true" (mnsClick)="addSlot.emit()">
          Slot hinzufügen
        </mns-btn>
      </div>
    </div>
  `,
})
export class ScheduleAgendaList {
  /** Blocks for the single day this agenda represents (any day index). */
  readonly dayBlocks = input.required<CalendarBlock[]>();
  readonly dayLabel = input.required<string>();
  readonly orgTimeZone = input.required<string>();
  /** Show the prev/next switcher (week collapsed to one day on mobile). */
  readonly showDaySwitcher = input<boolean>(false);

  readonly blockSelect = output<ScheduleEntry>();
  readonly addSlot = output<void>();
  readonly prevDay = output<void>();
  readonly nextDay = output<void>();

  readonly sortedBlocks = computed<CalendarBlock[]>(() =>
    [...this.dayBlocks()].sort((a, b) => a.occurrenceStart.getTime() - b.occurrenceStart.getTime()),
  );

  label(entry: ScheduleEntry): string {
    const playlistName = entry.playlist?.name || 'Playlist';
    if (entry.groupId && entry.group) {
      return `${playlistName} - ${entry.group.name}`;
    }
    return playlistName;
  }

  colour(entry: ScheduleEntry): string {
    return entry.colour || '#6d6cf6';
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString(undefined, {
      timeZone: this.orgTimeZone(),
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
