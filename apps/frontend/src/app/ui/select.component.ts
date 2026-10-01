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
import { closeLayer, isInnermostLayer, openLayer } from './dialog-stack';
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

/** Below the trigger, or above it when the viewport leaves no room. */
const MENU_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
];

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
  imports: [IconComponent, CdkOverlayOrigin, CdkConnectedOverlay],
  template: `
    <button
      #trigger
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
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

    <!--
      In an overlay rather than positioned next to the trigger: this dropdown is
      routinely opened inside a modal, whose panel both clips its overflow and —
      because it carries an entry animation on transform — is the containing
      block for anything positioned inside it, fixed included. Only a pane
      outside that subtree escapes both.
    -->
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
        class="flex max-h-[16rem] flex-col overflow-hidden rounded-md border border-border-strong bg-surface"
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

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain" role="listbox">
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
    </ng-template>
  `,
  host: {
    style: 'display:contents',
    '(document:keydown.escape)': 'closeIfOpen()',
    '(window:resize)': 'onResize()',
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

  protected readonly positions = MENU_POSITIONS;
  protected readonly scrollStrategy = inject(Overlay).scrollStrategies.reposition();

  protected readonly query = signal('');
  protected readonly triggerWidth = signal(0);

  private readonly trigger = viewChild.required<ElementRef<HTMLElement>>('trigger');
  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  /** Identity for the layer stack, so Escape closes this and not the dialog behind it. */
  private readonly layer = {};

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
    effect(() => {
      if (this.open()) {
        openLayer(this.layer);
      } else {
        closeLayer(this.layer);
      }
    });

    // The box only exists while the dropdown is open, so this runs when the
    // viewChild resolves rather than on a timer.
    effect(() => {
      if (this.open()) {
        this.searchBox()?.nativeElement.focus();
      }
    });

    inject(DestroyRef).onDestroy(() => closeLayer(this.layer));
  }

  toggleOpen(): void {
    this.query.set('');
    // Measured before opening, not in an effect afterwards: the overlay reads
    // its width as it attaches, and a width that arrives a tick later leaves
    // the menu at its content width for good.
    if (!this.open()) this.measureTrigger();
    this.open.update((v) => !v);
  }

  closeIfOpen(): void {
    if (this.open() && isInnermostLayer(this.layer)) this.open.set(false);
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

  /** The overlay follows the trigger on resize, but it does not re-measure it. */
  protected onResize(): void {
    if (this.open()) this.measureTrigger();
  }

  private measureTrigger(): void {
    this.triggerWidth.set(this.trigger().nativeElement.getBoundingClientRect().width);
  }

  /** The trigger's own click is handled by the button; closing here too would reopen it. */
  protected onOutsideClick(e: MouseEvent): void {
    if (this.trigger().nativeElement.contains(e.target as Node)) return;
    this.open.set(false);
  }
}
