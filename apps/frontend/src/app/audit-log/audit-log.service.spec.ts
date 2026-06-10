import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { AuditLogService } from './audit-log.service';
import { AuditLogResponse } from './audit-log.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

const RESPONSE: AuditLogResponse = {
  data: [
    {
      id: 'a1',
      timestamp: '2026-01-01T00:00:00.000Z',
      userId: 'u1',
      organisationId: ORG_ID,
      action: 'content.upload',
      resourceType: 'content',
      resourceId: 'c1',
      details: { fileName: 'clip.mp4' },
    },
  ],
  total: 1,
};

describe('AuditLogService', () => {
  let service: AuditLogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getAuditLog', () => {
    it('GETs /api/audit-log with the org header and no params when filters are omitted', () => {
      // Arrange
      let result: AuditLogResponse | undefined;

      // Act
      service.getAuditLog(ORG_ID).subscribe((res) => (result = res));
      const req = httpMock.expectOne((r) => r.url === '/api/audit-log');

      // Assert
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
      expect(req.request.params.keys().length).toBe(0);
      req.flush(RESPONSE);
      expect(result).toEqual(RESPONSE);
    });

    it('GETs with an empty filters object and emits no query params', () => {
      // Arrange & Act
      service.getAuditLog(ORG_ID, {}).subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/audit-log');

      // Assert
      expect(req.request.params.keys().length).toBe(0);
      req.flush(RESPONSE);
    });

    it('sets action, userId and resourceType params when provided', () => {
      // Arrange & Act
      service
        .getAuditLog(ORG_ID, {
          action: 'content.upload',
          userId: 'u1',
          resourceType: 'content',
        })
        .subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/audit-log');

      // Assert
      expect(req.request.params.get('action')).toBe('content.upload');
      expect(req.request.params.get('userId')).toBe('u1');
      expect(req.request.params.get('resourceType')).toBe('content');
      req.flush(RESPONSE);
    });

    it('sets from and to date-range params when provided', () => {
      // Arrange & Act
      service
        .getAuditLog(ORG_ID, {
          from: '2026-01-01T00:00:00.000Z',
          to: '2026-02-01T00:00:00.000Z',
        })
        .subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/audit-log');

      // Assert
      expect(req.request.params.get('from')).toBe('2026-01-01T00:00:00.000Z');
      expect(req.request.params.get('to')).toBe('2026-02-01T00:00:00.000Z');
      req.flush(RESPONSE);
    });

    it('stringifies numeric limit and offset pagination params', () => {
      // Arrange & Act
      service.getAuditLog(ORG_ID, { limit: 50, offset: 100 }).subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/audit-log');

      // Assert
      expect(req.request.params.get('limit')).toBe('50');
      expect(req.request.params.get('offset')).toBe('100');
      req.flush(RESPONSE);
    });

    it('includes limit=0 and offset=0 because the guard is a null check, not falsy', () => {
      // Arrange & Act
      service.getAuditLog(ORG_ID, { limit: 0, offset: 0 }).subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/audit-log');

      // Assert
      expect(req.request.params.get('limit')).toBe('0');
      expect(req.request.params.get('offset')).toBe('0');
      req.flush(RESPONSE);
    });

    it('omits empty-string filter values', () => {
      // Arrange & Act
      service.getAuditLog(ORG_ID, { action: '', userId: '', resourceType: '' }).subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/audit-log');

      // Assert
      expect(req.request.params.has('action')).toBe(false);
      expect(req.request.params.has('userId')).toBe(false);
      expect(req.request.params.has('resourceType')).toBe(false);
      req.flush(RESPONSE);
    });

    it('combines all filters into a single request', () => {
      // Arrange & Act
      service
        .getAuditLog(ORG_ID, {
          action: 'screen.update',
          userId: 'u9',
          resourceType: 'screen',
          from: '2026-01-01',
          to: '2026-03-01',
          limit: 25,
          offset: 25,
        })
        .subscribe();
      const req = httpMock.expectOne((r) => r.url === '/api/audit-log');

      // Assert
      expect(req.request.params.keys().length).toBe(7);
      req.flush(RESPONSE);
    });

    it('propagates HTTP errors to the subscriber', () => {
      // Arrange
      let errorStatus: number | undefined;

      // Act
      service.getAuditLog(ORG_ID).subscribe({
        next: () => {
          throw new Error('expected an error');
        },
        error: (err: { status: number }) => (errorStatus = err.status),
      });
      const req = httpMock.expectOne((r) => r.url === '/api/audit-log');
      req.flush('nope', { status: 403, statusText: 'Forbidden' });

      // Assert
      expect(errorStatus).toBe(403);
    });
  });
});
