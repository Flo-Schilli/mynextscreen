/* eslint-disable @angular-eslint/component-selector */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
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
 * Custom signal-driven dropdown. Closes on outside click and Escape key.
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
          class="absolute z-50 top-full left-0 right-0 mt-1.5 bg-surface border border-border-strong rounded-md overflow-hidden"
          style="box-shadow: var(--shadow-lg)"
          role="listbox"
        >
          @for (opt of options(); track opt.value) {
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
          }
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

  readonly changed = output<string>();

  readonly open = signal(false);

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  readonly selectedLabel = computed(() => {
    const v = this.value();
    return this.options().find((o) => o.value === v)?.label ?? this.placeholder();
  });

  toggleOpen(): void {
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

  onDocClick(e: MouseEvent): void {
    if (!this.host().nativeElement.contains(e.target as Node)) {
      this.open.set(false);
    }
  }
}
