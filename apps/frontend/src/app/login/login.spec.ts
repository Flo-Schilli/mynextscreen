import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { Login } from './login';
import { AuthService } from '../auth/auth.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface AuthStub {
  login: ReturnType<typeof vi.fn>;
}

function setup(loginImpl: () => Promise<void> = () => Promise.resolve()): {
  fixture: ComponentFixture<Login>;
  auth: AuthStub;
  navigate: ReturnType<typeof vi.fn>;
} {
  const auth: AuthStub = { login: vi.fn(loginImpl) };
  const navigate = vi.fn(() => Promise.resolve(true));
  const routerStub = { navigateByUrl: navigate } as unknown as Router;

  TestBed.configureTestingModule({
    imports: [ReactiveFormsModule],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: routerStub },
    ],
  });

  const fixture = TestBed.createComponent(Login);
  return { fixture, auth, navigate };
}

describe('Login', () => {
  it('renders the email/password form and title', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('input[formControlName="email"]'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('input[formControlName="password"]'))).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Signage Server');
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

  it('shows an error message when login fails', async () => {
    const { fixture, navigate } = setup(() => Promise.reject(new Error('bad')));
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({ email: 'user@example.com', password: 'pw' });

    await fixture.componentInstance.submit();

    expect(fixture.componentInstance.error()).toContain('Invalid');
    expect(navigate).not.toHaveBeenCalled();
  });
});
