import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import type { MfaRequiredBy, MfaStatusResponse } from '@mynextscreen/shared-types';
import { vi } from 'vitest';
import { mfaEnrolmentGuard } from './mfa-enrolment.guard';
import { AuthService, type MfaEnrolmentLock } from './auth.service';
import { MfaService } from './mfa.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const URL_TREE = {} as UrlTree;
const SUPER_ADMIN: MfaRequiredBy = { superAdmin: true, organisationIds: [] };
const ORGS: MfaRequiredBy = { superAdmin: false, organisationIds: ['o1', 'o2'] };
const NONE: MfaRequiredBy = { superAdmin: false, organisationIds: [] };

function status(requiredBy: MfaRequiredBy, totpEnabled = false): MfaStatusResponse {
  return { totpEnabled, enabledAt: null, recoveryCodesRemaining: 0, requiredBy };
}

function configure(opts: {
  authenticated?: boolean;
  enrolment?: MfaEnrolmentLock | null;
  status?: MfaStatusResponse | Error;
}) {
  const authed = opts.authenticated ?? true;
  const enrolment = signal<MfaEnrolmentLock | null>(opts.enrolment ?? null);
  const auth = {
    isAuthenticated: () => authed,
    loadCurrent: vi.fn(() => Promise.resolve()),
    mfaEnrolment: enrolment,
    requireEnrolment: vi.fn((requiredBy: MfaRequiredBy | null) => enrolment.set({ requiredBy })),
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
      { provide: Router, useValue: { createUrlTree } },
    ],
  });
  return { auth, loadStatus, createUrlTree };
}

function run(): Promise<boolean | UrlTree> {
  return TestBed.runInInjectionContext(() =>
    mfaEnrolmentGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as Promise<boolean | UrlTree>;
}

describe('mfaEnrolmentGuard', () => {
  it('allows the wizard without a status call while the lock knows its reason', async () => {
    const { loadStatus } = configure({ enrolment: { requiredBy: ORGS } });
    expect(await run()).toBe(true);
    expect(loadStatus).not.toHaveBeenCalled();
  });

  it('sends unauthenticated visitors to the login', async () => {
    const { createUrlTree } = configure({ authenticated: false });
    expect(await run()).toBe(URL_TREE);
    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('fills in the reason of a lock set by /api/auth/me or a login', async () => {
    const { auth } = configure({ enrolment: { requiredBy: null }, status: status(ORGS) });
    expect(await run()).toBe(true);
    expect(auth.requireEnrolment).toHaveBeenCalledWith(ORGS);
    expect(auth.mfaEnrolment()).toEqual({ requiredBy: ORGS });
  });

  it('keeps a lock without reason when the status cannot be loaded', async () => {
    const { auth } = configure({ enrolment: { requiredBy: null }, status: new Error('boom') });
    expect(await run()).toBe(true);
    expect(auth.mfaEnrolment()).toEqual({ requiredBy: null });
  });

  it('locks a session that was never locked in memory when the status requires MFA', async () => {
    const { auth } = configure({ status: status(SUPER_ADMIN) });
    expect(await run()).toBe(true);
    expect(auth.requireEnrolment).toHaveBeenCalledWith(SUPER_ADMIN);
  });

  it('redirects home when enrolment is not required', async () => {
    const { createUrlTree, auth } = configure({ status: status(NONE) });
    expect(await run()).toBe(URL_TREE);
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
    expect(auth.requireEnrolment).not.toHaveBeenCalled();
  });

  it('redirects home when TOTP is already active', async () => {
    const { createUrlTree } = configure({ status: status(SUPER_ADMIN, true) });
    expect(await run()).toBe(URL_TREE);
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
  });

  it('redirects home when the status cannot be loaded and nothing is locked', async () => {
    const { createUrlTree } = configure({ status: new Error('boom') });
    expect(await run()).toBe(URL_TREE);
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
