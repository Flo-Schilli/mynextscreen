import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { MfaStatusResponse } from '@mynextscreen/shared-types';
import { MfaService } from './mfa.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function status(overrides: Partial<MfaStatusResponse> = {}): MfaStatusResponse {
  return {
    totpEnabled: true,
    enabledAt: '2026-10-01T10:00:00.000Z',
    recoveryCodesRemaining: 10,
    requiredBy: { superAdmin: false, organisationIds: [] },
    ...overrides,
  };
}

function setup(): { service: MfaService; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return { service: TestBed.inject(MfaService), httpMock: TestBed.inject(HttpTestingController) };
}

describe('MfaService', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController, null, { optional: true })?.verify();
  });

  it('loads and caches the status', async () => {
    const { service, httpMock } = setup();
    const promise = service.loadStatus();
    httpMock.expectOne('/api/auth/mfa/status').flush(status());
    expect(await promise).toEqual(status());
    expect(service.status()).toEqual(status());
    expect(service.isRequired()).toBe(false);
  });

  it('is required for a super-admin or a requiring organisation', () => {
    const { service } = setup();
    service.status.set(status({ requiredBy: { superAdmin: true, organisationIds: [] } }));
    expect(service.isRequired()).toBe(true);
    service.status.set(status({ requiredBy: { superAdmin: false, organisationIds: ['o1'] } }));
    expect(service.isRequired()).toBe(true);
  });

  it('flags low recovery codes at three or fewer, only while TOTP is on', () => {
    const { service } = setup();
    service.status.set(status({ recoveryCodesRemaining: 4 }));
    expect(service.lowRecoveryCodes()).toBe(false);
    service.status.set(status({ recoveryCodesRemaining: 3 }));
    expect(service.lowRecoveryCodes()).toBe(true);
    service.status.set(status({ totpEnabled: false, recoveryCodesRemaining: 0 }));
    expect(service.lowRecoveryCodes()).toBe(false);
  });

  it('starts the setup with the password only', async () => {
    const { service, httpMock } = setup();
    const promise = service.startSetup('pw');
    const req = httpMock.expectOne('/api/auth/mfa/totp/setup');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ currentPassword: 'pw' });
    req.flush({ otpauthUri: 'otpauth://x', qrDataUrl: 'data:image/png;base64,AA', secret: 'S' });
    expect((await promise).secret).toBe('S');
  });

  it('sends the current code on a device change', async () => {
    const { service, httpMock } = setup();
    const promise = service.startSetup('pw', '123456');
    const req = httpMock.expectOne('/api/auth/mfa/totp/setup');
    expect(req.request.body).toEqual({ currentPassword: 'pw', code: '123456' });
    req.flush({ otpauthUri: 'otpauth://x', qrDataUrl: 'data:', secret: 'S' });
    await promise;
  });

  it('confirms the setup and returns the recovery codes', async () => {
    const { service, httpMock } = setup();
    const promise = service.confirmSetup('654321');
    const req = httpMock.expectOne('/api/auth/mfa/totp/confirm');
    expect(req.request.body).toEqual({ code: '654321' });
    req.flush({ recoveryCodes: ['aaaaa-bbbbb'] });
    expect(await promise).toEqual(['aaaaa-bbbbb']);
  });

  it('disables with password and code', async () => {
    const { service, httpMock } = setup();
    const promise = service.disable('pw', '111111');
    const req = httpMock.expectOne('/api/auth/mfa/totp/disable');
    expect(req.request.body).toEqual({ currentPassword: 'pw', code: '111111' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await promise;
  });

  it('regenerates recovery codes', async () => {
    const { service, httpMock } = setup();
    const promise = service.regenerateRecoveryCodes('pw', '222222');
    const req = httpMock.expectOne('/api/auth/mfa/recovery-codes/regenerate');
    expect(req.request.body).toEqual({ currentPassword: 'pw', code: '222222' });
    req.flush({ recoveryCodes: ['ccccc-ddddd'] });
    expect(await promise).toEqual(['ccccc-ddddd']);
  });
});
