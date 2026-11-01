import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import type { MfaStatusResponse } from '@mynextscreen/shared-types';
import { vi } from 'vitest';
import { mfaEnrolmentGuard } from './mfa-enrolment.guard';
import { AuthService, type MfaEnrolmentReason } from './auth.service';
import { MfaService } from './mfa.service';
import { OrganisationStateService } from '../shell/organisation-state.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const URL_TREE = {} as UrlTree;

function status(
  requiredBy: MfaStatusResponse['requiredBy'],
  totpEnabled = false,
): MfaStatusResponse {
  return { totpEnabled, enabledAt: null, recoveryCodesRemaining: 0, requiredBy };
}

function configure(opts: {
  authenticated?: boolean;
  enrolment?: MfaEnrolmentReason | null;
  status?: MfaStatusResponse | Error;
  selectedOrgId?: string | null;
}) {
  let authed = opts.authenticated ?? true;
  const enrolment = signal<MfaEnrolmentReason | null>(opts.enrolment ?? null);
  const auth = {
    isAuthenticated: () => authed,
    loadCurrent: vi.fn(() => Promise.resolve()),
    mfaEnrolment: enrolment,
    requireEnrolment: vi.fn((reason: MfaEnrolmentReason) => enrolment.set(reason)),
  };
  const loadStatus = vi.fn(() =>
    opts.status instanceof Error ? Promise.reject(opts.status) : Promise.resolve(opts.status),
  );
  const createUrlTree = vi.fn(() => URL_TREE);
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: auth },
      { provide: MfaService, useValue: { loadStatus } },
      {
        provide: OrganisationStateService,
        useValue: { selectedOrgId: () => opts.selectedOrgId ?? null },
      },
      { provide: Router, useValue: { createUrlTree } },
    ],
  });
  return { auth, loadStatus, createUrlTree, setAuthed: (v: boolean) => (authed = v) };
}

function run(): Promise<boolean | UrlTree> {
  return TestBed.runInInjectionContext(() =>
    mfaEnrolmentGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as Promise<boolean | UrlTree>;
}

describe('mfaEnrolmentGuard', () => {
  it('allows the wizard while the enrolment lock is set', async () => {
    const { loadStatus } = configure({ enrolment: { kind: 'super-admin' } });
    expect(await run()).toBe(true);
    expect(loadStatus).not.toHaveBeenCalled();
  });

  it('sends unauthenticated visitors to the login', async () => {
    const { createUrlTree } = configure({ authenticated: false });
    expect(await run()).toBe(URL_TREE);
    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('rebuilds the super-admin lock from the status after a reload', async () => {
    const { auth } = configure({ status: status({ superAdmin: true, organisationIds: [] }) });
    expect(await run()).toBe(true);
    expect(auth.requireEnrolment).toHaveBeenCalledWith({ kind: 'super-admin' });
  });

  it('prefers the selected organisation among the requiring ones', async () => {
    const { auth } = configure({
      status: status({ superAdmin: false, organisationIds: ['o1', 'o2'] }),
      selectedOrgId: 'o2',
    });
    expect(await run()).toBe(true);
    expect(auth.requireEnrolment).toHaveBeenCalledWith({
      kind: 'organisation',
      organisationId: 'o2',
    });
  });

  it('redirects home when enrolment is not required', async () => {
    const { createUrlTree, auth } = configure({
      status: status({ superAdmin: false, organisationIds: [] }),
    });
    expect(await run()).toBe(URL_TREE);
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
    expect(auth.requireEnrolment).not.toHaveBeenCalled();
  });

  it('redirects home when TOTP is already active', async () => {
    const { createUrlTree } = configure({
      status: status({ superAdmin: true, organisationIds: [] }, true),
    });
    expect(await run()).toBe(URL_TREE);
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('redirects home when the status cannot be loaded', async () => {
    const { createUrlTree } = configure({ status: new Error('boom') });
    expect(await run()).toBe(URL_TREE);
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
