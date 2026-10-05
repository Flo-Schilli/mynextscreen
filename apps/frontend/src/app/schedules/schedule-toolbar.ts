import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TargetOption } from './schedule.model';
import { ScheduleViewMode } from './schedule-calendar.service';
import { BtnComponent, IconComponent, SelectComponent, SelectOption } from '../ui';

/**
 * Presentational toolbar for the schedules view: target selector, view-mode
 * toggle, date navigation, and the create button. Holds no state — emits the
 * user's intent and lets the parent own the data.
 */
@Component({
  selector: 'app-schedule-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SelectComponent, BtnComponent, IconComponent, TranslocoDirective],
  template: `
    <div class="flex items-center gap-3 mb-5 flex-wrap" *transloco="let t">
      <!-- Target selector — id="targetSelect" preserved for specs -->
      <div id="targetSelect" class="flex items-center gap-2">
        <span class="text-sm font-semibold text-muted">{{ t('schedules.toolbar.target') }}</span>
        <div class="min-w-[14rem]">
          <mns-select
            [options]="targetOptions()"
            [value]="selectedTargetId()"
            [placeholder]="t('schedules.toolbar.targetPlaceholder')"
            (changed)="targetChange.emit($event)"
          />
        </div>
      </div>

      <!-- View-mode segmented control -->
      <div class="flex gap-[2px] p-[3px] rounded-[11px] bg-surface-2 border border-border view-seg">
        @for (v of viewOptions(); track v.value) {
          <button
            type="button"
            class="seg-btn px-3 py-[5px] rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-[150ms]"
            [class.active]="viewMode() === v.value"
            [class.bg-surface]="viewMode() === v.value"
            [class.text-text]="viewMode() === v.value"
            [class.text-muted]="viewMode() !== v.value"
            [style.box-shadow]="viewMode() === v.value ? 'var(--shadow)' : 'none'"
            (click)="viewChange.emit(v.value)"
          >
            {{ v.label }}
          </button>
        }
      </div>

      <!-- Navigation -->
      <div class="flex items-center gap-1.5 nav-buttons">
        <button
          type="button"
          class="grid place-items-center w-8 h-8 rounded-lg border border-border-strong bg-surface text-muted cursor-pointer transition-colors duration-[150ms] hover:bg-surface-3 hover:text-text"
          [title]="t('schedules.toolbar.previous')"
          (click)="prev.emit()"
        >
          <span class="inline-grid place-items-center rotate-180">
            <mns-icon name="Chevron" [size]="16" />
          </span>
        </button>
        <mns-btn variant="outline" size="sm" (mnsClick)="today.emit()">{{
          t('schedules.toolbar.today')
        }}</mns-btn>
        <button
          type="button"
          class="grid place-items-center w-8 h-8 rounded-lg border border-border-strong bg-surface text-muted cursor-pointer transition-colors duration-[150ms] hover:bg-surface-3 hover:text-text"
          [title]="t('schedules.toolbar.next')"
          (click)="next.emit()"
        >
          <mns-icon name="Chevron" [size]="16" />
        </button>
        <span class="current-range text-sm font-semibold text-text min-w-[10rem] ml-1">
          {{ currentRangeLabel() }}
        </span>
      </div>

      <div class="ml-auto">
        <mns-btn variant="primary" icon="Plus" (mnsClick)="create.emit()">{{
          t('schedules.toolbar.newSchedule')
        }}</mns-btn>
      </div>
    </div>
  `,
})
export class ScheduleToolbar {
  readonly screenTargets = input.required<TargetOption[]>();
  readonly groupTargets = input.required<TargetOption[]>();
  readonly selectedTargetId = input.required<string>();
  readonly viewMode = input.required<ScheduleViewMode>();
  readonly currentRangeLabel = input.required<string>();

  readonly targetChange = output<string>();
  readonly viewChange = output<ScheduleViewMode>();
  readonly prev = output<void>();
  readonly today = output<void>();
  readonly next = output<void>();
  readonly create = output<void>();

  private readonly transloco = inject(TranslocoService);

  readonly viewOptions = computed<{ value: ScheduleViewMode; label: string }[]>(() => [
    { value: 'day', label: this.transloco.translate('schedules.toolbar.viewDay') },
    { value: 'week', label: this.transloco.translate('schedules.toolbar.viewWeek') },
    { value: 'month', label: this.transloco.translate('schedules.toolbar.viewMonth') },
  ]);

  /**
   * Flat option list for {@link SelectComponent} (no native optgroup support):
   * screens first, then groups, each prefixed with its kind.
   */
  readonly targetOptions = computed<SelectOption[]>(() => {
    const opts: SelectOption[] = [];
    for (const s of this.screenTargets()) {
      opts.push({
        value: 'screen:' + s.id,
        label: this.transloco.translate('schedules.toolbar.screenOption', { name: s.name }),
      });
    }
    for (const g of this.groupTargets()) {
      opts.push({
        value: 'group:' + g.id,
        label: this.transloco.translate('schedules.toolbar.groupOption', {
          name: g.name,
          mode: g.mode,
        }),
      });
    }
    return opts;
  });
}
