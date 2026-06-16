import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { DashboardService } from './dashboard.service';
import { DashboardSummary } from './dashboard-summary.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org-1';

function makeSummary(): DashboardSummary {
  return {
    screens: { total: 3, online: 2, offline: 1, warning: 0 },
    content: { count: 8, libraryBytes: 4_800_000_000 },
    playlists: { count: 4 },
    schedules: { upcoming24h: 2 },
    storage: {
      originalUsedBytes: 1,
      originalLimitBytes: 2,
      transcodedUsedBytes: 3,
      transcodedLimitBytes: 4,
    },
    alerts: [],
  };
}

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        DashboardService,
      ],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs /api/dashboard/summary with the org header and returns the summary', () => {
    // Arrange
    const expected = makeSummary();
    let actual: DashboardSummary | undefined;

    // Act
    service.getSummary(ORG_ID).subscribe((res) => (actual = res));
    const req = httpMock.expectOne('/api/dashboard/summary');

    // Assert
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('X-Organisation-Id')).toBe(ORG_ID);
    req.flush(expected);
    expect(actual).toEqual(expected);
  });
});
