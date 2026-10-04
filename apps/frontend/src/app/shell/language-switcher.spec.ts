import { TestBed, getTestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageSwitcher } from './language-switcher';
import { LanguageService } from '../i18n/language.service';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

describe('LanguageSwitcher', () => {
  let fixture: ComponentFixture<LanguageSwitcher>;

  beforeEach(() => {
    localStorage.clear();
    // Pin the initial language so assertions are deterministic regardless of the
    // test environment's navigator.language.
    localStorage.setItem('mynextscreen_lang', 'de');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LanguageSwitcher, getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(LanguageSwitcher);
    fixture.detectChanges();
  });

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button'));
  }

  it('renders one button per available language', () => {
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['DE', 'EN']);
  });

  it('marks the active language as pressed', () => {
    const [de, en] = buttons();
    expect(de.getAttribute('aria-pressed')).toBe('true');
    expect(en.getAttribute('aria-pressed')).toBe('false');
  });

  it('switches the active language when another option is clicked', () => {
    const language = TestBed.inject(LanguageService);
    buttons()[1].click();
    fixture.detectChanges();
    expect(language.lang()).toBe('en');
    const [de, en] = buttons();
    expect(en.getAttribute('aria-pressed')).toBe('true');
    expect(de.getAttribute('aria-pressed')).toBe('false');
  });

  it('localises the group aria-label on language change', () => {
    const transloco = TestBed.inject(TranslocoService);
    const group = (): HTMLElement => fixture.nativeElement.querySelector('[role="group"]');
    expect(group().getAttribute('aria-label')).toBe('Sprache');
    transloco.setActiveLang('en');
    fixture.detectChanges();
    expect(group().getAttribute('aria-label')).toBe('Language');
  });
});
