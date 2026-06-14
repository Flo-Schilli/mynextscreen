/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type StatusDotStatus = 'online' | 'warning' | 'offline' | 'info';

const STATUS_COLOR: Record<StatusDotStatus, string> = {
  online: 'var(--color-online)',
  warning: 'var(--color-warn)',
  offline: 'var(--color-offline)',
  info: 'var(--color-info)',
};

const STATUS_DIM: Record<StatusDotStatus, string> = {
  online: 'var(--online-dim)',
  warning: 'var(--warn-dim)',
  offline: 'var(--offline-dim)',
  info: 'var(--info-dim)',
};

/**
 * Pulsing status indicator dot.
 *
 * @example
 * <mns-status-dot status="online" [pulse]="true" />
 */
@Component({
  selector: 'mns-status-dot',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-block rounded-full flex-shrink-0"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.background-color]="color()"
      [style.box-shadow]="shadow()"
      [style.animation]="animation()"
      aria-hidden="true"
    ></span>
  `,
})
export class StatusDotComponent {
  readonly status = input<StatusDotStatus>('online');
  readonly pulse = input<boolean>(false);
  readonly size = input<number>(8);

  readonly color = computed(() => STATUS_COLOR[this.status()]);
  readonly shadow = computed(() => `0 0 0 3px ${STATUS_DIM[this.status()]}`);
  readonly animation = computed(() =>
    this.pulse() && this.status() !== 'offline' ? 'pulseDot 1.8s ease-in-out infinite' : 'none',
  );
}
