import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { SetPassword } from './set-password';
import { AuthService } from './auth.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

interface AuthStub {
  setPassword: ReturnType<typeof vi.fn>;
}

function setup(query: Record<string, string>): {
  fixture: ComponentFixture<SetPassword>;
  auth: AuthStub;
} {
  const auth: AuthStub = { setPassword: vi.fn().mockResolvedValue(undefined) };
  TestBed.configureTestingModule({
    imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AuthService, useValue: auth },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(query) } },
      },
    ],
  });
  vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(SetPassword);
  fixture.detectChanges();
  return { fixture, auth };
}

describe('SetPassword', () => {
  describe('invitation link (invite=1)', () => {
    it('asks for the name', () => {
      const { fixture } = setup({ t: 'tok', invite: '1' });

      expect(fixture.nativeElement.querySelector('#name')).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Activate your account');
    });

    it('does not submit without a name', async () => {
      const { fixture, auth } = setup({ t: 'tok', invite: '1' });
      fixture.componentInstance.form.patchValue({ name: '   ', newPassword: 'supersecret' });

      await fixture.componentInstance.submit();

      expect(auth.setPassword).not.toHaveBeenCalled();
    });

    it('sends the trimmed name with the password', async () => {
      const { fixture, auth } = setup({ t: 'tok', invite: '1' });
      fixture.componentInstance.form.patchValue({ name: ' Jane Doe ', newPassword: 'supersecret' });

      await fixture.componentInstance.submit();

      expect(auth.setPassword).toHaveBeenCalledExactlyOnceWith('tok', 'supersecret', 'Jane Doe');
    });
  });

  describe('password reset link', () => {
    it('does not ask for a name', () => {
      const { fixture } = setup({ t: 'tok' });

      expect(fixture.nativeElement.querySelector('#name')).toBeNull();
    });

    it('sends only the password', async () => {
      const { fixture, auth } = setup({ t: 'tok' });
      fixture.componentInstance.form.patchValue({ newPassword: 'supersecret' });

      await fixture.componentInstance.submit();

      expect(auth.setPassword).toHaveBeenCalledExactlyOnceWith('tok', 'supersecret', undefined);
    });
  });
});
