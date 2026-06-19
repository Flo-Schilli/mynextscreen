import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent, IconName } from '../ui';
import { ScreenGroupMode } from './screen-group.model';

interface ModeOption {
  key: ScreenGroupMode;
  title: string;
  desc: string;
  icon: IconName;
}

const MODES: ModeOption[] = [
  { key: 'mirror', title: 'Mirror', desc: 'Same content on every screen at once', icon: 'Copy' },
  {
    key: 'split',
    title: 'Split',
    desc: 'One image or video spread across a video wall',
    icon: 'Grid',
  },
];

/**
 * Two large mode-cards (Mirror / Split) used in the create/edit modals and the
 * detail "Display mode" card. Presentational — emits the chosen mode.
 */
@Component({
  selector: 'app-screen-group-mode-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      @for (m of modes; track m.key) {
        <button
          type="button"
          class="text-left p-3.5 rounded-[13px] cursor-pointer border transition-all duration-[150ms]"
          [class.border-accent]="value() === m.key"
          [class.bg-accent-soft]="value() === m.key"
          [class.border-border-strong]="value() !== m.key"
          [class.bg-transparent]="value() !== m.key"
          [style.box-shadow]="value() === m.key ? '0 0 0 3px var(--accent-soft)' : 'none'"
          (click)="modeChange.emit(m.key)"
        >
          <span
            class="grid place-items-center w-[34px] h-[34px] rounded-[9px] mb-2.5"
            [class.bg-accent]="value() === m.key"
            [class.text-white]="value() === m.key"
            [class.bg-surface-3]="value() !== m.key"
            [class.text-muted]="value() !== m.key"
          >
            <mns-icon [name]="m.icon" [size]="18" />
          </span>
          <div class="font-bold text-sm" [class.text-accent]="value() === m.key">
            {{ m.title }}
          </div>
          <div class="text-xs text-muted mt-0.5 leading-[1.4]">{{ m.desc }}</div>
        </button>
      }
    </div>
  `,
})
export class ScreenGroupModeToggle {
  readonly value = input.required<ScreenGroupMode>();
  readonly modeChange = output<ScreenGroupMode>();

  protected readonly modes = MODES;
}
