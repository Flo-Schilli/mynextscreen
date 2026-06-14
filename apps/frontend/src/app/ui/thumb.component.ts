/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from './icon.component';

/**
 * Gradient "screen" thumbnail tile. Shows a play icon for video type.
 * Offline screens get grayscale + dark overlay via `dim` input.
 *
 * @example
 * <mns-thumb bg="linear-gradient(135deg,#6d6cf6,#a855f7)" type="video" [h]="120" />
 */
@Component({
  selector: 'mns-thumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div
      class="relative overflow-hidden flex-shrink-0"
      [style.height.px]="h()"
      [style.border-radius.px]="radius()"
      [style.background]="bg()"
      [style.filter]="dim() ? 'grayscale(1) brightness(0.5)' : 'none'"
    >
      <!-- top sheen -->
      <div
        class="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
        style="background: linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)"
      ></div>

      @if (type() === 'video') {
        <div class="absolute inset-0 grid place-items-center">
          <div class="w-10 h-10 rounded-full bg-black/40 grid place-items-center">
            <mns-icon name="Play" [size]="20" class="text-white ml-0.5" />
          </div>
        </div>
      }

      @if (badge()) {
        <div class="absolute top-2 left-2">
          <ng-content select="[slot=badge]" />
        </div>
      }
    </div>
  `,
  host: { style: 'display:contents' },
})
export class ThumbComponent {
  readonly bg = input<string>('linear-gradient(135deg, var(--accent), var(--accent-2))');
  readonly orient = input<string | undefined>(undefined);
  readonly type = input<'video' | 'image' | undefined>(undefined);
  readonly h = input<number>(120);
  readonly radius = input<number>(10);
  readonly badge = input<boolean>(false);
  readonly dim = input<boolean>(false);

  readonly _orient = computed(() => this.orient());
}
