/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, input, output, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent, IconName } from './icon.component';

/**
 * Styled text input with optional leading icon and suffix text.
 *
 * @example
 * <mns-sinput [(value)]="query" placeholder="Search…" icon="Search" />
 * <mns-sinput [(value)]="port" [mono]="true" suffix="ms" />
 */
@Component({
  selector: 'mns-sinput',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div
      class="flex items-center gap-2 px-3 rounded-[10px] bg-surface border border-border-strong transition-all duration-[180ms]"
      [class.ring-[3px]]="focused"
      [style.--tw-ring-color]="'var(--accent-soft)'"
    >
      @if (icon()) {
        <mns-icon [name]="icon()!" [size]="16" class="text-muted flex-shrink-0" />
      }
      <input
        class="flex-1 min-w-0 py-2 bg-transparent text-sm text-text placeholder:text-faint outline-none"
        [class.font-mono]="mono()"
        [type]="type()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        [(ngModel)]="model"
        (focus)="focused = true"
        (blur)="focused = false"
        (ngModelChange)="valueChange.emit($event)"
      />
      @if (suffix()) {
        <span class="text-xs text-muted flex-shrink-0">{{ suffix() }}</span>
      }
    </div>
  `,
  host: { style: 'display:contents' },
})
export class SInputComponent {
  readonly icon = input<IconName | undefined>(undefined);
  readonly suffix = input<string | undefined>(undefined);
  readonly placeholder = input<string>('');
  readonly mono = input<boolean>(false);
  readonly type = input<string>('text');
  readonly disabled = input<boolean>(false);

  readonly value = input<string>('');
  protected readonly model = linkedSignal(this.value);
  readonly valueChange = output<string>();

  protected focused = false;
}

/**
 * Labelled form field wrapper: label + control slot + optional hint.
 *
 * @example
 * <mns-sfield label="API Key" hint="Regenerate to invalidate old key">
 *   <mns-sinput [(value)]="apiKey" [mono]="true" />
 * </mns-sfield>
 */
@Component({
  selector: 'mns-sfield',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-1.5">
      <span class="text-[12.5px] font-semibold text-muted tracking-wide">
        {{ label() }}
      </span>
      <ng-content />
      @if (hint()) {
        <span class="text-[11.5px] text-faint">{{ hint() }}</span>
      }
    </div>
  `,
  host: { style: 'display:contents' },
})
export class SFieldComponent {
  readonly label = input.required<string>();
  readonly hint = input<string | undefined>(undefined);
}
