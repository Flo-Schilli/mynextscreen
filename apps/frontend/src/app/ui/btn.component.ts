/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

export type BtnVariant = 'primary' | 'soft' | 'outline' | 'ghost' | 'danger';
export type BtnSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<BtnSize, string> = {
  sm: 'px-3 py-[7px] text-[13px] gap-[7px]',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-[22px] py-[13px] text-[15px] gap-[9px]',
};

const VARIANT_CLASSES: Record<BtnVariant, string> = {
  primary: 'btn-primary text-white',
  soft: 'bg-accent-soft text-accent',
  outline: 'bg-transparent border border-border-strong text-text',
  ghost: 'bg-transparent text-muted',
  danger: 'bg-offline-dim text-offline',
};

/**
 * Button primitive. Wraps a native `<button>` with design-system styling.
 *
 * @example
 * <mns-btn variant="primary" (mnsClick)="save()">Save</mns-btn>
 * <mns-btn variant="ghost" icon="Settings" size="sm">Settings</mns-btn>
 */
@Component({
  selector: 'mns-btn',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button
      type="button"
      class="inline-flex items-center justify-center font-semibold rounded-[10px] leading-none whitespace-nowrap transition-all duration-[180ms] ease-out cursor-pointer select-none"
      [class]="classes()"
      [class.w-full]="full()"
      [class.opacity-50]="disabled()"
      [class.cursor-not-allowed]="disabled()"
      [disabled]="disabled() || null"
      [attr.title]="title() ?? null"
      [attr.aria-label]="title() ?? null"
      (click)="!disabled() && mnsClick.emit($event)"
    >
      @if (icon()) {
        <mns-icon [name]="icon()!" [size]="iconSize()" />
      }
      <ng-content />
      @if (iconRight()) {
        <mns-icon [name]="iconRight()!" [size]="iconSize()" />
      }
    </button>
  `,
  styles: `
    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      box-shadow: 0 8px 20px -10px var(--accent-ring);
    }
    button:not(:disabled):hover {
      transform: translateY(-1px);
      filter: brightness(1.06);
    }
    button:not(:disabled):active {
      transform: translateY(0);
    }
  `,
})
export class BtnComponent {
  readonly variant = input<BtnVariant>('primary');
  readonly size = input<BtnSize>('md');
  readonly icon = input<IconName | undefined>(undefined);
  readonly iconRight = input<IconName | undefined>(undefined);
  readonly full = input<boolean>(false);
  readonly title = input<string | undefined>(undefined);
  readonly disabled = input<boolean>(false);

  readonly mnsClick = output<MouseEvent>();

  readonly classes = computed(() => {
    return `${SIZE_CLASSES[this.size()]} ${VARIANT_CLASSES[this.variant()]}`;
  });

  readonly iconSize = computed(() => {
    const s = this.size();
    return s === 'sm' ? 14 : s === 'lg' ? 18 : 16;
  });
}
