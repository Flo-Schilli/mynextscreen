import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed, getTestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';
import { LanguageService } from '../i18n/language.service';
import { DateInputComponent } from './date-input.component';
import { TimeInputComponent } from './time-input.component';

try {
  getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch {
  // already initialized
}

@Component({
  standalone: true,
  imports: [FormsModule, DateInputComponent, TimeInputComponent],
  template: `
    <mns-date-input inputId="d" [(ngModel)]="date" />
    <mns-time-input inputId="t" [(ngModel)]="time" />
  `,
})
class HostComponent {
  readonly date = signal('2026-03-09');
  readonly time = signal('14:30');
}

describe('DateInputComponent / TimeInputComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let language: LanguageService;

  const field = (id: string): HTMLInputElement =>
    fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function type(id: string, text: string): Promise<void> {
    const input = field(id);
    input.value = text;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await settle();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HostComponent, getTranslocoTestingModule()],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    language = TestBed.inject(LanguageService);
    language.setLang('de');
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await settle();
  });

  it('shows the model value in German order and placeholder', () => {
    expect(field('d').value).toBe('09.03.2026');
    expect(field('d').placeholder).toBe('TT.MM.JJJJ');
    expect(field('t').value).toBe('14:30');
  });

  it('re-renders in the new locale when the language switches', async () => {
    language.setLang('en');
    await settle();

    expect(field('d').value).toBe('03/09/2026');
    expect(field('d').placeholder).toBe('MM/DD/YYYY');
    expect(field('t').value).toBe('2:30 PM');
  });

  it('writes typed German input back as ISO on blur', async () => {
    await type('d', '1.4.26');
    await type('t', '9.15');

    expect(host.date()).toBe('2026-04-01');
    expect(field('d').value).toBe('01.04.2026');
    expect(host.time()).toBe('09:15');
    expect(field('t').value).toBe('09:15');
  });

  it('keeps unparseable text, flags it, and empties the model', async () => {
    await type('d', '31.02.2026');

    expect(field('d').value).toBe('31.02.2026');
    expect(field('d').getAttribute('aria-invalid')).toBe('true');
    expect(host.date()).toBe('');
  });

  it('clears the model when the text is cleared', async () => {
    await type('d', '');

    expect(host.date()).toBe('');
    expect(field('d').getAttribute('aria-invalid')).toBe('false');
  });

  it('picks a date from the calendar popover', async () => {
    const trigger = fixture.nativeElement.querySelector(
      'mns-date-input button[aria-expanded]',
    ) as HTMLButtonElement;
    trigger.click();
    await settle();

    const day = document.querySelector(
      'button[aria-label="Freitag, 20. März 2026"]',
    ) as HTMLButtonElement | null;
    expect(day).not.toBeNull();
    day!.click();
    await settle();

    expect(host.date()).toBe('2026-03-20');
    expect(field('d').value).toBe('20.03.2026');
  });
});
