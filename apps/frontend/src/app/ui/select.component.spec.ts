import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectComponent, SelectOption } from './select.component';

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

  const el = (css: string) => fixture.nativeElement.querySelector(css) as HTMLElement | null;
  const optionLabels = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('[role=option] span')).map((s) =>
      (s as HTMLElement).textContent!.trim(),
    );

  const openDropdown = (): void => {
    (el('button[aria-haspopup]') as HTMLElement).click();
    fixture.detectChanges();
  };

  const type = (text: string): void => {
    const box = el('input[type=text]') as HTMLInputElement;
    box.value = text;
    box.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
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

    const list = el('[role=listbox]')!;
    expect(list.className).toContain('overflow-y-auto');
    expect(list.className).toContain('max-h-');
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
    expect(fixture.nativeElement.textContent).toContain('No match for');
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
    (fixture.nativeElement.querySelectorAll('[role=option]')[2] as HTMLElement).click();
    fixture.detectChanges();

    expect(host.picked()).toBe('v2');
    expect(el('[role=listbox]')).toBeNull();
  });
});
