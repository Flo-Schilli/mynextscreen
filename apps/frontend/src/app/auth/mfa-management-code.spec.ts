import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { isManagementCodeComplete, MfaManagementCodeComponent } from './mfa-management-code';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('isManagementCodeComplete', () => {
  it('accepts six digits and well-formed recovery codes', () => {
    expect(isManagementCodeComplete('123456')).toBe(true);
    expect(isManagementCodeComplete('abcde-fgh23')).toBe(true);
    expect(isManagementCodeComplete(' ABCDEFGH23 ')).toBe(true);
  });

  it('rejects partial or malformed codes', () => {
    for (const code of ['', '12345', 'abcde-fgh2', 'abcde-fgh1!', '1234567']) {
      expect(isManagementCodeComplete(code)).toBe(false);
    }
  });
});

describe('MfaManagementCodeComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(MfaManagementCodeComponent);
    const emitted: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, emitted };
  }

  it('starts with the authenticator code field', () => {
    const { el } = setup();
    expect(el.querySelector('app-mfa-code-input')).not.toBeNull();
    expect(el.querySelector('.recovery-input')).toBeNull();
  });

  it('switches to a recovery code, clearing the value, and emits it trimmed', async () => {
    const { fixture, el, emitted } = setup();

    el.querySelector<HTMLButtonElement>('.use-recovery')!.click();
    await fixture.whenStable();

    expect(emitted).toEqual(['']);
    const recovery = el.querySelector<HTMLInputElement>('.recovery-input')!;
    expect(recovery).not.toBeNull();
    recovery.value = ' abcde-fgh23 ';
    recovery.dispatchEvent(new Event('input'));
    expect(emitted.at(-1)).toBe('abcde-fgh23');
  });

  it('switches back to the authenticator', async () => {
    const { fixture, el, emitted } = setup();
    el.querySelector<HTMLButtonElement>('.use-recovery')!.click();
    await fixture.whenStable();

    el.querySelector<HTMLButtonElement>('.use-authenticator')!.click();
    await fixture.whenStable();

    expect(el.querySelector('app-mfa-code-input')).not.toBeNull();
    expect(emitted).toEqual(['', '']);
  });
});
