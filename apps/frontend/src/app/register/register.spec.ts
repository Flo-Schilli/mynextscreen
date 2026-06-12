import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Register } from './register';
import { AuthService } from '../auth/auth.service';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface AuthStub {
  register: ReturnType<typeof vi.fn>;
}

function setup(registerImpl: () => Promise<void> = () => Promise.resolve()): {
  fixture: ComponentFixture<Register>;
  auth: AuthStub;
} {
  const auth: AuthStub = { register: vi.fn(registerImpl) };
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AuthService, useValue: auth },
    ],
  });
  const fixture = TestBed.createComponent(Register);
  return { fixture, auth };
}

function fillValid(fixture: ComponentFixture<Register>): void {
  fixture.componentInstance.form.setValue({
    email: 'new@example.com',
    organisationName: 'Acme',
    password: 'supersecret',
    confirmPassword: 'supersecret',
  });
}

describe('Register', () => {
  it('does not call register when the form is invalid', async () => {
    const { fixture, auth } = setup();
    fixture.detectChanges();
    await fixture.componentInstance.submit();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('does not submit when passwords do not match', async () => {
    const { fixture, auth } = setup();
    fixture.componentInstance.form.setValue({
      email: 'new@example.com',
      organisationName: 'Acme',
      password: 'supersecret',
      confirmPassword: 'different1',
    });
    await fixture.componentInstance.submit();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('registers and switches to the done state on success', async () => {
    const { fixture, auth } = setup();
    fillValid(fixture);

    await fixture.componentInstance.submit();

    expect(auth.register).toHaveBeenCalledWith('new@example.com', 'supersecret', 'Acme');
    expect(fixture.componentInstance.done()).toBe(true);
  });

  it('shows a conflict message on 409', async () => {
    const { fixture } = setup(() => Promise.reject({ status: 409 }));
    fillValid(fixture);

    await fixture.componentInstance.submit();

    expect(fixture.componentInstance.done()).toBe(false);
    expect(fixture.componentInstance.error()).toContain('already taken');
  });
});
