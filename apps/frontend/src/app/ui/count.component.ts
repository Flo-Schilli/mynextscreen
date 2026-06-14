/* eslint-disable @angular-eslint/component-selector */
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  input,
  signal,
} from '@angular/core';

/**
 * Animated count-up number. Eases from 0 to `to` over `dur` milliseconds.
 *
 * @example
 * <mns-count [to]="42" suffix="screens" />
 */
@Component({
  selector: 'mns-count',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ displayed() }}{{ suffix() ? ' ' + suffix() : '' }}`,
  host: { class: 'mono tabular-nums' },
})
export class CountComponent implements OnDestroy {
  readonly to = input.required<number>();
  readonly dur = input<number>(900);
  readonly suffix = input<string | undefined>(undefined);

  readonly displayed = signal(0);

  private rafId: ReturnType<typeof requestAnimationFrame> | null = null;

  constructor() {
    effect(() => {
      const target = this.to();
      const duration = this.dur();

      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
      }

      const start = performance.now();
      const startVal = this.displayed();

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        this.displayed.set(Math.round(startVal + (target - startVal) * eased));

        if (progress < 1) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.rafId = null;
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }
}
