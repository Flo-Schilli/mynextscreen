import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
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
  GenreGroupValue,
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

          @if (value().playlistId) {
            <mns-sfield
              [label]="t('sources.schedules.form.genreGroupsLabel')"
              [hint]="
                isDynamic()
                  ? t('sources.schedules.form.genreGroupsHint')
                  : t('sources.schedules.form.genreGroupsHintStatic')
              "
            >
              <div class="flex flex-col gap-2">
                @for (
                  group of value().genreGroups;
                  track $index;
                  let i = $index, first = $first, last = $last
                ) {
                  <div
                    class="genre-group flex flex-col gap-1.5 rounded-lg border border-border p-2"
                  >
                    <div class="flex items-center gap-1.5">
                      <mns-multi-select
                        class="min-w-0 flex-1"
                        [options]="genrePickerOptions()"
                        [values]="group.genres"
                        [placeholder]="t('sources.schedules.form.genreGroupPlaceholder')"
                        [ariaLabel]="t('sources.schedules.form.genreGroupLabel', { n: i + 1 })"
                        (changed)="setGroup(i, { genres: $event })"
                      />
                      <mns-btn
                        class="move-group-up"
                        variant="ghost"
                        size="sm"
                        icon="ChevronUp"
                        [disabled]="first"
                        [title]="t('sources.schedules.form.moveUp')"
                        (mnsClick)="moveGroup(i, -1)"
                      />
                      <mns-btn
                        class="move-group-down"
                        variant="ghost"
                        size="sm"
                        icon="ChevronDown"
                        [disabled]="last"
                        [title]="t('sources.schedules.form.moveDown')"
                        (mnsClick)="moveGroup(i, 1)"
                      />
                      <mns-btn
                        class="remove-group"
                        variant="ghost"
                        size="sm"
                        icon="Trash"
                        [title]="t('common.actions.delete')"
                        (mnsClick)="removeGroup(i)"
                      />
                    </div>
                    <mns-select
                      class="group-playlist"
                      [options]="groupPlaylistOptions()"
                      [value]="group.playlistId"
                      [placeholder]="t('sources.schedules.form.groupPlaylistPlaceholder')"
                      [ariaLabel]="t('sources.schedules.form.groupPlaylistLabel', { n: i + 1 })"
                      (changed)="setGroup(i, { playlistId: $event })"
                    />
                    <p class="group-playlist-hint text-[12px] text-muted">
                      {{ t(groupPlaylistHint(group.playlistId)) }}
                    </p>
                  </div>
                }
                <mns-btn
                  class="add-genre-group self-start"
                  variant="outline"
                  size="sm"
                  icon="Plus"
                  (mnsClick)="addGroup()"
                >
                  {{ t('sources.schedules.form.addGenreGroup') }}
                </mns-btn>
              </div>
            </mns-sfield>
          }

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
  private readonly transloco = inject(TranslocoService);

  readonly title = input.required<string>();
  readonly initial = input.required<EventScheduleFormValue>();
  readonly venueOptions = input.required<SelectOption[]>();
  readonly playlistOptions = input.required<SelectOption[]>();
  readonly targetOptions = input.required<SelectOption[]>();
  /** Genres the source's events carry. */
  readonly genreOptions = input<string[]>([]);
  /** Playlists that may get genre groups: only a dynamic one has a genre filter to narrow. */
  readonly dynamicPlaylistIds = input<readonly string[]>([]);
  readonly saving = input(false);

  readonly save = output<EventScheduleFormValue>();
  readonly dismiss = output<void>();

  protected readonly colours = PRESET_COLOURS;
  protected readonly value = linkedSignal(() => this.initial());
  protected readonly submitted = signal(false);
  protected readonly isDynamic = computed(() =>
    this.dynamicPlaylistIds().includes(this.value().playlistId),
  );
  protected readonly errors = computed(() =>
    validateEventScheduleForm(this.value(), this.isDynamic()),
  );
  /**
   * What a group can play: the rule's playlist narrowed to the group's genres
   * (only when that one is dynamic), or any of the organisation's playlists.
   */
  protected readonly groupPlaylistOptions = computed<SelectOption[]>(() => [
    ...(this.isDynamic()
      ? [{ value: '', label: this.transloco.translate('sources.schedules.form.groupPlaylistRule') }]
      : []),
    ...this.playlistOptions(),
  ]);
  /** Keeps genres a group names although no current event carries them. */
  protected readonly genrePickerOptions = computed<SelectOption[]>(() => {
    const names = new Set([
      ...this.genreOptions(),
      ...this.value().genreGroups.flatMap((group) => group.genres),
    ]);
    return [...names].map((name) => ({ value: name, label: name }));
  });
  protected readonly crossesMidnight = computed(() =>
    windowCrossesMidnight(this.value().windowStart, this.value().windowEnd),
  );

  protected patch(change: Partial<EventScheduleFormValue>): void {
    this.value.update((current) => ({ ...current, ...change }));
  }

  protected addGroup(): void {
    this.patch({ genreGroups: [...this.value().genreGroups, { genres: [], playlistId: '' }] });
  }

  protected setGroup(index: number, change: Partial<GenreGroupValue>): void {
    this.patch({
      genreGroups: this.value().genreGroups.map((group, i) =>
        i === index ? { ...group, ...change } : group,
      ),
    });
  }

  /** What the chosen playlist will do with the group's genres. */
  protected groupPlaylistHint(playlistId: string): string {
    if (playlistId === '') {
      return 'sources.schedules.form.groupPlaylistHintRule';
    }
    return this.dynamicPlaylistIds().includes(playlistId)
      ? 'sources.schedules.form.groupPlaylistHintDynamic'
      : 'sources.schedules.form.groupPlaylistHintStatic';
  }

  protected moveGroup(index: number, step: -1 | 1): void {
    const groups = [...this.value().genreGroups];
    const target = index + step;
    if (target < 0 || target >= groups.length) return;
    [groups[index], groups[target]] = [groups[target], groups[index]];
    this.patch({ genreGroups: groups });
  }

  protected removeGroup(index: number): void {
    this.patch({ genreGroups: this.value().genreGroups.filter((_, i) => i !== index) });
  }

  submit(): void {
    this.submitted.set(true);
    if (this.errors().length > 0) return;
    this.save.emit(this.value());
  }
}
