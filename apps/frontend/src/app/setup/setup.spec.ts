import { TestBed, getTestBed, type ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { Setup } from './setup';
import { SetupService } from './setup.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function configure(createFirstAdmin = vi.fn(() => Promise.resolve())): {
  fixture: ComponentFixture<Setup>;
  component: Setup;
  createFirstAdmin: ReturnType<typeof vi.fn>;
  navigateByUrl: ReturnType<typeof vi.fn>;
} {
  const navigateByUrl = vi.fn(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    imports: [Setup, getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
    providers: [
      provideZonelessChangeDetection(),
      { provide: SetupService, useValue: { createFirstAdmin, setupNeeded: () => true } },
      { provide: Router, useValue: { navigateByUrl } },
    ],
  });
  const fixture = TestBed.createComponent(Setup);
  return { fixture, component: fixture.componentInstance, createFirstAdmin, navigateByUrl };
}

describe('Setup', () => {
  it('does not submit while the form is invalid (e.g. password too short)', async () => {
    const { component, createFirstAdmin } = configure();
    component.form.setValue({
      name: '',
      email: 'admin@example.com',
      password: 'short',
      confirmPassword: 'short',
    });

    await component.submit();

    expect(createFirstAdmin).not.toHaveBeenCalled();
  });

  it('flags mismatched passwords and blocks submit', async () => {
    const { component, createFirstAdmin } = configure();
    component.form.setValue({
      name: '',
      email: 'admin@example.com',
      password: 'supersecret',
      confirmPassword: 'different1',
    });

    expect(component.form.hasError('mismatch')).toBe(true);
    await component.submit();
    expect(createFirstAdmin).not.toHaveBeenCalled();
  });

  it('creates the admin and navigates to the dashboard on success', async () => {
    const { component, createFirstAdmin, navigateByUrl } = configure();
    component.form.setValue({
      name: 'Boss',
      email: 'admin@example.com',
      password: 'supersecret',
      confirmPassword: 'supersecret',
    });

    await component.submit();

    expect(createFirstAdmin).toHaveBeenCalledWith('admin@example.com', 'supersecret', 'Boss');
    expect(navigateByUrl).toHaveBeenCalledWith('/');
    expect(component.error()).toBeNull();
  });

  it('omits the name when left blank', async () => {
    const { component, createFirstAdmin } = configure();
    component.form.setValue({
      name: '',
      email: 'admin@example.com',
      password: 'supersecret',
      confirmPassword: 'supersecret',
    });

    await component.submit();

    expect(createFirstAdmin).toHaveBeenCalledWith('admin@example.com', 'supersecret', undefined);
  });

  it('surfaces an error message when setup fails', async () => {
    const failing = vi.fn(() => Promise.reject(new Error('conflict')));
    const { component, navigateByUrl } = configure(failing);
    component.form.setValue({
      name: '',
      email: 'admin@example.com',
      password: 'supersecret',
      confirmPassword: 'supersecret',
    });

    await component.submit();

    expect(component.error()).not.toBeNull();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
