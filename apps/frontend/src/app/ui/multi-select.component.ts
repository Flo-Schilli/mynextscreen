/* eslint-disable @angular-eslint/component-selector */
import { CdkConnectedOverlay, CdkOverlayOrigin, Overlay } from '@angular/cdk/overlay';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { closeLayer, isInnermostLayer, openLayer } from './dialog-stack';
import { IconComponent } from './icon.component';
import type { SelectOption } from './select.component';

/** Same threshold as `mns-select`: shorter lists are faster to scan than to filter. */
const SEARCH_THRESHOLD = 8;

/** Up to this many picked labels are spelled out on the trigger, beyond it a count. */
const MAX_TRIGGER_LABELS = 2;

const MENU_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
];

/**
 * Toggles `value` in `values`, keeping the order in which values were picked.
 * Exported for the component and its callers' tests.
 */
export function toggleValue(values: readonly string[], value: string): string[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

/**
 * The options plus every picked value the options do not contain, labelled
 * with the value itself. A filter value whose events are gone for now stays
 * visible and can be unpicked instead of silently surviving in the model.
 */
export function withPickedValues(
  options: readonly SelectOption[],
  values: readonly string[],
): SelectOption[] {
  const known = new Set(options.map((o) => o.value));
  const extra = values.filter((v) => !known.has(v)).map((v) => ({ value: v, label: v }));
  return [...options, ...extra];
}

/**
 * Multi-value sibling of `mns-select`: a dropdown of checkable options that
 * stays open while picking. Bind with `[(values)]`; `changed` fires on every
 * toggle with the new array.
 *
 * @example
 * <mns-multi-select [options]="venueOptions()" [(values)]="venues" />
 */
@Component({
  selector: 'mns-multi-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CdkOverlayOrigin, CdkConnectedOverlay, TranslocoDirective],
  template: `
    <button
      #trigger
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      type="button"
      class="inline-flex items-center justify-between gap-2 w-full px-3 py-2 rounded-[10px] text-sm font-medium bg-surface border border-border-strong text-text transition-all duration-[180ms] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      [class.ring-[3px]]="open()"
      [style.--tw-ring-color]="'var(--accent-soft)'"
      [disabled]="disabled()"
      (click)="toggleOpen()"
      (keydown)="onKeydown($event)"
      [attr.aria-expanded]="open()"
      [attr.aria-haspopup]="'listbox'"
      [attr.aria-label]="ariaLabel()"
    >
      <span class="truncate" [class.text-muted]="values().length === 0">{{ triggerLabel() }}</span>
      <mns-icon
        name="Chevron"
        [size]="16"
        class="text-muted flex-shrink-0 transition-transform duration-[180ms]"
        [style.transform]="open() ? 'rotate(90deg)' : 'none'"
      />
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayWidth]="triggerWidth()"
      [cdkConnectedOverlayViewportMargin]="8"
      [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
      (overlayOutsideClick)="onOutsideClick($event)"
      (detach)="open.set(false)"
    >
      <div
        *transloco="let t"
        class="flex w-full max-h-[18rem] flex-col overflow-hidden rounded-md border border-border-strong bg-surface"
        style="box-shadow: var(--shadow-lg)"
      >
        @if (showSearch()) {
          <div class="flex-shrink-0 border-b border-border p-2">
            <input
              #searchBox
              type="text"
              class="w-full rounded-[8px] border border-border-strong bg-surface-2 px-2.5 py-1.5 text-sm outline-none"
              [placeholder]="t('ui.select.searchPlaceholder')"
              [value]="query()"
              (input)="onQuery($event)"
            />
          </div>
        }

        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          role="listbox"
          aria-multiselectable="true"
        >
          @for (opt of filtered(); track opt.value) {
            <button
              type="button"
              role="option"
              class="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition-colors duration-[120ms] hover:bg-hover"
              [attr.aria-selected]="isPicked(opt.value)"
              (click)="toggle(opt.value)"
            >
              <span
                class="grid place-items-center w-4 h-4 rounded-[4px] border flex-shrink-0"
                [class.bg-accent]="isPicked(opt.value)"
                [class.border-accent]="isPicked(opt.value)"
                [class.text-white]="isPicked(opt.value)"
                [class.border-border-strong]="!isPicked(opt.value)"
              >
                @if (isPicked(opt.value)) {
                  <mns-icon name="Check" [size]="11" />
                }
              </span>
              <span class="truncate">{{ opt.label }}</span>
            </button>
          } @empty {
            <p class="px-3 py-2.5 text-sm text-muted">
              @if (query()) {
                {{ t('ui.select.noMatch', { query: query() }) }}
              } @else {
                {{ t('ui.multiSelect.noOptions') }}
              }
            </p>
          }
        </div>

        @if (values().length > 0) {
          <div
            class="flex flex-shrink-0 items-center justify-between border-t border-border px-3 py-1.5"
          >
            <span class="text-[12px] text-muted">{{
              t('ui.multiSelect.selected', { count: values().length })
            }}</span>
            <button
              type="button"
              class="text-[12px] font-semibold text-accent cursor-pointer"
              (click)="clear()"
            >
              {{ t('ui.multiSelect.clear') }}
            </button>
          </div>
        }
      </div>
    </ng-template>
  `,
  host: {
    style: 'display:contents',
    '(document:keydown.escape)': 'closeIfOpen()',
    '(window:resize)': 'onResize()',
  },
})
export class MultiSelectComponent {
  private readonly transloco = inject(TranslocoService);

  readonly options = input.required<SelectOption[]>();
  readonly values = model<string[]>([]);
  /** Shown while nothing is picked; defaults to a localized "All". */
  readonly placeholder = input<string>('');
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Leave unset to decide from the number of options. */
  readonly searchable = input<boolean | undefined>(undefined);
  readonly disabled = input<boolean>(false);

  readonly changed = output<string[]>();

  readonly open = signal(false);

  protected readonly positions = MENU_POSITIONS;
  protected readonly scrollStrategy = inject(Overlay).scrollStrategies.reposition();
  protected readonly query = signal('');
  protected readonly triggerWidth = signal(0);

  private readonly trigger = viewChild.required<ElementRef<HTMLElement>>('trigger');
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');
  private readonly layer = {};

  protected readonly allOptions = computed(() => withPickedValues(this.options(), this.values()));

  readonly triggerLabel = computed(() => {
    const values = this.values();
    if (values.length === 0) {
      return this.placeholder() || this.transloco.translate('ui.multiSelect.placeholder');
    }
    if (values.length > MAX_TRIGGER_LABELS) {
      return this.transloco.translate('ui.multiSelect.selected', { count: values.length });
    }
    const labels = new Map(this.allOptions().map((o) => [o.value, o.label]));
    return values.map((v) => labels.get(v) ?? v).join(', ');
  });

  protected readonly showSearch = computed(
    () => this.searchable() ?? this.allOptions().length > SEARCH_THRESHOLD,
  );

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.allOptions();
    return this.allOptions().filter((o) => o.label.toLowerCase().includes(q));
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        openLayer(this.layer);
      } else {
        closeLayer(this.layer);
      }
    });
    effect(() => {
      if (this.open()) {
        this.searchBox()?.nativeElement.focus();
      }
    });
    inject(DestroyRef).onDestroy(() => closeLayer(this.layer));
  }

  protected isPicked(value: string): boolean {
    return this.values().includes(value);
  }

  toggleOpen(): void {
    if (this.disabled()) return;
    this.query.set('');
    if (!this.open()) this.measureTrigger();
    this.open.update((v) => !v);
  }

  closeIfOpen(): void {
    if (this.open() && isInnermostLayer(this.layer)) this.open.set(false);
  }

  toggle(value: string): void {
    this.update(toggleValue(this.values(), value));
  }

  clear(): void {
    this.update([]);
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

  protected onResize(): void {
    if (this.open()) this.measureTrigger();
  }

  protected onOutsideClick(e: MouseEvent): void {
    if (this.trigger().nativeElement.contains(e.target as Node)) return;
    this.open.set(false);
  }

  private update(next: string[]): void {
    this.values.set(next);
    this.changed.emit(next);
  }

  private measureTrigger(): void {
    this.triggerWidth.set(this.trigger().nativeElement.getBoundingClientRect().width);
  }
}
