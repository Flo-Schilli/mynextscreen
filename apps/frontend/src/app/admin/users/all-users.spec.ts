import { TestBed, ComponentFixture, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AllUsers } from './all-users';
import { AdminUserService } from './admin-user.service';
import { AdminUser } from './admin-user.model';
import { AuthService } from '../../auth/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

const SELF_ID = 'self-1';

function user(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u-1',
    email: 'user@example.com',
    name: 'User One',
    emailVerified: true,
    isSuperAdmin: false,
    mfaEnabled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    memberships: [],
    ...overrides,
  };
}

describe('AllUsers — MFA', () => {
  let fixture: ComponentFixture<AllUsers>;
  let component: AllUsers;
  let service: {
    getAll: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    resetMfa: ReturnType<typeof vi.fn>;
  };

  function setup(users: AdminUser[]): void {
    service = {
      getAll: vi.fn().mockReturnValue(of(users)),
      delete: vi.fn().mockReturnValue(of(undefined)),
      resetMfa: vi.fn().mockReturnValue(of(undefined)),
    };
    TestBed.configureTestingModule({
      imports: [AllUsers, getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AdminUserService, useValue: service },
        { provide: AuthService, useValue: { user: signal({ userId: SELF_ID }) } },
      ],
    });
    fixture = TestBed.createComponent(AllUsers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows the MFA badge per user with MFA and the reset action except for oneself', () => {
    setup([user(), user({ id: 'u-2', mfaEnabled: true }), user({ id: SELF_ID, mfaEnabled: true })]);

    // Desktop table + mobile cards render both, so every count is doubled.
    expect(fixture.debugElement.queryAll(By.css('.mfa-badge'))).toHaveLength(4);
    expect(fixture.debugElement.queryAll(By.css('.reset-mfa'))).toHaveLength(2);
    expect(component.canResetMfa(user({ id: SELF_ID, mfaEnabled: true }))).toBe(false);
  });

  it('resets after confirmation and clears the badge', () => {
    const target = user({ id: 'u-2', mfaEnabled: true });
    setup([target]);
    const toast = TestBed.inject(ToastService);

    component.confirmResetMfa(target);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('app-mfa-reset-confirm-modal'))).toBeTruthy();
    component.executeResetMfa();

    expect(service.resetMfa).toHaveBeenCalledWith('u-2');
    expect(component.users[0].mfaEnabled).toBe(false);
    expect(component.mfaResetUser()).toBeNull();
    expect(toast.toasts().at(-1)?.type).toBe('success');
  });

  it('maps a refusal code to its own toast', () => {
    const target = user({ id: 'u-2', mfaEnabled: true });
    setup([target]);
    const toast = TestBed.inject(ToastService);
    service.resetMfa.mockReturnValue(
      throwError(() => ({ status: 409, error: { code: 'MFA_NOT_ENABLED' } })),
    );

    component.confirmResetMfa(target);
    component.executeResetMfa();

    expect(toast.toasts().at(-1)).toMatchObject({
      type: 'error',
      message: 'This user has no MFA set up.',
    });
  });
});
