/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Surface card. Wraps content in the standard bordered, shadowed, rounded tile.
 *
 * @example
 * <mns-card [hover]="true" [animate]="true" [delay]="0.1">…</mns-card>
 */
@Component({
  selector: 'mns-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-surface border border-border rounded-lg transition-all duration-[180ms]"
      [class.p-[var(--card-pad)]]="pad()"
      [class.hover:shadow-lg]="hover()"
      [class.cursor-pointer]="clickable()"
      [style.animation]="animStyle()"
      [style.box-shadow]="'var(--shadow)'"
    >
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }
    div {
      padding: var(--card-pad);
    }
    div.no-pad {
      padding: 0;
    }
    @media (prefers-reduced-motion: reduce) {
      div {
        animation: none !important;
      }
    }
  `,
})
export class CardComponent {
  readonly pad = input<boolean>(true);
  readonly hover = input<boolean>(false);
  readonly clickable = input<boolean>(false);
  readonly animate = input<boolean>(false);
  readonly delay = input<number>(0);

  readonly animStyle = computed(() => {
    if (!this.animate()) return 'none';
    return `fadeUp .5s cubic-bezier(.22,.61,.36,1) ${this.delay()}s both`;
  });
}
