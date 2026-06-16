/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

/**
 * Empty-state block: icon tile + title + description + optional action slot.
 *
 * @example
 * <mns-empty icon="Screens" title="No screens yet" desc="Add your first screen to get started.">
 *   <mns-btn variant="primary" icon="Plus">Add Screen</mns-btn>
 * </mns-empty>
 */
@Component({
  selector: 'mns-empty',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="flex flex-col items-center text-center py-10 gap-4">
      @if (icon()) {
        <div class="w-14 h-14 rounded-2xl bg-surface-3 text-faint grid place-items-center">
          <mns-icon [name]="icon()!" [size]="28" />
        </div>
      }
      <div>
        <div class="text-[15px] font-bold leading-snug">{{ title() }}</div>
        @if (desc()) {
          <div class="text-[13px] text-muted mt-1.5 max-w-[320px]">{{ desc() }}</div>
        }
      </div>
      <ng-content />
    </div>
  `,
  host: { style: 'display:contents' },
})
export class EmptyComponent {
  readonly icon = input<IconName | undefined>(undefined);
  readonly title = input.required<string>();
  readonly desc = input<string | undefined>(undefined);
}
