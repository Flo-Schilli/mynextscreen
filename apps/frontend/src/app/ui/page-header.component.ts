/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

/**
 * Standard page-level header: icon tile + title/sub + right-side action slot.
 *
 * @example
 * <mns-page-header title="Screens" sub="8 total" icon="Screens">
 *   <mns-btn variant="primary" icon="Plus">Add Screen</mns-btn>
 * </mns-page-header>
 */
@Component({
  selector: 'mns-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <header class="flex items-center justify-between gap-4 mb-6">
      <div class="flex items-center gap-3">
        @if (icon()) {
          <div
            class="w-[42px] h-[42px] rounded-[11px] bg-accent-soft text-accent grid place-items-center flex-shrink-0"
          >
            <mns-icon [name]="icon()!" [size]="22" />
          </div>
        }
        <div>
          <h1 class="text-[27px] font-extrabold leading-none tracking-[-0.025em]">
            {{ title() }}
          </h1>
          @if (sub()) {
            <p class="text-[13px] text-muted mt-1">{{ sub() }}</p>
          }
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <ng-content />
      </div>
    </header>
  `,
  host: { style: 'display:contents' },
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly sub = input<string | undefined>(undefined);
  readonly icon = input<IconName | undefined>(undefined);
}
