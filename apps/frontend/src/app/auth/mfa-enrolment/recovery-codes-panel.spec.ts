import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { vi } from 'vitest';
import { RECOVERY_CODES_FILENAME, RecoveryCodesPanelComponent } from './recovery-codes-panel';
import { getTranslocoTestingModule } from '../../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('RecoveryCodesPanelComponent', () => {
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };

  afterEach(() => {
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('revokes the download URL only after the click has been handled', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } })],
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(RecoveryCodesPanelComponent);
    fixture.componentRef.setInput('codes', ['aaaaa-bbbbb']);
    fixture.detectChanges();

    const createObjectURL = vi.fn(() => 'blob:codes');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe(RECOVERY_CODES_FILENAME);
      expect(this.href).toBe('blob:codes');
    });

    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((b) => b.textContent?.includes('Download'));
    button?.click();

    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:codes');
  });
});
