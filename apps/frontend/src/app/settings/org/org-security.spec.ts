import { TestBed, ComponentFixture, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import type { OrgMfaRequirementView } from '@mynextscreen/shared-types';
import { of, throwError } from 'rxjs';
import { OrgSecurity } from './org-security';
import { OrgSecurityStore } from './org-security.store';
import { OrgMfaService } from './org-mfa.service';
import { AuthService } from '../../auth/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { OrganisationStateService } from '../../shell/organisation-state.service';
import { organisationStateStub, orgWithRole } from '../../shell/organisation-state.testing';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const ORG_ID = 'org-1';
const OFF: OrgMfaRequirementView = { requireMfa: false, requireMfaSince: null };
const ON: OrgMfaRequirementView = { requireMfa: true, requireMfaSince: '2026-11-01T10:00:00.000Z' };

describe('OrgSecurity', () => {
  let fixture: ComponentFixture<OrgSecurity>;
  let store: OrgSecurityStore;
  let api: { getRequirement: ReturnType<typeof vi.fn>; setRequirement: ReturnType<typeof vi.fn> };

  function setup(opts: {
    sessionMfa: boolean;
    current?: OrgMfaRequirementView;
    role?: 'org_admin' | 'editor';
  }): void {
    api = {
      getRequirement: vi.fn().mockReturnValue(of(opts.current ?? OFF)),
      setRequirement: vi.fn().mockReturnValue(of(ON)),
    };
    TestBed.configureTestingModule({
      imports: [OrgSecurity, getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: OrgMfaService, useValue: api },
        { provide: AuthService, useValue: { sessionMfa: signal(opts.sessionMfa) } },
        {
          provide: OrganisationStateService,
          useValue: organisationStateStub(orgWithRole(ORG_ID, opts.role ?? 'org_admin')),
        },
      ],
    });
    fixture = TestBed.createComponent(OrgSecurity);
    store = fixture.debugElement.injector.get(OrgSecurityStore);
    fixture.detectChanges();
  }

  function switchButton(): HTMLButtonElement {
    return fixture.debugElement.query(By.css('button[role="switch"]')).nativeElement;
  }

  it('disables the switch with a hint while the admin has no MFA session', () => {
    setup({ sessionMfa: false });

    expect(api.getRequirement).toHaveBeenCalledWith(ORG_ID);
    expect(switchButton().disabled).toBe(true);
    expect(fixture.debugElement.query(By.css('.own-mfa-hint'))).toBeTruthy();
  });

  it('still lets an admin without MFA switch an active requirement off', () => {
    setup({ sessionMfa: false, current: ON });
    api.setRequirement.mockReturnValue(of(OFF));

    expect(switchButton().disabled).toBe(false);
    switchButton().click();

    expect(api.setRequirement).toHaveBeenCalledWith(ORG_ID, false);
    expect(store.requirement()).toEqual(OFF);
  });

  it('asks for confirmation before switching it on, then saves and shows since', () => {
    setup({ sessionMfa: true });
    expect(fixture.debugElement.query(By.css('.own-mfa-hint'))).toBeNull();

    switchButton().click();
    fixture.detectChanges();
    expect(store.confirmOpen()).toBe(true);
    expect(api.setRequirement).not.toHaveBeenCalled();

    store.confirmEnable();
    fixture.detectChanges();

    expect(api.setRequirement).toHaveBeenCalledWith(ORG_ID, true);
    expect(store.switchOn()).toBe(true);
    expect(fixture.debugElement.query(By.css('.since'))).toBeTruthy();
    expect(TestBed.inject(ToastService).toasts().at(-1)?.type).toBe('success');
  });

  it('cancelling the confirmation flips the switch back off', () => {
    setup({ sessionMfa: true });

    switchButton().click();
    store.cancelEnable();

    expect(store.switchOn()).toBe(false);
    expect(api.setRequirement).not.toHaveBeenCalled();
  });

  it('maps MFA_SELF_REQUIRED to an explanatory toast and keeps the switch off', () => {
    setup({ sessionMfa: true });
    api.setRequirement.mockReturnValue(
      throwError(() => ({ status: 403, error: { code: 'MFA_SELF_REQUIRED' } })),
    );

    store.toggle(true);
    store.confirmEnable();

    expect(store.switchOn()).toBe(false);
    expect(TestBed.inject(ToastService).toasts().at(-1)).toMatchObject({
      type: 'error',
      message: 'Sign in with MFA yourself before requiring it for everyone.',
    });
  });

  it('refuses non-admins without loading', () => {
    setup({ sessionMfa: true, role: 'editor' });

    expect(api.getRequirement).not.toHaveBeenCalled();
    expect(store.loadError()).toBe('You are not an Org Admin of this organisation.');
  });
});
