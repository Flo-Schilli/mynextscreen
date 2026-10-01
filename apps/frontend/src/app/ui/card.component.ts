/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Surface card. Wraps content in the standard bordered, shadowed, rounded tile.
 *
 * @example
 * <mns-card [hover]="true" [animate]="true" [delay]="0.1">…</mns-card>
 *
 * Set `hoverAccent` to make the whole card glow with the accent border and lift
 * on hover — used by clickable list cards (screens / screen-groups / playlists).
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
      [class.hover:border-accent]="hoverAccent()"
      [class.hover:-translate-y-px]="hoverAccent()"
      [class.cursor-pointer]="clickable()"
      [style.animation]="animStyle()"
      [style.box-shadow]="'var(--shadow)'"
    >
      <ng-content />
    </div>
  `,
  styles: `
    /*
     * In a layer so a utility class on the host can win. Unlayered rules beat
     * everything in Tailwind's layers, so an unlayered :host would make
     * \`<mns-card class="block mb-5">\` silently do nothing: the margin would
     * sit on an element that generates no box.
     */
    @layer components {
      :host {
        display: contents;
      }
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
  readonly hoverAccent = input<boolean>(false);
  readonly clickable = input<boolean>(false);
  readonly animate = input<boolean>(false);
  readonly delay = input<number>(0);

  readonly animStyle = computed(() => {
    if (!this.animate()) return 'none';
    return `fadeUp .5s cubic-bezier(.22,.61,.36,1) ${this.delay()}s both`;
  });
}
