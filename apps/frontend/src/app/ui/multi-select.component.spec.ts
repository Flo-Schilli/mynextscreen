import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultiSelectComponent, toggleValue, withPickedValues } from './multi-select.component';
import type { SelectOption } from './select.component';
import { getTranslocoTestingModule } from '../i18n/transloco-testing';

const VENUES: SelectOption[] = [
  { value: 'hirsch', label: 'Hirsch' },
  { value: 'loewensaal', label: 'Löwensaal' },
  { value: 'zbau', label: 'Z-Bau' },
];

@Component({
  standalone: true,
  imports: [MultiSelectComponent],
  template: `<mns-multi-select
    [options]="options()"
    [(values)]="picked"
    [disabled]="disabled()"
    placeholder="All venues"
    (changed)="changes.push($event)"
  />`,
})
class HostComponent {
  readonly options = signal<SelectOption[]>(VENUES);
  readonly picked = signal<string[]>([]);
  readonly disabled = signal(false);
  readonly changes: string[][] = [];
}

describe('toggleValue / withPickedValues', () => {
  it('adds in pick order and removes again', () => {
    expect(toggleValue(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleValue(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('keeps picked values that are no longer offered, labelled with themselves', () => {
    expect(withPickedValues(VENUES.slice(0, 1), ['hirsch', 'Club X'])).toEqual([
      { value: 'hirsch', label: 'Hirsch' },
      { value: 'Club X', label: 'Club X' },
    ]);
  });
});

describe('MultiSelectComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const trigger = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button[aria-haspopup]');
  const options = (): HTMLElement[] => Array.from(document.querySelectorAll('[role=option]'));

  const open = (): void => {
    trigger().click();
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
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the placeholder while nothing is picked', () => {
    expect(trigger().textContent).toContain('All venues');
  });

  it('toggles options, stays open and reports every change', () => {
    open();
    options()[1].click();
    fixture.detectChanges();
    options()[0].click();
    fixture.detectChanges();

    expect(host.picked()).toEqual(['loewensaal', 'hirsch']);
    expect(host.changes).toEqual([['loewensaal'], ['loewensaal', 'hirsch']]);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    expect(options().length).toBe(3);

    options()[1].click();
    fixture.detectChanges();
    expect(host.picked()).toEqual(['hirsch']);
  });

  it('spells out up to two picked labels, then shows a count', () => {
    host.picked.set(['hirsch', 'zbau']);
    fixture.detectChanges();
    expect(trigger().textContent).toContain('Hirsch, Z-Bau');

    host.picked.set(['hirsch', 'zbau', 'loewensaal']);
    fixture.detectChanges();
    expect(trigger().textContent).toContain('3 selected');
  });

  it('lists a picked value the options lack, so it can be unpicked', () => {
    host.picked.set(['Club X']);
    fixture.detectChanges();
    open();

    const stale = options().find((o) => o.textContent?.includes('Club X'));
    expect(stale?.getAttribute('aria-selected')).toBe('true');
    stale!.click();
    fixture.detectChanges();
    expect(host.picked()).toEqual([]);
  });

  it('clears the selection from the footer', () => {
    host.picked.set(['hirsch', 'zbau']);
    fixture.detectChanges();
    open();

    const clear = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Clear selection'),
    );
    clear!.click();
    fixture.detectChanges();

    expect(host.picked()).toEqual([]);
  });

  it('does not open while disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    open();

    expect(options().length).toBe(0);
    expect(trigger().disabled).toBe(true);
  });
});
