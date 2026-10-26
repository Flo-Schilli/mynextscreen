import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  DisplacedSlot,
  ScheduleEntry,
  blockingTitle,
  entryGenres,
  entryPlaylistName,
  entryTitle,
} from './schedule.model';
import {
  CalendarBlock,
  GapBlock,
  GhostBlock,
  MonthDayCell,
  ScheduleViewMode,
} from './schedule-calendar.service';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CardComponent, IconComponent } from '../ui';
import { ScheduleAgendaList } from './schedule-agenda-list';
import { LanguageService } from '../i18n/language.service';
import {
  isSameZonedDay,
  minutesToTime,
  zonedDateKey,
  zonedMinutesOfDay,
  zonedParts,
  zonedTimeToInstant,
} from './org-time';

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

/** Weekday order (Mon-first) used to render the month header from the active locale. */
const WEEKDAY_KEYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const NOW_TICK_MS = 60_000;
/** Where the time grid opens when nothing earlier is scheduled. */
const DEFAULT_FIRST_HOUR = 8;
/** Blocks shorter than this show their title only. */
const COMPACT_BLOCK_PX = 40;
/** From this height a block's title may wrap onto a second line. */
const TALL_BLOCK_PX = 80;

/**
 * Presentational calendar grid — renders the month grid or the day/week time
 * grid for a set of pre-positioned {@link CalendarBlock}s. Owns only display
 * formatting and the slot-click DOM math; all schedule state, drag handling,
 * and persistence stay in the parent, which receives the emitted intents.
 */
@Component({
  selector: 'app-schedule-calendar-grid',
  standalone: true,
  imports: [CardComponent, IconComponent, ScheduleAgendaList, TranslocoDirective],
  template: `
    <mns-card [pad]="false" *transloco="let t">
      @if (viewMode() === 'month') {
        <!-- Month View -->
        <div class="month-grid">
          <div class="month-header-row grid grid-cols-7 border-b border-border">
            @for (dayName of weekdayNames(); track dayName) {
              <div
                class="month-header-cell px-2 py-2.5 text-center text-[13px] font-bold text-muted"
              >
                {{ dayName }}
              </div>
            }
          </div>
          @for (week of monthWeeks(); track $index) {
            <div class="month-week-row grid grid-cols-7">
              @for (day of week; track $index) {
                <div
                  class="month-day-cell min-h-[3rem] md:min-h-[5rem] p-1 md:p-1.5 border-b border-r border-border cursor-pointer transition-colors duration-[120ms] hover:bg-surface-2"
                  [class.other-month]="!day.isCurrentMonth"
                  [class.opacity-40]="!day.isCurrentMonth"
                  [class.today]="day.isToday"
                  (click)="monthDayClick.emit(day.date)"
                  role="button"
                  tabindex="0"
                  (keydown.enter)="monthDayClick.emit(day.date)"
                >
                  <span
                    class="month-day-number text-[11px] md:text-xs font-semibold text-muted inline-block mb-0.5 md:mb-1"
                    [class.is-today]="day.isToday"
                  >
                    {{ day.dayNumber }}
                  </span>
                  <!-- Compact "•N" indicator where chips would not fit (below md) -->
                  @if (day.blocks.length > 0) {
                    <div class="month-day-dot md:hidden flex items-center gap-0.5 text-accent">
                      <span class="w-1.5 h-1.5 rounded-full bg-accent inline-block"></span>
                      <span class="text-[10px] font-bold tabular-nums">{{
                        day.blocks.length
                      }}</span>
                    </div>
                  }
                  <div class="month-day-entries hidden md:flex flex-col gap-0.5">
                    @for (block of day.blocks; track block.entry.id) {
                      <div
                        class="month-entry-chip flex items-center gap-1 text-[10px] font-semibold text-text px-1.5 py-0.5 rounded truncate"
                        [style.background]="chipBg(block.entry)"
                        [style.borderLeft]="'2px solid ' + getColour(block.entry)"
                        [title]="blockTooltip(block)"
                      >
                        @if (block.entry.groupId) {
                          <span class="group-badge-sm text-[9px] font-extrabold text-accent"
                            >G</span
                          >
                        }
                        @if (block.isRecurring) {
                          <mns-icon name="Refresh" [size]="9" class="text-muted flex-shrink-0" />
                        }
                        <span class="truncate">{{ titleOf(block.entry) }}</span>
                      </div>
                    }
                    @for (slot of day.ghosts ?? []; track $index) {
                      <button
                        type="button"
                        class="month-ghost-chip ghost-chip flex items-center gap-1 text-[10px] font-semibold text-muted px-1.5 py-0.5 rounded truncate text-left"
                        [style.borderColor]="slot.colour"
                        [title]="ghostTooltip(slot)"
                        (click)="$event.stopPropagation(); ghostSelect.emit(slot)"
                      >
                        <span class="truncate">{{ slot.eventTitle }}</span>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <!-- Day / Week View — mobile agenda (below md) -->
        <div class="md:hidden">
          <app-schedule-agenda-list
            [dayBlocks]="mobileDayBlocks()"
            [dayLabel]="mobileDayLabel()"
            [orgTimeZone]="orgTimeZone()"
            [showDaySwitcher]="true"
            (blockSelect)="blockEnter.emit($event)"
            (addSlot)="emitMobileSlot()"
            (prevDay)="mobilePrevDay.emit()"
            (nextDay)="mobileNextDay.emit()"
          />
        </div>

        <!-- Day / Week View — desktop time grid (md and up) -->
        <div
          #scroller
          class="time-grid hidden md:block overflow-y-auto overscroll-contain min-h-[420px] max-h-[calc(100dvh-16rem)]"
        >
          <div
            class="time-grid-header flex border-b border-border sticky top-0 z-[8] bg-surface rounded-t-[inherit]"
          >
            <div class="time-gutter-header w-14 flex-shrink-0 border-r border-border"></div>
            @for (day of visibleDays(); track $index) {
              <div
                class="day-column-header flex-1 text-center px-2 py-2.5 text-[13px] font-bold border-l border-border"
                [class.today]="isDayToday(day)"
                [class.bg-accent-soft]="isDayToday(day)"
                [class.text-accent]="isDayToday(day)"
                [class.text-muted]="!isDayToday(day)"
              >
                <span class="day-name">{{ formatDayHeader(day) }}</span>
              </div>
            }
          </div>
          <div
            class="time-grid-body flex relative"
            (click)="onTimeGridClick($event)"
            (keydown.enter)="$event.preventDefault()"
            role="grid"
            tabindex="0"
          >
            <div class="time-gutter w-14 flex-shrink-0 border-r border-border">
              @for (hour of hours; track hour) {
                <div
                  class="time-label relative text-right pr-2 text-[11px] font-semibold font-mono text-faint"
                  [style.height.px]="hourHeight()"
                  style="top: -0.5em"
                >
                  {{ formatHour(hour) }}
                </div>
              }
            </div>
            <div class="day-columns flex flex-1">
              @for (day of visibleDays(); track $index; let dayIdx = $index) {
                <div
                  class="day-column flex-1 relative border-l border-border"
                  [class.bg-accent-soft]="isDayToday(day)"
                  [attr.data-day-index]="dayIdx"
                >
                  @for (hour of hours; track hour) {
                    <div
                      class="hour-slot box-border border-b"
                      style="border-color: color-mix(in srgb, var(--border) 55%, transparent)"
                      [style.height.px]="hourHeight()"
                    ></div>
                  }
                  <!-- Now line (today only, when in visible range) -->
                  @if (isDayToday(day) && nowTopPx() !== null) {
                    <div
                      class="now-line absolute left-0 right-0 h-0.5 bg-accent z-[6] pointer-events-none"
                      style="box-shadow: 0 0 8px -1px var(--accent)"
                      [style.top.px]="nowTopPx()"
                    >
                      <span
                        class="absolute -left-[3px] -top-[3px] w-2 h-2 rounded-full bg-accent"
                      ></span>
                    </div>
                  }
                  <!-- Gap indicators -->
                  @for (gap of getGapsForDay(dayIdx); track $index) {
                    <div
                      class="gap-indicator gap-hatch absolute left-0 right-0 z-[1] pointer-events-none"
                      [style.top.px]="gap.top"
                      [style.height.px]="gap.height"
                    ></div>
                  }
                  <!-- Schedule blocks -->
                  @for (block of getBlocksForDay(dayIdx); track block.entry.id) {
                    <div
                      class="schedule-block absolute left-0.5 right-0.5 rounded-[8px] z-[2] overflow-hidden min-h-[1.25rem] select-none transition-shadow duration-[150ms]"
                      [class.cursor-grab]="!block.entry.managedByRule"
                      [class.cursor-pointer]="!!block.entry.managedByRule"
                      [class.dragging]="draggingEntryId() === block.entry.id"
                      [class.conflict]="hasConflict(block)"
                      [style.top.px]="block.top"
                      [style.height.px]="block.height"
                      [style.background]="blockBg(block.entry)"
                      [style.border]="blockBorder(block)"
                      [style.borderLeft]="blockLeftBorder(block)"
                      (mousedown)="blockMouseDown.emit({ event: $event, block })"
                      (click)="blockClick.emit({ event: $event, block })"
                      (keydown.enter)="blockEnter.emit(block.entry)"
                      role="button"
                      tabindex="0"
                    >
                      @if (!block.entry.managedByRule) {
                        <div
                          class="resize-handle resize-handle-top absolute left-0 right-0 top-0 h-1.5 cursor-ns-resize z-[5]"
                          (mousedown)="resizeMouseDown.emit({ event: $event, block, edge: 'top' })"
                          (keydown.enter)="$event.preventDefault()"
                          role="separator"
                          tabindex="0"
                          [attr.aria-label]="t('schedules.grid.resizeTop')"
                          aria-valuenow="0"
                        ></div>
                      }
                      <div
                        class="block-content px-2 py-1 flex flex-col gap-0.5 h-full box-border min-w-0"
                        [title]="blockTooltip(block)"
                      >
                        @if (isCompact(block)) {
                          <span
                            class="block-title text-[11.5px] font-semibold text-text truncate leading-[1.25]"
                            >{{ titleOf(block.entry) }}</span
                          >
                        } @else {
                          <span class="block-meta flex items-center gap-1 min-w-0 text-muted">
                            <span
                              class="block-time text-[10.5px] font-mono whitespace-nowrap truncate"
                            >
                              {{ formatBlockTime(block.occurrenceStart) }}–{{
                                formatBlockTime(block.occurrenceEnd)
                              }}
                            </span>
                            <span class="ml-auto flex items-center gap-0.5 flex-shrink-0">
                              @if (hasConflict(block)) {
                                <mns-icon name="Alert" [size]="11" class="text-offline" />
                              }
                              @if (isSlicePreparing(block.entry)) {
                                <span
                                  class="inline-flex items-center gap-0.5 text-warn"
                                  [title]="
                                    t('schedules.grid.preparingRenditions', {
                                      percent: slicePct(block.entry),
                                    })
                                  "
                                >
                                  <mns-icon name="Layers" [size]="11" class="animate-pulse" />
                                  <span class="text-[9px] font-bold tabular-nums"
                                    >{{ slicePct(block.entry) }}%</span
                                  >
                                </span>
                              } @else if (block.entry.sliceStatus?.status === 'failed') {
                                <span [title]="t('schedules.grid.renditionFailed')">
                                  <mns-icon name="Alert" [size]="11" class="text-offline" />
                                </span>
                              }
                              @if (block.entry.groupId) {
                                <span
                                  class="group-badge inline-flex text-accent"
                                  [title]="t('schedules.grid.groupBadge')"
                                >
                                  <mns-icon name="Groups" [size]="11" />
                                </span>
                              }
                              @if (block.entry.managedByRule) {
                                <span
                                  class="managed-badge inline-flex"
                                  [title]="t('schedules.managed.managedBadge')"
                                >
                                  <mns-icon name="Lock" [size]="11" />
                                </span>
                              }
                              @if (block.isRecurring) {
                                <mns-icon name="Refresh" [size]="11" />
                              }
                            </span>
                          </span>
                          <span
                            class="block-title text-[12.5px] font-semibold text-text leading-[1.25] break-words"
                            [class.line-clamp-2]="isTall(block)"
                            [class.truncate]="!isTall(block)"
                            >{{ titleOf(block.entry) }}</span
                          >
                          <span class="block-sub flex items-center gap-1 min-w-0 leading-[1.25]">
                            @if (genresOf(block.entry); as genres) {
                              <span
                                class="genre-pill inline-flex items-center gap-0.5 min-w-0 max-w-full flex-shrink-0 rounded px-1 text-[9.5px] font-bold leading-[14px] bg-accent-soft text-accent"
                                [title]="t('schedules.genreGroup.badgeTitle', { genres })"
                              >
                                <mns-icon name="Sparkle" [size]="9" class="flex-shrink-0" />
                                <span class="truncate">{{ genres }}</span>
                              </span>
                            }
                            @if (subtitleOf(block.entry); as subtitle) {
                              <span class="block-playlist text-[11px] text-muted truncate">{{
                                subtitle
                              }}</span>
                            }
                          </span>
                        }
                      </div>
                      @if (!block.entry.managedByRule) {
                        <div
                          class="resize-handle resize-handle-bottom absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize z-[5]"
                          (mousedown)="
                            resizeMouseDown.emit({ event: $event, block, edge: 'bottom' })
                          "
                          (keydown.enter)="$event.preventDefault()"
                          role="separator"
                          tabindex="0"
                          [attr.aria-label]="t('schedules.grid.resizeBottom')"
                          aria-valuenow="0"
                        ></div>
                      }
                    </div>
                  }
                  <!-- Displaced slots: what a rule would play here but left to another entry -->
                  @for (ghost of getGhostsForDay(dayIdx); track $index) {
                    <button
                      type="button"
                      class="ghost-block absolute z-[4] rounded-[6px] overflow-hidden text-left px-1.5 py-1"
                      [class.ghost-wide]="viewMode() === 'day'"
                      [style.top.px]="ghost.top"
                      [style.height.px]="ghost.height"
                      [style.--ghost]="ghost.slot.colour"
                      [title]="ghostTooltip(ghost.slot)"
                      [attr.aria-label]="ghostTooltip(ghost.slot)"
                      (mousedown)="$event.stopPropagation()"
                      (click)="$event.stopPropagation(); ghostSelect.emit(ghost.slot)"
                    >
                      @if (viewMode() === 'day') {
                        <span class="block text-[11.5px] font-semibold text-muted truncate">{{
                          ghost.slot.eventTitle
                        }}</span>
                        <span class="block text-[10.5px] text-faint truncate">{{
                          t('schedules.displaced.short')
                        }}</span>
                      }
                    </button>
                  }
                </div>
              }
            </div>
          </div>
        </div>
        <div
          class="fallback-legend hidden md:flex items-center gap-2 px-4 py-2.5 border-t border-border text-[11px] text-muted"
        >
          <span class="gap-hatch w-5 h-3 rounded-sm border border-border flex-shrink-0"></span>
          {{ t('schedules.grid.fallbackLegend') }}
          @if (ghosts().length > 0) {
            <span
              class="ghost-legend ml-4 w-2.5 h-3 rounded-sm border-[1.5px] border-dashed border-muted flex-shrink-0"
            ></span>
            {{ t('schedules.displaced.legend') }}
          }
        </div>
      }
    </mns-card>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .schedule-block:hover {
      box-shadow: var(--shadow);
      z-index: 3;
    }
    .schedule-block.dragging {
      opacity: 0.7;
      cursor: grabbing;
      z-index: 10;
    }
    .gap-hatch {
      background: repeating-linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-warn) 5%, transparent) 0 1.5px,
        transparent 1.5px 9px
      );
    }
    .ghost-block {
      right: 2px;
      width: 14px;
      border: 1.5px dashed var(--ghost);
      background:
        repeating-linear-gradient(
          135deg,
          color-mix(in srgb, var(--ghost) 35%, transparent) 0 3px,
          transparent 3px 7px
        ),
        var(--surface);
      opacity: 0.9;
    }
    .ghost-block:hover {
      opacity: 1;
      box-shadow: var(--shadow);
    }
    .ghost-block.ghost-wide {
      width: 34%;
    }
    .ghost-chip {
      border: 1px dashed;
      opacity: 0.75;
    }
    .schedule-block.conflict {
      box-shadow: 0 0 0 1px var(--color-offline);
    }
    .month-day-cell:nth-child(7n) {
      border-right: none;
    }
    .month-day-number.is-today {
      background: var(--accent);
      color: #fff;
      border-radius: 9999px;
      width: 1.5rem;
      height: 1.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
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
  /** Slots event schedule rules left to other entries, drawn as dashed ghosts. */
  readonly ghosts = input<GhostBlock[]>([]);
  /**
   * Which of {@link visibleDays} the mobile agenda shows. In week view the grid
   * collapses to a single day on small screens; the parent steps this via the
   * day switcher (mobilePrevDay/mobileNextDay) by moving the current date.
   */
  readonly mobileDayIndex = input<number>(0);

  readonly monthDayClick = output<Date>();
  readonly createSlot = output<CreateSlot>();
  readonly blockMouseDown = output<BlockPointerEvent>();
  readonly resizeMouseDown = output<ResizePointerEvent>();
  readonly blockClick = output<BlockPointerEvent>();
  readonly blockEnter = output<ScheduleEntry>();
  readonly ghostSelect = output<DisplacedSlot>();
  readonly mobilePrevDay = output<void>();
  readonly mobileNextDay = output<void>();

  readonly hours = HOURS;

  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  /** Short weekday labels (Mon-first) in the active locale for the month header. */
  readonly weekdayNames = computed<string[]>(() => {
    this.language.locale();
    return WEEKDAY_KEYS.map((k) => this.transloco.translate('schedules.form.weekday.' + k));
  });

  /** Re-evaluated each minute so the now-line tracks the current time. */
  private readonly nowMs = signal(Date.now());

  constructor() {
    const timer = setInterval(() => this.nowMs.set(Date.now()), NOW_TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  /** The range the time grid last scrolled for, so a re-render never yanks it back. */
  private scrolledFor: { range: string; hadBlocks: boolean } | null = null;

  /**
   * Opens the time grid just above the first thing scheduled in the visible
   * range, or at 08:00, instead of at midnight. Runs again only when the range
   * changes, or once more when its blocks arrive after it did.
   */
  private readonly openAtFirstEntry = afterRenderEffect(() => {
    const el = this.scroller()?.nativeElement;
    if (!el || this.viewMode() === 'month') return;
    const range = `${this.viewMode()}:${this.visibleDays()[0]?.getTime() ?? ''}`;
    const hasBlocks = this.blocks().length > 0;
    const last = this.scrolledFor;
    if (last && last.range === range && (last.hadBlocks || !hasBlocks)) return;
    el.scrollTop = this.initialScrollTop();
    this.scrolledFor = { range, hadBlocks: hasBlocks };
  });

  private initialScrollTop(): number {
    const hourHeight = this.hourHeight();
    const firstTop = Math.min(
      DEFAULT_FIRST_HOUR * hourHeight,
      ...this.blocks().map((block) => block.top),
    );
    return Math.max(0, firstTop - hourHeight);
  }

  /** The visible day the mobile agenda renders (defaults to the first day). */
  private readonly mobileDay = computed<Date | null>(() => {
    const days = this.visibleDays();
    const idx = Math.max(0, Math.min(this.mobileDayIndex(), days.length - 1));
    return days[idx] ?? null;
  });

  /** Blocks belonging to the mobile agenda's day, sorted by the agenda itself. */
  readonly mobileDayBlocks = computed<CalendarBlock[]>(() => {
    const idx = Math.max(0, Math.min(this.mobileDayIndex(), this.visibleDays().length - 1));
    return this.blocks().filter((b) => b.dayIndex === idx);
  });

  /** Full-date heading for the mobile agenda's day. */
  readonly mobileDayLabel = computed<string>(() => {
    const day = this.mobileDay();
    if (!day) return '';
    return day.toLocaleDateString(this.language.locale(), {
      timeZone: this.orgTimeZone(),
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  });

  readonly nowTopPx = computed<number | null>(() => {
    const minutes = zonedMinutesOfDay(new Date(this.nowMs()), this.orgTimeZone());
    const top = (minutes / 60) * this.hourHeight();
    const maxTop = 24 * this.hourHeight();
    if (top < 0 || top > maxTop) return null;
    return top;
  });

  getBlocksForDay(dayIndex: number): CalendarBlock[] {
    return this.blocks().filter((b) => b.dayIndex === dayIndex);
  }

  getGhostsForDay(dayIndex: number): GhostBlock[] {
    return this.ghosts().filter((g) => g.dayIndex === dayIndex);
  }

  /** What a ghost stands for: the event, its rule, and who holds the slot instead. */
  ghostTooltip(slot: DisplacedSlot): string {
    return this.transloco.translate<string>('schedules.displaced.tooltip', {
      event: slot.eventTitle,
      rule: slot.ruleName,
      blocking: blockingTitle(slot),
    });
  }

  getGapsForDay(dayIndex: number): GapBlock[] {
    return this.gaps().filter((g) => g.dayIndex === dayIndex);
  }

  getEntryLabel(entry: ScheduleEntry): string {
    const playlistName =
      entryPlaylistName(entry) ||
      this.transloco.translate<string>('schedules.grid.playlistFallback');
    if (entry.groupId && entry.group) {
      return `${playlistName} - ${entry.group.name}`;
    }
    return playlistName;
  }

  /** Headline of a block: the event or entry name, else the playlist. */
  titleOf(entry: ScheduleEntry): string {
    return entryTitle(entry) || this.transloco.translate<string>('schedules.grid.playlistFallback');
  }

  /** The playlist line under the title, unless the title already is the playlist. */
  subtitleOf(entry: ScheduleEntry): string | null {
    const label = this.getEntryLabel(entry);
    return label === this.titleOf(entry) ? null : label;
  }

  isCompact(block: CalendarBlock): boolean {
    return block.height < COMPACT_BLOCK_PX;
  }

  isTall(block: CalendarBlock): boolean {
    return block.height >= TALL_BLOCK_PX;
  }

  /** Everything a block carries, one item per line, for its native tooltip. */
  blockTooltip(block: CalendarBlock): string {
    const entry = block.entry;
    const genres = entryGenres(entry);
    const target = entry.group?.name ?? entry.screen?.name;
    return [
      this.titleOf(entry),
      `${this.formatBlockTime(block.occurrenceStart)}–${this.formatBlockTime(block.occurrenceEnd)}`,
      this.subtitleOf(entry),
      genres && this.transloco.translate<string>('schedules.genreGroup.badgeTitle', { genres }),
      target,
      entry.managedByRule &&
        this.transloco.translate<string>('schedules.grid.managedBy', {
          rule: entry.managedByRule.name,
        }),
    ]
      .filter((line): line is string => !!line)
      .join('\n');
  }

  /** The genre group the entry's event matched, as "Rock, Metal"; null when none did. */
  genresOf(entry: ScheduleEntry): string | null {
    return entryGenres(entry);
  }

  getColour(entry: ScheduleEntry): string {
    return entry.colour || '#6d6cf6';
  }

  /** True while a split group's wall renditions for this entry are being prepared. */
  isSlicePreparing(entry: ScheduleEntry): boolean {
    const status = entry.sliceStatus?.status;
    return status === 'queued' || status === 'processing';
  }

  /** Slice progress percent for the calendar badge. */
  slicePct(entry: ScheduleEntry): number {
    const ss = entry.sliceStatus;
    if (!ss || ss.totalItems <= 0) return 0;
    return Math.round((ss.completedItems / ss.totalItems) * 100);
  }

  blockBg(entry: ScheduleEntry): string {
    return `color-mix(in srgb, ${this.getColour(entry)} 26%, var(--surface))`;
  }

  chipBg(entry: ScheduleEntry): string {
    return `color-mix(in srgb, ${this.getColour(entry)} 18%, var(--surface))`;
  }

  blockBorder(block: CalendarBlock): string {
    if (this.hasConflict(block)) return '1px solid var(--color-offline)';
    return `1px solid color-mix(in srgb, ${this.getColour(block.entry)} 60%, transparent)`;
  }

  blockLeftBorder(block: CalendarBlock): string {
    const style = this.isOneOff(block) ? 'dashed' : 'solid';
    return `3px ${style} ${this.getColour(block.entry)}`;
  }

  /** A one-off entry has no recurrence rule. */
  isOneOff(block: CalendarBlock): boolean {
    return !block.isRecurring && !block.entry.rrule;
  }

  /** Client-side overlap detection: same day, overlapping minutes, different entry. */
  hasConflict(block: CalendarBlock): boolean {
    const sameDay = this.getBlocksForDay(block.dayIndex);
    return sameDay.some(
      (other) =>
        other.entry.id !== block.entry.id &&
        block.occurrenceStart < other.occurrenceEnd &&
        block.occurrenceEnd > other.occurrenceStart,
    );
  }

  isDayToday(day: Date): boolean {
    return isSameZonedDay(day, new Date(), this.orgTimeZone());
  }

  formatHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  formatDayHeader(day: Date): string {
    return day.toLocaleDateString(this.language.locale(), {
      timeZone: this.orgTimeZone(),
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  formatBlockTime(date: Date): string {
    return date.toLocaleTimeString(this.language.locale(), {
      timeZone: this.orgTimeZone(),
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /**
   * Mobile "+ Slot hinzufügen": reuses the existing {@link createSlot} output
   * with a sensible default 1-hour window on the agenda's day (current hour, or
   * 09:00 for a day that is not today).
   */
  emitMobileSlot(): void {
    const day = this.mobileDay();
    if (!day) return;
    const startHour = this.isDayToday(day) ? zonedParts(new Date(), this.orgTimeZone()).hour : 9;
    this.createSlot.emit(this.hourSlot(day, startHour));
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

    this.createSlot.emit(this.hourSlot(day, hour));
  }

  /**
   * One-hour slot from `hour` on `day`, on the organisation's wall clock.
   * 23:00 ends at 23:59 so the slot never rolls over into the next day.
   */
  private hourSlot(day: Date, hour: number): { start: Date; end: Date } {
    const timeZone = this.orgTimeZone();
    const clamped = Math.max(0, Math.min(23, hour));
    const dayKey = zonedDateKey(day, timeZone);
    const start = zonedTimeToInstant(dayKey, minutesToTime(clamped * 60), timeZone);
    const end = zonedTimeToInstant(dayKey, minutesToTime((clamped + 1) * 60), timeZone);
    return { start, end };
  }
}
