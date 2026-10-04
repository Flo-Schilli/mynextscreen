import { TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { vi } from 'vitest';
import { LanguageService } from './language.service';
import { LANG_STORAGE_KEY } from './i18n.constants';
import { getTranslocoTestingModule } from './transloco-testing';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

function setup(): { service: LanguageService; transloco: TranslocoService } {
  TestBed.configureTestingModule({
    imports: [getTranslocoTestingModule()],
    providers: [provideZonelessChangeDetection()],
  });
  const service = TestBed.inject(LanguageService);
  const transloco = TestBed.inject(TranslocoService);
  return { service, transloco };
}

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('uses the persisted language when one is stored', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'en');
    const { service, transloco } = setup();
    expect(service.lang()).toBe('en');
    expect(transloco.getActiveLang()).toBe('en');
  });

  it('falls back to navigator.language as first-fill when nothing is stored', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    const { service } = setup();
    expect(service.lang()).toBe('en');
  });

  it('defaults to de when neither storage nor browser language resolve', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
    const { service } = setup();
    expect(service.lang()).toBe('de');
  });

  it('persists the choice and updates Transloco on setLang', () => {
    const { service, transloco } = setup();
    service.setLang('en');
    expect(service.lang()).toBe('en');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
    expect(transloco.getActiveLang()).toBe('en');
  });

  it('exposes the Angular locale for the active language', () => {
    const { service } = setup();
    expect(service.locale()).toBe('de-DE');
    service.setLang('en');
    expect(service.locale()).toBe('en-US');
  });

  it('sets the document lang attribute', () => {
    const { service } = setup();
    expect(document.documentElement.lang).toBe('de');
    service.setLang('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
