import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  BtnComponent,
  ModalComponent,
  MultiSelectComponent,
  OverlayComponent,
  SFieldComponent,
  SInputComponent,
  SelectComponent,
  SelectOption,
  TimeInputComponent,
  ToggleRowComponent,
} from '../ui';
import { PRESET_COLOURS } from '../schedules/schedule-form-modal';
import {
  EventScheduleFormValue,
  validateEventScheduleForm,
  windowCrossesMidnight,
} from './event-schedule-state';

/**
 * Create or edit one event schedule rule. Holds its own copy of the form;
 * the parent saves what `save` emits and closes the modal on success.
 */
@Component({
  selector: 'app-event-schedule-rule-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BtnComponent,
    FormsModule,
    ModalComponent,
    MultiSelectComponent,
    OverlayComponent,
    SFieldComponent,
    SInputComponent,
    SelectComponent,
    TimeInputComponent,
    ToggleRowComponent,
    TranslocoDirective,
  ],
  template: `
    <mns-overlay (closed)="dismiss.emit()" *transloco="let t">
      <mns-modal [title]="title()" icon="Calendar" [widthPx]="560" (closed)="dismiss.emit()">
        <div class="flex flex-col gap-5">
          <mns-sfield [label]="t('sources.schedules.form.nameLabel')">
            <mns-sinput
              class="rule-name"
              [value]="value().name"
              [placeholder]="t('sources.schedules.form.namePlaceholder')"
              (valueChange)="patch({ name: $event })"
            />
          </mns-sfield>

          <mns-sfield
            [label]="t('sources.schedules.form.venuesLabel')"
            [hint]="t('sources.schedules.form.venuesHint')"
          >
            <mns-multi-select
              [options]="venueOptions()"
              [values]="value().venues"
              [placeholder]="t('sources.schedules.form.venuesPlaceholder')"
              [ariaLabel]="t('sources.schedules.form.venuesLabel')"
              (changed)="patch({ venues: $event })"
            />
          </mns-sfield>

          <mns-sfield [label]="t('sources.schedules.form.playlistLabel')">
            <mns-select
              [options]="playlistOptions()"
              [value]="value().playlistId"
              [ariaLabel]="t('sources.schedules.form.playlistLabel')"
              (changed)="patch({ playlistId: $event })"
            />
          </mns-sfield>

          <mns-sfield
            [label]="t('sources.schedules.form.windowLabel')"
            [hint]="
              crossesMidnight()
                ? t('sources.schedules.form.windowNextDay')
                : t('sources.schedules.form.windowHint')
            "
          >
            <div class="flex items-center gap-2">
              <mns-time-input
                class="w-[6.5rem]"
                inputId="rule-window-start"
                [ngModel]="value().windowStart"
                (ngModelChange)="patch({ windowStart: $event })"
              />
              <span class="text-muted">–</span>
              <mns-time-input
                class="w-[6.5rem]"
                inputId="rule-window-end"
                [ngModel]="value().windowEnd"
                (ngModelChange)="patch({ windowEnd: $event })"
              />
            </div>
          </mns-sfield>

          <mns-sfield
            [label]="t('sources.schedules.form.targetsLabel')"
            [hint]="t('sources.schedules.form.targetsHint')"
          >
            <mns-multi-select
              [options]="targetOptions()"
              [values]="value().targets"
              [placeholder]="t('sources.schedules.form.targetsPlaceholder')"
              [ariaLabel]="t('sources.schedules.form.targetsLabel')"
              (changed)="patch({ targets: $event })"
            />
          </mns-sfield>

          <mns-sfield [label]="t('sources.schedules.form.colourLabel')">
            <div class="flex flex-wrap gap-2">
              @for (c of colours; track c) {
                <button
                  type="button"
                  class="colour-swatch w-7 h-7 rounded-[8px] cursor-pointer"
                  [style.background]="c"
                  [style.border]="value().colour === c ? '2px solid #fff' : '2px solid transparent'"
                  [style.box-shadow]="value().colour === c ? '0 0 0 2px ' + c : 'none'"
                  [attr.aria-label]="t('schedules.form.selectColour', { colour: c })"
                  [attr.aria-pressed]="value().colour === c"
                  (click)="patch({ colour: c })"
                ></button>
              }
            </div>
          </mns-sfield>

          <mns-toggle-row
            icon="X"
            [label]="t('sources.schedules.form.excludeCancelledLabel')"
            [desc]="t('sources.schedules.form.excludeCancelledDesc')"
            [checked]="value().excludeCancelled"
            (toggled)="patch({ excludeCancelled: $event })"
          />

          <mns-toggle-row
            icon="Calendar"
            [label]="t('sources.schedules.form.enabledLabel')"
            [desc]="t('sources.schedules.form.enabledDesc')"
            [checked]="value().enabled"
            (toggled)="patch({ enabled: $event })"
          />

          @if (submitted() && errors().length > 0) {
            <ul class="form-errors flex flex-col gap-1 text-offline text-sm">
              @for (error of errors(); track error) {
                <li>{{ t('sources.schedules.form.errors.' + error) }}</li>
              }
            </ul>
          }
        </div>

        <div slot="footer" class="flex gap-2.5 px-6 pb-5">
          <mns-btn class="flex-1" variant="outline" [full]="true" (mnsClick)="dismiss.emit()">
            {{ t('common.actions.cancel') }}
          </mns-btn>
          <mns-btn
            class="save-rule flex-1"
            variant="primary"
            icon="Check"
            [full]="true"
            [disabled]="saving()"
            (mnsClick)="submit()"
          >
            {{ saving() ? t('sources.detail.saving') : t('common.actions.save') }}
          </mns-btn>
        </div>
      </mns-modal>
    </mns-overlay>
  `,
})
export class EventScheduleRuleModal {
  readonly title = input.required<string>();
  readonly initial = input.required<EventScheduleFormValue>();
  readonly venueOptions = input.required<SelectOption[]>();
  readonly playlistOptions = input.required<SelectOption[]>();
  readonly targetOptions = input.required<SelectOption[]>();
  readonly saving = input(false);

  readonly save = output<EventScheduleFormValue>();
  readonly dismiss = output<void>();

  protected readonly colours = PRESET_COLOURS;
  protected readonly value = linkedSignal(() => this.initial());
  protected readonly submitted = signal(false);
  protected readonly errors = computed(() => validateEventScheduleForm(this.value()));
  protected readonly crossesMidnight = computed(() =>
    windowCrossesMidnight(this.value().windowStart, this.value().windowEnd),
  );

  protected patch(change: Partial<EventScheduleFormValue>): void {
    this.value.update((current) => ({ ...current, ...change }));
  }

  submit(): void {
    this.submitted.set(true);
    if (this.errors().length > 0) return;
    this.save.emit(this.value());
  }
}
