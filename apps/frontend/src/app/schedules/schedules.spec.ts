import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { Schedules } from './schedules';
import { ScheduleService } from './schedule.service';
import {
  ScheduleEntry,
  CreateScheduleEntryRequest,
  UpdateScheduleEntryRequest,
} from './schedule.model';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { PlaylistService } from '../playlists/playlist.service';
import { Playlist } from '../playlists/playlist.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { OrganisationService } from '../admin/organisations/organisation.service';
import { Organisation } from '../admin/organisations/organisation.model';
import { ScreenGroupService } from '../screen-groups/screen-group.service';
import { ScreenGroup } from '../screen-groups/screen-group.model';
import { CalendarBlock } from './schedule-calendar.service';
import { ScheduleFormResult } from './schedule-form-modal';
import { ToastService, Toast } from '../shared/toast/toast.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

function makeEntry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    id: 'e1',
    organisationId: ORG_ID,
    screenId: 's1',
    groupId: null,
    playlistId: 'p1',
    startTime: '2026-06-01T08:00:00.000Z',
    endTime: '2026-06-01T10:00:00.000Z',
    rrule: null,
    colour: '#3b82f6',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makeScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 's1',
    organisationId: ORG_ID,
    name: 'Lobby',
    resolution: '1920x1080',
    location: 'Hall',
    isOnline: true,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makeGroup(overrides: Partial<ScreenGroup> = {}): ScreenGroup {
  return {
    id: 'g1',
    organisationId: ORG_ID,
    name: 'Wall',
    mode: 'split',
    gridColumns: 2,
    gridRows: 2,
    screens: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 'p1',
    organisationId: ORG_ID,
    name: 'Loop A',
    color: '#6d6cf6',
    items: [],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makeBlock(overrides: Partial<CalendarBlock> = {}): CalendarBlock {
  return {
    entry: makeEntry(),
    top: 60,
    height: 120,
    dayIndex: 0,
    isRecurring: false,
    occurrenceStart: new Date('2026-06-01T08:00:00.000Z'),
    occurrenceEnd: new Date('2026-06-01T10:00:00.000Z'),
    ...overrides,
  };
}

function makeForm(overrides: Partial<ScheduleFormResult> = {}): ScheduleFormResult {
  return {
    targetId: 'screen:s1',
    playlistId: 'p1',
    startDate: '2026-06-01',
    startTime: '08:00',
    endDate: '2026-06-01',
    endTime: '10:00',
    colour: '#3b82f6',
    recurrence: 'none',
    weekdays: [],
    ...overrides,
  };
}

// --- Stubs -----------------------------------------------------------------

class MemberServiceStub {
  memberships: MyMembership[] = [
    { id: 'm1', userId: 'u1', organisationId: ORG_ID, role: 'org_admin', createdAt: '' },
  ];
  getMyMemberships(): Observable<MyMembership[]> {
    return of(this.memberships);
  }
}

class OrganisationServiceStub {
  org: Organisation = {
    id: ORG_ID,
    name: 'Org',
    timeZone: 'UTC',
    storageOriginalLimitBytes: 0,
    storageTranscodedLimitBytes: 0,
    storageOriginalUsedBytes: 0,
    storageTranscodedUsedBytes: 0,
    defaultPlaylistId: null,
    createdAt: '',
    updatedAt: '',
  };
  getOne(): Observable<Organisation> {
    return of(this.org);
  }
}

class ScreenServiceStub {
  screens: Screen[] = [makeScreen()];
  getAll(): Observable<Screen[]> {
    return of(this.screens);
  }
}

class ScreenGroupServiceStub {
  groups: ScreenGroup[] = [makeGroup()];
  getAll(): Observable<ScreenGroup[]> {
    return of(this.groups);
  }
}

class PlaylistServiceStub {
  playlists: Playlist[] = [makePlaylist()];
  getAll(): Observable<Playlist[]> {
    return of(this.playlists);
  }
}

class ScheduleServiceStub {
  entries: ScheduleEntry[] = [];
  createResult: Observable<ScheduleEntry> = of(makeEntry());
  updateResult: Observable<ScheduleEntry> = of(makeEntry());
  deleteResult: Observable<void> = of(undefined);

  lastCreateDto?: CreateScheduleEntryRequest;
  lastUpdate?: { id: string; dto: UpdateScheduleEntryRequest };
  lastDeleteId?: string;

  getByScreen(): Observable<ScheduleEntry[]> {
    return of(this.entries);
  }
  getByDateRange(): Observable<ScheduleEntry[]> {
    return of(this.entries);
  }
  create(orgId: string, dto: CreateScheduleEntryRequest): Observable<ScheduleEntry> {
    this.lastCreateDto = dto;
    return this.createResult;
  }
  update(orgId: string, id: string, dto: UpdateScheduleEntryRequest): Observable<ScheduleEntry> {
    this.lastUpdate = { id, dto };
    return this.updateResult;
  }
  delete(orgId: string, id: string): Observable<void> {
    this.lastDeleteId = id;
    return this.deleteResult;
  }
}

const routerStub = { navigate: vi.fn(() => Promise.resolve(true)) };

describe('Schedules', () => {
  let fixture: ComponentFixture<Schedules>;
  let component: Schedules;
  let schedule: ScheduleServiceStub;
  let member: MemberServiceStub;
  let screenGroupStub: ScreenGroupServiceStub;
  let toastService: ToastService;

  function lastToast(): Toast | undefined {
    return toastService.toasts().at(-1);
  }

  async function setUp(): Promise<void> {
    fixture = TestBed.createComponent(Schedules);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    schedule = new ScheduleServiceStub();
    member = new MemberServiceStub();
    screenGroupStub = new ScreenGroupServiceStub();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ScheduleService, useValue: schedule },
        { provide: MemberService, useValue: member },
        { provide: OrganisationService, useValue: new OrganisationServiceStub() },
        { provide: ScreenService, useValue: new ScreenServiceStub() },
        { provide: ScreenGroupService, useValue: screenGroupStub },
        { provide: PlaylistService, useValue: new PlaylistServiceStub() },
        { provide: Router, useValue: routerStub },
      ],
    });
  });

  describe('initial load', () => {
    it('selects the org_admin organisation and clears the loading flag', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      expect(component.orgId).toBe(ORG_ID);
      expect(component.loading).toBe(false);
      expect(component.loadError).toBe('');
    });

    it('falls back to the first membership when no org_admin exists', async () => {
      // Arrange
      member.memberships = [
        { id: 'm2', userId: 'u1', organisationId: 'org9', role: 'editor', createdAt: '' },
      ];

      // Act
      await setUp();

      // Assert
      expect(component.orgId).toBe('org9');
    });

    it('sets a load error when the user belongs to no organisation', async () => {
      // Arrange
      member.memberships = [];

      // Act
      await setUp();

      // Assert
      expect(component.loadError).toContain('not a member');
      expect(component.loading).toBe(false);
    });

    it('auto-selects the first target and reads the org timezone', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      expect(component.selectedTargetId).toBe('screen:s1');
      expect(component.orgTimeZone).toBe('UTC');
    });
  });

  describe('target getters', () => {
    it('splits target options into screen and group lists', async () => {
      // Arrange / Act
      await setUp();

      // Assert
      expect(component.screenTargets.map((t) => t.id)).toEqual(['s1']);
      expect(component.groupTargets.map((t) => t.id)).toEqual(['g1']);
    });

    it('derives the target type and raw id from the selected target', async () => {
      // Arrange
      await setUp();

      // Act
      component.selectedTargetId = 'group:g1';

      // Assert
      expect(component.selectedTargetType).toBe('group');
      expect(component.selectedTargetRawId).toBe('g1');
    });

    it('returns a null target type when nothing is selected', async () => {
      // Arrange
      await setUp();

      // Act
      component.selectedTargetId = '';

      // Assert
      expect(component.selectedTargetType).toBeNull();
    });
  });

  describe('currentRangeLabel', () => {
    it('formats a single day in day view', async () => {
      // Arrange
      await setUp();
      component.viewMode = 'day';
      component.currentDate = new Date('2026-06-01T12:00:00Z');

      // Act
      const label = component.currentRangeLabel;

      // Assert (locale-agnostic: full date with year, no range dash)
      expect(label).toContain('2026');
      expect(label).not.toContain(' - ');
    });

    it('formats a start-end range in week view', async () => {
      // Arrange
      await setUp();
      component.viewMode = 'week';
      component.currentDate = new Date('2026-06-03T12:00:00Z');

      // Act
      const label = component.currentRangeLabel;

      // Assert
      expect(label).toContain(' - ');
    });

    it('formats month and year in month view', async () => {
      // Arrange
      await setUp();
      component.viewMode = 'month';
      component.currentDate = new Date('2026-06-15T12:00:00Z');

      // Act
      const label = component.currentRangeLabel;

      // Assert
      expect(label).toContain('2026');
      expect(label).not.toContain(' - ');
    });
  });

  describe('navigation', () => {
    it('moves the current date back by a day in day view', async () => {
      // Arrange
      await setUp();
      component.viewMode = 'day';
      component.currentDate = new Date('2026-06-10T00:00:00Z');

      // Act
      component.navigatePrev();

      // Assert
      expect(component.currentDate.toISOString()).toBe('2026-06-09T00:00:00.000Z');
    });

    it('moves the current date forward by a week in week view', async () => {
      // Arrange
      await setUp();
      component.viewMode = 'week';
      component.currentDate = new Date('2026-06-10T00:00:00Z');

      // Act
      component.navigateNext();

      // Assert
      expect(component.currentDate.toISOString()).toBe('2026-06-17T00:00:00.000Z');
    });

    it('jumps to the first of the next month in month view', async () => {
      // Arrange
      await setUp();
      component.viewMode = 'month';
      component.currentDate = new Date(2026, 5, 15);

      // Act
      component.navigateNext();

      // Assert
      expect(component.currentDate.getMonth()).toBe(6);
      expect(component.currentDate.getDate()).toBe(1);
    });

    it('resets both current and selected date to today', async () => {
      // Arrange
      await setUp();
      component.currentDate = new Date(2000, 0, 1);
      component.selectedDate = new Date(2000, 0, 1);

      // Act
      component.navigateToday();

      // Assert
      expect(component.currentDate.getFullYear()).toBe(new Date().getFullYear());
      expect(component.selectedDate.getFullYear()).toBe(new Date().getFullYear());
    });

    it('switches view and reloads on setView', async () => {
      // Arrange
      await setUp();

      // Act
      component.setView('month');

      // Assert
      expect(component.viewMode).toBe('month');
    });

    it('switches to day view and selects the clicked month day', async () => {
      // Arrange
      await setUp();
      const clicked = new Date(2026, 5, 20);

      // Act
      component.onMonthDayClick(clicked);

      // Assert
      expect(component.viewMode).toBe('day');
      expect(component.selectedDate.getDate()).toBe(20);
    });
  });

  describe('loadEntries (group target)', () => {
    it('filters date-range entries to the selected group', async () => {
      // Arrange
      await setUp();
      schedule.entries = [
        makeEntry({ id: 'e1', groupId: 'g1', screenId: null }),
        makeEntry({ id: 'e2', groupId: 'g2', screenId: null }),
      ];
      component.selectedTargetId = 'group:g1';

      // Act
      component.loadEntries();

      // Assert
      expect(component.entries.map((e) => e.id)).toEqual(['e1']);
    });
  });

  describe('openCreateModal', () => {
    it('opens the modal seeded with the selected target and first playlist', async () => {
      // Arrange
      await setUp();

      // Act
      component.openCreateModal();

      // Assert
      expect(component.showModal).toBe(true);
      expect(component.editingEntry).toBeNull();
      expect(component.modalInitialTargetId).toBe('screen:s1');
      expect(component.modalInitialPlaylistId).toBe('p1');
    });
  });

  describe('openEditModal', () => {
    it('seeds the modal from an existing screen entry', async () => {
      // Arrange
      await setUp();
      const entry = makeEntry({ screenId: 's1', groupId: null, rrule: 'FREQ=DAILY' });

      // Act
      component.openEditModal(entry);

      // Assert
      expect(component.showModal).toBe(true);
      expect(component.editingEntry).toBe(entry);
      expect(component.modalInitialTargetId).toBe('screen:s1');
      expect(component.modalInitialRecurrence).toBe('daily');
    });

    it('seeds a group target id for a group entry', async () => {
      // Arrange
      await setUp();
      const entry = makeEntry({ screenId: null, groupId: 'g1' });

      // Act
      component.openEditModal(entry);

      // Assert
      expect(component.modalInitialTargetId).toBe('group:g1');
    });
  });

  describe('closeModal', () => {
    it('hides the modal and clears the editing entry', async () => {
      // Arrange
      await setUp();
      component.showModal = true;
      component.editingEntry = makeEntry();

      // Act
      component.closeModal();

      // Assert
      expect(component.showModal).toBe(false);
      expect(component.editingEntry).toBeNull();
    });
  });

  describe('submitModal validation', () => {
    it('rejects an end time at or before the start time', async () => {
      // Arrange
      await setUp();

      // Act
      component.submitModal(makeForm({ startTime: '10:00', endTime: '09:00' }));

      // Assert
      expect(component.modalError).toContain('End time must be after');
      expect(component.submitting).toBe(false);
    });

    it('rejects a missing playlist', async () => {
      // Arrange
      await setUp();

      // Act
      component.submitModal(makeForm({ playlistId: '' }));

      // Assert
      expect(component.modalError).toContain('select a playlist');
    });

    it('rejects a missing target on create', async () => {
      // Arrange
      await setUp();
      component.editingEntry = null;

      // Act
      component.submitModal(makeForm({ targetId: '' }));

      // Assert
      expect(component.modalError).toContain('select a target');
    });
  });

  describe('submitModal create', () => {
    it('creates a screen-targeted entry and shows a success toast', async () => {
      // Arrange
      await setUp();

      // Act
      component.submitModal(makeForm({ targetId: 'screen:s1' }));

      // Assert
      expect(schedule.lastCreateDto?.screenId).toBe('s1');
      expect(schedule.lastCreateDto?.groupId).toBeUndefined();
      expect(component.showModal).toBe(false);
      expect(lastToast()?.type).toBe('success');
    });

    it('creates a group-targeted entry and starts slice polling for a split group', async () => {
      // Arrange
      await setUp();
      screenGroupStub.groups = [makeGroup({ id: 'g1', mode: 'split' })];
      // rebuild target options from the new groups
      component.openEditModal(makeEntry({ groupId: 'g1', screenId: null }));
      component.closeModal();

      // Act
      component.submitModal(makeForm({ targetId: 'group:g1' }));

      // Assert
      expect(schedule.lastCreateDto?.groupId).toBe('g1');
      expect(component.sliceProcessing).toBe(true);
    });

    it('maps a 409 conflict to an overlap error', async () => {
      // Arrange
      await setUp();
      schedule.createResult = throwError(() => ({ status: 409 }));

      // Act
      component.submitModal(makeForm());

      // Assert
      expect(component.modalError).toContain('overlaps');
      expect(component.submitting).toBe(false);
    });

    it('surfaces the server message for a non-409 create error', async () => {
      // Arrange
      await setUp();
      schedule.createResult = throwError(() => ({ status: 500, error: { message: 'Boom' } }));

      // Act
      component.submitModal(makeForm());

      // Assert
      expect(component.modalError).toBe('Boom');
    });
  });

  describe('submitModal update', () => {
    it('updates the editing entry and reloads on success', async () => {
      // Arrange
      await setUp();
      component.editingEntry = makeEntry({ id: 'edit-1' });

      // Act
      component.submitModal(makeForm());

      // Assert
      expect(schedule.lastUpdate?.id).toBe('edit-1');
      expect(component.showModal).toBe(false);
      expect(lastToast()?.type).toBe('success');
    });

    it('maps a 409 conflict on update to an overlap error', async () => {
      // Arrange
      await setUp();
      component.editingEntry = makeEntry({ id: 'edit-1' });
      schedule.updateResult = throwError(() => ({ status: 409 }));

      // Act
      component.submitModal(makeForm());

      // Assert
      expect(component.modalError).toContain('overlaps');
    });
  });

  describe('deleteEntry', () => {
    it('does nothing when there is no editing entry', async () => {
      // Arrange
      await setUp();
      component.editingEntry = null;

      // Act
      component.deleteEntry();

      // Assert
      expect(schedule.lastDeleteId).toBeUndefined();
    });

    it('deletes the editing entry and closes the modal on success', async () => {
      // Arrange
      await setUp();
      component.editingEntry = makeEntry({ id: 'del-1' });
      component.showModal = true;

      // Act
      component.deleteEntry();

      // Assert
      expect(schedule.lastDeleteId).toBe('del-1');
      expect(component.showModal).toBe(false);
      expect(lastToast()?.type).toBe('success');
    });

    it('shows an error message when the delete fails', async () => {
      // Arrange
      await setUp();
      component.editingEntry = makeEntry({ id: 'del-1' });
      schedule.deleteResult = throwError(() => ({ error: { message: 'No delete' } }));

      // Act
      component.deleteEntry();

      // Assert
      expect(component.modalError).toBe('No delete');
    });
  });

  describe('drag & resize', () => {
    it('records drag state on block mousedown', async () => {
      // Arrange
      await setUp();
      const block = makeBlock({ top: 60 });
      const event = {
        clientY: 100,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        target: document.createElement('div'),
      } as unknown as MouseEvent;

      // Act
      component.onBlockMouseDown(event, block);

      // Assert
      expect(component.dragState?.entryId).toBe(block.entry.id);
      expect(component.dragState?.originalTop).toBe(60);
    });

    it('ignores block mousedown that originates on a resize handle', async () => {
      // Arrange
      await setUp();
      const handle = document.createElement('div');
      handle.classList.add('resize-handle');
      const event = {
        clientY: 100,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        target: handle,
      } as unknown as MouseEvent;

      // Act
      component.onBlockMouseDown(event, makeBlock());

      // Assert
      expect(component.dragState).toBeNull();
    });

    it('records resize state with the edge on resize mousedown', async () => {
      // Arrange
      await setUp();
      const block = makeBlock({ top: 60, height: 120 });
      const event = {
        clientY: 100,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as MouseEvent;

      // Act
      component.onResizeMouseDown(event, block, 'bottom');

      // Assert
      expect(component.resizeState?.edge).toBe('bottom');
      expect(component.resizeState?.originalHeight).toBe(120);
    });

    it('does not open the edit modal on block click while dragging', async () => {
      // Arrange
      await setUp();
      component.dragState = { entryId: 'e1', startY: 0, originalTop: 0, block: makeBlock() };
      const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;

      // Act
      component.onBlockClick(event, makeBlock());

      // Assert
      expect(component.showModal).toBe(false);
    });

    it('opens the edit modal on a plain block click', async () => {
      // Arrange
      await setUp();
      component.dragState = null;
      component.resizeState = null;
      const block = makeBlock();
      const event = { stopPropagation: vi.fn() } as unknown as MouseEvent;

      // Act
      component.onBlockClick(event, block);

      // Assert
      expect(component.showModal).toBe(true);
      expect(component.editingEntry).toBe(block.entry);
    });
  });

  describe('toast feedback', () => {
    it('shows a success toast through the global service on create', async () => {
      // Arrange
      await setUp();

      // Act
      component.submitModal(makeForm({ targetId: 'screen:s1' }));

      // Assert
      expect(lastToast()?.type).toBe('success');
      expect(lastToast()?.message).toContain('Schedule created');
    });

    it('shows an error toast through the global service when an overlapping move is rejected', async () => {
      // Arrange
      await setUp();
      schedule.updateResult = throwError(() => ({ status: 409 }));
      const block = makeBlock({ top: 60, height: 120 });
      component.dragState = {
        entryId: block.entry.id,
        startY: 0,
        originalTop: 0,
        block: { ...block, top: 200 },
      };

      // Act
      component['onMouseUp']();

      // Assert
      expect(lastToast()?.type).toBe('error');
      expect(lastToast()?.message).toContain('Overlap');
    });
  });
});
