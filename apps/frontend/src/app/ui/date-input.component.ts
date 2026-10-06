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
  forwardRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { WEEK_START_BY_LANG } from '../i18n/i18n.constants';
import {
  CalendarDay,
  formatIsoDate,
  fullDateLabel,
  monthGrid,
  monthLabel,
  parseLocalDate,
  splitIsoDate,
  todayIso,
  weekdayNames,
} from '../i18n/locale-date-input';
import { closeLayer, isInnermostLayer, openLayer } from './dialog-stack';
import { IconComponent } from './icon.component';
import { FIELD_BOX_CLASS, FIELD_INPUT_CLASS, LocaleTextField } from './locale-text-field';

const POPOVER_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
];

const MONTHS_PER_YEAR = 12;

/**
 * Date field in the app's language: `TT.MM.JJJJ` in German, `MM/DD/YYYY` in
 * English, with a calendar popover. The model value is an ISO date
 * (`YYYY-MM-DD`) or `''`, exactly what `<input type="date">` produced, so it
 * replaces one without touching the surrounding code.
 *
 * @example
 * <mns-date-input inputId="from" [(ngModel)]="from" />
 */
@Component({
  selector: 'mns-date-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, CdkOverlayOrigin, CdkConnectedOverlay, TranslocoDirective],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateInputComponent), multi: true },
  ],
  template: `
    <ng-container *transloco="let t">
      <div
        cdkOverlayOrigin
        #origin="cdkOverlayOrigin"
        [class]="boxClass"
        [class.bg-surface]="tone() === 'surface'"
        [class.bg-surface-2]="tone() === 'raised'"
        [class.border-border-strong]="!showError()"
        [class.border-offline]="showError()"
        [class.ring-[3px]]="focused() || open()"
        [style.--tw-ring-color]="'var(--accent-soft)'"
      >
        <input
          #field
          type="text"
          inputmode="numeric"
          autocomplete="off"
          [id]="inputId()"
          [class]="inputClass"
          [placeholder]="t('ui.dateInput.placeholder')"
          [value]="text()"
          [disabled]="disabled()"
          [attr.aria-invalid]="showError()"
          [attr.title]="parseError() ? t('ui.dateInput.invalid') : null"
          (input)="onInput($event)"
          (focus)="focused.set(true)"
          (blur)="onBlur()"
          (keydown.enter)="commit()"
        />
        <button
          #trigger
          type="button"
          class="flex-shrink-0 grid place-items-center pr-2.5 pl-1 text-muted hover:text-text disabled:opacity-60"
          [disabled]="disabled()"
          [attr.aria-label]="t('ui.dateInput.openCalendar')"
          [attr.aria-expanded]="open()"
          (click)="toggle()"
        >
          <mns-icon name="Calendar" [size]="16" />
        </button>
      </div>

      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="open()"
        [cdkConnectedOverlayPositions]="positions"
        [cdkConnectedOverlayViewportMargin]="8"
        [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
        (overlayOutsideClick)="onOutsideClick($event)"
        (detach)="open.set(false)"
      >
        <div
          class="w-[17rem] rounded-md border border-border-strong bg-surface p-3"
          style="box-shadow: var(--shadow-lg)"
          role="dialog"
          [attr.aria-label]="monthTitle()"
        >
          <div class="mb-2 flex items-center justify-between">
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-hover hover:text-text"
              [attr.aria-label]="t('ui.dateInput.previousMonth')"
              (click)="shiftMonth(-1)"
            >
              <mns-icon name="ChevronLeft" [size]="16" />
            </button>
            <span class="text-sm font-semibold text-text" aria-live="polite">{{
              monthTitle()
            }}</span>
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-hover hover:text-text"
              [attr.aria-label]="t('ui.dateInput.nextMonth')"
              (click)="shiftMonth(1)"
            >
              <mns-icon name="Chevron" [size]="16" />
            </button>
          </div>

          <div class="grid grid-cols-7 gap-0.5 text-center" role="grid">
            @for (name of weekdays(); track $index) {
              <span class="py-1 text-[11px] font-semibold text-faint" role="columnheader">{{
                name
              }}</span>
            }
            @for (week of grid(); track $index) {
              @for (day of week; track day.iso) {
                <button
                  type="button"
                  role="gridcell"
                  class="h-8 rounded-[8px] text-[13px] transition-colors duration-[120ms]"
                  [class.text-faint]="!day.inMonth && day.iso !== value()"
                  [class.text-text]="day.inMonth && day.iso !== value()"
                  [class.hover:bg-hover]="day.iso !== value()"
                  [class.bg-accent]="day.iso === value()"
                  [class.text-white]="day.iso === value()"
                  [class.font-semibold]="day.iso === value() || day.iso === today"
                  [class.ring-1]="day.iso === today && day.iso !== value()"
                  [class.ring-accent]="day.iso === today && day.iso !== value()"
                  [attr.aria-label]="dayLabel(day)"
                  [attr.aria-selected]="day.iso === value()"
                  (click)="choose(day.iso)"
                >
                  {{ day.day }}
                </button>
              }
            }
          </div>

          <div class="mt-2 flex justify-between border-t border-border pt-2">
            <button
              type="button"
              class="rounded-[8px] px-2 py-1 text-xs font-semibold text-muted hover:bg-hover hover:text-text"
              (click)="choose('')"
            >
              {{ t('ui.dateInput.clear') }}
            </button>
            <button
              type="button"
              class="rounded-[8px] px-2 py-1 text-xs font-semibold text-accent hover:bg-accent-soft"
              (click)="choose(today)"
            >
              {{ t('ui.dateInput.today') }}
            </button>
          </div>
        </div>
      </ng-template>
    </ng-container>
  `,
  host: {
    class: 'block',
    '(document:keydown.escape)': 'closeIfOpen()',
  },
})
export class DateInputComponent extends LocaleTextField {
  protected readonly boxClass = FIELD_BOX_CLASS;
  protected readonly inputClass = FIELD_INPUT_CLASS;
  protected readonly positions = POPOVER_POSITIONS;
  protected readonly scrollStrategy = inject(Overlay).scrollStrategies.reposition();
  protected readonly today = todayIso();

  readonly open = signal(false);
  /** Month shown in the popover, independent of the value while paging. */
  protected readonly view = signal({ year: 0, month: 1 });

  protected readonly weekStart = computed(() => WEEK_START_BY_LANG[this.lang()]);
  protected readonly grid = computed(() =>
    monthGrid(this.view().year, this.view().month, this.weekStart()),
  );
  protected readonly weekdays = computed(() => weekdayNames(this.locale(), this.weekStart()));
  protected readonly monthTitle = computed(() =>
    monthLabel(this.view().year, this.view().month, this.locale()),
  );

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly layer = {};

  constructor() {
    super();
    effect(() => {
      if (this.open()) openLayer(this.layer);
      else closeLayer(this.layer);
    });
    inject(DestroyRef).onDestroy(() => closeLayer(this.layer));
  }

  protected format(iso: string, locale: string): string {
    return formatIsoDate(iso, locale);
  }

  protected parse(text: string, locale: string): string | null {
    return parseLocalDate(text, locale);
  }

  protected toggle(): void {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    const shown = splitIsoDate(this.value()) ?? splitIsoDate(this.today);
    if (shown) this.view.set({ year: shown.year, month: shown.month });
    this.open.set(true);
  }

  protected shiftMonth(delta: number): void {
    this.view.update(({ year, month }) => {
      const index = year * MONTHS_PER_YEAR + (month - 1) + delta;
      return { year: Math.floor(index / MONTHS_PER_YEAR), month: (index % MONTHS_PER_YEAR) + 1 };
    });
  }

  protected choose(iso: string): void {
    this.pick(iso);
    this.open.set(false);
    this.field().nativeElement.focus();
  }

  protected dayLabel(day: CalendarDay): string {
    return fullDateLabel(day.iso, this.locale());
  }

  protected closeIfOpen(): void {
    if (this.open() && isInnermostLayer(this.layer)) this.open.set(false);
  }

  /** The trigger toggles on its own click; closing here too would reopen it. */
  protected onOutsideClick(e: MouseEvent): void {
    if (this.trigger().nativeElement.contains(e.target as Node)) return;
    this.open.set(false);
  }
}
