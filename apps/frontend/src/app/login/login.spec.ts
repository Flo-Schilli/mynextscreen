import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { TranslocoService } from '@jsverse/transloco';
import { Login } from './login';
import { AuthService } from '../auth/auth.service';
import { SetupService } from '../setup/setup.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface AuthStub {
  login: ReturnType<typeof vi.fn>;
  resendVerification: ReturnType<typeof vi.fn>;
}

function setup(loginImpl: () => Promise<void> = () => Promise.resolve()): {
  fixture: ComponentFixture<Login>;
  auth: AuthStub;
  navigate: ReturnType<typeof vi.fn>;
  setupService: SetupService;
} {
  const auth: AuthStub = {
    login: vi.fn(loginImpl),
    resendVerification: vi.fn(() => Promise.resolve()),
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
  return { fixture, auth, navigate, setupService: TestBed.inject(SetupService) };
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
});
