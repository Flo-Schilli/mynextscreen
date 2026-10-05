import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { vi } from 'vitest';
import { VerifyEmail } from './verify-email';
import { AuthService } from './auth.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface AuthStub {
  verifyEmail: ReturnType<typeof vi.fn>;
  resendVerification: ReturnType<typeof vi.fn>;
}

function setup(
  token: string | null,
  verifyImpl: () => Promise<void> = () => Promise.resolve(),
): {
  fixture: ComponentFixture<VerifyEmail>;
  auth: AuthStub;
  navigate: ReturnType<typeof vi.fn>;
} {
  const auth: AuthStub = {
    verifyEmail: vi.fn(verifyImpl),
    resendVerification: vi.fn(() => Promise.resolve()),
  };
  const navigate = vi.fn(() => Promise.resolve(true));
  const route = { snapshot: { queryParamMap: { get: () => token } } };

  TestBed.configureTestingModule({
    imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: { navigateByUrl: navigate } },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  return { fixture: TestBed.createComponent(VerifyEmail), auth, navigate };
}

describe('VerifyEmail', () => {
  it('verifies a present token and navigates to the dashboard', async () => {
    const { fixture, auth, navigate } = setup('vtok');
    await fixture.componentInstance.ngOnInit();
    expect(auth.verifyEmail).toHaveBeenCalledWith('vtok');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows the error state when no token is present', async () => {
    const { fixture, auth } = setup(null);
    await fixture.componentInstance.ngOnInit();
    expect(auth.verifyEmail).not.toHaveBeenCalled();
    expect(fixture.componentInstance.state()).toBe('error');
  });

  it('shows the error state when verification fails', async () => {
    const { fixture, navigate } = setup('bad', () => Promise.reject(new Error('nope')));
    await fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.state()).toBe('error');
    expect(navigate).not.toHaveBeenCalled();
  });
});
