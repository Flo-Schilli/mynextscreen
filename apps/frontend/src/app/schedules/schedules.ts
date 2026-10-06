import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ScheduleService } from './schedule.service';
import {
  ScheduleEntry,
  CreateScheduleEntryRequest,
  UpdateScheduleEntryRequest,
  SchedulePriority,
  TargetOption,
} from './schedule.model';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { PlaylistService } from '../playlists/playlist.service';
import { Playlist } from '../playlists/playlist.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { OrganisationService } from '../admin/organisations/organisation.service';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { ScreenGroup, SliceJobStatus } from '../screen-groups/screen-group.model';
import { DashboardSseService } from '../dashboard/dashboard-sse.service';
import { ScheduleRecurrenceService, RecurrenceType } from './schedule-recurrence.service';
import {
  ScheduleCalendarService,
  ScheduleViewMode,
  CalendarBlock,
  GapBlock,
  DayTimeline,
  MonthDayCell,
} from './schedule-calendar.service';
import { ScheduleToolbar } from './schedule-toolbar';
import { ScheduleSidePanel } from './schedule-side-panel';
import { ScheduleCalendarGrid } from './schedule-calendar-grid';
import { ScheduleFormModal, ScheduleFormResult, PRESET_COLOURS } from './schedule-form-modal';
import { ToastService } from '../shared/toast/toast.service';
import { PageHeaderComponent, OverlayComponent, ModalComponent } from '../ui';
import { LanguageService } from '../i18n/language.service';

const HOUR_HEIGHT = 60;

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [
    ScheduleToolbar,
    ScheduleSidePanel,
    ScheduleCalendarGrid,
    ScheduleFormModal,
    PageHeaderComponent,
    OverlayComponent,
    ModalComponent,
    TranslocoDirective,
  ],
  template: `
    <div class="page" *transloco="let t">
      <mns-page-header
        [title]="t('schedules.page.title')"
        icon="Schedules"
        [sub]="scheduleSubtitle"
      />

      @if (loadError) {
        <p
          class="error text-sm text-offline px-4 py-3 rounded-lg border border-offline/30 bg-offline-dim mb-4"
        >
          {{ loadError }}
        </p>
      }

      @if (loading) {
        <div class="flex items-center justify-center py-20 text-muted text-sm">
          <span
            class="w-5 h-5 rounded-full border-2 border-border border-t-accent animate-spin mr-3"
          ></span>
          {{ t('schedules.page.loading') }}
        </div>
      }

      @if (!loading && !loadError) {
        <app-schedule-toolbar
          [screenTargets]="screenTargets"
          [groupTargets]="groupTargets"
          [selectedTargetId]="selectedTargetId"
          [viewMode]="viewMode"
          [currentRangeLabel]="currentRangeLabel"
          (targetChange)="onToolbarTargetChange($event)"
          (viewChange)="setView($event)"
          (prev)="navigatePrev()"
          (today)="navigateToday()"
          (next)="navigateNext()"
          (create)="openCreateModal()"
        />

        <div class="calendar-layout">
          <div class="calendar-container">
            <app-schedule-calendar-grid
              [viewMode]="viewMode"
              [visibleDays]="visibleDays"
              [monthWeeks]="monthWeeks"
              [blocks]="calendarBlocks"
              [gaps]="gapBlocks"
              [hourHeight]="hourHeight"
              [orgTimeZone]="orgTimeZone"
              [draggingEntryId]="dragState?.entryId ?? null"
              [mobileDayIndex]="mobileDayIndex"
              (monthDayClick)="onMonthDayClick($event)"
              (createSlot)="openCreateModalWithTimes($event.start, $event.end)"
              (blockMouseDown)="onBlockMouseDown($event.event, $event.block)"
              (resizeMouseDown)="onResizeMouseDown($event.event, $event.block, $event.edge)"
              (blockClick)="onBlockClick($event.event, $event.block)"
              (blockEnter)="openEditModal($event)"
              (mobilePrevDay)="stepMobileDay(-1)"
              (mobileNextDay)="stepMobileDay(1)"
            />
          </div>

          <app-schedule-side-panel
            class="hidden md:block"
            [dateLabel]="formatSidePanelDate(selectedDate)"
            [timeline]="dayTimeline"
          />
        </div>
      }

      @if (showModal) {
        <app-schedule-form-modal
          [editingEntry]="editingEntry"
          [screenTargets]="screenTargets"
          [groupTargets]="groupTargets"
          [screenGroups]="screenGroups"
          [playlists]="playlists"
          [submitting]="submitting"
          [error]="modalError"
          [initialTargetId]="modalInitialTargetId"
          [initialPlaylistId]="modalInitialPlaylistId"
          [initialName]="modalInitialName"
          [initialPriority]="modalInitialPriority"
          [initialStart]="modalInitialStart"
          [initialEnd]="modalInitialEnd"
          [initialColour]="modalInitialColour"
          [initialRecurrence]="modalInitialRecurrence"
          [initialWeekdays]="modalInitialWeekdays"
          (save)="submitModal($event)"
          (remove)="deleteEntry()"
          (dismiss)="closeModal()"
        />
      }

      @if (sliceModal; as ss) {
        <mns-overlay (closed)="dismissSliceModal()">
          <mns-modal
            [title]="sliceModalTitle(ss)"
            [icon]="ss.status === 'failed' ? 'Alert' : 'Layers'"
            [widthPx]="420"
            (closed)="dismissSliceModal()"
          >
            @if (ss.status === 'failed') {
              <p class="text-[13px] text-muted leading-relaxed">
                {{
                  t('schedules.slice.failedBody', {
                    error: ss.error || t('schedules.slice.failedFallback'),
                  })
                }}
              </p>
            } @else if (ss.status === 'completed') {
              <p class="text-[13px] text-muted mb-3">{{ t('schedules.slice.completedBody') }}</p>
              <div class="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div class="h-full bg-accent" style="width: 100%"></div>
              </div>
            } @else {
              <p class="text-[13px] text-muted mb-3 leading-relaxed">
                {{ t('schedules.slice.processingBody') }}
              </p>
              <div class="flex justify-between text-[12px] text-muted mb-1.5">
                <span class="tabular-nums">{{ ss.completedItems }}/{{ ss.totalItems }}</span>
                <span class="tabular-nums">{{ slicePct(ss) }}%</span>
              </div>
              <div class="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  class="h-full bg-accent transition-[width] duration-300"
                  [style.width.%]="slicePct(ss)"
                ></div>
              </div>
            }
            <div slot="footer" class="flex justify-end px-6 pb-5">
              <button
                type="button"
                class="text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-border text-muted hover:bg-hover hover:text-text transition-colors"
                (click)="dismissSliceModal()"
              >
                {{
                  ss.status === 'queued' || ss.status === 'processing'
                    ? t('schedules.slice.runInBackground')
                    : t('common.actions.close')
                }}
              </button>
            </div>
          </mns-modal>
        </mns-overlay>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    /* Calendar Layout */
    .calendar-layout {
      display: flex;
      gap: var(--gap, 1rem);
    }
    .calendar-container {
      flex: 1;
      min-width: 0;
    }
  `,
})
export class Schedules implements OnInit, OnDestroy {
  private scheduleService = inject(ScheduleService);
  private screenService = inject(ScreenService);
  private playlistService = inject(PlaylistService);
  private memberService = inject(MemberService);
  private organisationService = inject(OrganisationService);
  private screenGroupService = inject(ScreenGroupService);
  private recurrence = inject(ScheduleRecurrenceService);
  private calendar = inject(ScheduleCalendarService);
  private toast = inject(ToastService);
  private transloco = inject(TranslocoService);
  private language = inject(LanguageService);
  private sse = inject(DashboardSseService);
  private destroyRef = inject(DestroyRef);

  orgId = '';
  orgTimeZone = 'UTC';
  loading = true;
  loadError = '';

  screens: Screen[] = [];
  screenGroups: ScreenGroup[] = [];
  playlists: Playlist[] = [];
  entries: ScheduleEntry[] = [];

  // Target selector: "screen:<id>" or "group:<id>"
  selectedTargetId = '';
  targetOptions: TargetOption[] = [];

  viewMode: ScheduleViewMode = 'week';
  currentDate = new Date();
  selectedDate = new Date();

  // Which visible day the mobile agenda shows (week view collapses to one day
  // on small screens). Stays 0 in day view; tracks the weekday in week view.
  mobileDayIndex = 0;

  hourHeight = HOUR_HEIGHT;

  // Computed calendar data
  calendarBlocks: CalendarBlock[] = [];
  gapBlocks: GapBlock[] = [];
  monthWeeks: MonthDayCell[][] = [];
  dayTimeline: DayTimeline[] = [];

  // Live slice progress overlay, shown after assigning content to a split group.
  // Fed by the slice.* SSE stream; null when no run is being surfaced.
  sliceModal: SliceJobStatus | null = null;
  private sliceModalAutoClose: ReturnType<typeof setTimeout> | null = null;

  // Modal state (form state itself lives in the modal child)
  showModal = false;
  editingEntry: ScheduleEntry | null = null;
  modalError = '';
  submitting = false;
  modalInitialTargetId = '';
  modalInitialPlaylistId = '';
  modalInitialName = '';
  modalInitialPriority: SchedulePriority = 'normal';
  modalInitialStart = new Date();
  modalInitialEnd = new Date();
  modalInitialColour = PRESET_COLOURS[0];
  modalInitialRecurrence: RecurrenceType = 'none';
  modalInitialWeekdays: string[] = [];

  // Drag state
  dragState: { entryId: string; startY: number; originalTop: number; block: CalendarBlock } | null =
    null;
  resizeState: {
    entryId: string;
    edge: 'top' | 'bottom';
    startY: number;
    block: CalendarBlock;
    originalTop: number;
    originalHeight: number;
  } | null = null;

  // Bound handlers for mouse events
  private boundMouseMove = this.onMouseMove.bind(this);
  private boundMouseUp = this.onMouseUp.bind(this);

  get scheduleSubtitle(): string {
    const count = this.entries.length;
    if (this.loading || !count) {
      return this.transloco.translate('schedules.page.subtitleDefault');
    }
    return this.transloco.translate('schedules.page.subtitleCount', { count });
  }

  get screenTargets(): TargetOption[] {
    return this.targetOptions.filter((t) => t.type === 'screen');
  }

  get groupTargets(): TargetOption[] {
    return this.targetOptions.filter((t) => t.type === 'group');
  }

  get selectedTargetType(): 'screen' | 'group' | null {
    if (!this.selectedTargetId) return null;
    return this.selectedTargetId.startsWith('group:') ? 'group' : 'screen';
  }

  get selectedTargetRawId(): string {
    return this.selectedTargetId.replace(/^(screen|group):/, '');
  }

  get visibleDays(): Date[] {
    return this.calendar.getVisibleDays(this.viewMode, this.currentDate);
  }

  get currentRangeLabel(): string {
    const locale = this.language.locale();
    const opts: Intl.DateTimeFormatOptions = { timeZone: this.orgTimeZone };
    if (this.viewMode === 'day') {
      return this.currentDate.toLocaleDateString(locale, {
        ...opts,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (this.viewMode === 'week') {
      const days = this.visibleDays;
      const first = days[0];
      const last = days[6];
      const fmtStart = first.toLocaleDateString(locale, {
        ...opts,
        month: 'short',
        day: 'numeric',
      });
      const fmtEnd = last.toLocaleDateString(locale, {
        ...opts,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${fmtStart} - ${fmtEnd}`;
    }
    return this.currentDate.toLocaleDateString(locale, {
      ...opts,
      month: 'long',
      year: 'numeric',
    });
  }

  ngOnInit(): void {
    this.loadCurrentOrg();
    this.subscribeToSlicing();
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    if (this.sliceModalAutoClose) clearTimeout(this.sliceModalAutoClose);
  }

  /**
   * Live-update slice status across the calendar (badges) and the progress
   * overlay from the dashboard SSE stream. Replaces the previous fixed-timer
   * placeholder with real per-item progress.
   */
  private subscribeToSlicing(): void {
    this.sse.sliceProgress$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((ev) => {
      const d = ev.data;
      this.applySliceEvent({
        groupId: d['groupId'] as string,
        playlistId: d['playlistId'] as string,
        status: 'processing' as SliceJobStatus['status'],
        totalItems: (d['totalItems'] as number) ?? 0,
        completedItems: (d['completedItems'] as number) ?? 0,
        error: null,
      });
    });
    this.sse.sliceComplete$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((ev) => {
      const d = ev.data;
      const total = (d['totalItems'] as number) ?? 0;
      this.applySliceEvent({
        groupId: d['groupId'] as string,
        playlistId: d['playlistId'] as string,
        status: 'completed' as SliceJobStatus['status'],
        totalItems: total,
        completedItems: total,
        error: null,
      });
    });
    this.sse.sliceFailed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((ev) => {
      const d = ev.data;
      this.applySliceEvent({
        groupId: d['groupId'] as string,
        playlistId: d['playlistId'] as string,
        status: 'failed' as SliceJobStatus['status'],
        totalItems: 0,
        completedItems: 0,
        error: (d['error'] as string) ?? null,
      });
    });
  }

  /** Patch the matching calendar entries + the open overlay with a slice update. */
  private applySliceEvent(status: SliceJobStatus): void {
    this.entries = this.entries.map((e) =>
      e.groupId === status.groupId && e.playlistId === status.playlistId
        ? { ...e, sliceStatus: status }
        : e,
    );
    this.rebuildCalendar();

    if (
      this.sliceModal &&
      this.sliceModal.groupId === status.groupId &&
      this.sliceModal.playlistId === status.playlistId
    ) {
      this.sliceModal = status;
      if (status.status === 'completed') {
        // Renditions ready — the backend gate now lets the wall switch. Pull the
        // authoritative entry state, then auto-dismiss the overlay shortly.
        this.loadEntries();
        if (this.sliceModalAutoClose) clearTimeout(this.sliceModalAutoClose);
        this.sliceModalAutoClose = setTimeout(() => (this.sliceModal = null), 2500);
      }
    }
  }

  /** Progress percent for the overlay / badges. */
  slicePct(status: SliceJobStatus | null): number {
    if (!status || status.totalItems <= 0) return 0;
    return Math.round((status.completedItems / status.totalItems) * 100);
  }

  /** Heading for the slice progress overlay by status. */
  sliceModalTitle(status: SliceJobStatus): string {
    if (status.status === 'failed') return this.transloco.translate('schedules.slice.failedTitle');
    if (status.status === 'completed')
      return this.transloco.translate('schedules.slice.readyTitle');
    return this.transloco.translate('schedules.slice.preparingTitle');
  }

  /** Dismiss the overlay and keep tracking via calendar badges ("run in background"). */
  dismissSliceModal(): void {
    if (this.sliceModalAutoClose) clearTimeout(this.sliceModalAutoClose);
    this.sliceModal = null;
    this.loadEntries();
  }

  private loadCurrentOrg(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const adminMembership = memberships.find((m) => m.role === 'org_admin');
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
        } else if (memberships.length > 0) {
          this.orgId = memberships[0].organisationId;
        } else {
          this.loadError = this.transloco.translate('common.errors.noOrgMembership');
          this.loading = false;
          return;
        }
        this.loadOrgDetails();
        this.loadScreens();
        this.loadScreenGroups();
        this.loadPlaylists();
      },
      error: () => {
        this.loadError = this.transloco.translate('common.errors.loadOrgContext');
        this.loading = false;
      },
    });
  }

  private loadOrgDetails(): void {
    this.organisationService.getOne(this.orgId).subscribe({
      next: (org) => {
        this.orgTimeZone = org.timeZone || 'UTC';
      },
      error: () => {
        // Fall back to UTC
      },
    });
  }

  private loadScreens(): void {
    this.screenService.getAll(this.orgId).subscribe({
      next: (screens) => {
        this.screens = screens;
        this.buildTargetOptions();
        if (!this.selectedTargetId && this.targetOptions.length > 0) {
          this.selectedTargetId = this.targetOptions[0].type + ':' + this.targetOptions[0].id;
          this.loadEntries();
        } else if (this.targetOptions.length === 0 && this.screenGroups.length === 0) {
          this.loading = false;
        }
      },
      error: () => {
        this.loadError = this.transloco.translate('schedules.errors.loadScreens');
        this.loading = false;
      },
    });
  }

  private loadScreenGroups(): void {
    this.screenGroupService.getAll(this.orgId).subscribe({
      next: (groups) => {
        this.screenGroups = groups;
        this.buildTargetOptions();
        if (!this.selectedTargetId && this.targetOptions.length > 0) {
          this.selectedTargetId = this.targetOptions[0].type + ':' + this.targetOptions[0].id;
          this.loadEntries();
        } else if (this.selectedTargetId) {
          // Already loading, no need to reload
        } else if (this.targetOptions.length === 0) {
          this.loading = false;
        }
      },
      error: () => {
        // Non-critical — screen groups just won't appear
      },
    });
  }

  private buildTargetOptions(): void {
    const opts: TargetOption[] = [];
    for (const screen of this.screens) {
      opts.push({ id: screen.id, name: screen.name, type: 'screen' });
    }
    for (const group of this.screenGroups) {
      opts.push({ id: group.id, name: group.name, type: 'group', mode: group.mode });
    }
    this.targetOptions = opts;
  }

  private loadPlaylists(): void {
    this.playlistService.getAll(this.orgId).subscribe({
      next: (playlists) => {
        this.playlists = playlists;
      },
    });
  }

  loadEntries(): void {
    if (!this.selectedTargetId) return;
    const range = this.calendar.getQueryRange(this.viewMode, this.currentDate);

    if (this.selectedTargetType === 'screen') {
      this.scheduleService
        .getByScreen(this.orgId, this.selectedTargetRawId, range.from, range.to)
        .subscribe({
          next: (entries) => {
            this.entries = entries;
            this.loading = false;
            this.rebuildCalendar();
          },
          error: () => {
            this.loadError = this.transloco.translate('schedules.errors.loadEntries');
            this.loading = false;
          },
        });
    } else {
      // For group targets, fetch all entries by date range and filter client-side
      this.scheduleService.getByDateRange(this.orgId, range.from, range.to).subscribe({
        next: (entries) => {
          this.entries = entries.filter((e) => e.groupId === this.selectedTargetRawId);
          this.loading = false;
          this.rebuildCalendar();
        },
        error: () => {
          this.loadError = 'Failed to load schedule entries.';
          this.loading = false;
        },
      });
    }
  }

  private rebuildCalendar(): void {
    if (this.viewMode === 'month') {
      this.monthWeeks = this.calendar.buildMonthWeeks(this.entries, this.currentDate);
    } else {
      const { blocks, gaps } = this.calendar.buildTimeGridBlocks(
        this.entries,
        this.visibleDays,
        this.hourHeight,
      );
      this.calendarBlocks = blocks;
      this.gapBlocks = gaps;
    }
    this.dayTimeline = this.calendar.buildDayTimeline(
      this.entries,
      this.selectedDate,
      this.orgTimeZone,
    );
  }

  // --- Navigation ---
  setView(mode: ScheduleViewMode): void {
    this.viewMode = mode;
    this.syncMobileDayIndex();
    this.loadEntries();
  }

  /**
   * Point the mobile agenda at the visible day matching {@link selectedDate}
   * (or day 0 when it falls outside the current range). Keeps the small-screen
   * agenda aligned after view/date changes without a resize listener.
   */
  private syncMobileDayIndex(): void {
    if (this.viewMode !== 'week') {
      this.mobileDayIndex = 0;
      return;
    }
    const days = this.visibleDays;
    const idx = days.findIndex(
      (d) =>
        d.getFullYear() === this.selectedDate.getFullYear() &&
        d.getMonth() === this.selectedDate.getMonth() &&
        d.getDate() === this.selectedDate.getDate(),
    );
    this.mobileDayIndex = idx >= 0 ? idx : 0;
  }

  navigatePrev(): void {
    if (this.viewMode === 'day') {
      this.currentDate = new Date(this.currentDate.getTime() - 86400000);
    } else if (this.viewMode === 'week') {
      this.currentDate = new Date(this.currentDate.getTime() - 7 * 86400000);
    } else {
      this.currentDate = new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth() - 1,
        1,
      );
    }
    this.syncMobileDayIndex();
    this.loadEntries();
  }

  navigateNext(): void {
    if (this.viewMode === 'day') {
      this.currentDate = new Date(this.currentDate.getTime() + 86400000);
    } else if (this.viewMode === 'week') {
      this.currentDate = new Date(this.currentDate.getTime() + 7 * 86400000);
    } else {
      this.currentDate = new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth() + 1,
        1,
      );
    }
    this.syncMobileDayIndex();
    this.loadEntries();
  }

  navigateToday(): void {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.syncMobileDayIndex();
    this.loadEntries();
  }

  /**
   * Mobile day switcher (agenda). In day view this steps the current date by a
   * day; in week view it walks the selected weekday across the visible week,
   * shifting to the adjacent week when it runs past an edge. Keeps
   * {@link selectedDate} aligned with the shown day for the timeline.
   */
  stepMobileDay(delta: number): void {
    if (this.viewMode === 'day') {
      this.currentDate = new Date(this.currentDate.getTime() + delta * 86400000);
      this.selectedDate = new Date(this.currentDate);
      this.mobileDayIndex = 0;
      this.loadEntries();
      return;
    }
    // Week view: 7 day-columns; step the index and roll over to the next week.
    const next = this.mobileDayIndex + delta;
    if (next < 0) {
      this.currentDate = new Date(this.currentDate.getTime() - 7 * 86400000);
      this.mobileDayIndex = 6;
    } else if (next > 6) {
      this.currentDate = new Date(this.currentDate.getTime() + 7 * 86400000);
      this.mobileDayIndex = 0;
    } else {
      this.mobileDayIndex = next;
    }
    this.selectedDate = new Date(this.visibleDays[this.mobileDayIndex]);
    this.loadEntries();
  }

  onToolbarTargetChange(targetId: string): void {
    this.selectedTargetId = targetId;
    this.loadEntries();
  }

  onMonthDayClick(date: Date): void {
    this.currentDate = new Date(date);
    this.selectedDate = new Date(date);
    this.setView('day');
  }

  // --- Modal ---
  openCreateModal(): void {
    const now = new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    this.openCreateModalWithTimes(start, end);
  }

  openCreateModalWithTimes(start: Date, end: Date): void {
    this.editingEntry = null;
    this.modalInitialTargetId = this.selectedTargetId;
    this.modalInitialPlaylistId = this.playlists.length > 0 ? this.playlists[0].id : '';
    this.modalInitialName = '';
    this.modalInitialPriority = 'normal';
    this.modalInitialStart = start;
    this.modalInitialEnd = end;
    this.modalInitialColour = PRESET_COLOURS[Math.floor(Math.random() * PRESET_COLOURS.length)];
    this.modalInitialRecurrence = 'none';
    this.modalInitialWeekdays = [];
    this.modalError = '';
    this.showModal = true;
  }

  openEditModal(entry: ScheduleEntry): void {
    // A split entry that is still slicing (or failed) shows its live progress
    // instead of the edit form when clicked — editing is meaningless until the
    // wall renditions are ready.
    const ss = entry.sliceStatus;
    if (ss && (ss.status === 'queued' || ss.status === 'processing' || ss.status === 'failed')) {
      if (this.sliceModalAutoClose) clearTimeout(this.sliceModalAutoClose);
      this.sliceModal = ss;
      return;
    }

    this.editingEntry = entry;
    this.modalInitialPlaylistId = entry.playlistId;
    this.modalInitialName = entry.name ?? '';
    this.modalInitialPriority = entry.priority;
    this.modalInitialStart = new Date(entry.startTime);
    this.modalInitialEnd = new Date(entry.endTime);
    this.modalInitialColour = entry.colour;

    if (entry.groupId) {
      this.modalInitialTargetId = 'group:' + entry.groupId;
    } else if (entry.screenId) {
      this.modalInitialTargetId = 'screen:' + entry.screenId;
    } else {
      this.modalInitialTargetId = '';
    }

    const form = this.recurrence.toRecurrenceForm(entry.rrule);
    this.modalInitialRecurrence = form.recurrence;
    this.modalInitialWeekdays = form.weekdays;

    this.modalError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingEntry = null;
  }

  submitModal(result: ScheduleFormResult): void {
    const startStr = `${result.startDate}T${result.startTime}:00`;
    const endStr = `${result.endDate}T${result.endTime}:00`;
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (end <= start) {
      this.modalError = this.transloco.translate('schedules.errors.endAfterStart');
      return;
    }
    if (!result.playlistId) {
      this.modalError = this.transloco.translate('schedules.errors.selectPlaylist');
      return;
    }

    const rrule = this.recurrence.buildRrule(result.recurrence, result.weekdays);

    this.submitting = true;
    this.modalError = '';

    if (this.editingEntry) {
      const dto: UpdateScheduleEntryRequest = {
        playlistId: result.playlistId,
        name: result.name ? result.name : null,
        priority: result.priority,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        rrule: rrule || null,
        colour: result.colour,
      };
      const editEntry = this.editingEntry;
      const editIsSplit =
        !!editEntry.groupId &&
        this.screenGroups.find((g) => g.id === editEntry.groupId)?.mode === 'split';
      this.scheduleService.update(this.orgId, editEntry.id, dto).subscribe({
        next: () => {
          this.submitting = false;
          this.closeModal();
          this.loadEntries();
          if (editIsSplit && editEntry.groupId) {
            this.openSliceModal(editEntry.groupId, result.playlistId);
            this.toast.success(this.transloco.translate('schedules.toast.updatedPreparing'));
          } else {
            this.toast.success(this.transloco.translate('schedules.toast.updated'));
          }
        },
        error: (err) => {
          this.submitting = false;
          if (err.status === 409) {
            this.modalError = this.transloco.translate('schedules.errors.overlap');
          } else {
            this.modalError =
              err.error?.message || this.transloco.translate('schedules.errors.updateEntry');
          }
        },
      });
    } else {
      if (!result.targetId) {
        this.modalError = this.transloco.translate('schedules.errors.selectTarget');
        this.submitting = false;
        return;
      }

      const isGroupTarget = result.targetId.startsWith('group:');
      const targetId = result.targetId.replace(/^(screen|group):/, '');

      const dto: CreateScheduleEntryRequest = {
        playlistId: result.playlistId,
        name: result.name || undefined,
        priority: result.priority,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        rrule: rrule || undefined,
        colour: result.colour,
      };

      if (isGroupTarget) {
        dto.groupId = targetId;
      } else {
        dto.screenId = targetId;
      }

      const isSplitGroup =
        isGroupTarget && this.screenGroups.find((g) => g.id === targetId)?.mode === 'split';

      this.scheduleService.create(this.orgId, dto).subscribe({
        next: () => {
          this.submitting = false;
          this.closeModal();
          this.loadEntries();

          if (isSplitGroup) {
            this.openSliceModal(targetId, result.playlistId);
            this.toast.success(this.transloco.translate('schedules.toast.createdPreparing'));
          } else {
            this.toast.success(this.transloco.translate('schedules.toast.created'));
          }
        },
        error: (err) => {
          this.submitting = false;
          if (err.status === 409) {
            this.modalError = this.transloco.translate('schedules.errors.overlap');
          } else {
            this.modalError =
              err.error?.message || this.transloco.translate('schedules.errors.createEntry');
          }
        },
      });
    }
  }

  /** Open the live progress overlay for a split group's slicing run. */
  private openSliceModal(groupId: string, playlistId: string): void {
    if (this.sliceModalAutoClose) clearTimeout(this.sliceModalAutoClose);
    this.sliceModal = {
      groupId,
      playlistId,
      status: 'queued' as SliceJobStatus['status'],
      totalItems: 0,
      completedItems: 0,
      error: null,
    };
  }

  deleteEntry(): void {
    if (!this.editingEntry) return;
    this.submitting = true;
    this.scheduleService.delete(this.orgId, this.editingEntry.id).subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.loadEntries();
        this.toast.success(this.transloco.translate('schedules.toast.deleted'));
      },
      error: (err) => {
        this.submitting = false;
        this.modalError =
          err.error?.message || this.transloco.translate('schedules.errors.deleteEntry');
      },
    });
  }

  // --- Drag & Drop ---
  onBlockMouseDown(event: MouseEvent, block: CalendarBlock): void {
    // Ignore if it was a resize handle
    if ((event.target as HTMLElement).classList.contains('resize-handle')) return;
    event.preventDefault();
    event.stopPropagation();

    this.dragState = {
      entryId: block.entry.id,
      startY: event.clientY,
      originalTop: block.top,
      block,
    };
  }

  onResizeMouseDown(event: MouseEvent, block: CalendarBlock, edge: 'top' | 'bottom'): void {
    event.preventDefault();
    event.stopPropagation();

    this.resizeState = {
      entryId: block.entry.id,
      edge,
      startY: event.clientY,
      block,
      originalTop: block.top,
      originalHeight: block.height,
    };
  }

  onBlockClick(event: MouseEvent, block: CalendarBlock): void {
    // Only open edit if not dragging
    if (this.dragState || this.resizeState) return;
    event.stopPropagation();
    this.selectedDate = new Date(block.occurrenceStart);
    this.dayTimeline = this.calendar.buildDayTimeline(
      this.entries,
      this.selectedDate,
      this.orgTimeZone,
    );
    this.openEditModal(block.entry);
  }

  // NOTE: drag/resize mutates block.top/height in place on the shared
  // CalendarBlock objects rendered by <app-schedule-calendar-grid>. This relies
  // on zone-based change detection (provideZoneChangeDetection) picking up the
  // document mousemove and re-rendering the (non-OnPush) child. If this app ever
  // moves to OnPush or zoneless, switch these to immutable/signal updates.
  private onMouseMove(event: MouseEvent): void {
    if (this.dragState) {
      const dy = event.clientY - this.dragState.startY;
      const newTop = Math.max(0, this.dragState.originalTop + dy);
      this.dragState.block.top = newTop;
    }

    if (this.resizeState) {
      const dy = event.clientY - this.resizeState.startY;
      if (this.resizeState.edge === 'bottom') {
        const newHeight = Math.max(20, this.resizeState.originalHeight + dy);
        this.resizeState.block.height = newHeight;
      } else {
        const newTop = Math.max(0, this.resizeState.originalTop + dy);
        const newHeight = this.resizeState.originalHeight - (newTop - this.resizeState.originalTop);
        if (newHeight >= 20) {
          this.resizeState.block.top = newTop;
          this.resizeState.block.height = newHeight;
        }
      }
    }
  }

  private onMouseUp(): void {
    if (this.dragState) {
      const block = this.dragState.block;
      const moved = Math.abs(block.top - this.dragState.originalTop);
      if (moved > 5) {
        this.commitDragOrResize(block);
      }
      this.dragState = null;
    }

    if (this.resizeState) {
      const block = this.resizeState.block;
      const changed =
        Math.abs(block.height - this.resizeState.originalHeight) > 5 ||
        Math.abs(block.top - this.resizeState.originalTop) > 5;
      if (changed) {
        this.commitDragOrResize(block);
      }
      this.resizeState = null;
    }
  }

  private commitDragOrResize(block: CalendarBlock): void {
    // Convert pixel position back to time
    const dayDate = this.visibleDays[block.dayIndex];
    if (!dayDate) return;

    const { start, end } = this.calendar.pixelsToTimeRange(
      block.top,
      block.height,
      dayDate,
      this.hourHeight,
    );

    const dto: UpdateScheduleEntryRequest = {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };

    this.scheduleService.update(this.orgId, block.entry.id, dto).subscribe({
      next: () => {
        this.loadEntries();
        this.toast.success(this.transloco.translate('schedules.toast.updated'));
      },
      error: (err) => {
        if (err.status === 409) {
          this.toast.error(this.transloco.translate('schedules.toast.overlapReverted'));
        } else {
          this.toast.error(this.transloco.translate('schedules.toast.moveFailed'));
        }
        this.loadEntries(); // Revert visual
      },
    });
  }

  formatSidePanelDate(date: Date): string {
    return date.toLocaleDateString(this.language.locale(), {
      timeZone: this.orgTimeZone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
