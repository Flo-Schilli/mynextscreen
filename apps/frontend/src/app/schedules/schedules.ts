import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ScheduleService } from './schedule.service';
import {
  ScheduleEntry,
  CreateScheduleEntryRequest,
  UpdateScheduleEntryRequest,
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
import { ScreenGroup } from '../screen-groups/screen-group.model';
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
import { PageHeaderComponent } from '../ui';

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
  ],
  template: `
    <div class="page">
      <mns-page-header title="Schedules" icon="Schedules" [sub]="scheduleSubtitle" />

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
          Loading schedules…
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

        @if (sliceProcessing) {
          <div class="slice-status">
            <span class="slice-spinner"></span>
            Processing slices… Content is being prepared for the video wall.
          </div>
        }

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
              (monthDayClick)="onMonthDayClick($event)"
              (createSlot)="openCreateModalWithTimes($event.start, $event.end)"
              (blockMouseDown)="onBlockMouseDown($event.event, $event.block)"
              (resizeMouseDown)="onResizeMouseDown($event.event, $event.block, $event.edge)"
              (blockClick)="onBlockClick($event.event, $event.block)"
              (blockEnter)="openEditModal($event)"
            />
          </div>

          <app-schedule-side-panel
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
    </div>
  `,
  styles: `
    /* Slice Processing Status */
    .slice-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      background: color-mix(in srgb, var(--accent) 10%, var(--surface-2));
      border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
      border-radius: var(--r-lg);
      margin-bottom: 1rem;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }
    .slice-spinner {
      width: 0.875rem;
      height: 0.875rem;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: sched-spin 0.8s linear infinite;
    }
    @keyframes sched-spin {
      to {
        transform: rotate(360deg);
      }
    }

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

  hourHeight = HOUR_HEIGHT;

  // Computed calendar data
  calendarBlocks: CalendarBlock[] = [];
  gapBlocks: GapBlock[] = [];
  monthWeeks: MonthDayCell[][] = [];
  dayTimeline: DayTimeline[] = [];

  // Slice processing status
  sliceProcessing = false;
  private slicePollTimer: ReturnType<typeof setTimeout> | null = null;

  // Modal state (form state itself lives in the modal child)
  showModal = false;
  editingEntry: ScheduleEntry | null = null;
  modalError = '';
  submitting = false;
  modalInitialTargetId = '';
  modalInitialPlaylistId = '';
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
    if (this.loading) return 'Plan playlists across screens and groups by the calendar';
    const count = this.entries.length;
    if (!count) return 'Plan playlists across screens and groups by the calendar';
    return `${count} scheduled ${count === 1 ? 'block' : 'blocks'}`;
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
    const opts: Intl.DateTimeFormatOptions = { timeZone: this.orgTimeZone };
    if (this.viewMode === 'day') {
      return this.currentDate.toLocaleDateString(undefined, {
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
      const fmtStart = first.toLocaleDateString(undefined, {
        ...opts,
        month: 'short',
        day: 'numeric',
      });
      const fmtEnd = last.toLocaleDateString(undefined, {
        ...opts,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `${fmtStart} - ${fmtEnd}`;
    }
    return this.currentDate.toLocaleDateString(undefined, {
      ...opts,
      month: 'long',
      year: 'numeric',
    });
  }

  ngOnInit(): void {
    this.loadCurrentOrg();
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
    if (this.slicePollTimer) clearTimeout(this.slicePollTimer);
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
          this.loadError = 'You are not a member of any organisation.';
          this.loading = false;
          return;
        }
        this.loadOrgDetails();
        this.loadScreens();
        this.loadScreenGroups();
        this.loadPlaylists();
      },
      error: () => {
        this.loadError = 'Failed to load organisation context.';
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
        this.loadError = 'Failed to load screens.';
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
            this.loadError = 'Failed to load schedule entries.';
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
    this.loadEntries();
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
    this.loadEntries();
  }

  navigateToday(): void {
    this.currentDate = new Date();
    this.selectedDate = new Date();
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
    this.modalInitialStart = start;
    this.modalInitialEnd = end;
    this.modalInitialColour = PRESET_COLOURS[Math.floor(Math.random() * PRESET_COLOURS.length)];
    this.modalInitialRecurrence = 'none';
    this.modalInitialWeekdays = [];
    this.modalError = '';
    this.showModal = true;
  }

  openEditModal(entry: ScheduleEntry): void {
    this.editingEntry = entry;
    this.modalInitialPlaylistId = entry.playlistId;
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
      this.modalError = 'End time must be after start time.';
      return;
    }
    if (!result.playlistId) {
      this.modalError = 'Please select a playlist.';
      return;
    }

    const rrule = this.recurrence.buildRrule(result.recurrence, result.weekdays);

    this.submitting = true;
    this.modalError = '';

    if (this.editingEntry) {
      const dto: UpdateScheduleEntryRequest = {
        playlistId: result.playlistId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        rrule: rrule || null,
        colour: result.colour,
      };
      this.scheduleService.update(this.orgId, this.editingEntry.id, dto).subscribe({
        next: () => {
          this.submitting = false;
          this.closeModal();
          this.loadEntries();
          this.toast.success('Schedule updated.');
        },
        error: (err) => {
          this.submitting = false;
          if (err.status === 409) {
            this.modalError = 'This time slot overlaps with an existing entry.';
          } else {
            this.modalError = err.error?.message || 'Failed to update entry.';
          }
        },
      });
    } else {
      if (!result.targetId) {
        this.modalError = 'Please select a target screen or group.';
        this.submitting = false;
        return;
      }

      const isGroupTarget = result.targetId.startsWith('group:');
      const targetId = result.targetId.replace(/^(screen|group):/, '');

      const dto: CreateScheduleEntryRequest = {
        playlistId: result.playlistId,
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
            this.toast.success('Schedule created. Slicing content for video wall...');
            this.startSlicePolling();
          } else {
            this.toast.success('Schedule created.');
          }
        },
        error: (err) => {
          this.submitting = false;
          if (err.status === 409) {
            this.modalError = 'This time slot overlaps with an existing entry.';
          } else {
            this.modalError = err.error?.message || 'Failed to create entry.';
          }
        },
      });
    }
  }

  private startSlicePolling(): void {
    this.sliceProcessing = true;
    // Poll for a few seconds to indicate processing, then clear.
    // In a production system this would check a real status endpoint.
    if (this.slicePollTimer) clearTimeout(this.slicePollTimer);
    this.slicePollTimer = setTimeout(() => {
      this.sliceProcessing = false;
      this.loadEntries();
    }, 8000);
  }

  deleteEntry(): void {
    if (!this.editingEntry) return;
    this.submitting = true;
    this.scheduleService.delete(this.orgId, this.editingEntry.id).subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.loadEntries();
        this.toast.success('Schedule deleted.');
      },
      error: (err) => {
        this.submitting = false;
        this.modalError = err.error?.message || 'Failed to delete entry.';
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
        this.toast.success('Schedule updated.');
      },
      error: (err) => {
        if (err.status === 409) {
          this.toast.error('Overlap detected. Move was reverted.');
        } else {
          this.toast.error('Failed to move entry.');
        }
        this.loadEntries(); // Revert visual
      },
    });
  }

  formatSidePanelDate(date: Date): string {
    return date.toLocaleDateString(undefined, {
      timeZone: this.orgTimeZone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
