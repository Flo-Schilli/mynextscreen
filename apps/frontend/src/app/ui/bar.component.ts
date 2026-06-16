/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Horizontal progress bar.
 *
 * @example
 * <mns-bar [value]="72" [glow]="true" />
 * <mns-bar [value]="45" color="var(--color-online)" />
 */
@Component({
  selector: 'mns-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-[99px] overflow-hidden w-full"
      [style.height.px]="h()"
      [style.background]="track()"
    >
      <div
        class="h-full rounded-[99px]"
        [style.width.%]="clampedValue()"
        [style.background]="color()"
        [style.box-shadow]="glowShadow()"
        [style.transition]="'width .8s cubic-bezier(.22,.61,.36,1)'"
      ></div>
    </div>
  `,
  host: { style: 'display:contents' },
})
export class BarComponent {
  readonly value = input.required<number>();
  readonly color = input<string>('var(--accent)');
  readonly track = input<string>('var(--track)');
  readonly h = input<number>(8);
  readonly glow = input<boolean>(false);

  readonly clampedValue = computed(() => Math.min(100, Math.max(0, this.value())));

  readonly glowShadow = computed(() => (this.glow() ? `0 0 12px -2px ${this.color()}` : 'none'));
}
