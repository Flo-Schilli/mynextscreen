import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { VersionService } from './version.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function setup(): { service: VersionService; http: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  // Instantiating the service fires the /version.json request from its constructor.
  const service = TestBed.inject(VersionService);
  const http = TestBed.inject(HttpTestingController);
  return { service, http };
}

describe('VersionService', () => {
  it('exposes the version from /version.json', async () => {
    const { service, http } = setup();
    http
      .expectOne('/version.json')
      .flush({ version: '0.2.1', commit: 'abc1234', builtAt: '2026-06-12' });
    await Promise.resolve();
    expect(service.version()).toBe('0.2.1');
    http.verify();
  });

  it('ignores the dev placeholder version', async () => {
    const { service, http } = setup();
    http.expectOne('/version.json').flush({ version: '0.0.0-dev', commit: 'x', builtAt: 'x' });
    await Promise.resolve();
    expect(service.version()).toBeNull();
    http.verify();
  });

  it('stays null when version.json is missing', async () => {
    const { service, http } = setup();
    http.expectOne('/version.json').flush('Not Found', { status: 404, statusText: 'Not Found' });
    await Promise.resolve();
    expect(service.version()).toBeNull();
    http.verify();
  });

  it('stays null when the payload is malformed', async () => {
    const { service, http } = setup();
    http.expectOne('/version.json').flush({ nope: true });
    await Promise.resolve();
    expect(service.version()).toBeNull();
    http.verify();
  });
});
