import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectComponent, SelectOption } from './select.component';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

function makeOptions(count: number): SelectOption[] {
  return Array.from({ length: count }, (_, i) => ({
    value: `v${i}`,
    label: `Europe/City${i}`,
  }));
}

@Component({
  standalone: true,
  imports: [SelectComponent],
  template: `<mns-select [options]="options()" [(value)]="picked" placeholder="Choose…" />`,
})
class HostComponent {
  readonly options = signal<SelectOption[]>([]);
  readonly picked = signal('');
}

describe('SelectComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  // The menu lives in the CDK overlay container on <body>, not inside the
  // component — that is the whole point of it.
  const el = (css: string) => document.querySelector(css) as HTMLElement | null;
  const optionLabels = (): string[] =>
    Array.from(document.querySelectorAll('[role=option] span')).map((s) =>
      (s as HTMLElement).textContent!.trim(),
    );

  const openDropdown = (): void => {
    (fixture.nativeElement.querySelector('button[aria-haspopup]') as HTMLElement).click();
    fixture.detectChanges();
  };

  const type = (text: string): void => {
    const box = el('input[type=text]') as HTMLInputElement;
    box.value = text;
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HostComponent,
        getTranslocoTestingModule({ translocoConfig: { defaultLang: 'en' } }),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  const setUp = (count: number): void => {
    host.options.set(makeOptions(count));
    fixture.detectChanges();
  };

  it('shows no filter box for a short list', () => {
    setUp(4);
    openDropdown();

    expect(el('input[type=text]')).toBeNull();
    expect(optionLabels().length).toBe(4);
  });

  it('shows a filter box once the list is long', () => {
    // A time-zone picker has some 400 entries; without this it cannot be used.
    setUp(40);
    openDropdown();

    expect(el('input[type=text]')).toBeTruthy();
  });

  it('keeps the options in a scrolling container', () => {
    setUp(40);
    openDropdown();

    expect(el('[role=listbox]')!.className).toContain('overflow-y-auto');
  });

  it('renders the menu outside the component, where nothing can clip it', () => {
    // A modal panel clips its overflow and, carrying an entry animation on
    // transform, is the containing block for anything positioned inside it.
    setUp(40);
    openDropdown();

    const menu = el('[role=listbox]')!;
    expect(fixture.nativeElement.contains(menu)).toBe(false);
    expect(menu.closest('.cdk-overlay-container')).toBeTruthy();
  });

  it('opens the menu as wide as the field', () => {
    setUp(40);
    const trigger = fixture.nativeElement.querySelector('button[aria-haspopup]') as HTMLElement;
    // jsdom lays nothing out, so the trigger has to claim a width of its own.
    trigger.getBoundingClientRect = () => ({ width: 480, height: 36 }) as DOMRect;

    openDropdown();

    expect((el('.cdk-overlay-pane') as HTMLElement).style.width).toBe('480px');
    // The pane is a flex container, so the box inside it has to be told to fill
    // it — a pane of the right width around a menu of content width looks
    // exactly like the bug this replaced.
    expect(el('[role=listbox]')!.parentElement!.className).toContain('w-full');
  });

  it('filters on what is typed, ignoring case', () => {
    setUp(40);
    openDropdown();
    type('city3');

    // City3 plus City30…City39.
    expect(optionLabels()).toEqual([
      'Europe/City3',
      ...Array.from({ length: 10 }, (_, i) => `Europe/City3${i}`),
    ]);
  });

  it('says so when nothing matches', () => {
    setUp(40);
    openDropdown();
    type('Antarctica');

    expect(optionLabels()).toEqual([]);
    expect(el('.cdk-overlay-container')!.textContent).toContain('No match for');
  });

  it('picks the first match on Enter', () => {
    setUp(40);
    openDropdown();
    type('city37');
    (el('input[type=text]') as HTMLInputElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();

    expect(host.picked()).toBe('v37');
    expect(el('[role=listbox]')).toBeNull();
  });

  it('starts from the full list the next time it opens', () => {
    setUp(40);
    openDropdown();
    type('city37');
    openDropdown(); // close
    openDropdown(); // reopen

    expect(optionLabels().length).toBe(40);
  });

  it('selecting an option reports it and closes', () => {
    setUp(4);
    openDropdown();
    (document.querySelectorAll('[role=option]')[2] as HTMLElement).click();
    fixture.detectChanges();

    expect(host.picked()).toBe('v2');
    expect(el('[role=listbox]')).toBeNull();
  });

  it('Escape closes the menu and leaves whatever is behind it alone', () => {
    setUp(40);
    openDropdown();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(el('[role=listbox]')).toBeNull();
  });
});
