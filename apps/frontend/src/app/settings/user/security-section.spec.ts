import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import type { MfaStatusResponse } from '@mynextscreen/shared-types';
import { SecuritySectionComponent } from './security-section';
import { SecuritySettingsStore } from './security-settings.store';
import { AuthService } from '../../auth/auth.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { ToastService } from '../../shared/toast/toast.service';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';

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

async function setup(initial: MfaStatusResponse) {
  TestBed.configureTestingModule({
    imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: { completeEnrolment: () => Promise.resolve() } },
      {
        provide: OrganisationStateService,
        useValue: {
          organisations: signal([{ id: 'o1', name: 'Club One', timeZone: 'UTC', role: 'Editor' }]),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(SecuritySectionComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  (await nextRequest(httpMock, '/api/auth/mfa/status')).flush(initial);
  await settle(fixture);
  const store = fixture.debugElement.injector.get(SecuritySettingsStore);
  return { fixture, httpMock, store, toast: TestBed.inject(ToastService) };
}

/** The store fires follow-up requests after a few awaits; wait for them to appear. */
function nextRequest(httpMock: HttpTestingController, url: string) {
  return vi.waitFor(() => httpMock.expectOne(url));
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

function el(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function typeInto(fixture: ComponentFixture<unknown>, selector: string, value: string): void {
  const input = (document.querySelector(selector) ??
    fixture.debugElement.query(By.css(selector))?.nativeElement) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

describe('SecuritySectionComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController, null, { optional: true })?.verify();
  });

  it('offers set-up while MFA is off', async () => {
    const { fixture } = await setup(status({ totpEnabled: false, enabledAt: null }));
    expect(el(fixture).querySelector('.enable')).not.toBeNull();
    expect(el(fixture).querySelector('.disable')).toBeNull();
    expect(el(fixture).textContent).toContain('Two-factor authentication off');
  });

  it('offers disable, device change and regeneration while MFA is optional', async () => {
    const { fixture } = await setup(status());
    expect(el(fixture).querySelector('.disable')).not.toBeNull();
    expect(el(fixture).querySelector('.change-device')).not.toBeNull();
    expect(el(fixture).querySelector('.regenerate')).not.toBeNull();
    expect(el(fixture).querySelector('.required-note')).toBeNull();
  });

  it('hides disable with an explanation for a super-admin', async () => {
    const { fixture } = await setup(
      status({ requiredBy: { superAdmin: true, organisationIds: [] } }),
    );
    expect(el(fixture).querySelector('.disable')).toBeNull();
    expect(el(fixture).querySelector('.required-note')?.textContent).toContain(
      'platform administrators',
    );
  });

  it('hides disable and names the organisations that require MFA', async () => {
    const { fixture } = await setup(
      status({ requiredBy: { superAdmin: false, organisationIds: ['o1'] } }),
    );
    expect(el(fixture).querySelector('.disable')).toBeNull();
    expect(el(fixture).querySelector('.required-note')?.textContent).toContain('Club One');
    expect(el(fixture).querySelector('.account-wide-note')?.textContent).toContain('whole account');
  });

  it('names the super-admin role and the organisations together', async () => {
    const { fixture } = await setup(
      status({ requiredBy: { superAdmin: true, organisationIds: ['o1'] } }),
    );
    const note = el(fixture).querySelector('.required-note')?.textContent ?? '';
    expect(note).toContain('platform administrators');
    expect(note).toContain('Club One');
  });

  it('falls back to a count for organisations it cannot resolve', async () => {
    const { fixture } = await setup(
      status({ requiredBy: { superAdmin: false, organisationIds: ['o1', 'unknown'] } }),
    );
    expect(el(fixture).querySelector('.required-note')?.textContent).toContain(
      '2 of your organisations require',
    );
  });

  it('offers set-up without a required note while MFA is optional', async () => {
    const { fixture } = await setup(
      status({ totpEnabled: false, enabledAt: null, recoveryCodesRemaining: 0 }),
    );
    expect(el(fixture).querySelector('.enable')).not.toBeNull();
    expect(el(fixture).querySelector('.required-note')).toBeNull();
    expect(el(fixture).querySelector('.account-wide-note')).toBeNull();
  });

  it('shows separate inline errors for a wrong password and a wrong code', async () => {
    const { fixture, httpMock, store } = await setup(status());
    store.open('disable');
    fixture.detectChanges();

    let promise = store.disable('nope', '123456');
    httpMock
      .expectOne('/api/auth/mfa/totp/disable')
      .flush({ code: 'MFA_INVALID_PASSWORD' }, { status: 401, statusText: 'Unauthorized' });
    await promise;
    expect(store.fieldError()).toContain('password is not correct');

    promise = store.disable('pw', '000000');
    httpMock
      .expectOne('/api/auth/mfa/totp/disable')
      .flush({ code: 'MFA_INVALID_CODE' }, { status: 401, statusText: 'Unauthorized' });
    await promise;
    expect(store.fieldError()).toContain('code is not valid');
    expect(store.dialog()).toBe('disable');
  });

  it('warns when three or fewer recovery codes remain', async () => {
    const { fixture } = await setup(status({ recoveryCodesRemaining: 3 }));
    expect(el(fixture).querySelector('.low-codes-warning')).not.toBeNull();
    expect(el(fixture).querySelector('.recovery-remaining')?.textContent).toContain(
      '3 recovery codes left',
    );
  });

  it('does not warn with enough recovery codes', async () => {
    const { fixture } = await setup(status({ recoveryCodesRemaining: 4 }));
    expect(el(fixture).querySelector('.low-codes-warning')).toBeNull();
  });

  it('handles 409 MFA_DISABLE_FORBIDDEN with a toast and a fresh status', async () => {
    const { fixture, httpMock, store, toast } = await setup(status());
    store.open('disable');
    fixture.detectChanges();

    const promise = store.disable('pw', '123456');
    httpMock
      .expectOne('/api/auth/mfa/totp/disable')
      .flush(
        { code: 'MFA_DISABLE_FORBIDDEN', message: 'mandatory' },
        { status: 409, statusText: 'Conflict' },
      );
    (await nextRequest(httpMock, '/api/auth/mfa/status')).flush(
      status({ requiredBy: { superAdmin: false, organisationIds: ['o1'] } }),
    );
    await promise;
    await settle(fixture);

    expect(store.dialog()).toBeNull();
    expect(toast.toasts().at(-1)).toMatchObject({ type: 'error' });
    expect(toast.toasts().at(-1)?.message).toContain('mandatory');
    expect(el(fixture).querySelector('.disable')).toBeNull();
  });

  it('disables MFA with password and code', async () => {
    const { fixture, httpMock, store, toast } = await setup(status());
    (el(fixture).querySelector('.disable button') as HTMLButtonElement).click();
    await settle(fixture);
    typeInto(fixture, 'input[type="password"]', 'pw');
    typeInto(fixture, '#mfa-disable-code', '123456');
    (document.querySelector('.confirm-disable button') as HTMLButtonElement).click();

    const req = await nextRequest(httpMock, '/api/auth/mfa/totp/disable');
    expect(req.request.body).toEqual({ currentPassword: 'pw', code: '123456' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    (await nextRequest(httpMock, '/api/auth/mfa/status')).flush(
      status({ totpEnabled: false, enabledAt: null, recoveryCodesRemaining: 0 }),
    );
    await settle(fixture);

    expect(store.dialog()).toBeNull();
    expect(toast.toasts().at(-1)).toMatchObject({ type: 'success' });
  });

  it('keeps regenerated codes open until they are confirmed as saved', async () => {
    const { fixture, httpMock, store, toast } = await setup(status({ recoveryCodesRemaining: 1 }));
    store.open('regenerate');
    fixture.detectChanges();

    const promise = store.regenerate('123456');
    httpMock
      .expectOne('/api/auth/mfa/recovery-codes/regenerate')
      .flush({ recoveryCodes: ['aaaaa-bbbbb'] });
    (await nextRequest(httpMock, '/api/auth/mfa/status')).flush(status());
    await promise;
    await settle(fixture);

    expect(store.regeneratedCodes()).toEqual(['aaaaa-bbbbb']);
    expect(store.close()).toBe(false);
    expect(store.dialog()).toBe('regenerate');
    expect(toast.toasts().at(-1)?.type).toBe('info');

    store.setCodesAcknowledged(true);
    expect(store.close()).toBe(true);
    expect(store.dialog()).toBeNull();
    expect(store.regeneratedCodes()).toEqual([]);
  });

  it('blocks closing the wizard dialog while its codes are unsaved', async () => {
    const { store } = await setup(status());
    store.open('device');
    expect(store.close(false)).toBe(false);
    expect(store.dialog()).toBe('device');
    expect(store.close(true)).toBe(true);
  });
});
