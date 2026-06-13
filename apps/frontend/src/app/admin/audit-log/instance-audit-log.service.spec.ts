import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { InstanceAuditLogService } from './instance-audit-log.service';
import { AuditLogResponse } from '../../audit-log/audit-log.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const BASE_URL = '/api/admin/audit-log';

describe('InstanceAuditLogService', () => {
  let service: InstanceAuditLogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(InstanceAuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('issues a GET to the admin audit-log URL with no params by default', () => {
    const response: AuditLogResponse = { data: [], total: 0 };
    let received: AuditLogResponse | undefined;

    service.getAuditLog().subscribe((r) => (received = r));
    const req = httpMock.expectOne((r) => r.url === BASE_URL);

    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(response);
    expect(received).toEqual(response);
  });

  it('does not attach an X-Organisation-Id header (super-admin scoped)', () => {
    service.getAuditLog().subscribe();
    const req = httpMock.expectOne((r) => r.url === BASE_URL);

    expect(req.request.headers.has('X-Organisation-Id')).toBe(false);
    req.flush({ data: [], total: 0 });
  });

  it('serialises every filter (incl. organisationId) into query params', () => {
    service
      .getAuditLog({
        action: 'email.sent',
        userId: 'u1',
        organisationId: 'org-1',
        resourceType: 'email',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.999Z',
        limit: 50,
        offset: 100,
      })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === BASE_URL);
    const p = req.request.params;
    expect(p.get('action')).toBe('email.sent');
    expect(p.get('userId')).toBe('u1');
    expect(p.get('organisationId')).toBe('org-1');
    expect(p.get('resourceType')).toBe('email');
    expect(p.get('from')).toBe('2026-01-01T00:00:00.000Z');
    expect(p.get('to')).toBe('2026-01-31T23:59:59.999Z');
    expect(p.get('limit')).toBe('50');
    expect(p.get('offset')).toBe('100');
    req.flush({ data: [], total: 0 });
  });

  it('propagates HTTP errors (e.g. 403 for non-super-admins)', () => {
    let errorStatus: number | undefined;

    service.getAuditLog().subscribe({ error: (err) => (errorStatus = err.status) });
    const req = httpMock.expectOne((r) => r.url === BASE_URL);
    req.flush('forbidden', { status: 403, statusText: 'Forbidden' });

    expect(errorStatus).toBe(403);
  });
});
