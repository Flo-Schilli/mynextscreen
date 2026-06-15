import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { InstanceAdminService } from './instance-admin.service';
import { SystemLoad } from './instance-admin.model';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const LOAD: SystemLoad = { cpu: [10, 20], ram: [30, 40], cores: 8, ramTotalGB: 16 };

describe('InstanceAdminService.getSystemLoad', () => {
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

  it('GETs /api/admin/dashboard/load', () => {
    let result: SystemLoad | undefined;

    service.getSystemLoad().subscribe((res) => (result = res));
    const req = httpMock.expectOne((r) => r.url === '/api/admin/dashboard/load');

    expect(req.request.method).toBe('GET');
    req.flush(LOAD);
    expect(result).toEqual(LOAD);
  });
});
