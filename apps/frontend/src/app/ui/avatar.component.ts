/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Derive initials from a display name (up to 2 chars). */
function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Deterministic hue from a string. */
function stringHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  }
  return h % 360;
}

/** Gradient pair from hue (used by Avatar). */
function gradientFor(name: string): string {
  const hue = stringHue(name);
  return `linear-gradient(135deg, hsl(${hue},60%,45%), hsl(${(hue + 40) % 360},70%,55%))`;
}

/**
 * Gradient initials avatar tile.
 *
 * @example
 * <mns-avatar name="Jane Doe" [size]="34" />
 */
@Component({
  selector: 'mns-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="rounded-[10px] grid place-items-center font-bold text-white flex-shrink-0"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.background]="gradient()"
      [style.font-size.px]="fontSize()"
    >
      {{ initials() }}
    </div>
  `,
  host: { style: 'display:contents' },
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input<number>(34);

  readonly initials = computed(() => toInitials(this.name()));
  readonly gradient = computed(() => gradientFor(this.name()));
  readonly fontSize = computed(() => Math.round(this.size() * 0.36));
}

/**
 * Deterministic 5×5 symmetric identicon (SVG-based) from any seed string.
 *
 * @example
 * <mns-identicon seed="user@example.com" [size]="38" />
 */
@Component({
  selector: 'mns-identicon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
      [attr.rx]="radius()"
    >
      <rect
        [attr.width]="size()"
        [attr.height]="size()"
        [attr.fill]="bgColor()"
        [attr.rx]="radius()"
      />
      @for (cell of cells(); track $index) {
        @if (cell.on) {
          <rect
            [attr.x]="cell.x"
            [attr.y]="cell.y"
            [attr.width]="cell.w"
            [attr.height]="cell.w"
            [attr.fill]="fgColor()"
          />
        }
      }
    </svg>
  `,
  host: { style: 'display:contents' },
})
export class IdenticonComponent {
  readonly seed = input.required<string>();
  readonly size = input<number>(38);
  readonly radius = input<number>(10);

  readonly hue = computed(() => stringHue(this.seed()));
  readonly fgColor = computed(() => `hsl(${this.hue()},55%,55%)`);
  readonly bgColor = computed(() => `hsl(${this.hue()},30%,18%)`);

  readonly cells = computed(() => {
    const s = this.seed();
    const sz = this.size();
    const pad = sz * 0.1;
    const cellW = (sz - pad * 2) / 5;
    const result: { x: number; y: number; w: number; on: boolean }[] = [];

    // Simple hash to get 15 bits (left 3 cols of 5×5, mirrored)
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    }

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        const bit = (hash >> (row * 3 + col)) & 1;
        const mirrorCols = col < 2 ? [col, 4 - col] : [col];
        for (const c of mirrorCols) {
          result.push({
            x: pad + c * cellW,
            y: pad + row * cellW,
            w: cellW,
            on: bit === 1,
          });
        }
      }
    }
    return result;
  });
}

/**
 * Smart user avatar: shows Identicon keyed on email/name.
 *
 * @example
 * <mns-user-avatar name="Jane Doe" email="jane@example.com" [size]="34" />
 */
@Component({
  selector: 'mns-user-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IdenticonComponent],
  template: ` <mns-identicon [seed]="seed()" [size]="size()" [radius]="radius()" /> `,
  host: { style: 'display:contents' },
})
export class UserAvatarComponent {
  readonly name = input.required<string>();
  readonly email = input<string | undefined>(undefined);
  readonly size = input<number>(34);
  readonly radius = input<number>(10);

  readonly seed = computed(() => this.email() ?? this.name());
}
