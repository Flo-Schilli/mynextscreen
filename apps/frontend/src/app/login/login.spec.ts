import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { TranslocoService } from '@jsverse/transloco';
import { Login } from './login';
import { AuthService } from '../auth/auth.service';
import { SetupService } from '../setup/setup.service';
import { ToastService } from '../shared/toast/toast.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface AuthStub {
  login: ReturnType<typeof vi.fn>;
  verifyMfa: ReturnType<typeof vi.fn>;
  abandonMfaChallenge: ReturnType<typeof vi.fn>;
  resendVerification: ReturnType<typeof vi.fn>;
  mfaChallengePending: WritableSignal<boolean>;
}

interface SetupOptions {
  verifyImpl?: () => Promise<unknown>;
  challengePending?: boolean;
}

function setup(
  loginImpl: () => Promise<unknown> = () => Promise.resolve('ok'),
  options: SetupOptions = {},
): {
  fixture: ComponentFixture<Login>;
  auth: AuthStub;
  navigate: ReturnType<typeof vi.fn>;
  setupService: SetupService;
  toast: ToastService;
} {
  const auth: AuthStub = {
    login: vi.fn(loginImpl),
    verifyMfa: vi.fn(options.verifyImpl ?? (() => Promise.resolve('ok'))),
    abandonMfaChallenge: vi.fn(),
    resendVerification: vi.fn(() => Promise.resolve()),
    mfaChallengePending: signal(options.challengePending ?? false),
  };
  const navigate = vi.fn(() => Promise.resolve(true));
  const routerStub = {
    navigateByUrl: navigate,
    createUrlTree: vi.fn(),
    serializeUrl: vi.fn(),
  } as unknown as Router;

  TestBed.configureTestingModule({
    // Pin English so the 'Invalid' / 'verify' error-text assertions hold.
    imports: [
      ReactiveFormsModule,
      getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
    ],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: routerStub },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: new Map<string, string>() } },
      },
    ],
  });

  const fixture = TestBed.createComponent(Login);
  return {
    fixture,
    auth,
    navigate,
    setupService: TestBed.inject(SetupService),
    toast: TestBed.inject(ToastService),
  };
}

function httpError(status: number, error: Record<string, unknown> = {}): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

/** Types into the 6-digit field the way a user (or the OS autofill) would. */
function typeCode(fixture: ComponentFixture<Login>, value: string): void {
  const input = fixture.debugElement.query(By.css('#mfa-code')).nativeElement as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function signInToMfaStep(): Promise<ReturnType<typeof setup>> {
  const ctx = setup(() => Promise.resolve('mfa-required'));
  ctx.fixture.detectChanges();
  ctx.fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'pw' });
  await ctx.fixture.componentInstance.submit();
  ctx.fixture.detectChanges();
  return ctx;
}

describe('Login', () => {
  it('renders the email/password form and title', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('input[formControlName="email"]'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('input[formControlName="password"]'))).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('myNextScreen');
  });

  it('renders English copy and switches to German live on language change', () => {
    const { fixture } = setup();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Welcome back');

    const transloco = TestBed.inject(TranslocoService);
    transloco.setActiveLang('de');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Willkommen zurück');
    expect(fixture.nativeElement.textContent).not.toContain('Welcome back');
  });

  it('does not call login when the form is invalid', async () => {
    const { fixture, auth } = setup();
    fixture.detectChanges();
    await fixture.componentInstance.submit();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('logs in and navigates to root on valid submit', async () => {
    const { fixture, auth, navigate } = setup();
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'pw' });

    await fixture.componentInstance.submit();

    expect(auth.login).toHaveBeenCalledWith('user@example.com', 'pw');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('submits (sign-in) when the form is submitted via Enter and both fields are filled', async () => {
    const { fixture, auth } = setup();
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'pw' });

    // A native type=submit button lets Enter in any field fire (ngSubmit).
    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn).not.toBeNull();

    fixture.debugElement.query(By.css('form')).triggerEventHandler('submit', new Event('submit'));
    await fixture.whenStable();

    expect(auth.login).toHaveBeenCalledWith('user@example.com', 'pw');
  });

  it('shows an error message when login fails', async () => {
    const { fixture, navigate } = setup(() => Promise.reject(new Error('bad')));
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'pw' });

    await fixture.componentInstance.submit();

    expect(fixture.componentInstance.error()).toContain('Invalid');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('flags needsVerification on a 403 and offers a resend', async () => {
    const { fixture } = setup(() => Promise.reject({ status: 403 }));
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'pw' });

    await fixture.componentInstance.submit();

    expect(fixture.componentInstance.needsVerification()).toBe(true);
    expect(fixture.componentInstance.error()).toContain('verify');
  });

  it('resendVerification calls the auth service and marks resent', async () => {
    const { fixture, auth } = setup();
    fixture.componentInstance.form.controls.email.setValue('user@example.com');

    await fixture.componentInstance.resendVerification();

    expect(auth.resendVerification).toHaveBeenCalledWith('user@example.com');
    expect(fixture.componentInstance.resent()).toBe(true);
  });

  it('reflects signupEnabled from the setup service', () => {
    const { fixture, setupService } = setup();
    setupService.signupEnabled.set(true);
    expect(fixture.componentInstance.signupEnabled()).toBe(true);
  });

  describe('second factor', () => {
    it('switches to the code step when the password step asks for MFA', async () => {
      const { fixture, navigate } = await signInToMfaStep();

      expect(fixture.componentInstance.step()).toBe('mfa');
      expect(navigate).not.toHaveBeenCalled();
      const input = fixture.debugElement.query(By.css('#mfa-code'))
        .nativeElement as HTMLInputElement;
      expect(input.getAttribute('autocomplete')).toBe('one-time-code');
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(input.getAttribute('maxlength')).toBe('6');
      expect(fixture.debugElement.query(By.css('input[formControlName="password"]'))).toBeNull();
    });

    it('starts at the code step when a challenge is already pending', () => {
      const { fixture } = setup(undefined, { challengePending: true });
      fixture.detectChanges();
      expect(fixture.componentInstance.step()).toBe('mfa');
    });

    it('auto-submits once six digits are entered and navigates home', async () => {
      const { fixture, auth, navigate } = await signInToMfaStep();

      typeCode(fixture, '12345');
      expect(auth.verifyMfa).not.toHaveBeenCalled();
      typeCode(fixture, '12 34 56');
      await fixture.whenStable();

      expect(auth.verifyMfa).toHaveBeenCalledWith({ code: '123456' });
      expect(navigate).toHaveBeenCalledWith('/');
    });

    it('goes to the enrolment wizard when the session still needs enrolment', async () => {
      const { fixture, navigate } = setup(() => Promise.resolve('enrolment-required'));
      fixture.detectChanges();
      fixture.componentInstance.form.setValue({ email: 'admin@example.com', password: 'pw' });
      await fixture.componentInstance.submit();
      expect(navigate).toHaveBeenCalledWith('/mfa-enrolment');
    });

    it('shows an inline error and stays on the code step for a wrong code', async () => {
      const ctx = await signInToMfaStep();
      ctx.auth.verifyMfa.mockRejectedValueOnce(httpError(401, { code: 'MFA_INVALID_CODE' }));
      ctx.fixture.componentInstance.onCodeChange('000000');

      await ctx.fixture.componentInstance.submitCode();

      expect(ctx.fixture.componentInstance.step()).toBe('mfa');
      expect(ctx.fixture.componentInstance.codeError()).toContain('not valid');
      expect(ctx.navigate).not.toHaveBeenCalled();
    });

    it('does not read the message text: a 401 without a code is a generic failure', async () => {
      const ctx = await signInToMfaStep();
      ctx.auth.verifyMfa.mockRejectedValueOnce(
        httpError(401, { message: 'MFA challenge expired — sign in again' }),
      );
      ctx.fixture.componentInstance.onCodeChange('123456');

      await ctx.fixture.componentInstance.submitCode();

      expect(ctx.fixture.componentInstance.step()).toBe('mfa');
      expect(ctx.fixture.componentInstance.codeError()).toBeNull();
      expect(ctx.toast.toasts().at(-1)?.message).toContain('Verification failed');
    });

    it('returns to the password step with a toast when the challenge expired', async () => {
      const ctx = await signInToMfaStep();
      ctx.auth.verifyMfa.mockRejectedValueOnce(httpError(401, { code: 'MFA_CHALLENGE_EXPIRED' }));
      ctx.fixture.componentInstance.onCodeChange('123456');

      await ctx.fixture.componentInstance.submitCode();

      expect(ctx.fixture.componentInstance.step()).toBe('password');
      expect(ctx.auth.abandonMfaChallenge).toHaveBeenCalled();
      expect(ctx.fixture.componentInstance.form.controls.password.value).toBe('');
      expect(ctx.toast.toasts().at(-1)).toMatchObject({ type: 'error' });
      expect(ctx.toast.toasts().at(-1)?.message).toContain('timed out');
    });

    it('toasts a lockout on 429 MFA_LOCKED_OUT', async () => {
      const ctx = await signInToMfaStep();
      ctx.auth.verifyMfa.mockRejectedValueOnce(httpError(429, { code: 'MFA_LOCKED_OUT' }));
      ctx.fixture.componentInstance.onCodeChange('123456');

      await ctx.fixture.componentInstance.submitCode();

      expect(ctx.toast.toasts().at(-1)?.message).toContain('Too many failed attempts');
    });

    it('toasts a lockout already at the password step', async () => {
      const { fixture, toast } = setup(() =>
        Promise.reject(httpError(429, { code: 'MFA_LOCKED_OUT' })),
      );
      fixture.detectChanges();
      fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'pw' });
      await fixture.componentInstance.submit();
      expect(toast.toasts().at(-1)?.message).toContain('Too many failed attempts');
      expect(fixture.componentInstance.error()).toBeNull();
    });

    it('switches to recovery-code input and submits the recovery code', async () => {
      const { fixture, auth, navigate } = await signInToMfaStep();

      fixture.debugElement.query(By.css('.use-recovery')).nativeElement.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.mfaMethod()).toBe('recovery');
      const input = fixture.debugElement.query(By.css('#recovery-code'))
        .nativeElement as HTMLInputElement;
      input.value = ' abcde-fgh23 ';
      input.dispatchEvent(new Event('input'));

      await fixture.componentInstance.submitRecoveryCode();

      expect(auth.verifyMfa).toHaveBeenCalledWith({ recoveryCode: 'abcde-fgh23' });
      expect(navigate).toHaveBeenCalledWith('/');
    });

    it('goes back to the password step on request', async () => {
      const { fixture, auth } = await signInToMfaStep();
      fixture.debugElement.query(By.css('.back-to-password')).nativeElement.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.step()).toBe('password');
      expect(auth.abandonMfaChallenge).toHaveBeenCalled();
    });
  });
});
