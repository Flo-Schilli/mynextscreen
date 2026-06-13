import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { InstanceAdminService } from './instance-admin.service';
import { InstanceAdminSummary } from './instance-admin.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const URL = '/api/admin/dashboard';

function makeSummary(): InstanceAdminSummary {
  return {
    users: { total: 3, verified: 2, pending: 1 },
    organisationCount: 2,
    storage: {
      originalUsedBytes: 150,
      originalLimitBytes: 1500,
      transcodedUsedBytes: 270,
      transcodedLimitBytes: 2700,
    },
    hostDisk: { path: './media', totalBytes: 1000, freeBytes: 400, available: true },
  };
}

describe('InstanceAdminService', () => {
  let service: InstanceAdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(InstanceAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('issues a GET to the admin dashboard URL and returns the summary', () => {
    const summary = makeSummary();
    let received: InstanceAdminSummary | undefined;

    service.getSummary().subscribe((result) => (received = result));
    const req = httpMock.expectOne(URL);

    expect(req.request.method).toBe('GET');
    req.flush(summary);
    expect(received).toEqual(summary);
  });

  it('propagates HTTP errors', () => {
    let errorStatus: number | undefined;

    service.getSummary().subscribe({ error: (err) => (errorStatus = err.status) });
    httpMock.expectOne(URL).flush('boom', { status: 403, statusText: 'Forbidden' });

    expect(errorStatus).toBe(403);
  });
});
