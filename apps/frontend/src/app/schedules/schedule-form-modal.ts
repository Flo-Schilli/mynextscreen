import { Component, OnInit, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScheduleEntry, TargetOption } from './schedule.model';
import { Playlist } from '../playlists/playlist.model';
import { ScreenGroup } from '../screen-groups/screen-group.model';
import { RecurrenceType } from './schedule-recurrence.service';

export const PRESET_COLOURS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#6366f1',
];

const WEEKDAY_OPTIONS = [
  { value: 'MO', label: 'Mon' },
  { value: 'TU', label: 'Tue' },
  { value: 'WE', label: 'Wed' },
  { value: 'TH', label: 'Thu' },
  { value: 'FR', label: 'Fri' },
  { value: 'SA', label: 'Sat' },
  { value: 'SU', label: 'Sun' },
];

/** The raw form values the modal emits; the parent validates and persists them. */
export interface ScheduleFormResult {
  targetId: string;
  playlistId: string;
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
  imports: [FormsModule],
  template: `
    <div
      class="modal-overlay"
      (click)="dismiss.emit()"
      role="dialog"
      tabindex="-1"
      (keydown.escape)="dismiss.emit()"
    >
      <div
        class="modal"
        (click)="$event.stopPropagation()"
        (keydown.enter)="$event.stopPropagation()"
        role="document"
        tabindex="0"
      >
        <h2>{{ editingEntry() ? 'Edit Schedule Entry' : 'Create Schedule Entry' }}</h2>
        <form (ngSubmit)="submit()">
          <!-- Target Selector (create only) -->
          @if (!editingEntry()) {
            <div class="form-group">
              <label for="modalTarget">Target</label>
              <select
                id="modalTarget"
                [(ngModel)]="targetId"
                (ngModelChange)="updateTargetGroup()"
                name="modalTarget"
                required
              >
                <option value="" disabled>Select a screen or group</option>
                @if (screenTargets().length > 0) {
                  <optgroup label="Screens">
                    @for (opt of screenTargets(); track opt.id) {
                      <option [value]="'screen:' + opt.id">&#9633; {{ opt.name }}</option>
                    }
                  </optgroup>
                }
                @if (groupTargets().length > 0) {
                  <optgroup label="Screen Groups">
                    @for (opt of groupTargets(); track opt.id) {
                      <option [value]="'group:' + opt.id">
                        &#9638; {{ opt.name }} ({{ opt.mode }})
                      </option>
                    }
                  </optgroup>
                }
              </select>
            </div>

            @if (targetGroup) {
              <div class="info-box">
                <span class="info-label">Mode:</span>
                {{ targetGroup.mode === 'mirror' ? 'Mirror' : 'Split' }} ({{
                  targetGroup.mode === 'mirror'
                    ? 'all screens show the same content'
                    : targetGroup.gridColumns + 'x' + targetGroup.gridRows + ' grid'
                }})
              </div>
            }

            @if (targetGroup?.mode === 'split') {
              <div class="info-box info-box-warn">
                Content will be pre-sliced for each screen in the video wall. This may take a moment
                to process after saving.
              </div>
            }
          }

          <div class="form-group">
            <label for="modalPlaylist">Playlist</label>
            <select id="modalPlaylist" [(ngModel)]="playlistId" name="modalPlaylist" required>
              <option value="" disabled>Select a playlist</option>
              @for (p of playlists(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="modalStartDate">Start Date</label>
              <input
                id="modalStartDate"
                type="date"
                [(ngModel)]="startDate"
                name="modalStartDate"
                required
              />
            </div>
            <div class="form-group">
              <label for="modalStartTime">Start Time</label>
              <input
                id="modalStartTime"
                type="time"
                [(ngModel)]="startTime"
                name="modalStartTime"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="modalEndDate">End Date</label>
              <input
                id="modalEndDate"
                type="date"
                [(ngModel)]="endDate"
                name="modalEndDate"
                required
              />
            </div>
            <div class="form-group">
              <label for="modalEndTime">End Time</label>
              <input
                id="modalEndTime"
                type="time"
                [(ngModel)]="endTime"
                name="modalEndTime"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label for="modalColourCustom">Colour</label>
            <div class="colour-picker">
              @for (c of presetColours; track c) {
                <button
                  type="button"
                  class="colour-swatch"
                  [style.background]="c"
                  [class.selected]="colour === c"
                  (click)="colour = c"
                  [attr.aria-label]="'Select colour ' + c"
                >
                  &nbsp;
                </button>
              }
              <input
                id="modalColourCustom"
                type="color"
                [(ngModel)]="colour"
                name="modalColourCustom"
                class="colour-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="modalRecurrence">Recurrence</label>
            <select id="modalRecurrence" [(ngModel)]="recurrence" name="modalRecurrence">
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="weekdays">Specific weekdays</option>
            </select>
          </div>

          @if (recurrence === 'weekdays') {
            <div class="form-group">
              <span id="weekdayLabel" class="form-label-text">Days</span>
              <div class="weekday-checkboxes">
                @for (wd of weekdayOptions; track wd.value) {
                  <label class="weekday-checkbox">
                    <input
                      type="checkbox"
                      [checked]="weekdays.includes(wd.value)"
                      (change)="toggleWeekday(wd.value)"
                    />
                    {{ wd.label }}
                  </label>
                }
              </div>
            </div>
          }

          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <div class="form-actions">
            @if (editingEntry()) {
              <button type="button" class="btn btn-danger" (click)="remove.emit()">Delete</button>
            }
            <div class="form-actions-right">
              <button type="button" class="btn btn-secondary" (click)="dismiss.emit()">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                {{ submitting() ? 'Saving...' : editingEntry() ? 'Update' : 'Create' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: `
    .form-row {
      display: flex;
      gap: 0.75rem;
    }
    .form-row .form-group {
      flex: 1;
    }
    .form-label-text {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.25rem;
    }
    .form-actions-right {
      display: flex;
      gap: 0.75rem;
      margin-left: auto;
    }
    .info-box {
      padding: 0.5rem 0.75rem;
      background: color-mix(in srgb, var(--color-accent) 8%, var(--color-bg-primary));
      border: 1px solid color-mix(in srgb, var(--color-accent) 25%, var(--color-border));
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
      margin-bottom: 1rem;
    }
    .info-box .info-label {
      font-weight: 600;
      color: var(--color-text-primary);
    }
    .info-box-warn {
      background: color-mix(in srgb, #f59e0b 8%, var(--color-bg-primary));
      border-color: color-mix(in srgb, #f59e0b 25%, var(--color-border));
    }
    .colour-picker {
      display: flex;
      gap: 0.375rem;
      flex-wrap: wrap;
      align-items: center;
    }
    .colour-swatch {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 0.25rem;
      border: 2px solid transparent;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .colour-swatch:hover {
      border-color: var(--color-text-muted);
    }
    .colour-swatch.selected {
      border-color: #fff;
      box-shadow: 0 0 0 1px var(--color-accent);
    }
    .colour-input {
      width: 2rem !important;
      height: 1.5rem;
      padding: 0 !important;
      border: 1px solid var(--color-border) !important;
      border-radius: 0.25rem;
      cursor: pointer;
      background: transparent !important;
    }
    .weekday-checkboxes {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .weekday-checkbox {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      color: var(--color-text-primary);
      cursor: pointer;
    }
    .weekday-checkbox input[type='checkbox'] {
      width: auto;
      accent-color: var(--color-accent);
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
  readonly initialStart = input.required<Date>();
  readonly initialEnd = input.required<Date>();
  readonly initialColour = input.required<string>();
  readonly initialRecurrence = input.required<RecurrenceType>();
  readonly initialWeekdays = input.required<string[]>();

  readonly save = output<ScheduleFormResult>();
  readonly remove = output<void>();
  readonly dismiss = output<void>();

  readonly presetColours = PRESET_COLOURS;
  readonly weekdayOptions = WEEKDAY_OPTIONS;

  targetId = '';
  targetGroup: ScreenGroup | null = null;
  playlistId = '';
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
    this.startDate = this.toDateInputValue(this.initialStart());
    this.startTime = this.toTimeInputValue(this.initialStart());
    this.endDate = this.toDateInputValue(this.initialEnd());
    this.endTime = this.toTimeInputValue(this.initialEnd());
    this.colour = this.initialColour();
    this.recurrence = this.initialRecurrence();
    this.weekdays = [...this.initialWeekdays()];
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

  toggleWeekday(value: string): void {
    this.weekdays = this.weekdays.includes(value)
      ? this.weekdays.filter((d) => d !== value)
      : [...this.weekdays, value];
  }

  submit(): void {
    this.save.emit({
      targetId: this.targetId,
      playlistId: this.playlistId,
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
