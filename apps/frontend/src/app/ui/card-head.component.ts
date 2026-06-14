/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

/**
 * Standard header row inside a card: icon tile + title/sub + right slot.
 *
 * @example
 * <mns-card-head title="Screens" sub="8 total" icon="Screens">
 *   <mns-btn slot="right" variant="soft" size="sm">Add</mns-btn>
 * </mns-card-head>
 */
@Component({
  selector: 'mns-card-head',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="flex items-start justify-between gap-3 mb-[18px]">
      <div class="flex items-start gap-3">
        @if (icon()) {
          <div
            class="w-[34px] h-[34px] rounded-[9px] bg-accent-soft text-accent grid place-items-center flex-shrink-0"
          >
            <mns-icon [name]="icon()!" [size]="18" />
          </div>
        }
        <div>
          <div class="text-base font-bold leading-snug tracking-[-0.01em]">
            {{ title() }}
          </div>
          @if (sub()) {
            <div class="text-[13px] text-muted mt-0.5">{{ sub() }}</div>
          }
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <ng-content select="[slot=right]" />
      </div>
    </div>
  `,
  host: { style: 'display:contents' },
})
export class CardHeadComponent {
  readonly title = input.required<string>();
  readonly sub = input<string | undefined>(undefined);
  readonly icon = input<IconName | undefined>(undefined);
}
