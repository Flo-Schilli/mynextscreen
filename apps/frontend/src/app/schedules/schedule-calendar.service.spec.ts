import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScheduleCalendarService } from './schedule-calendar.service';
import { ScheduleEntry } from './schedule.model';

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
      providers: [provideZonelessChangeDetection(), ScheduleCalendarService],
    });
    service = TestBed.inject(ScheduleCalendarService);
  });

  describe('getWeekStart', () => {
    it('returns Monday 00:00 for a mid-week date', () => {
      const ws = service.getWeekStart(new Date(2026, 5, 10)); // Wed 2026-06-10
      expect(ws.getDay()).toBe(1); // Monday
      expect(ws.getDate()).toBe(8);
      expect(ws.getHours()).toBe(0);
    });

    it('returns the previous Monday for a Sunday', () => {
      const ws = service.getWeekStart(new Date(2026, 5, 14)); // Sun 2026-06-14
      expect(ws.getDate()).toBe(8);
    });
  });

  describe('getVisibleDays', () => {
    it('returns a single day in day view', () => {
      const days = service.getVisibleDays('day', new Date(2026, 5, 10));
      expect(days).toHaveLength(1);
      expect(days[0].getDate()).toBe(10);
    });

    it('returns 7 Monday-first days in week view', () => {
      const days = service.getVisibleDays('week', new Date(2026, 5, 10));
      expect(days).toHaveLength(7);
      expect(days[0].getDay()).toBe(1);
      expect(days[6].getDay()).toBe(0);
    });
  });

  describe('getQueryRange', () => {
    it('spans exactly one day in day view', () => {
      const { from, to } = service.getQueryRange('day', new Date(2026, 5, 10));
      const ms = new Date(to).getTime() - new Date(from).getTime();
      expect(ms).toBe(24 * 60 * 60 * 1000);
    });

    it('spans seven days in week view', () => {
      const { from, to } = service.getQueryRange('week', new Date(2026, 5, 10));
      const ms = new Date(to).getTime() - new Date(from).getTime();
      expect(ms).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('spans a padded window around the month in month view', () => {
      const { from, to } = service.getQueryRange('month', new Date(2026, 5, 15));
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
      const { blocks, gaps } = service.buildTimeGridBlocks([makeEntry()], days, HOUR_HEIGHT);

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
      const { blocks } = service.buildTimeGridBlocks([entry], [new Date(2026, 5, 10)], HOUR_HEIGHT);
      expect(blocks[0].height).toBe(20);
    });

    it('positions a midnight-spanning entry on its start day (known min-height quirk)', () => {
      // 22:00 -> 02:00 next day. The end is clipped to the next-day 00:00 boundary,
      // whose getHours()/getMinutes() are 0, so endMinutes wraps to 0 and the block
      // collapses to MIN_BLOCK_HEIGHT. This is the original component's behavior,
      // locked here to guard against accidental change during the service extraction.
      const entry = makeEntry({ startTime: '2026-06-10T22:00:00', endTime: '2026-06-11T02:00:00' });
      const { blocks } = service.buildTimeGridBlocks([entry], [new Date(2026, 5, 10)], HOUR_HEIGHT);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].top).toBe(22 * HOUR_HEIGHT);
      expect(blocks[0].height).toBe(20);
    });
  });

  describe('buildMonthWeeks', () => {
    it('builds Monday-first weeks of 7 cells flagging the current month', () => {
      const weeks = service.buildMonthWeeks([], new Date(2026, 5, 15));
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      for (const week of weeks) {
        expect(week).toHaveLength(7);
      }
      expect(weeks[0][0].date.getDay()).toBe(1); // Monday
      const someJune = weeks.flat().find((c) => c.date.getMonth() === 5);
      expect(someJune?.isCurrentMonth).toBe(true);
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
      const timeline = service.buildDayTimeline([morning, earlier], new Date(2026, 5, 10), 'UTC');
      expect(timeline).toHaveLength(2);
      expect(timeline[0].startTime <= timeline[1].startTime).toBe(true);
      expect(timeline[0].playlistName).toBe('Morning');
      expect(timeline[0].targetName).toBe('Lobby');
      expect(timeline[0].isGroup).toBe(false);
    });

    it('uses the group name and flags isGroup for group entries', () => {
      const groupEntry = makeEntry({
        screenId: null,
        groupId: 'g1',
        group: { id: 'g1', name: 'Wall', mode: 'split' },
        playlist: { id: 'p1', name: 'Loop' },
      });
      const timeline = service.buildDayTimeline([groupEntry], new Date(2026, 5, 10), 'UTC');
      expect(timeline[0].isGroup).toBe(true);
      expect(timeline[0].targetName).toBe('Wall');
    });
  });

  describe('pixelsToTimeRange', () => {
    it('converts pixel offsets back into start/end times', () => {
      const { start, end } = service.pixelsToTimeRange(540, 60, new Date(2026, 5, 10), HOUR_HEIGHT);
      expect(start.getHours()).toBe(9);
      expect(start.getMinutes()).toBe(0);
      expect(end.getHours()).toBe(10);
    });
  });
});
