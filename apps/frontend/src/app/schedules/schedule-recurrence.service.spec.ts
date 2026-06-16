import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScheduleRecurrenceService } from './schedule-recurrence.service';
import { ScheduleEntry } from './schedule.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

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

describe('ScheduleRecurrenceService', () => {
  let service: ScheduleRecurrenceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ScheduleRecurrenceService],
    });
    service = TestBed.inject(ScheduleRecurrenceService);
  });

  describe('parseRrule', () => {
    it('parses FREQ=DAILY', () => {
      expect(service.parseRrule('FREQ=DAILY')).toEqual({ freq: 'DAILY', byday: undefined });
    });

    it('parses WEEKLY with BYDAY and strips the RRULE: prefix', () => {
      expect(service.parseRrule('RRULE:FREQ=WEEKLY;BYDAY=MO,WE')).toEqual({
        freq: 'WEEKLY',
        byday: ['MO', 'WE'],
      });
    });

    it('returns null when FREQ is missing', () => {
      expect(service.parseRrule('BYDAY=MO')).toBeNull();
    });
  });

  describe('buildRrule', () => {
    it('returns undefined for none', () => {
      expect(service.buildRrule('none', [])).toBeUndefined();
    });

    it('builds daily and weekly', () => {
      expect(service.buildRrule('daily', [])).toBe('FREQ=DAILY');
      expect(service.buildRrule('weekly', [])).toBe('FREQ=WEEKLY');
    });

    it('builds weekdays with BYDAY', () => {
      expect(service.buildRrule('weekdays', ['MO', 'TU'])).toBe('FREQ=WEEKLY;BYDAY=MO,TU');
    });

    it('returns undefined for weekdays with no days selected', () => {
      expect(service.buildRrule('weekdays', [])).toBeUndefined();
    });
  });

  describe('toRecurrenceForm', () => {
    it('maps null to none', () => {
      expect(service.toRecurrenceForm(null)).toEqual({ recurrence: 'none', weekdays: [] });
    });

    it('maps DAILY to daily', () => {
      expect(service.toRecurrenceForm('FREQ=DAILY')).toEqual({ recurrence: 'daily', weekdays: [] });
    });

    it('maps WEEKLY+BYDAY to weekdays with its days', () => {
      expect(service.toRecurrenceForm('FREQ=WEEKLY;BYDAY=MO,FR')).toEqual({
        recurrence: 'weekdays',
        weekdays: ['MO', 'FR'],
      });
    });

    it('maps plain WEEKLY to weekly', () => {
      expect(service.toRecurrenceForm('FREQ=WEEKLY')).toEqual({
        recurrence: 'weekly',
        weekdays: [],
      });
    });
  });

  describe('doesDayMatchRrule', () => {
    const entryStart = new Date(2026, 5, 10); // Wed 2026-06-10

    it('matches every day for DAILY', () => {
      expect(service.doesDayMatchRrule(new Date(2026, 5, 11), entryStart, { freq: 'DAILY' })).toBe(
        true,
      );
    });

    it('matches only listed weekdays for WEEKLY+BYDAY', () => {
      const rule = { freq: 'WEEKLY', byday: ['MO', 'WE'] };
      expect(service.doesDayMatchRrule(new Date(2026, 5, 10), entryStart, rule)).toBe(true); // Wed
      expect(service.doesDayMatchRrule(new Date(2026, 5, 11), entryStart, rule)).toBe(false); // Thu
    });

    it('matches the original weekday for WEEKLY without BYDAY', () => {
      const rule = { freq: 'WEEKLY' };
      expect(service.doesDayMatchRrule(new Date(2026, 5, 17), entryStart, rule)).toBe(true); // Wed
      expect(service.doesDayMatchRrule(new Date(2026, 5, 18), entryStart, rule)).toBe(false); // Thu
    });
  });

  describe('getOccurrencesOnDay', () => {
    it('returns the single range for a non-recurring entry overlapping the day', () => {
      const entry = makeEntry();
      const occ = service.getOccurrencesOnDay(entry, new Date(2026, 5, 10));
      expect(occ).toHaveLength(1);
      expect(occ[0].start.getHours()).toBe(9);
      expect(occ[0].end.getHours()).toBe(10);
    });

    it('returns nothing for a non-recurring entry on a different day', () => {
      const entry = makeEntry();
      expect(service.getOccurrencesOnDay(entry, new Date(2026, 5, 11))).toHaveLength(0);
    });

    it('projects a daily entry onto a later day at the original time', () => {
      const entry = makeEntry({ rrule: 'FREQ=DAILY' });
      const occ = service.getOccurrencesOnDay(entry, new Date(2026, 5, 15));
      expect(occ).toHaveLength(1);
      expect(occ[0].start.getHours()).toBe(9);
      expect(occ[0].start.getDate()).toBe(15);
    });

    it('only emits weekly+byday occurrences on matching weekdays', () => {
      const entry = makeEntry({ rrule: 'FREQ=WEEKLY;BYDAY=WE' });
      expect(service.getOccurrencesOnDay(entry, new Date(2026, 5, 17))).toHaveLength(1); // Wed
      expect(service.getOccurrencesOnDay(entry, new Date(2026, 5, 18))).toHaveLength(0); // Thu
    });

    it('excludes recurring occurrences before the entry start date', () => {
      const entry = makeEntry({ rrule: 'FREQ=DAILY' });
      expect(service.getOccurrencesOnDay(entry, new Date(2026, 5, 9))).toHaveLength(0);
    });

    it('falls back to the original date when the RRULE has no FREQ', () => {
      const entry = makeEntry({ rrule: 'BYDAY=MO' }); // parseRrule -> null
      expect(service.getOccurrencesOnDay(entry, new Date(2026, 5, 10))).toHaveLength(1); // original day
      expect(service.getOccurrencesOnDay(entry, new Date(2026, 5, 11))).toHaveLength(0); // other day
    });
  });
});
