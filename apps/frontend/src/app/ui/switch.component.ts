/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

/**
 * 42×24 pill toggle switch. Use `[(checked)]` for two-way binding.
 *
 * @example
 * <mns-switch [(checked)]="enabled" />
 */
@Component({
  selector: 'mns-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      class="relative inline-flex flex-shrink-0 rounded-[99px] transition-colors duration-[180ms] cursor-pointer focus-visible:outline-none focus-visible:ring-2"
      style="width:42px; height:24px; --tw-ring-color: var(--accent-ring)"
      [style.background]="checked() ? 'var(--accent)' : 'var(--surface-3)'"
      [attr.aria-checked]="checked()"
      [disabled]="disabled() || null"
      [class.opacity-50]="disabled()"
      (click)="toggle()"
    >
      <span
        class="absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-[180ms]"
        [style.transform]="checked() ? 'translateX(18px)' : 'translateX(0)'"
      ></span>
    </button>
  `,
  host: { style: 'display:contents' },
})
export class SwitchComponent {
  readonly checked = model<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly toggled = output<boolean>();

  toggle(): void {
    if (this.disabled()) return;
    const next = !this.checked();
    this.checked.set(next);
    this.toggled.emit(next);
  }
}

/**
 * Icon tile + label/description row with an integrated Switch.
 *
 * @example
 * <mns-toggle-row
 *   icon="Bell"
 *   label="Email notifications"
 *   desc="Receive updates via email"
 *   [(checked)]="emailEnabled"
 * />
 */
@Component({
  selector: 'mns-toggle-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, SwitchComponent],
  template: `
    <div class="flex items-center justify-between gap-4 py-3">
      <div class="flex items-center gap-3">
        @if (icon()) {
          <div
            class="w-9 h-9 rounded-[9px] bg-surface-3 text-muted grid place-items-center flex-shrink-0"
          >
            <mns-icon [name]="icon()!" [size]="18" />
          </div>
        }
        <div>
          <div class="text-sm font-semibold">{{ label() }}</div>
          @if (desc()) {
            <div class="text-[13px] text-muted mt-0.5">{{ desc() }}</div>
          }
        </div>
      </div>
      <mns-switch [(checked)]="checked" [disabled]="disabled()" (toggled)="toggled.emit($event)" />
    </div>
  `,
  host: { style: 'display:contents' },
})
export class ToggleRowComponent {
  readonly icon = input<IconName | undefined>(undefined);
  readonly label = input.required<string>();
  readonly desc = input<string | undefined>(undefined);
  readonly checked = model<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly toggled = output<boolean>();
}
