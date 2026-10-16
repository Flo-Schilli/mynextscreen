/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

/**
 * Labelled −/+ numeric stepper bounded by `min`/`max`, moving to the neighbouring multiple
 * of `step`: a stored value off that grid (31 with step 5) snaps onto it instead of staying
 * off it for good. Signal-model only:
 * bind with `[(value)]` and/or listen to `(changed)`.
 *
 * @example
 * <mns-stepper label="Columns" [(value)]="cols" [min]="1" [max]="4" />
 */
@Component({
  selector: 'mns-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  template: `
    <div class="flex items-center justify-between" *transloco="let t">
      <span class="text-[13.5px] text-muted">{{ label() }}</span>
      <div class="flex items-center border border-border-strong rounded-[10px] overflow-hidden">
        <button
          type="button"
          class="grid place-items-center w-8 h-8 text-muted text-lg font-bold transition-colors duration-[120ms] hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
          [attr.aria-label]="t('ui.stepper.decrease')"
          [disabled]="value() <= min()"
          (click)="dec()"
        >
          −
        </button>
        <span class="mono min-w-8 px-1 text-center font-bold text-sm">{{ value() }}</span>
        <button
          type="button"
          class="grid place-items-center w-8 h-8 text-muted text-lg font-bold transition-colors duration-[120ms] hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
          [attr.aria-label]="t('ui.stepper.increase')"
          [disabled]="value() >= max()"
          (click)="inc()"
        >
          +
        </button>
      </div>
    </div>
  `,
  host: { style: 'display:contents' },
})
export class StepperComponent {
  readonly label = input.required<string>();
  readonly value = model<number>(1);
  readonly min = input<number>(1);
  readonly max = input<number>(4);
  /** Amount one click adds or removes. */
  readonly step = input<number>(1);

  readonly canDec = computed(() => this.value() > this.min());
  readonly canInc = computed(() => this.value() < this.max());

  /** Snaps to the previous multiple of `step`, so 31 with step 5 goes to 30, not 26. */
  dec(): void {
    const step = this.step();
    const previous = Math.ceil(this.value() / step) * step - step;
    this.value.set(Math.max(this.min(), previous));
  }

  /** Snaps to the next multiple of `step`, so 31 with step 5 goes to 35, not 36. */
  inc(): void {
    const step = this.step();
    const next = Math.floor(this.value() / step) * step + step;
    this.value.set(Math.min(this.max(), next));
  }
}
