import { ChangeDetectionStrategy, Component, OnInit, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ScheduleEntry, SchedulePriority, TargetOption } from './schedule.model';
import { Playlist } from '../playlists/playlist.model';
import { ScreenGroup } from '../screen-groups/screen-group.model';
import { RecurrenceType } from './schedule-recurrence.service';
import {
  OverlayComponent,
  ModalComponent,
  BtnComponent,
  IconComponent,
  IconName,
  SelectComponent,
  SelectOption,
  DateInputComponent,
  TimeInputComponent,
} from '../ui';

export const PRESET_COLOURS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

/** Weekday toggle values (labels resolved from `schedules.form.weekday.*`). */
const WEEKDAY_VALUES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

/** Quick weekday presets shown alongside the per-day toggles. */
const WEEKDAY_PRESETS: { labelKey: string; days: string[] }[] = [
  { labelKey: 'schedules.form.weekdayPreset.monFri', days: ['MO', 'TU', 'WE', 'TH', 'FR'] },
  { labelKey: 'schedules.form.weekdayPreset.weekends', days: ['SA', 'SU'] },
  {
    labelKey: 'schedules.form.weekdayPreset.allDays',
    days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
  },
];

/** Quick start/end time presets for the time window. */
const TIME_PRESETS: { labelKey: string; start: string; end: string }[] = [
  { labelKey: 'schedules.form.timePreset.business', start: '09:00', end: '17:00' },
  { labelKey: 'schedules.form.timePreset.morning', start: '06:00', end: '12:00' },
  { labelKey: 'schedules.form.timePreset.evening', start: '17:00', end: '22:00' },
  { labelKey: 'schedules.form.timePreset.allDay', start: '06:00', end: '23:00' },
];

const RECURRENCE_VALUES: RecurrenceType[] = ['none', 'daily', 'weekly', 'weekdays'];

const PRIORITY_OPTIONS: { value: SchedulePriority; icon: IconName }[] = [
  { value: 'normal', icon: 'Clock' },
  { value: 'high', icon: 'Layers' },
];

/** The raw form values the modal emits; the parent validates and persists them. */
export interface ScheduleFormResult {
  targetId: string;
  playlistId: string;
  name: string;
  priority: SchedulePriority;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  colour: string;
  recurrence: RecurrenceType;
  weekdays: string[];
}

/**
 * Create/edit schedule entry modal. Owns its own form state (initialized once
 * from the provided initial values) and emits the raw form on submit. All
 * validation, DTO building, and persistence stay in the parent, which feeds
 * `submitting`/`error` back in.
 */
@Component({
  selector: 'app-schedule-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    OverlayComponent,
    ModalComponent,
    BtnComponent,
    IconComponent,
    SelectComponent,
    DateInputComponent,
    TimeInputComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal
        [title]="editingEntry() ? t('schedules.form.editTitle') : t('schedules.form.createTitle')"
        [sub]="t('schedules.form.sub')"
        icon="Calendar"
        [widthPx]="680"
        (closed)="dismiss.emit()"
      >
        <form (ngSubmit)="submit()">
          <div class="flex flex-col gap-5">
            <!-- Name -->
            <div>
              <div class="text-[12.5px] font-semibold text-muted mb-[9px]">
                {{ t('schedules.form.nameLabel') }}
              </div>
              <input
                type="text"
                [(ngModel)]="name"
                name="modalName"
                maxlength="120"
                [placeholder]="t('schedules.form.namePlaceholder')"
                class="w-full px-3.5 py-2.5 rounded-[10px] bg-surface-2 border border-border-strong text-text text-sm"
              />
            </div>

            <!-- Target Selector (create only) -->
            @if (!editingEntry()) {
              <div id="modalTarget">
                <div class="text-[12.5px] font-semibold text-muted mb-[9px]">
                  {{ t('schedules.form.targetLabel') }}
                </div>
                <mns-select
                  [options]="targetSelectOptions()"
                  [value]="targetId"
                  [placeholder]="t('schedules.form.targetPlaceholder')"
                  (changed)="onTargetChange($event)"
                />
              </div>

              @if (targetGroup) {
                <div
                  class="info-box rounded-[10px] px-3.5 py-2.5 text-[13px] text-muted border"
                  style="background: color-mix(in srgb, var(--accent) 8%, var(--surface)); border-color: color-mix(in srgb, var(--accent) 25%, var(--border))"
                >
                  <span class="font-bold text-text">{{ t('schedules.form.modeLabel') }}</span>
                  {{
                    targetGroup.mode === 'mirror'
                      ? t('schedules.form.modeMirror')
                      : t('schedules.form.modeSplit')
                  }}
                  ({{
                    targetGroup.mode === 'mirror'
                      ? t('schedules.form.modeMirrorDesc')
                      : t('schedules.form.modeSplitDesc', {
                          columns: targetGroup.gridColumns,
                          rows: targetGroup.gridRows,
                        })
                  }})
                </div>
              }

              @if (targetGroup?.mode === 'split') {
                <div
                  class="info-box info-box-warn rounded-[10px] px-3.5 py-2.5 text-[13px] text-muted border"
                  style="background: color-mix(in srgb, var(--color-warn) 8%, var(--surface)); border-color: color-mix(in srgb, var(--color-warn) 28%, var(--border))"
                >
                  {{ t('schedules.form.splitWarning') }}
                </div>
              }
            }

            <!-- Playlist card grid -->
            <div>
              <div class="text-[12.5px] font-semibold text-muted mb-[9px]">
                {{ t('schedules.form.playlistLabel') }}
              </div>
              @if (playlists().length === 0) {
                <div class="text-[13px] text-muted">{{ t('schedules.form.noPlaylists') }}</div>
              } @else {
                <div
                  class="grid gap-2"
                  style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))"
                >
                  @for (p of playlists(); track p.id) {
                    <button
                      type="button"
                      class="playlist-card flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] text-left cursor-pointer border transition-colors duration-[120ms]"
                      [class.border-accent]="playlistId === p.id"
                      [class.bg-accent-soft]="playlistId === p.id"
                      [class.border-border]="playlistId !== p.id"
                      [class.bg-surface-2]="playlistId !== p.id"
                      (click)="playlistId = p.id"
                    >
                      <span
                        class="grid place-items-center w-[30px] h-[30px] rounded-lg flex-shrink-0 text-white"
                        [style.background]="
                          'linear-gradient(135deg, ' +
                          p.color +
                          ', color-mix(in srgb, ' +
                          p.color +
                          ' 55%, #fff))'
                        "
                      >
                        <mns-icon name="Playlists" [size]="15" />
                      </span>
                      <span class="flex-1 min-w-0">
                        <span class="block text-[13.5px] font-semibold text-text truncate">{{
                          p.name
                        }}</span>
                        <span class="block text-[11.5px] text-muted">{{
                          t('schedules.form.playlistItems', { count: p.items.length })
                        }}</span>
                      </span>
                      @if (playlistId === p.id) {
                        <mns-icon name="Check" [size]="16" class="text-accent flex-shrink-0" />
                      }
                    </button>
                  }
                </div>
              }
            </div>

            <!-- Recurrence -->
            <div>
              <div class="text-[12.5px] font-semibold text-muted mb-[9px]">
                {{ t('schedules.form.whenLabel') }}
              </div>
              <div
                class="flex gap-[2px] p-[3px] rounded-[11px] bg-surface-2 border border-border w-fit"
              >
                @for (r of recurrenceValues; track r) {
                  <button
                    type="button"
                    class="recurrence-btn px-3 py-[5px] rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-[150ms]"
                    [class.active]="recurrence === r"
                    [class.bg-surface]="recurrence === r"
                    [class.text-text]="recurrence === r"
                    [class.text-muted]="recurrence !== r"
                    [style.box-shadow]="recurrence === r ? 'var(--shadow)' : 'none'"
                    (click)="setRecurrence(r)"
                  >
                    {{ t('schedules.form.recurrence.' + r) }}
                  </button>
                }
              </div>
            </div>

            @if (recurrence === 'weekdays') {
              <div>
                <span class="text-[12.5px] font-semibold text-muted mb-[9px] block">{{
                  t('schedules.form.daysLabel')
                }}</span>
                <div class="flex gap-2 flex-wrap mb-2.5">
                  @for (wd of weekdayValues; track wd) {
                    <button
                      type="button"
                      class="weekday-checkbox px-3 py-[6px] rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-[150ms] border"
                      [class.border-accent]="weekdays.includes(wd)"
                      [class.text-accent]="weekdays.includes(wd)"
                      [class.bg-accent-soft]="weekdays.includes(wd)"
                      [class.border-border-strong]="!weekdays.includes(wd)"
                      [class.text-muted]="!weekdays.includes(wd)"
                      (click)="toggleWeekday(wd)"
                    >
                      {{ t('schedules.form.weekday.' + wd) }}
                    </button>
                  }
                </div>
                <div class="flex gap-[7px] flex-wrap">
                  @for (preset of weekdayPresets; track preset.labelKey) {
                    <button
                      type="button"
                      class="day-preset px-[11px] py-[5px] rounded-full text-xs font-semibold cursor-pointer border transition-colors duration-[120ms]"
                      [class.border-accent]="isWeekdayPresetActive(preset.days)"
                      [class.text-accent]="isWeekdayPresetActive(preset.days)"
                      [class.bg-accent-soft]="isWeekdayPresetActive(preset.days)"
                      [class.border-border]="!isWeekdayPresetActive(preset.days)"
                      [class.text-muted]="!isWeekdayPresetActive(preset.days)"
                      (click)="applyWeekdayPreset(preset.days)"
                    >
                      {{ t(preset.labelKey) }}
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Date / time window -->
            <div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div class="text-[12.5px] font-semibold text-muted mb-[9px]">
                    {{ t('schedules.form.startLabel') }}
                  </div>
                  <div class="flex gap-2">
                    <mns-date-input
                      [(ngModel)]="startDate"
                      name="modalStartDate"
                      required
                      class="flex-1 min-w-0"
                    />
                    <mns-time-input
                      [(ngModel)]="startTime"
                      name="modalStartTime"
                      required
                      class="w-[6.5rem]"
                    />
                  </div>
                </div>
                <div>
                  <div class="text-[12.5px] font-semibold text-muted mb-[9px]">
                    {{ t('schedules.form.endLabel') }}
                  </div>
                  <div class="flex gap-2">
                    <mns-date-input
                      [(ngModel)]="endDate"
                      name="modalEndDate"
                      required
                      class="flex-1 min-w-0"
                      [invalid]="isTimeRangeInvalid()"
                    />
                    <mns-time-input
                      [(ngModel)]="endTime"
                      name="modalEndTime"
                      required
                      class="w-[6.5rem]"
                      [invalid]="isTimeRangeInvalid()"
                    />
                  </div>
                </div>
              </div>

              @if (isTimeRangeInvalid()) {
                <p class="text-xs text-offline mt-[7px]">{{ t('schedules.form.endAfterStart') }}</p>
              }

              <div class="flex gap-[7px] flex-wrap mt-2.5">
                @for (preset of timePresets; track preset.labelKey) {
                  <button
                    type="button"
                    class="time-preset px-[11px] py-[5px] rounded-full text-xs font-semibold cursor-pointer border transition-colors duration-[120ms]"
                    [class.border-accent]="isTimePresetActive(preset)"
                    [class.text-accent]="isTimePresetActive(preset)"
                    [class.bg-accent-soft]="isTimePresetActive(preset)"
                    [class.border-border]="!isTimePresetActive(preset)"
                    [class.text-muted]="!isTimePresetActive(preset)"
                    (click)="applyTimePreset(preset)"
                  >
                    {{ t(preset.labelKey) }}
                  </button>
                }
              </div>
            </div>

            <!-- Priority -->
            <div>
              <span class="flex items-center gap-2 text-[12.5px] font-semibold text-muted mb-[9px]">
                {{ t('schedules.form.priorityLabel') }}
                @if (priority === 'high') {
                  <span class="text-accent font-semibold">{{
                    t('schedules.form.priorityHint')
                  }}</span>
                }
              </span>
              <div class="flex gap-2">
                @for (p of priorityOptions; track p.value) {
                  <button
                    type="button"
                    class="priority-btn flex-1 flex items-center justify-center gap-2 py-[11px] rounded-[10px] text-[13.5px] font-semibold cursor-pointer border transition-colors duration-[120ms]"
                    [class.border-accent]="priority === p.value"
                    [class.text-accent]="priority === p.value"
                    [class.bg-accent-soft]="priority === p.value"
                    [class.border-border-strong]="priority !== p.value"
                    [class.text-muted]="priority !== p.value"
                    (click)="priority = p.value"
                  >
                    <mns-icon [name]="p.icon" [size]="16" />
                    {{ t('schedules.form.priority.' + p.value) }}
                  </button>
                }
              </div>
            </div>

            <!-- Colour -->
            <div>
              <div class="text-[12.5px] font-semibold text-muted mb-[9px]">
                {{ t('schedules.form.colourLabel') }}
              </div>
              <div class="flex gap-[9px] items-center flex-wrap">
                @for (c of presetColours; track c) {
                  <button
                    type="button"
                    class="colour-swatch w-7 h-7 rounded-[8px] cursor-pointer"
                    [style.background]="c"
                    [style.border]="colour === c ? '2px solid #fff' : '2px solid transparent'"
                    [style.box-shadow]="colour === c ? '0 0 0 2px ' + c : 'none'"
                    [attr.aria-label]="t('schedules.form.selectColour', { colour: c })"
                    (click)="colour = c"
                  ></button>
                }
                <input
                  type="color"
                  [(ngModel)]="colour"
                  name="modalColourCustom"
                  [attr.aria-label]="t('schedules.form.customColour')"
                  class="w-8 h-7 p-0 rounded-[8px] cursor-pointer bg-transparent border border-border-strong"
                />
              </div>
            </div>

            @if (error()) {
              <p class="error text-sm text-offline">{{ error() }}</p>
            }
          </div>

          <div slot="footer" class="flex items-center gap-2.5 px-6 py-4 border-t border-border">
            @if (editingEntry()) {
              <mns-btn variant="danger" class="btn-danger" (mnsClick)="remove.emit()">
                {{ t('common.actions.delete') }}
              </mns-btn>
            }
            <div class="flex gap-2.5 ml-auto">
              <mns-btn variant="outline" class="btn-secondary" (mnsClick)="dismiss.emit()">
                {{ t('common.actions.cancel') }}
              </mns-btn>
              <button
                type="submit"
                class="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white cursor-pointer"
                [class.opacity-50]="submitting()"
                [disabled]="submitting()"
              >
                @if (!submitting()) {
                  <mns-icon name="Check" [size]="16" />
                }
                {{
                  submitting()
                    ? t('schedules.form.saving')
                    : editingEntry()
                      ? t('schedules.form.update')
                      : t('schedules.form.create')
                }}
              </button>
            </div>
          </div>
        </form>
      </mns-modal>
    </mns-overlay>
  `,
  styles: `
    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      box-shadow: 0 8px 20px -10px var(--accent-ring);
      transition: filter 0.15s;
    }
    .btn-primary:not(:disabled):hover {
      filter: brightness(1.06);
    }
  `,
})
export class ScheduleFormModal implements OnInit {
  readonly editingEntry = input.required<ScheduleEntry | null>();
  readonly screenTargets = input.required<TargetOption[]>();
  readonly groupTargets = input.required<TargetOption[]>();
  readonly screenGroups = input.required<ScreenGroup[]>();
  readonly playlists = input.required<Playlist[]>();
  readonly submitting = input.required<boolean>();
  readonly error = input.required<string>();

  readonly initialTargetId = input.required<string>();
  readonly initialPlaylistId = input.required<string>();
  readonly initialName = input.required<string>();
  readonly initialPriority = input.required<SchedulePriority>();
  readonly initialStart = input.required<Date>();
  readonly initialEnd = input.required<Date>();
  readonly initialColour = input.required<string>();
  readonly initialRecurrence = input.required<RecurrenceType>();
  readonly initialWeekdays = input.required<string[]>();

  readonly save = output<ScheduleFormResult>();
  readonly remove = output<void>();
  readonly dismiss = output<void>();

  private readonly transloco = inject(TranslocoService);

  readonly presetColours = PRESET_COLOURS;
  readonly weekdayValues = WEEKDAY_VALUES;
  readonly weekdayPresets = WEEKDAY_PRESETS;
  readonly timePresets = TIME_PRESETS;
  readonly recurrenceValues = RECURRENCE_VALUES;
  readonly priorityOptions = PRIORITY_OPTIONS;

  targetId = '';
  targetGroup: ScreenGroup | null = null;
  playlistId = '';
  name = '';
  priority: SchedulePriority = 'normal';
  startDate = '';
  startTime = '';
  endDate = '';
  endTime = '';
  colour = PRESET_COLOURS[0];
  recurrence: RecurrenceType = 'none';
  weekdays: string[] = [];

  ngOnInit(): void {
    this.targetId = this.initialTargetId();
    this.playlistId = this.initialPlaylistId();
    this.name = this.initialName();
    this.priority = this.initialPriority();
    this.startDate = this.toDateInputValue(this.initialStart());
    this.startTime = this.toTimeInputValue(this.initialStart());
    this.endDate = this.toDateInputValue(this.initialEnd());
    this.endTime = this.toTimeInputValue(this.initialEnd());
    this.colour = this.initialColour();
    this.recurrence = this.initialRecurrence();
    this.weekdays = [...this.initialWeekdays()];
    this.updateTargetGroup();
  }

  targetSelectOptions(): SelectOption[] {
    const opts: SelectOption[] = [];
    for (const s of this.screenTargets()) {
      opts.push({
        value: 'screen:' + s.id,
        label: this.transloco.translate('schedules.form.screenOption', { name: s.name }),
      });
    }
    for (const g of this.groupTargets()) {
      opts.push({
        value: 'group:' + g.id,
        label: this.transloco.translate('schedules.form.groupOption', {
          name: g.name,
          mode: g.mode,
        }),
      });
    }
    return opts;
  }

  onTargetChange(value: string): void {
    this.targetId = value;
    this.updateTargetGroup();
  }

  updateTargetGroup(): void {
    if (this.targetId.startsWith('group:')) {
      const groupId = this.targetId.replace('group:', '');
      this.targetGroup = this.screenGroups().find((g) => g.id === groupId) || null;
    } else {
      this.targetGroup = null;
    }
  }

  setRecurrence(value: RecurrenceType): void {
    this.recurrence = value;
    if (value !== 'weekdays') {
      this.weekdays = [];
    }
  }

  toggleWeekday(value: string): void {
    this.weekdays = this.weekdays.includes(value)
      ? this.weekdays.filter((d) => d !== value)
      : [...this.weekdays, value];
  }

  applyWeekdayPreset(days: string[]): void {
    this.weekdays = [...days];
  }

  isWeekdayPresetActive(days: string[]): boolean {
    return days.length === this.weekdays.length && days.every((d) => this.weekdays.includes(d));
  }

  applyTimePreset(preset: { start: string; end: string }): void {
    this.startTime = preset.start;
    this.endTime = preset.end;
  }

  isTimePresetActive(preset: { start: string; end: string }): boolean {
    return this.startTime === preset.start && this.endTime === preset.end;
  }

  isTimeRangeInvalid(): boolean {
    if (!this.startDate || !this.startTime || !this.endDate || !this.endTime) {
      return false;
    }
    const start = new Date(`${this.startDate}T${this.startTime}:00`);
    const end = new Date(`${this.endDate}T${this.endTime}:00`);
    return end <= start;
  }

  submit(): void {
    this.save.emit({
      targetId: this.targetId,
      playlistId: this.playlistId,
      name: this.name.trim(),
      priority: this.priority,
      startDate: this.startDate,
      startTime: this.startTime,
      endDate: this.endDate,
      endTime: this.endTime,
      colour: this.colour,
      recurrence: this.recurrence,
      weekdays: this.weekdays,
    });
  }

  private toDateInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toTimeInputValue(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}
