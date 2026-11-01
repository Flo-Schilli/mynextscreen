import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { MfaRequiredBy } from '@mynextscreen/shared-types';
import { vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { MfaEnrolmentPage } from './mfa-enrolment-page';
import { MfaEnrolmentWizardComponent } from './mfa-enrolment-wizard';
import { MfaEnrolmentStore } from './mfa-enrolment.store';
import { AuthService, type MfaEnrolmentLock } from '../auth.service';
import { MfaService } from '../mfa.service';
import { OrganisationStateService, type OrgWithRole } from '../../shell/organisation-state.service';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORGS: OrgWithRole[] = [
  { id: 'o1', name: 'Club One', timeZone: 'Europe/Berlin', role: 'Editor' },
  { id: 'o2', name: 'Hall Two', timeZone: 'Europe/Berlin', role: 'Viewer' },
];

function setup(requiredBy: MfaRequiredBy | null, orgs: OrgWithRole[] = []) {
  const enrolment = signal<MfaEnrolmentLock | null>({ requiredBy });
  const auth = {
    mfaEnrolment: enrolment,
    logout: vi.fn(() => Promise.resolve()),
    completeEnrolment: vi.fn(() => Promise.resolve()),
  };
  const orgState = {
    organisations: signal(orgs),
    selectedOrgId: signal<string | null>('o1'),
    loadOrganisations: vi.fn(),
  };
  const router = { navigateByUrl: vi.fn(() => Promise.resolve(true)) };
  TestBed.configureTestingModule({
    imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: auth },
      { provide: MfaService, useValue: {} },
      { provide: OrganisationStateService, useValue: orgState },
      { provide: Router, useValue: router },
    ],
  });
  const fixture = TestBed.createComponent(MfaEnrolmentPage);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, auth, orgState, router };
}

const reasonText = (el: HTMLElement): string => el.querySelector('.reason')?.textContent ?? '';

describe('MfaEnrolmentPage', () => {
  it('explains the super-admin requirement without loading memberships', () => {
    const { el, orgState } = setup({ superAdmin: true, organisationIds: [] }, ORGS);
    expect(reasonText(el)).toContain('platform administrator');
    expect(orgState.loadOrganisations).not.toHaveBeenCalled();
  });

  it('names every organisation that requires MFA', () => {
    const { el } = setup({ superAdmin: false, organisationIds: ['o1', 'o2'] }, ORGS);
    expect(reasonText(el)).toContain('Club One, Hall Two');
  });

  it('combines the super-admin role and the requiring organisations', () => {
    const { el } = setup({ superAdmin: true, organisationIds: ['o2'] }, ORGS);
    expect(reasonText(el)).toContain('platform administrator');
    expect(reasonText(el)).toContain('Hall Two');
  });

  it('falls back to a count when organisation names are unknown', () => {
    const { el, orgState } = setup({ superAdmin: false, organisationIds: ['o1', 'x9'] });
    expect(reasonText(el)).toContain('2 of your organisations require');
    expect(orgState.loadOrganisations).toHaveBeenCalled();
  });

  it('shows a generic reason while requiredBy is not known', () => {
    const { el } = setup(null, ORGS);
    expect(reasonText(el)).toContain('mandatory for your account');
  });

  it('says that the requirement applies account-wide and offers no organisation switch', () => {
    const { el } = setup({ superAdmin: false, organisationIds: ['o1'] }, ORGS);
    expect(el.querySelector('.account-wide')?.textContent).toContain('whole account');
    expect(el.querySelector('.other-orgs')).toBeNull();
  });

  describe('unsaved recovery codes', () => {
    afterEach(() => vi.restoreAllMocks());

    function showCodes(fixture: ReturnType<typeof setup>['fixture']): MfaEnrolmentStore {
      const store = fixture.debugElement
        .query(By.directive(MfaEnrolmentWizardComponent))
        .injector.get(MfaEnrolmentStore);
      store.recoveryCodes.set(['aaaaa-bbbbb']);
      store.step.set('codes');
      fixture.detectChanges();
      return store;
    }

    it('lets the user leave freely before any codes are shown', () => {
      const confirm = vi.spyOn(window, 'confirm');
      const { fixture } = setup(null);
      expect(fixture.componentInstance.canDeactivate()).toBe(true);
      expect(confirm).not.toHaveBeenCalled();
    });

    it('asks before leaving while the codes are not confirmed as saved', () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { fixture } = setup(null);
      const store = showCodes(fixture);

      expect(fixture.componentInstance.canDeactivate()).toBe(false);
      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('recovery codes'));

      store.setAcknowledged(true);
      expect(fixture.componentInstance.canDeactivate()).toBe(true);
    });

    it('does not sign out when the user cancels the warning', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { fixture, el, auth } = setup(null);
      showCodes(fixture);
      const logout = Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Sign out'),
      );
      logout?.click();
      await fixture.whenStable();
      expect(auth.logout).not.toHaveBeenCalled();
    });

    it('signs out without a second prompt once the user confirmed', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { fixture, el, auth } = setup(null);
      showCodes(fixture);
      const logout = Array.from(el.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Sign out'),
      );
      logout?.click();
      await fixture.whenStable();
      expect(auth.logout).toHaveBeenCalled();
      expect(fixture.componentInstance.canDeactivate()).toBe(true);
      expect(confirm).toHaveBeenCalledTimes(1);
    });
  });

  it('signs out to the login', async () => {
    const { fixture, el, auth, router } = setup(null);
    const logout = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sign out'),
    );
    logout?.click();
    await fixture.whenStable();
    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
