import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { CapturePluginService } from './capture-plugin.service';

describe('CapturePluginService', () => {
  let service: CapturePluginService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CapturePluginService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the status', () => {
    service.getStatus('a1').subscribe();
    const req = http.expectOne('/api/site-agents/a1/capture-plugin');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('reads the license text', () => {
    service.getLicenseText('a1').subscribe();
    const req = http.expectOne('/api/site-agents/a1/capture-plugin/license-text');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('posts exactly the license hash it was given', () => {
    service.accept('a1', 'abc123').subscribe();
    const req = http.expectOne('/api/site-agents/a1/capture-plugin/acceptance');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ licenseSha256: 'abc123' });
    req.flush({});
  });

  it('revokes with a DELETE', () => {
    service.revoke('a1').subscribe();
    const req = http.expectOne('/api/site-agents/a1/capture-plugin/acceptance');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
