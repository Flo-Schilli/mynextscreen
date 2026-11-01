import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { MfaEnrolmentPage } from './mfa-enrolment-page';
import { AuthService, type MfaEnrolmentReason } from '../auth.service';
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

function setup(reason: MfaEnrolmentReason, orgs: OrgWithRole[] = []) {
  const enrolment = signal<MfaEnrolmentReason | null>(reason);
  const auth = {
    mfaEnrolment: enrolment,
    clearEnrolment: vi.fn(() => enrolment.set(null)),
    logout: vi.fn(() => Promise.resolve()),
    completeEnrolment: vi.fn(() => Promise.resolve()),
  };
  const orgState = {
    organisations: signal(orgs),
    selectedOrgId: signal<string | null>('o1'),
    loadOrganisations: vi.fn(),
    select: vi.fn(),
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
  return { fixture, auth, orgState, router };
}

describe('MfaEnrolmentPage', () => {
  it('explains the super-admin requirement and offers no organisation switch', () => {
    const { fixture, orgState } = setup({ kind: 'super-admin' }, ORGS);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.reason')?.textContent).toContain('platform administrator');
    expect(el.querySelector('.other-orgs')).toBeNull();
    expect(orgState.loadOrganisations).not.toHaveBeenCalled();
  });

  it('names the requiring organisation and offers the others', () => {
    const { fixture } = setup({ kind: 'organisation', organisationId: 'o1' }, ORGS);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.reason')?.textContent).toContain('Club One');
    const other = el.querySelector('.other-orgs');
    expect(other?.textContent).toContain('Hall Two');
    expect(other?.textContent).not.toContain('Club One');
  });

  it('loads the memberships when the shell has not', () => {
    const { orgState } = setup({ kind: 'organisation', organisationId: 'o1' });
    expect(orgState.loadOrganisations).toHaveBeenCalled();
  });

  it('switching organisation lifts the lock and opens the app', async () => {
    const { fixture, auth, orgState, router } = setup(
      { kind: 'organisation', organisationId: 'o1' },
      ORGS,
    );
    (fixture.nativeElement.querySelector('.other-orgs button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(orgState.select).toHaveBeenCalledWith('o2');
    expect(auth.clearEnrolment).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });
});
