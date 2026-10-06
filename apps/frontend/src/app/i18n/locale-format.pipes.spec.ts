import { Component } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeEn from '@angular/common/locales/en';
import { getTranslocoTestingModule } from './transloco-testing';
import { LanguageService } from './language.service';
import { LocaleDatePipe, LocaleNumberPipe } from './locale-format.pipes';

// `provideI18n()` does this in the app; these specs bypass it.
registerLocaleData(localeDe);
registerLocaleData(localeEn);

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

@Component({
  standalone: true,
  imports: [LocaleDatePipe, LocaleNumberPipe],
  template: `<span id="d">{{ when | localeDate: 'mediumDate' }}</span
    ><span id="n">{{ amount | localeNumber: '1.2-2' }}</span>`,
})
class HostComponent {
  when = new Date('2026-03-09T12:00:00.000Z');
  amount = 1234.5;
}

/** Angular's own pipe, for the contrast that motivated these two. */
@Component({
  standalone: true,
  imports: [DatePipe],
  template: `<span id="d">{{ when | date: 'mediumDate' }}</span>`,
})
class AngularPipeHostComponent {
  when = new Date('2026-03-09T12:00:00.000Z');
}

describe('locale-reactive format pipes', () => {
  let fixture: ComponentFixture<HostComponent>;
  let language: LanguageService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HostComponent, getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    language = TestBed.inject(LanguageService);
    fixture.detectChanges();
  });

  function text(id: string): string {
    return (fixture.nativeElement as HTMLElement).querySelector(`#${id}`)?.textContent ?? '';
  }

  it('formats the date in the active language', () => {
    language.setLang('de');
    fixture.detectChanges();

    // German `mediumDate` is numeric (`dd.MM.y`), English spells the month.
    expect(text('d')).toBe('09.03.2026');
  });

  it('reformats the date when the language is switched at runtime', () => {
    language.setLang('de');
    fixture.detectChanges();
    expect(text('d')).toBe('09.03.2026');

    language.setLang('en');
    fixture.detectChanges();

    // The regression this pipe exists for: with Angular's DatePipe the text
    // stayed on the bootstrap language here, because LOCALE_ID is resolved
    // once per injector and the pipe caches it in its constructor.
    expect(text('d')).toBe('Mar 9, 2026');
  });

  it('reformats numbers when the language is switched at runtime', () => {
    language.setLang('de');
    fixture.detectChanges();
    expect(text('n')).toBe('1.234,50');

    language.setLang('en');
    fixture.detectChanges();

    expect(text('n')).toBe('1,234.50');
  });

  it('passes null through rather than printing a placeholder date', () => {
    const pipe = TestBed.runInInjectionContext(() => new LocaleDatePipe());
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
  });
});

describe("Angular's DatePipe, for contrast", () => {
  it('does not follow a runtime language switch — the reason for LocaleDatePipe', async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AngularPipeHostComponent, getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    const fixture = TestBed.createComponent(AngularPipeHostComponent);
    const language = TestBed.inject(LanguageService);
    language.setLang('de');
    fixture.detectChanges();
    const before = (fixture.nativeElement as HTMLElement).textContent ?? '';

    language.setLang('en');
    fixture.detectChanges();
    const after = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(after).toBe(before);
  });
});
