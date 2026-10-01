/* eslint-disable @angular-eslint/component-selector */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from './icon.component';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * A list longer than this gets a filter box. Below it, scanning the list is
 * faster than typing, and a search field on a three-item dropdown is noise.
 */
const SEARCH_THRESHOLD = 8;

/**
 * Custom signal-driven dropdown. Closes on outside click and Escape key.
 * Long lists scroll and get a filter box; `searchable` forces or suppresses it.
 *
 * @example
 * <mns-select
 *   [options]="[{value:'a',label:'Option A'},{value:'b',label:'Option B'}]"
 *   [(value)]="selectedValue"
 *   placeholder="Choose..."
 * />
 */
@Component({
  selector: 'mns-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="relative" #host>
      <button
        type="button"
        class="inline-flex items-center justify-between gap-2 w-full px-3 py-2 rounded-[10px] text-sm font-medium bg-surface border border-border-strong text-text transition-all duration-[180ms] cursor-pointer"
        [class.ring-[3px]]="open()"
        [style.--tw-ring-color]="'var(--accent-soft)'"
        (click)="toggleOpen()"
        (keydown)="onKeydown($event)"
        [attr.aria-expanded]="open()"
        [attr.aria-haspopup]="'listbox'"
      >
        <span class="truncate">{{ selectedLabel() }}</span>
        <mns-icon
          name="Chevron"
          [size]="16"
          class="text-muted flex-shrink-0 transition-transform duration-[180ms]"
          [style.transform]="open() ? 'rotate(90deg)' : 'none'"
        />
      </button>

      @if (open()) {
        <div
          class="absolute z-50 top-full left-0 right-0 mt-1.5 flex flex-col overflow-hidden rounded-md border border-border-strong bg-surface"
          style="box-shadow: var(--shadow-lg)"
        >
          @if (showSearch()) {
            <div class="flex-shrink-0 border-b border-border p-2">
              <input
                #searchBox
                type="text"
                class="w-full rounded-[8px] border border-border-strong bg-surface-2 px-2.5 py-1.5 text-sm outline-none"
                placeholder="Search…"
                [value]="query()"
                (input)="onQuery($event)"
                (keydown)="onSearchKeydown($event)"
              />
            </div>
          }

          <div class="max-h-[16rem] overflow-y-auto overscroll-contain" role="listbox">
            @for (opt of filtered(); track opt.value) {
              <button
                type="button"
                role="option"
                class="flex items-center justify-between w-full px-3 py-2 text-sm text-left transition-colors duration-[120ms]"
                [class.bg-accent-soft]="opt.value === value()"
                [class.text-accent]="opt.value === value()"
                [class.hover:bg-hover]="opt.value !== value()"
                [attr.aria-selected]="opt.value === value()"
                (click)="select(opt.value)"
              >
                <span>{{ opt.label }}</span>
                @if (opt.value === value()) {
                  <mns-icon name="Check" [size]="14" class="text-accent" />
                }
              </button>
            } @empty {
              <p class="px-3 py-2.5 text-sm text-muted">No match for “{{ query() }}”</p>
            }
          </div>
        </div>
      }
    </div>
  `,
  host: {
    style: 'display:contents',
    '(document:click)': 'onDocClick($event)',
    '(document:keydown.escape)': 'closeIfOpen()',
  },
})
export class SelectComponent {
  readonly options = input.required<SelectOption[]>();
  readonly value = model<string>('');
  readonly placeholder = input<string>('Select…');
  /** Leave unset to decide from the number of options. */
  readonly searchable = input<boolean | undefined>(undefined);

  readonly changed = output<string>();

  readonly open = signal(false);

  protected readonly query = signal('');

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  readonly selectedLabel = computed(() => {
    const v = this.value();
    return this.options().find((o) => o.value === v)?.label ?? this.placeholder();
  });

  protected readonly showSearch = computed(
    () => this.searchable() ?? this.options().length > SEARCH_THRESHOLD,
  );

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter((o) => o.label.toLowerCase().includes(q));
  });

  constructor() {
    // The box only exists while the dropdown is open, so this runs when the
    // viewChild resolves rather than on a timer.
    effect(() => {
      if (this.open()) {
        this.searchBox()?.nativeElement.focus();
      }
    });
  }

  toggleOpen(): void {
    this.query.set('');
    this.open.update((v) => !v);
  }

  closeIfOpen(): void {
    if (this.open()) this.open.set(false);
  }

  select(v: string): void {
    this.value.set(v);
    this.changed.emit(v);
    this.open.set(false);
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggleOpen();
    }
  }

  protected onQuery(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }

  /** Enter picks the only thing left, so a filtered-down list needs no mouse. */
  protected onSearchKeydown(e: KeyboardEvent): void {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const first = this.filtered()[0];
    if (first) this.select(first.value);
  }

  onDocClick(e: MouseEvent): void {
    if (!this.host().nativeElement.contains(e.target as Node)) {
      this.open.set(false);
    }
  }
}
