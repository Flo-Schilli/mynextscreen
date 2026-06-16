/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

export type BadgeTone = 'neutral' | 'accent' | 'online' | 'warning' | 'offline' | 'info';

interface ToneClasses {
  text: string;
  bg: string;
}

const TONE_CLASSES: Record<BadgeTone, ToneClasses> = {
  neutral: { text: 'text-muted', bg: 'bg-surface-3' },
  accent: { text: 'text-accent', bg: 'bg-accent-soft' },
  online: { text: 'text-online', bg: 'bg-online-dim' },
  warning: { text: 'text-warn', bg: 'bg-warn-dim' },
  offline: { text: 'text-offline', bg: 'bg-offline-dim' },
  info: { text: 'text-info', bg: 'bg-info-dim' },
};

/**
 * Pill-shaped label badge with optional leading icon.
 *
 * @example
 * <mns-badge tone="online">Online</mns-badge>
 * <mns-badge tone="accent" icon="Sparkle">New</mns-badge>
 */
@Component({
  selector: 'mns-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[99px] text-xs font-semibold"
      [class]="classes()"
    >
      @if (icon()) {
        <mns-icon [name]="icon()!" [size]="12" />
      }
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('neutral');
  readonly icon = input<IconName | undefined>(undefined);

  readonly classes = computed(() => {
    const { text, bg } = TONE_CLASSES[this.tone()];
    return `${text} ${bg}`;
  });
}
