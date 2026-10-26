import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CardComponent, EmptyComponent, IconComponent, SwitchComponent } from '../ui';
import { LanguageService } from '../i18n/language.service';
import { ListDay } from './schedule-calendar.service';
import { ScheduleConflict, ScheduleOccurrence } from './schedule-conflicts';
import { ScheduleEntry, entryGenres, entryPlaylistName, entryTitle } from './schedule.model';
import { isSameZonedDay } from './org-time';

/**
 * Presentational list of upcoming occurrences, grouped by day. Shows where
 * entries overlap on a screen and which of them plays; selecting a row hands
 * the entry back to the page, which opens it as the calendar would.
 */
@Component({
  selector: 'app-schedule-list-view',
  standalone: true,
  imports: [CardComponent, EmptyComponent, IconComponent, SwitchComponent, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mns-card [pad]="false" *transloco="let t">
      <div
        class="list-head flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border text-[13px]"
      >
        @if (conflictCount() > 0) {
          <span class="conflict-count inline-flex items-center gap-1.5 font-semibold text-offline">
            <mns-icon name="Alert" [size]="14" />
            {{ t('schedules.list.conflicts', { count: conflictCount() }) }}
          </span>
          <div class="only-conflicts ml-auto inline-flex items-center gap-2 text-muted">
            {{ t('schedules.list.onlyConflicts') }}
            <mns-switch [checked]="onlyConflicts()" (toggled)="onlyConflicts.set($event)" />
          </div>
        } @else {
          <span class="no-conflicts inline-flex items-center gap-1.5 text-muted">
            <mns-icon name="CheckCircle" [size]="14" class="text-online" />
            {{ t('schedules.list.noConflicts') }}
          </span>
        }
      </div>

      @if (shownDays().length === 0) {
        <div class="py-10">
          <mns-empty icon="Calendar" [title]="t('schedules.list.empty')" />
        </div>
      }

      @for (day of shownDays(); track day.date.getTime()) {
        <section class="list-day">
          <h3
            class="list-day-head sticky top-0 z-[1] px-4 py-2 text-[12px] font-bold uppercase tracking-wide bg-surface-2 border-b border-border"
            [class.text-accent]="isToday(day.date)"
            [class.text-muted]="!isToday(day.date)"
          >
            {{ formatDay(day.date) }}
          </h3>
          @for (occurrence of day.occurrences; track occurrence.key) {
            <button
              type="button"
              class="list-row w-full text-left grid grid-cols-[3px_1fr] md:grid-cols-[3px_6.5rem_1fr_minmax(0,11rem)] gap-x-3 gap-y-0.5 px-4 py-2.5 border-b border-border last:border-b-0 transition-colors duration-[120ms] hover:bg-surface-2"
              [class.has-conflict]="conflictsOf(occurrence).length > 0"
              (click)="entrySelect.emit(occurrence.entry)"
            >
              <span
                class="row-colour row-span-3 md:row-span-1 rounded-sm self-stretch"
                [style.background]="occurrence.entry.colour || '#6d6cf6'"
              ></span>
              <span
                class="row-time text-[12.5px] font-mono font-semibold text-muted whitespace-nowrap md:pt-px"
              >
                {{ formatTime(occurrence.start) }}–{{ formatTime(occurrence.end) }}
              </span>
              <span class="row-main flex flex-col gap-0.5 min-w-0 col-start-2 md:col-start-auto">
                <span class="flex items-center gap-1.5 min-w-0">
                  @if (conflictsOf(occurrence).length > 0) {
                    <mns-icon name="Alert" [size]="13" class="text-offline flex-shrink-0" />
                  }
                  <span class="row-title text-[13.5px] font-semibold text-text truncate">{{
                    titleOf(occurrence.entry)
                  }}</span>
                  @if (occurrence.entry.managedByRule) {
                    <span
                      class="text-faint flex-shrink-0"
                      [title]="t('schedules.managed.managedBadge')"
                    >
                      <mns-icon name="Lock" [size]="12" />
                    </span>
                  }
                  @if (occurrence.entry.rrule) {
                    <mns-icon name="Refresh" [size]="12" class="text-faint flex-shrink-0" />
                  }
                </span>
                <span class="flex items-center gap-1.5 min-w-0 text-[12px] text-muted">
                  @if (playlistOf(occurrence.entry); as playlist) {
                    <span class="row-playlist truncate">{{ playlist }}</span>
                  }
                  @if (genresOf(occurrence.entry); as genres) {
                    <span
                      class="genre-pill inline-flex items-center gap-0.5 min-w-0 rounded px-1 text-[10.5px] font-bold leading-[16px] bg-accent-soft text-accent"
                      [title]="t('schedules.genreGroup.badgeTitle', { genres })"
                    >
                      <mns-icon name="Sparkle" [size]="10" class="flex-shrink-0" />
                      <span class="truncate">{{ genres }}</span>
                    </span>
                  }
                </span>
                @for (conflict of conflictsOf(occurrence); track conflict.other.id) {
                  <span class="row-conflict text-[12px] text-offline leading-snug">
                    {{ conflictText(conflict) }}
                  </span>
                }
              </span>
              <span
                class="row-target col-start-2 md:col-start-auto flex items-center gap-1.5 min-w-0 text-[12px] text-muted md:justify-end"
              >
                <mns-icon
                  [name]="occurrence.entry.groupId ? 'Groups' : 'Screens'"
                  [size]="12"
                  class="flex-shrink-0 text-faint"
                />
                <span class="truncate">{{ targetOf(occurrence.entry) }}</span>
              </span>
            </button>
          }
        </section>
      }
    </mns-card>
  `,
  styles: `
    .list-row.has-conflict {
      background: color-mix(in srgb, var(--color-offline) 7%, transparent);
    }
  `,
})
export class ScheduleListView {
  readonly days = input.required<ListDay[]>();
  readonly conflicts = input.required<Map<string, ScheduleConflict[]>>();
  readonly orgTimeZone = input.required<string>();

  readonly entrySelect = output<ScheduleEntry>();

  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  readonly onlyConflicts = signal(false);

  readonly conflictCount = computed(() => this.conflicts().size);

  readonly shownDays = computed<ListDay[]>(() => {
    if (!this.onlyConflicts()) return this.days();
    const conflicts = this.conflicts();
    return this.days()
      .map((day) => ({ ...day, occurrences: day.occurrences.filter((o) => conflicts.has(o.key)) }))
      .filter((day) => day.occurrences.length > 0);
  });

  conflictsOf(occurrence: ScheduleOccurrence): ScheduleConflict[] {
    return this.conflicts().get(occurrence.key) ?? [];
  }

  titleOf(entry: ScheduleEntry): string {
    return entryTitle(entry) || this.transloco.translate<string>('schedules.grid.playlistFallback');
  }

  /** The playlist, unless the title already shows it. */
  playlistOf(entry: ScheduleEntry): string | null {
    const playlist = entryPlaylistName(entry);
    return playlist === this.titleOf(entry) ? null : playlist;
  }

  genresOf(entry: ScheduleEntry): string | null {
    return entryGenres(entry);
  }

  targetOf(entry: ScheduleEntry): string {
    return entry.group?.name ?? entry.screen?.name ?? '';
  }

  conflictText(conflict: ScheduleConflict): string {
    return this.transloco.translate<string>(
      conflict.wins ? 'schedules.list.conflictWins' : 'schedules.list.conflictLoses',
      { other: this.titleOf(conflict.other), screens: conflict.screenNames.join(', ') },
    );
  }

  isToday(day: Date): boolean {
    return isSameZonedDay(day, new Date(), this.orgTimeZone());
  }

  formatDay(day: Date): string {
    return day.toLocaleDateString(this.language.locale(), {
      timeZone: this.orgTimeZone(),
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString(this.language.locale(), {
      timeZone: this.orgTimeZone(),
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
