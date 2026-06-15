/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

/**
 * Labelled −/+ numeric stepper bounded by `min`/`max`. Signal-model only:
 * bind with `[(value)]` and/or listen to `(changed)`.
 *
 * @example
 * <mns-stepper label="Columns" [(value)]="cols" [min]="1" [max]="4" />
 */
@Component({
  selector: 'mns-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between">
      <span class="text-[13.5px] text-muted">{{ label() }}</span>
      <div class="flex items-center border border-border-strong rounded-[10px] overflow-hidden">
        <button
          type="button"
          class="grid place-items-center w-8 h-8 text-muted text-lg font-bold transition-colors duration-[120ms] hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Decrease"
          [disabled]="value() <= min()"
          (click)="dec()"
        >
          −
        </button>
        <span class="mono w-8 text-center font-bold text-sm">{{ value() }}</span>
        <button
          type="button"
          class="grid place-items-center w-8 h-8 text-muted text-lg font-bold transition-colors duration-[120ms] hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Increase"
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

  readonly canDec = computed(() => this.value() > this.min());
  readonly canInc = computed(() => this.value() < this.max());

  dec(): void {
    this.value.set(Math.max(this.min(), this.value() - 1));
  }

  inc(): void {
    this.value.set(Math.min(this.max(), this.value() + 1));
  }
}
