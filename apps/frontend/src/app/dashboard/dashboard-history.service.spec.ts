import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { DashboardService } from './dashboard.service';
import { DashboardHistory } from './dashboard-history.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org1';

const HISTORY: DashboardHistory = {
  points: [
    {
      capturedAt: '2026-06-15T10:00:00.000Z',
      screensOnline: 2,
      contentCount: 5,
      playlistCount: 1,
      openAlerts: 0,
    },
  ],
};

describe('DashboardService.getHistory', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs /api/dashboard/history with the org header', () => {
    let result: DashboardHistory | undefined;

    service.getHistory(ORG_ID).subscribe((res) => (result = res));
    const req = httpMock.expectOne((r) => r.url === '/api/dashboard/history');

    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
    req.flush(HISTORY);
    expect(result).toEqual(HISTORY);
  });
});
