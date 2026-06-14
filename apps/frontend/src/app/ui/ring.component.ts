/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * SVG donut gauge. Center content is projected via `<ng-content>`.
 *
 * @example
 * <mns-ring [value]="68" [size]="64">
 *   <span class="text-xs font-bold mono">68%</span>
 * </mns-ring>
 */
@Component({
  selector: 'mns-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative inline-grid place-items-center"
      [style.width.px]="size()"
      [style.height.px]="size()"
    >
      <svg
        class="absolute inset-0"
        [attr.width]="size()"
        [attr.height]="size()"
        [attr.viewBox]="viewBox()"
        fill="none"
        style="transform: rotate(-90deg)"
      >
        <!-- track -->
        <circle
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          [attr.stroke]="track()"
          [attr.stroke-width]="sw()"
          fill="none"
        />
        <!-- progress -->
        <circle
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          [attr.stroke]="color()"
          [attr.stroke-width]="sw()"
          fill="none"
          stroke-linecap="round"
          [attr.stroke-dasharray]="circumference()"
          [attr.stroke-dashoffset]="dashOffset()"
          style="transition: stroke-dashoffset .9s cubic-bezier(.22,.61,.36,1)"
        />
      </svg>
      <!-- center slot -->
      <div class="relative z-10 flex items-center justify-center">
        <ng-content />
      </div>
    </div>
  `,
  host: { style: 'display:inline-grid' },
})
export class RingComponent {
  readonly value = input.required<number>();
  readonly size = input<number>(64);
  readonly sw = input<number>(7);
  readonly color = input<string>('var(--accent)');
  readonly track = input<string>('var(--track)');

  readonly center = computed(() => this.size() / 2);
  readonly radius = computed(() => this.center() - this.sw() / 2 - 1);
  readonly circumference = computed(() => 2 * Math.PI * this.radius());
  readonly viewBox = computed(() => `0 0 ${this.size()} ${this.size()}`);

  readonly dashOffset = computed(() => {
    const pct = Math.min(100, Math.max(0, this.value())) / 100;
    return this.circumference() * (1 - pct);
  });
}
