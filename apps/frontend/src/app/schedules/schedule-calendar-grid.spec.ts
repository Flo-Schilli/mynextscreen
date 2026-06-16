import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  ScheduleCalendarGrid,
  CreateSlot,
  BlockPointerEvent,
  ResizePointerEvent,
} from './schedule-calendar-grid';
import { ScheduleEntry } from './schedule.model';
import { CalendarBlock, GapBlock, MonthDayCell } from './schedule-calendar.service';

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
    startTime: '2026-06-01T08:00:00.000Z',
    endTime: '2026-06-01T10:00:00.000Z',
    rrule: null,
    colour: '#3b82f6',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    playlist: { id: 'p1', name: 'Morning Loop' },
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

describe('ScheduleCalendarGrid', () => {
  let fixture: ComponentFixture<ScheduleCalendarGrid>;
  let component: ScheduleCalendarGrid;

  async function setUp(overrides?: {
    viewMode?: 'day' | 'week' | 'month';
    visibleDays?: Date[];
    monthWeeks?: MonthDayCell[][];
    blocks?: CalendarBlock[];
    gaps?: GapBlock[];
    draggingEntryId?: string | null;
  }): Promise<void> {
    fixture = TestBed.createComponent(ScheduleCalendarGrid);
    fixture.componentRef.setInput('viewMode', overrides?.viewMode ?? 'day');
    fixture.componentRef.setInput(
      'visibleDays',
      overrides?.visibleDays ?? [new Date('2026-06-01T00:00:00')],
    );
    fixture.componentRef.setInput('monthWeeks', overrides?.monthWeeks ?? []);
    fixture.componentRef.setInput('blocks', overrides?.blocks ?? []);
    fixture.componentRef.setInput('gaps', overrides?.gaps ?? []);
    fixture.componentRef.setInput('hourHeight', HOUR_HEIGHT);
    fixture.componentRef.setInput('orgTimeZone', 'UTC');
    if (overrides?.draggingEntryId !== undefined) {
      fixture.componentRef.setInput('draggingEntryId', overrides.draggingEntryId);
    }
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  describe('filtering helpers', () => {
    it('getBlocksForDay returns only blocks matching the day index', async () => {
      // Arrange
      await setUp({
        blocks: [
          makeBlock({ dayIndex: 0 }),
          makeBlock({ dayIndex: 1 }),
          makeBlock({ dayIndex: 0 }),
        ],
      });

      // Act
      const result = component.getBlocksForDay(0);

      // Assert
      expect(result.length).toBe(2);
      expect(result.every((b) => b.dayIndex === 0)).toBe(true);
    });

    it('getGapsForDay returns only gaps matching the day index', async () => {
      // Arrange
      await setUp({
        gaps: [
          { top: 0, height: 60, dayIndex: 0 },
          { top: 0, height: 60, dayIndex: 2 },
        ],
      });

      // Act
      const result = component.getGapsForDay(2);

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].dayIndex).toBe(2);
    });
  });

  describe('getEntryLabel', () => {
    it('returns just the playlist name for a screen entry', async () => {
      // Arrange
      await setUp();

      // Act
      const label = component.getEntryLabel(makeEntry());

      // Assert
      expect(label).toBe('Morning Loop');
    });

    it('appends the group name for a group entry', async () => {
      // Arrange
      await setUp();
      const entry = makeEntry({
        groupId: 'g1',
        group: { id: 'g1', name: 'Wall', mode: 'split' },
      });

      // Act
      const label = component.getEntryLabel(entry);

      // Assert
      expect(label).toBe('Morning Loop - Wall');
    });

    it('falls back to "Playlist" when no playlist is attached', async () => {
      // Arrange
      await setUp();

      // Act
      const label = component.getEntryLabel(makeEntry({ playlist: undefined }));

      // Assert
      expect(label).toBe('Playlist');
    });
  });

  describe('isOneOff', () => {
    it('is true for a non-recurring entry without an rrule', async () => {
      // Arrange
      await setUp();

      // Act / Assert
      expect(component.isOneOff(makeBlock({ isRecurring: false }))).toBe(true);
    });

    it('is false for a recurring block', async () => {
      // Arrange
      await setUp();

      // Act / Assert
      expect(component.isOneOff(makeBlock({ isRecurring: true }))).toBe(false);
    });
  });

  describe('hasConflict', () => {
    it('flags overlapping blocks on the same day', async () => {
      // Arrange
      const a = makeBlock({
        entry: makeEntry({ id: 'a' }),
        occurrenceStart: new Date('2026-06-01T08:00:00.000Z'),
        occurrenceEnd: new Date('2026-06-01T10:00:00.000Z'),
      });
      const b = makeBlock({
        entry: makeEntry({ id: 'b' }),
        occurrenceStart: new Date('2026-06-01T09:00:00.000Z'),
        occurrenceEnd: new Date('2026-06-01T11:00:00.000Z'),
      });
      await setUp({ viewMode: 'day', blocks: [a, b] });

      // Act / Assert
      expect(component.hasConflict(a)).toBe(true);
      expect(component.hasConflict(b)).toBe(true);
    });

    it('does not flag non-overlapping blocks', async () => {
      // Arrange
      const a = makeBlock({
        entry: makeEntry({ id: 'a' }),
        occurrenceStart: new Date('2026-06-01T08:00:00.000Z'),
        occurrenceEnd: new Date('2026-06-01T09:00:00.000Z'),
      });
      const b = makeBlock({
        entry: makeEntry({ id: 'b' }),
        occurrenceStart: new Date('2026-06-01T09:00:00.000Z'),
        occurrenceEnd: new Date('2026-06-01T10:00:00.000Z'),
      });
      await setUp({ viewMode: 'day', blocks: [a, b] });

      // Act / Assert
      expect(component.hasConflict(a)).toBe(false);
    });
  });

  describe('isDayToday', () => {
    it('returns true for the current date', async () => {
      // Arrange
      await setUp();

      // Act / Assert
      expect(component.isDayToday(new Date())).toBe(true);
    });

    it('returns false for a different date', async () => {
      // Arrange
      await setUp();

      // Act / Assert
      expect(component.isDayToday(new Date('1999-01-01T00:00:00'))).toBe(false);
    });
  });

  describe('formatHour', () => {
    it('zero-pads the hour and appends :00', async () => {
      // Arrange
      await setUp();

      // Act / Assert
      expect(component.formatHour(9)).toBe('09:00');
      expect(component.formatHour(13)).toBe('13:00');
    });
  });

  describe('formatBlockTime', () => {
    it('formats a date as 24h HH:mm in the org timezone', async () => {
      // Arrange
      await setUp();

      // Act
      const formatted = component.formatBlockTime(new Date('2026-06-01T08:30:00.000Z'));

      // Assert (UTC tz, 24h)
      expect(formatted).toBe('08:30');
    });
  });

  describe('view rendering', () => {
    it('renders the month grid in month view', async () => {
      // Arrange
      const monthWeeks: MonthDayCell[][] = [
        [
          {
            date: new Date('2026-06-01T00:00:00'),
            dayNumber: 1,
            isCurrentMonth: true,
            isToday: false,
            blocks: [makeBlock()],
          },
        ],
      ];

      // Act
      await setUp({ viewMode: 'month', monthWeeks });

      // Assert
      expect(fixture.nativeElement.querySelector('.month-grid')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.time-grid')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.month-entry-chip').length).toBe(1);
    });

    it('renders the time grid with one schedule block in day view', async () => {
      // Arrange / Act
      await setUp({ viewMode: 'day', blocks: [makeBlock()] });

      // Assert
      expect(fixture.nativeElement.querySelector('.time-grid')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.month-grid')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.schedule-block').length).toBe(1);
    });

    it('marks the dragging block with the dragging class', async () => {
      // Arrange / Act
      await setUp({ viewMode: 'day', blocks: [makeBlock()], draggingEntryId: 'e1' });

      // Assert
      const block = fixture.nativeElement.querySelector('.schedule-block') as HTMLElement;
      expect(block.classList.contains('dragging')).toBe(true);
    });

    it('renders gap indicators in the day column', async () => {
      // Arrange / Act
      await setUp({ viewMode: 'day', gaps: [{ top: 0, height: 120, dayIndex: 0 }] });

      // Assert
      expect(fixture.nativeElement.querySelectorAll('.gap-indicator').length).toBe(1);
    });

    it('renders the group badge for a group block in day view', async () => {
      // Arrange
      const block = makeBlock({
        entry: makeEntry({ groupId: 'g1', group: { id: 'g1', name: 'Wall', mode: 'mirror' } }),
      });

      // Act
      await setUp({ viewMode: 'day', blocks: [block] });

      // Assert
      expect(fixture.nativeElement.querySelector('.schedule-block .group-badge')).toBeTruthy();
    });
  });

  describe('output emits', () => {
    it('emits monthDayClick with the cell date when a month day is clicked', async () => {
      // Arrange
      const cellDate = new Date('2026-06-05T00:00:00');
      const monthWeeks: MonthDayCell[][] = [
        [{ date: cellDate, dayNumber: 5, isCurrentMonth: true, isToday: false, blocks: [] }],
      ];
      await setUp({ viewMode: 'month', monthWeeks });
      let emitted: Date | undefined;
      component.monthDayClick.subscribe((d) => (emitted = d));

      // Act
      (fixture.nativeElement.querySelector('.month-day-cell') as HTMLElement).click();

      // Assert
      expect(emitted).toBe(cellDate);
    });

    it('emits blockClick when a schedule block is clicked', async () => {
      // Arrange
      await setUp({ viewMode: 'day', blocks: [makeBlock()] });
      let emitted: BlockPointerEvent | undefined;
      component.blockClick.subscribe((e) => (emitted = e));

      // Act
      (fixture.nativeElement.querySelector('.schedule-block') as HTMLElement).click();

      // Assert
      expect(emitted?.block.entry.id).toBe('e1');
    });

    it('emits blockMouseDown on mousedown of a schedule block', async () => {
      // Arrange
      await setUp({ viewMode: 'day', blocks: [makeBlock()] });
      let emitted: BlockPointerEvent | undefined;
      component.blockMouseDown.subscribe((e) => (emitted = e));

      // Act
      const block = fixture.nativeElement.querySelector('.schedule-block') as HTMLElement;
      block.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      // Assert
      expect(emitted?.block.entry.id).toBe('e1');
    });

    it('emits resizeMouseDown with the edge when a resize handle is moused down', async () => {
      // Arrange
      await setUp({ viewMode: 'day', blocks: [makeBlock()] });
      const emitted: ResizePointerEvent[] = [];
      component.resizeMouseDown.subscribe((e) => emitted.push(e));

      // Act
      const handles = fixture.nativeElement.querySelectorAll('.resize-handle');
      (handles[0] as HTMLElement).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      (handles[1] as HTMLElement).dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      // Assert
      expect(emitted.map((e) => e.edge)).toEqual(['top', 'bottom']);
    });
  });

  describe('onTimeGridClick', () => {
    it('does nothing when the click target is not an hour slot', async () => {
      // Arrange
      await setUp({ viewMode: 'day' });
      let emitted: CreateSlot | undefined;
      component.createSlot.subscribe((s) => (emitted = s));
      const notSlot = document.createElement('div');

      // Act
      component.onTimeGridClick({ target: notSlot, clientY: 100 } as unknown as MouseEvent);

      // Assert
      expect(emitted).toBeUndefined();
    });

    it('emits a one-hour createSlot derived from the click position on an hour slot', async () => {
      // Arrange
      const day = new Date('2026-06-01T00:00:00');
      await setUp({ viewMode: 'day', visibleDays: [day] });
      let emitted: CreateSlot | undefined;
      component.createSlot.subscribe((s) => (emitted = s));

      const dayColumn = fixture.nativeElement.querySelector('.day-column') as HTMLElement;
      const slot = dayColumn.querySelector('.hour-slot') as HTMLElement;
      // Simulate a column rect so the y-math resolves to hour 2.
      dayColumn.getBoundingClientRect = () =>
        ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }) as DOMRect;

      // Act — clientY 150 / hourHeight 60 => hour 2
      component.onTimeGridClick({ target: slot, clientY: 150 } as unknown as MouseEvent);

      // Assert
      expect(emitted).toBeTruthy();
      expect(emitted!.start.getHours()).toBe(2);
      expect(emitted!.end.getHours()).toBe(3);
    });
  });
});
