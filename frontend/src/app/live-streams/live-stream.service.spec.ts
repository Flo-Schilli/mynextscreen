import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { LiveStreamService } from './live-stream.service';
import {
  LiveStream,
  CreateLiveStreamRequest,
  UpdateLiveStreamRequest,
  ActivateLiveStreamRequest,
  ActivateStreamResponse,
  StreamHealthState,
} from './live-stream.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

function makeStream(overrides: Partial<LiveStream> = {}): LiveStream {
  return {
    id: 'ls-1',
    organisationId: ORG_ID,
    name: 'Main Stage',
    sourceUrl: 'rtmp://source/live',
    protocol: 'rtmp',
    status: 'idle',
    transcodingPreset: 'high_1080p',
    audioEnabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('LiveStreamService', () => {
  let service: LiveStreamService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(LiveStreamService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getAll', () => {
    it('issues a GET to /api/live-streams with the org header and returns the list', () => {
      // Arrange
      const streams = [makeStream(), makeStream({ id: 'ls-2', name: 'Side Stage' })];
      let result: LiveStream[] | undefined;

      // Act
      service.getAll(ORG_ID).subscribe((res) => (result = res));
      const req = httpMock.expectOne('/api/live-streams');

      // Assert
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(streams);
      expect(result).toEqual(streams);
    });
  });

  describe('getOne', () => {
    it('issues a GET to /api/live-streams/:id with the org header and returns the stream', () => {
      // Arrange
      const stream = makeStream({ id: 'abc' });
      let result: LiveStream | undefined;

      // Act
      service.getOne(ORG_ID, 'abc').subscribe((res) => (result = res));
      const req = httpMock.expectOne('/api/live-streams/abc');

      // Assert
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(stream);
      expect(result).toEqual(stream);
    });
  });

  describe('create', () => {
    it('POSTs the create dto to /api/live-streams with the org header', () => {
      // Arrange
      const dto: CreateLiveStreamRequest = {
        name: 'New Stream',
        sourceUrl: 'rtmp://x/live',
        protocol: 'rtmp',
        transcodingPreset: 'medium_720p',
        audioEnabled: false,
      };
      const created = makeStream({ name: dto.name, sourceUrl: dto.sourceUrl });
      let result: LiveStream | undefined;

      // Act
      service.create(ORG_ID, dto).subscribe((res) => (result = res));
      const req = httpMock.expectOne('/api/live-streams');

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(created);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('PATCHes the update dto to /api/live-streams/:id with the org header', () => {
      // Arrange
      const dto: UpdateLiveStreamRequest = { name: 'Renamed', audioEnabled: true };
      const updated = makeStream({ id: 'u1', name: 'Renamed' });
      let result: LiveStream | undefined;

      // Act
      service.update(ORG_ID, 'u1', dto).subscribe((res) => (result = res));
      const req = httpMock.expectOne('/api/live-streams/u1');

      // Assert
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(updated);
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('DELETEs /api/live-streams/:id with the org header', () => {
      // Arrange
      let completed = false;

      // Act
      service.delete(ORG_ID, 'd1').subscribe(() => (completed = true));
      const req = httpMock.expectOne('/api/live-streams/d1');

      // Assert
      expect(req.request.method).toBe('DELETE');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(null);
      expect(completed).toBe(true);
    });
  });

  describe('activate', () => {
    it('POSTs the activate dto to /api/live-streams/:id/activate and returns stream with warnings', () => {
      // Arrange
      const dto: ActivateLiveStreamRequest = { targetScreenIds: ['s1', 's2'] };
      const response: ActivateStreamResponse = {
        stream: makeStream({ status: 'active' }),
        warnings: ['screen offline'],
      };
      let result: ActivateStreamResponse | undefined;

      // Act
      service.activate(ORG_ID, 'ls-1', dto).subscribe((res) => (result = res));
      const req = httpMock.expectOne('/api/live-streams/ls-1/activate');

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(response);
      expect(result).toEqual(response);
    });
  });

  describe('deactivate', () => {
    it('POSTs an empty body to /api/live-streams/:id/deactivate with the org header', () => {
      // Arrange
      const stream = makeStream({ status: 'idle' });
      let result: LiveStream | undefined;

      // Act
      service.deactivate(ORG_ID, 'ls-1').subscribe((res) => (result = res));
      const req = httpMock.expectOne('/api/live-streams/ls-1/deactivate');

      // Assert
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(stream);
      expect(result).toEqual(stream);
    });
  });

  describe('getHealth', () => {
    it('issues a GET to /api/live-streams/:id/health with the org header', () => {
      // Arrange
      const health: StreamHealthState = {
        streamId: 'ls-1',
        status: 'active',
        health: 'ok',
        checkedAt: '2026-01-01T00:00:00.000Z',
      };
      let result: StreamHealthState | undefined;

      // Act
      service.getHealth(ORG_ID, 'ls-1').subscribe((res) => (result = res));
      const req = httpMock.expectOne('/api/live-streams/ls-1/health');

      // Assert
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      req.flush(health);
      expect(result).toEqual(health);
    });
  });

  describe('error handling', () => {
    it('propagates HTTP errors to the subscriber', () => {
      // Arrange
      let errorStatus: number | undefined;

      // Act
      service.getAll(ORG_ID).subscribe({
        next: () => {
          throw new Error('expected an error');
        },
        error: (err: { status: number }) => (errorStatus = err.status),
      });
      const req = httpMock.expectOne('/api/live-streams');
      req.flush('boom', { status: 500, statusText: 'Server Error' });

      // Assert
      expect(errorStatus).toBe(500);
    });
  });
});
