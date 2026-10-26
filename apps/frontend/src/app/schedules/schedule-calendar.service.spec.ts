import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { LIST_VIEW_DAYS, ScheduleCalendarService } from './schedule-calendar.service';
import { ScheduleEntry } from './schedule.model';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

/** The existing cases build dates on the runner's clock, so the organisation shares its zone. */
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const HOUR_HEIGHT = 60;

function makeEntry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    id: 'e1',
    organisationId: 'org1',
    screenId: 's1',
    groupId: null,
    playlistId: 'p1',
    name: null,
    priority: 'normal',
    startTime: '2026-06-10T09:00:00',
    endTime: '2026-06-10T10:00:00',
    rrule: null,
    colour: '#3b82f6',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

describe('ScheduleCalendarService', () => {
  let service: ScheduleCalendarService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [provideZonelessChangeDetection(), ScheduleCalendarService],
    });
    service = TestBed.inject(ScheduleCalendarService);
  });

  describe('getWeekStart', () => {
    it('returns Monday 00:00 for a mid-week date', () => {
      const ws = service.getWeekStart(new Date(2026, 5, 10), LOCAL_TZ); // Wed 2026-06-10
      expect(ws.getDay()).toBe(1); // Monday
      expect(ws.getDate()).toBe(8);
      expect(ws.getHours()).toBe(0);
    });

    it('returns the previous Monday for a Sunday', () => {
      const ws = service.getWeekStart(new Date(2026, 5, 14), LOCAL_TZ); // Sun 2026-06-14
      expect(ws.getDate()).toBe(8);
    });
  });

  describe('getVisibleDays', () => {
    it('returns a single day in day view', () => {
      const days = service.getVisibleDays('day', new Date(2026, 5, 10), LOCAL_TZ);
      expect(days).toHaveLength(1);
      expect(days[0].getDate()).toBe(10);
    });

    it('returns 7 Monday-first days in week view', () => {
      const days = service.getVisibleDays('week', new Date(2026, 5, 10), LOCAL_TZ);
      expect(days).toHaveLength(7);
      expect(days[0].getDay()).toBe(1);
      expect(days[6].getDay()).toBe(0);
    });
  });

  describe('getQueryRange', () => {
    it('spans exactly one day in day view', () => {
      const { from, to } = service.getQueryRange('day', new Date(2026, 5, 10), LOCAL_TZ);
      const ms = new Date(to).getTime() - new Date(from).getTime();
      expect(ms).toBe(24 * 60 * 60 * 1000);
    });

    it('spans seven days in week view', () => {
      const { from, to } = service.getQueryRange('week', new Date(2026, 5, 10), LOCAL_TZ);
      const ms = new Date(to).getTime() - new Date(from).getTime();
      expect(ms).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('spans a padded window around the month in month view', () => {
      const { from, to } = service.getQueryRange('month', new Date(2026, 5, 15), LOCAL_TZ);
      const fromDate = new Date(from);
      const toDate = new Date(to);
      // 7 days before the 1st of June -> still in May
      expect(fromDate.getMonth()).toBe(4);
      expect(fromDate.getDate()).toBe(25);
      // 7 days into July
      expect(toDate.getMonth()).toBe(6);
      expect(toDate.getDate()).toBe(7);
    });
  });

  describe('buildTimeGridBlocks', () => {
    it('positions a 09:00-10:00 entry and brackets it with fallback gaps', () => {
      const days = [new Date(2026, 5, 10)];
      const { blocks, gaps } = service.buildTimeGridBlocks(
        [makeEntry()],
        days,
        HOUR_HEIGHT,
        LOCAL_TZ,
      );

      expect(blocks).toHaveLength(1);
      expect(blocks[0].top).toBe(540);
      expect(blocks[0].height).toBe(60);
      expect(blocks[0].dayIndex).toBe(0);

      expect(gaps).toEqual([
        { top: 0, height: 540, dayIndex: 0 },
        { top: 600, height: 840, dayIndex: 0 },
      ]);
    });

    it('enforces a minimum block height', () => {
      const entry = makeEntry({ startTime: '2026-06-10T09:00:00', endTime: '2026-06-10T09:05:00' });
      const { blocks } = service.buildTimeGridBlocks(
        [entry],
        [new Date(2026, 5, 10)],
        HOUR_HEIGHT,
        LOCAL_TZ,
      );
      expect(blocks[0].height).toBe(20);
    });

    it('runs a midnight-spanning entry to the bottom of its start day', () => {
      // 22:00 -> 02:00 next day: the block is clipped at local midnight and
      // fills the last two hours, instead of collapsing to the minimum height.
      const entry = makeEntry({ startTime: '2026-06-10T22:00:00', endTime: '2026-06-11T02:00:00' });
      const { blocks } = service.buildTimeGridBlocks(
        [entry],
        [new Date(2026, 5, 10)],
        HOUR_HEIGHT,
        LOCAL_TZ,
      );
      expect(blocks).toHaveLength(1);
      expect(blocks[0].top).toBe(22 * HOUR_HEIGHT);
      expect(blocks[0].height).toBe(2 * HOUR_HEIGHT);
    });
  });

  describe('buildMonthWeeks', () => {
    it('builds Monday-first weeks of 7 cells flagging the current month', () => {
      const weeks = service.buildMonthWeeks([], new Date(2026, 5, 15), LOCAL_TZ);
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      for (const week of weeks) {
        expect(week).toHaveLength(7);
      }
      expect(weeks[0][0].date.getDay()).toBe(1); // Monday
      const someJune = weeks.flat().find((c) => c.date.getMonth() === 5);
      expect(someJune?.isCurrentMonth).toBe(true);
    });
  });

  describe('list view', () => {
    it('covers 14 days from the current date', () => {
      const days = service.getVisibleDays('list', new Date(2026, 5, 10, 15), LOCAL_TZ);
      expect(days).toHaveLength(LIST_VIEW_DAYS);
      expect(days[0]).toEqual(new Date(2026, 5, 10));
      expect(days[13]).toEqual(new Date(2026, 5, 23));
      const range = service.getQueryRange('list', new Date(2026, 5, 10, 15), LOCAL_TZ);
      expect(new Date(range.to)).toEqual(new Date(2026, 5, 24));
    });

    it('lists each occurrence once under the day it starts on, sorted by start', () => {
      // Arrange
      const days = service.getVisibleDays('list', new Date(2026, 5, 10), LOCAL_TZ);
      const late = makeEntry({
        id: 'late',
        startTime: '2026-06-10T22:00:00',
        endTime: '2026-06-11T02:00:00',
      });
      const early = makeEntry({ id: 'early' });
      const thursdays = makeEntry({
        id: 'thursdays',
        startTime: '2026-06-11T08:00:00',
        endTime: '2026-06-11T08:30:00',
        rrule: 'FREQ=WEEKLY;BYDAY=TH',
      });

      // Act
      const listed = service.buildListDays([late, thursdays, early], days, LOCAL_TZ);

      // Assert
      expect(listed.map((d) => d.date)).toEqual([
        new Date(2026, 5, 10),
        new Date(2026, 5, 11),
        new Date(2026, 5, 18),
      ]);
      expect(listed[0].occurrences.map((o) => o.entry.id)).toEqual(['early', 'late']);
      expect(listed[1].occurrences.map((o) => o.entry.id)).toEqual(['thursdays']);
      expect(listed[2].occurrences.map((o) => o.entry.id)).toEqual(['thursdays']);
    });

    it('puts an entry that began before the range under its first day', () => {
      const days = service.getVisibleDays('list', new Date(2026, 5, 10), LOCAL_TZ);
      const running = makeEntry({
        startTime: '2026-06-09T22:00:00',
        endTime: '2026-06-10T02:00:00',
      });
      const [first] = service.buildListDays([running], days, LOCAL_TZ);
      expect(first.date).toEqual(new Date(2026, 5, 10));
      expect(first.occurrences).toHaveLength(1);
    });
  });

  describe('buildDayTimeline', () => {
    it('returns one item per occurrence sorted by start time', () => {
      const morning = makeEntry({
        id: 'm',
        startTime: '2026-06-10T14:00:00',
        endTime: '2026-06-10T15:00:00',
        playlist: { id: 'p1', name: 'Afternoon' },
        screen: { id: 's1', name: 'Lobby' },
      });
      const earlier = makeEntry({
        id: 'e',
        startTime: '2026-06-10T08:00:00',
        endTime: '2026-06-10T09:00:00',
        playlist: { id: 'p2', name: 'Morning' },
        screen: { id: 's1', name: 'Lobby' },
      });
      const timeline = service.buildDayTimeline(
        [morning, earlier],
        new Date(2026, 5, 10),
        LOCAL_TZ,
      );
      expect(timeline).toHaveLength(2);
      expect(timeline[0].startTime <= timeline[1].startTime).toBe(true);
      expect(timeline[0].playlistName).toBe('Morning');
      expect(timeline[0].targetName).toBe('Lobby');
      expect(timeline[0].isGroup).toBe(false);
      expect(timeline[0].genres).toBeNull();
    });

    it('carries the genre group and the narrowed playlist name of a genre group entry', () => {
      const entry = makeEntry({
        startTime: '2026-06-10T18:00:00',
        endTime: '2026-06-10T19:00:00',
        playlist: { id: 'v1', name: 'Demnächst · Rock, Metal' },
        genreGroup: { genres: ['Rock', 'Metal'], basePlaylistName: 'Demnächst' },
      });
      const [item] = service.buildDayTimeline([entry], new Date(2026, 5, 10), LOCAL_TZ);
      expect(item.playlistName).toBe('Demnächst');
      expect(item.genres).toBe('Rock, Metal');
    });

    it('uses the group name and flags isGroup for group entries', () => {
      const groupEntry = makeEntry({
        screenId: null,
        groupId: 'g1',
        group: { id: 'g1', name: 'Wall', mode: 'split' },
        playlist: { id: 'p1', name: 'Loop' },
      });
      const timeline = service.buildDayTimeline([groupEntry], new Date(2026, 5, 10), LOCAL_TZ);
      expect(timeline[0].isGroup).toBe(true);
      expect(timeline[0].targetName).toBe('Wall');
    });
  });

  describe('pixelsToTimeRange', () => {
    it('converts pixel offsets back into start/end times', () => {
      const { start, end } = service.pixelsToTimeRange(
        540,
        60,
        new Date(2026, 5, 10),
        HOUR_HEIGHT,
        LOCAL_TZ,
      );
      expect(start.getHours()).toBe(9);
      expect(start.getMinutes()).toBe(0);
      expect(end.getHours()).toBe(10);
    });
  });

  describe("in the organisation's zone, whatever the browser's", () => {
    const NY = 'America/New_York';

    it('starts the week on Monday in the organisation zone', () => {
      // Sunday 22:00 in New York is already Monday in Europe.
      const ws = service.getWeekStart(new Date('2026-06-15T02:00:00Z'), NY);
      expect(ws.toISOString()).toBe('2026-06-08T04:00:00.000Z');
    });

    it('positions blocks on the organisation wall clock', () => {
      // 18:00–19:00 in New York.
      const entry = makeEntry({
        startTime: '2026-06-10T22:00:00Z',
        endTime: '2026-06-10T23:00:00Z',
      });
      const days = service.getVisibleDays('day', new Date('2026-06-10T16:00:00Z'), NY);

      const { blocks } = service.buildTimeGridBlocks([entry], days, HOUR_HEIGHT, NY);

      expect(days[0].toISOString()).toBe('2026-06-10T04:00:00.000Z');
      expect(blocks).toHaveLength(1);
      expect(blocks[0].top).toBe(18 * HOUR_HEIGHT);
      expect(blocks[0].height).toBe(HOUR_HEIGHT);
    });

    it('shows a recurring entry that runs past midnight on the next day too', () => {
      // Daily 22:00–02:00 in New York.
      const entry = makeEntry({
        startTime: '2026-06-11T02:00:00Z',
        endTime: '2026-06-11T06:00:00Z',
        rrule: 'FREQ=DAILY',
      });
      const days = service.getVisibleDays('day', new Date('2026-06-12T16:00:00Z'), NY);

      const { blocks } = service.buildTimeGridBlocks([entry], days, HOUR_HEIGHT, NY);

      expect(blocks.map((b) => [b.top, b.height])).toEqual([
        [0, 2 * HOUR_HEIGHT],
        [22 * HOUR_HEIGHT, 2 * HOUR_HEIGHT],
      ]);
    });

    it('reads dragged pixels as organisation time', () => {
      const day = new Date('2026-06-10T04:00:00Z');

      const { start, end } = service.pixelsToTimeRange(
        18 * HOUR_HEIGHT,
        6 * HOUR_HEIGHT,
        day,
        HOUR_HEIGHT,
        NY,
      );

      expect(start.toISOString()).toBe('2026-06-10T22:00:00.000Z');
      // The bottom of the grid is midnight of the next day.
      expect(end.toISOString()).toBe('2026-06-11T04:00:00.000Z');
    });

    it('flags today and the month in the organisation zone', () => {
      const weeks = service.buildMonthWeeks([], new Date('2026-07-01T02:00:00Z'), NY);
      const cells = weeks.flat();

      // 1 July 02:00 UTC is still 30 June in New York.
      expect(cells.find((c) => c.isCurrentMonth)?.dayNumber).toBe(1);
      expect(cells.filter((c) => c.isCurrentMonth)).toHaveLength(30);
    });
  });
});
