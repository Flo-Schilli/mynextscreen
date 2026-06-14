import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { Dashboard } from './dashboard';
import { ScreenService } from '../screens/screen.service';
import { ScheduleService } from '../schedules/schedule.service';
import { DashboardService } from './dashboard.service';
import { OrganisationStateService } from '../shell/organisation-state.service';
import { DashboardSseService, DashboardEvent } from './dashboard-sse.service';
import { Screen } from '../screens/screen.model';
import { ScheduleEntry } from '../schedules/schedule.model';
import { DashboardSummary } from './dashboard-summary.model';
import { DashboardScreenGrid } from './dashboard-screen-grid';
import { StorageUsageBars } from '../shared/storage-usage-bars';
import { DashboardScheduleTimeline } from './dashboard-schedule-timeline';
import { DashboardActivityFeed } from './dashboard-activity-feed';
import { DashboardAlerts } from './dashboard-alerts';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

/** Flush pending microtasks then settle the zoneless fixture. */
async function flush(f: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 6; i++) await Promise.resolve();
  await f.whenStable();
  f.detectChanges();
}

function makeScreen(overrides: Partial<Screen> = {}): Screen {
  return {
    id: 'screen-1',
    organisationId: 'org-1',
    name: 'Lobby',
    resolution: '1920x1080',
    location: 'Entrance',
    isOnline: false,
    lastHeartbeat: null,
    groupId: null,
    gridRow: null,
    gridColumn: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    screens: { total: 1, online: 1, offline: 0, warning: 0 },
    content: { count: 8, libraryBytes: 4_800_000_000 },
    playlists: { count: 4 },
    schedules: { upcoming24h: 2 },
    storage: {
      originalUsedBytes: 100,
      originalLimitBytes: 1000,
      transcodedUsedBytes: 200,
      transcodedLimitBytes: 1000,
    },
    alerts: [],
    ...overrides,
  };
}

function makeScheduleEntry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  const now = Date.now();
  return {
    id: 'sched-1',
    organisationId: 'org-1',
    screenId: 'screen-1',
    groupId: null,
    playlistId: 'pl-1',
    startTime: new Date(now + 60 * 60 * 1000).toISOString(),
    endTime: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
    rrule: null,
    colour: '#3b82f6',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    playlist: { id: 'pl-1', name: 'Daytime' },
    screen: { id: 'screen-1', name: 'Lobby' },
    ...overrides,
  };
}

interface SseStub {
  screenOnline$: Subject<DashboardEvent>;
  screenOffline$: Subject<DashboardEvent>;
  scheduleUpdated$: Subject<DashboardEvent>;
  transcodingProgress$: Subject<DashboardEvent>;
  transcodingComplete$: Subject<DashboardEvent>;
  transcodingFailed$: Subject<DashboardEvent>;
  notificationNew$: Subject<DashboardEvent>;
  liveStreamHealth$: Subject<DashboardEvent>;
}

function makeSseStub(): SseStub {
  return {
    screenOnline$: new Subject(),
    screenOffline$: new Subject(),
    scheduleUpdated$: new Subject(),
    transcodingProgress$: new Subject(),
    transcodingComplete$: new Subject(),
    transcodingFailed$: new Subject(),
    notificationNew$: new Subject(),
    liveStreamHealth$: new Subject(),
  };
}

function sseEvent(type: string, data: Record<string, unknown>): DashboardEvent {
  return { type, data, timestamp: new Date().toISOString() };
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let component: Dashboard;
  let sse: SseStub;
  let selectedOrgId: WritableSignal<string | null>;
  let getAllScreens: ReturnType<typeof vi.fn>;
  let getSummary: ReturnType<typeof vi.fn>;
  let getByDateRange: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  async function setup(
    options: {
      orgId?: string | null;
      screens?: ReturnType<typeof vi.fn>;
      summary?: ReturnType<typeof vi.fn>;
      schedule?: ReturnType<typeof vi.fn>;
    } = {},
  ): Promise<void> {
    selectedOrgId = signal<string | null>('orgId' in options ? (options.orgId ?? null) : 'org-1');
    getAllScreens = options.screens ?? vi.fn(() => of<Screen[]>([]));
    getSummary = options.summary ?? vi.fn(() => of(makeSummary()));
    getByDateRange = options.schedule ?? vi.fn(() => of<ScheduleEntry[]>([]));
    navigate = vi.fn();
    sse = makeSseStub();

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: { navigate } },
        { provide: ScreenService, useValue: { getAll: getAllScreens } },
        { provide: DashboardService, useValue: { getSummary } },
        { provide: ScheduleService, useValue: { getByDateRange } },
        { provide: OrganisationStateService, useValue: { selectedOrgId } },
        { provide: DashboardSseService, useValue: sse },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await flush(fixture);
  }

  describe('data loading on org selection', () => {
    it('loads screens, summary and schedule for the selected org', async () => {
      // Arrange & Act
      await setup({
        screens: vi.fn(() => of([makeScreen({ id: 'a' }), makeScreen({ id: 'b' })])),
        summary: vi.fn(() => of(makeSummary({ content: { count: 12, libraryBytes: 5e9 } }))),
        schedule: vi.fn(() => of([makeScheduleEntry()])),
      });

      // Assert
      expect(getAllScreens).toHaveBeenCalledWith('org-1');
      expect(getSummary).toHaveBeenCalledWith('org-1');
      expect(getByDateRange).toHaveBeenCalledWith('org-1', expect.any(String), expect.any(String));
      expect(component.screens().length).toBe(2);
      expect(component.contentCount()).toBe(12);
      expect(component.scheduleEntries().length).toBe(1);
    });

    it('does not load any data when no org is selected', async () => {
      // Arrange & Act
      await setup({ orgId: null });

      // Assert
      expect(getAllScreens).not.toHaveBeenCalled();
      expect(getSummary).not.toHaveBeenCalled();
      expect(getByDateRange).not.toHaveBeenCalled();
    });

    it('clears loading flags after successful loads', async () => {
      // Arrange & Act
      await setup({ screens: vi.fn(() => of([makeScreen()])) });

      // Assert
      expect(component.loadingScreens()).toBe(false);
      expect(component.loadingSummary()).toBe(false);
      expect(component.loadingSchedule()).toBe(false);
    });

    it('clears loading flags when loads error out', async () => {
      // Arrange & Act
      await setup({
        screens: vi.fn(() => throwError(() => new Error('boom'))),
        summary: vi.fn(() => throwError(() => new Error('boom'))),
        schedule: vi.fn(() => throwError(() => new Error('boom'))),
      });

      // Assert
      expect(component.loadingScreens()).toBe(false);
      expect(component.loadingSummary()).toBe(false);
      expect(component.loadingSchedule()).toBe(false);
      expect(component.screens()).toEqual([]);
      expect(component.summary()).toBeNull();
    });

    it('reloads all data when refresh() is invoked', async () => {
      // Arrange
      await setup({ screens: vi.fn(() => of([makeScreen()])) });
      getAllScreens.mockClear();
      getSummary.mockClear();
      getByDateRange.mockClear();

      // Act
      component.refresh();
      await flush(fixture);

      // Assert
      expect(getAllScreens).toHaveBeenCalledTimes(1);
      expect(getSummary).toHaveBeenCalledTimes(1);
      expect(getByDateRange).toHaveBeenCalledTimes(1);
    });
  });

  describe('KPIs', () => {
    it('classifies screens into online, warning and offline by heartbeat staleness', async () => {
      // Arrange
      const now = Date.now();
      await setup({
        screens: vi.fn(() =>
          of([
            makeScreen({ id: 'fresh', isOnline: true, lastHeartbeat: new Date(now).toISOString() }),
            makeScreen({
              id: 'stale',
              isOnline: true,
              lastHeartbeat: new Date(now - 120_000).toISOString(),
            }),
            makeScreen({ id: 'down', isOnline: false }),
          ]),
        ),
      });

      // Assert
      expect(component.screensOnline()).toBe(1);
      expect(component.screensWarning()).toBe(1);
      expect(component.screensOffline()).toBe(1);
    });

    it('derives content, playlist and library-size KPIs from the summary', async () => {
      // Arrange & Act
      await setup({
        screens: vi.fn(() => of([makeScreen()])),
        summary: vi.fn(() =>
          of(
            makeSummary({
              content: { count: 9, libraryBytes: 4_800_000_000 },
              playlists: { count: 5 },
            }),
          ),
        ),
      });

      // Assert
      expect(component.contentCount()).toBe(9);
      expect(component.playlistCount()).toBe(5);
      expect(component.libraryGb()).toBe('4.8');
    });

    it('splits the open-alert KPI into critical and warning counts', async () => {
      // Arrange & Act
      await setup({
        screens: vi.fn(() => of([makeScreen()])),
        summary: vi.fn(() =>
          of(
            makeSummary({
              alerts: [
                { id: 'a', tone: 'offline', title: 'x', description: 'y', timestamp: null },
                { id: 'b', tone: 'warn', title: 'x', description: 'y', timestamp: null },
                { id: 'c', tone: 'info', title: 'x', description: 'y', timestamp: null },
              ],
            }),
          ),
        ),
      });

      // Assert
      expect(component.alertCount()).toBe(3);
      expect(component.criticalAlertCount()).toBe(1);
      expect(component.warningAlertCount()).toBe(2);
    });
  });

  describe('conditional rendering branches', () => {
    it('shows the onboarding state when no screens are registered', async () => {
      // Arrange & Act
      await setup({ screens: vi.fn(() => of<Screen[]>([])) });

      // Assert: no screens => onboarding view, not the populated dashboard
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Welcome to myNextScreen');
      expect(fixture.debugElement.query(By.directive(DashboardScreenGrid))).toBeNull();
    });

    it('renders the screen grid child when screens exist', async () => {
      // Arrange & Act
      await setup({ screens: vi.fn(() => of([makeScreen()])) });

      // Assert
      expect(fixture.debugElement.query(By.directive(DashboardScreenGrid))).not.toBeNull();
    });

    it('shows the storage empty state when the summary is null', async () => {
      // Arrange & Act: provide a screen so dataState === 'populated', summary errors out → null
      await setup({
        screens: vi.fn(() => of([makeScreen()])),
        summary: vi.fn(() => throwError(() => new Error('no summary'))),
      });

      // Assert
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('No storage data available.');
      expect(fixture.debugElement.query(By.directive(StorageUsageBars))).toBeNull();
    });

    it('renders the storage child when the summary is available', async () => {
      // Arrange & Act: provide a screen so dataState === 'populated'
      await setup({
        screens: vi.fn(() => of([makeScreen()])),
        summary: vi.fn(() => of(makeSummary())),
      });

      // Assert
      expect(fixture.debugElement.query(By.directive(StorageUsageBars))).not.toBeNull();
    });

    it('renders the alerts child when the summary has alerts', async () => {
      // Arrange & Act
      await setup({
        screens: vi.fn(() => of([makeScreen()])),
        summary: vi.fn(() =>
          of(
            makeSummary({
              alerts: [
                {
                  id: 'screen:1',
                  tone: 'offline',
                  title: 'Lobby offline',
                  description: 'No heartbeat',
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
          ),
        ),
      });

      // Assert
      expect(fixture.debugElement.query(By.directive(DashboardAlerts))).not.toBeNull();
    });

    it('shows the alerts empty state when there are no alerts', async () => {
      // Arrange & Act
      await setup({ screens: vi.fn(() => of([makeScreen()])) });

      // Assert
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('No open alerts');
      expect(fixture.debugElement.query(By.directive(DashboardAlerts))).toBeNull();
    });

    it('shows the schedule empty state when there are no timeline rows', async () => {
      // Arrange & Act: provide a screen so dataState === 'populated', schedule is empty
      await setup({
        screens: vi.fn(() => of([makeScreen()])),
        schedule: vi.fn(() => of<ScheduleEntry[]>([])),
      });

      // Assert
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('No upcoming schedules.');
      expect(fixture.debugElement.query(By.directive(DashboardScheduleTimeline))).toBeNull();
    });

    it('renders the timeline child when schedule rows exist', async () => {
      // Arrange & Act: provide a screen so dataState === 'populated', schedule has entries
      await setup({
        screens: vi.fn(() => of([makeScreen()])),
        schedule: vi.fn(() => of([makeScheduleEntry()])),
      });

      // Assert
      expect(fixture.debugElement.query(By.directive(DashboardScheduleTimeline))).not.toBeNull();
    });

    it('shows the activity empty state initially', async () => {
      // Arrange & Act: provide a screen so dataState === 'populated', activity feed starts empty
      await setup({ screens: vi.fn(() => of([makeScreen()])) });

      // Assert
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('No recent activity.');
      expect(fixture.debugElement.query(By.directive(DashboardActivityFeed))).toBeNull();
    });

    it('renders the screen count in the card header sub text', async () => {
      // Arrange & Act
      await setup({ screens: vi.fn(() => of([makeScreen({ id: 'a' }), makeScreen({ id: 'b' })])) });

      // Assert: populated state shows screensSubline "N of M active" somewhere in the DOM
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('2');
    });
  });

  describe('timelineHours', () => {
    it('emits nine labels at three-hour intervals across 24 hours', async () => {
      // Arrange & Act
      await setup();

      // Assert: 0,3,6,...,24 => 9 labels
      expect(component.timelineHours().length).toBe(9);
    });
  });

  describe('timelineRows derivation', () => {
    it('groups entries by target and positions them within the 24h window', async () => {
      // Arrange
      const now = Date.now();
      const start = new Date(now + 6 * 60 * 60 * 1000).toISOString(); // +6h
      const end = new Date(now + 12 * 60 * 60 * 1000).toISOString(); // +12h
      await setup({
        schedule: vi.fn(() =>
          of([makeScheduleEntry({ startTime: start, endTime: end, colour: '#abcdef' })]),
        ),
      });

      // Assert
      const rows = component.timelineRows();
      expect(rows.length).toBe(1);
      expect(rows[0].screenName).toBe('Lobby');
      const block = rows[0].entries[0];
      expect(block.playlistName).toBe('Daytime');
      expect(block.colour).toBe('#abcdef');
      // +6h of a 24h window ≈ 25%, 6h span ≈ 25% width.
      expect(block.startPercent).toBeGreaterThan(20);
      expect(block.startPercent).toBeLessThan(30);
      expect(block.widthPercent).toBeGreaterThan(20);
      expect(block.widthPercent).toBeLessThan(30);
    });

    it('clamps entries to the visible window and drops entries fully in the past', async () => {
      // Arrange
      const now = Date.now();
      const pastStart = new Date(now - 5 * 60 * 60 * 1000).toISOString();
      const pastEnd = new Date(now - 2 * 60 * 60 * 1000).toISOString();
      await setup({
        schedule: vi.fn(() =>
          of([makeScheduleEntry({ id: 'past', startTime: pastStart, endTime: pastEnd })]),
        ),
      });

      // Assert: entry ends before window start -> no visible blocks.
      const rows = component.timelineRows();
      expect(rows[0].entries.length).toBe(0);
    });

    it('falls back to group name and "Unknown" playlist when fields are missing', async () => {
      // Arrange
      const now = Date.now();
      const start = new Date(now + 1 * 60 * 60 * 1000).toISOString();
      const end = new Date(now + 2 * 60 * 60 * 1000).toISOString();
      await setup({
        schedule: vi.fn(() =>
          of([
            makeScheduleEntry({
              screenId: null,
              groupId: 'group-9',
              screen: undefined,
              group: { id: 'group-9', name: 'Wall', mode: 'mirror' },
              playlist: undefined,
              startTime: start,
              endTime: end,
            }),
          ]),
        ),
      });

      // Assert
      const rows = component.timelineRows();
      expect(rows[0].screenName).toBe('Wall');
      expect(rows[0].entries[0].playlistName).toBe('Unknown');
      // No colour on the entry -> default blue.
      expect(rows[0].entries[0].colour).toBe('#3b82f6');
    });
  });

  describe('SSE-driven updates', () => {
    it('marks a screen online and pushes an activity entry on screen.online', async () => {
      // Arrange
      await setup({ screens: vi.fn(() => of([makeScreen({ id: 's1', isOnline: false })])) });

      // Act
      sse.screenOnline$.next(sseEvent('screen.online', { screenId: 's1' }));
      await flush(fixture);

      // Assert
      expect(component.screens()[0].isOnline).toBe(true);
      expect(component.activityFeed()[0].category).toBe('screen');
      expect(component.activityFeed()[0].description).toBe('Screen came online');
    });

    it('marks a screen offline on screen.offline', async () => {
      // Arrange
      await setup({ screens: vi.fn(() => of([makeScreen({ id: 's1', isOnline: true })])) });

      // Act
      sse.screenOffline$.next(sseEvent('screen.offline', { screenId: 's1' }));
      await flush(fixture);

      // Assert
      expect(component.screens()[0].isOnline).toBe(false);
      expect(component.activityFeed()[0].description).toBe('Screen went offline');
    });

    it('reloads the schedule and logs activity on schedule.updated', async () => {
      // Arrange
      await setup();
      getByDateRange.mockClear();

      // Act
      sse.scheduleUpdated$.next(sseEvent('schedule.updated', {}));
      await flush(fixture);

      // Assert
      expect(getByDateRange).toHaveBeenCalledTimes(1);
      expect(component.activityFeed()[0].category).toBe('schedule');
    });

    it('refreshes the summary on transcoding complete/failed events', async () => {
      // Arrange
      await setup();
      getSummary.mockClear();

      // Act
      sse.transcodingComplete$.next(sseEvent('transcoding.complete', {}));
      sse.transcodingFailed$.next(sseEvent('transcoding.failed', {}));
      await flush(fixture);

      // Assert: each event triggers a background summary refresh.
      expect(getSummary).toHaveBeenCalledTimes(2);
    });

    it('logs transcoding complete, failed and progress activities', async () => {
      // Arrange
      await setup();

      // Act
      sse.transcodingComplete$.next(sseEvent('transcoding.complete', {}));
      sse.transcodingFailed$.next(sseEvent('transcoding.failed', {}));
      sse.transcodingProgress$.next(sseEvent('transcoding.progress', { progress: 42 }));
      await flush(fixture);

      // Assert: newest first
      const feed = component.activityFeed();
      expect(feed[0].description).toBe('Transcoding progress: 42%');
      expect(feed[1].description).toBe('Transcoding failed');
      expect(feed[2].description).toBe('Transcoding completed');
      expect(feed.every((e) => e.category === 'transcoding')).toBe(true);
    });

    it('caps the rolling activity feed at 20 entries, newest first', async () => {
      // Arrange
      await setup();

      // Act
      for (let i = 0; i < 25; i++) {
        sse.transcodingComplete$.next(sseEvent('transcoding.complete', {}));
      }
      await flush(fixture);

      // Assert
      expect(component.activityFeed().length).toBe(20);
    });

    it('renders the activity feed child once entries arrive', async () => {
      // Arrange: provide a screen so dataState === 'populated'
      await setup({ screens: vi.fn(() => of([makeScreen()])) });

      // Act
      sse.transcodingComplete$.next(sseEvent('transcoding.complete', {}));
      await flush(fixture);
      fixture.componentRef.changeDetectorRef.detectChanges();

      // Assert
      expect(fixture.debugElement.query(By.directive(DashboardActivityFeed))).not.toBeNull();
    });

    it('ignores online events for unknown screen ids', async () => {
      // Arrange
      await setup({ screens: vi.fn(() => of([makeScreen({ id: 's1', isOnline: false })])) });

      // Act
      sse.screenOnline$.next(sseEvent('screen.online', { screenId: 'other' }));
      await flush(fixture);

      // Assert: existing screen unchanged, but activity still logged.
      expect(component.screens()[0].isOnline).toBe(false);
      expect(component.activityFeed().length).toBe(1);
    });
  });

  describe('navigation', () => {
    it('navigates to the screens route with the id query param', async () => {
      // Arrange
      await setup();

      // Act
      component.navigateToScreen('screen-77');

      // Assert
      expect(navigate).toHaveBeenCalledWith(['/screens'], { queryParams: { id: 'screen-77' } });
    });
  });

  describe('teardown', () => {
    it('unsubscribes from SSE streams on destroy', async () => {
      // Arrange
      await setup();
      fixture.destroy();

      // Act
      sse.screenOnline$.next(sseEvent('screen.online', { screenId: 'x' }));

      // Assert: no new activity after destroy.
      expect(component.activityFeed().length).toBe(0);
    });
  });
});
