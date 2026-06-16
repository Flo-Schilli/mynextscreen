import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ScheduleService } from './schedule.service';
import {
  ScheduleEntry,
  CreateScheduleEntryRequest,
  UpdateScheduleEntryRequest,
} from './schedule.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

function makeEntry(overrides: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    id: 'sched-1',
    organisationId: ORG_ID,
    screenId: 'screen-1',
    groupId: null,
    playlistId: 'playlist-1',
    name: null,
    priority: 'normal',
    startTime: '2026-06-01T10:00:00.000Z',
    endTime: '2026-06-01T12:00:00.000Z',
    rrule: null,
    colour: '#ff0000',
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-01T09:00:00.000Z',
    ...overrides,
  };
}

describe('ScheduleService', () => {
  let service: ScheduleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ScheduleService,
      ],
    });

    service = TestBed.inject(ScheduleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getByScreen', () => {
    it('issues a GET to /api/schedules with screenId, from and to query params', () => {
      // Arrange
      const expected = [makeEntry()];
      let actual: ScheduleEntry[] | undefined;

      // Act
      service
        .getByScreen(ORG_ID, 'screen-1', '2026-06-01', '2026-06-07')
        .subscribe((res) => (actual = res));
      const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/schedules');

      // Assert
      expect(req.request.params.get('screenId')).toBe('screen-1');
      expect(req.request.params.get('from')).toBe('2026-06-01');
      expect(req.request.params.get('to')).toBe('2026-06-07');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('getByDateRange', () => {
    it('issues a GET to /api/schedules with from and to params and no screenId', () => {
      // Arrange
      const expected = [makeEntry(), makeEntry({ id: 'sched-2' })];
      let actual: ScheduleEntry[] | undefined;

      // Act
      service.getByDateRange(ORG_ID, '2026-06-01', '2026-06-30').subscribe((res) => (actual = res));
      const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/schedules');

      // Assert
      expect(req.request.params.get('from')).toBe('2026-06-01');
      expect(req.request.params.get('to')).toBe('2026-06-30');
      expect(req.request.params.has('screenId')).toBe(false);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('create', () => {
    it('POSTs the create dto to /api/schedules and returns the created entry', () => {
      // Arrange
      const dto: CreateScheduleEntryRequest = {
        screenId: 'screen-1',
        playlistId: 'playlist-1',
        startTime: '2026-06-01T10:00:00.000Z',
        endTime: '2026-06-01T12:00:00.000Z',
        colour: '#00ff00',
      };
      const expected = makeEntry({ colour: '#00ff00' });
      let actual: ScheduleEntry | undefined;

      // Act
      service.create(ORG_ID, dto).subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/schedules');

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('update', () => {
    it('PATCHes the update dto to /api/schedules/:id and returns the updated entry', () => {
      // Arrange
      const dto: UpdateScheduleEntryRequest = { colour: '#0000ff', rrule: null };
      const expected = makeEntry({ colour: '#0000ff' });
      let actual: ScheduleEntry | undefined;

      // Act
      service.update(ORG_ID, 'sched-1', dto).subscribe((res) => (actual = res));
      const req = httpMock.expectOne('/api/schedules/sched-1');

      // Assert
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(expected);
      expect(actual).toEqual(expected);
    });
  });

  describe('delete', () => {
    it('DELETEs /api/schedules/:id with the org header', () => {
      // Arrange
      let completed = false;

      // Act
      service.delete(ORG_ID, 'sched-1').subscribe(() => (completed = true));
      const req = httpMock.expectOne('/api/schedules/sched-1');

      // Assert
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(null);
      expect(completed).toBe(true);
    });
  });

  describe('error handling', () => {
    it('propagates a server error from getByDateRange to the subscriber', () => {
      // Arrange
      let status: number | undefined;

      // Act
      service.getByDateRange(ORG_ID, '2026-06-01', '2026-06-30').subscribe({
        error: (err: { status: number }) => (status = err.status),
      });
      const req = httpMock.expectOne((r) => r.method === 'GET' && r.url === '/api/schedules');
      req.flush('boom', { status: 500, statusText: 'Server Error' });

      // Assert
      expect(status).toBe(500);
    });
  });
});
