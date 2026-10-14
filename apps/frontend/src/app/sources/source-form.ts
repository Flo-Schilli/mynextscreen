import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  AdapterDescriptor,
  SLIDE_BACKGROUNDS,
  SLIDE_FORMATS,
  SlideBackground,
  SlideFormat,
  SYNC_INTERVAL_MAX_MINUTES,
  SYNC_INTERVAL_MIN_MINUTES,
} from './content-source.model';
import {
  SourceFormValue,
  formatLabel,
  toggleFormat,
  validateSourceForm,
  withAdapter,
} from './source-form-state';
import {
  IconComponent,
  SelectComponent,
  SelectOption,
  SFieldComponent,
  SInputComponent,
  ToggleRowComponent,
} from '../ui';

/** Parses a typed number; NaN for anything else, which validation then rejects. */
function toNumber(raw: string): number {
  return raw.trim() === '' ? Number.NaN : Number(raw);
}

/** A half-typed (NaN) number shows as an empty field rather than "NaN". */
function numText(value: number | undefined): string {
  return value === undefined || Number.isNaN(value) ? '' : String(value);
}

/**
 * Presentational source form: name, website (adapter) with its parameters
 * rendered from the adapter's `paramsSchema`, slide formats, slide style, sync
 * interval and the enabled switch. Two-way bound through `value`; the parent
 * validates with the same {@link validateSourceForm} and persists.
 */
@Component({
  selector: 'app-source-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IconComponent,
    SelectComponent,
    SFieldComponent,
    SInputComponent,
    ToggleRowComponent,
    TranslocoDirective,
  ],
  template: `
    <div class="flex flex-col gap-5" *transloco="let t">
      <mns-sfield [label]="t('sources.form.nameLabel')">
        <mns-sinput
          [value]="value().name"
          [placeholder]="t('sources.form.namePlaceholder')"
          [disabled]="disabled()"
          (valueChange)="patch({ name: $event })"
        />
      </mns-sfield>

      <mns-sfield
        [label]="t('sources.form.adapterLabel')"
        [hint]="adapterLocked() ? t('sources.form.adapterFixed') : undefined"
      >
        @if (adapterLocked() || disabled()) {
          <div class="px-3 py-2 rounded-[10px] bg-surface-2 border border-border text-sm">
            {{ adapter()?.label ?? value().adapterType }}
          </div>
        } @else if (adapters().length === 0) {
          <p class="text-sm text-muted">{{ t('sources.form.noAdapters') }}</p>
        } @else {
          <mns-select
            [options]="adapterOptions()"
            [value]="value().adapterType"
            [ariaLabel]="t('sources.form.adapterLabel')"
            (changed)="selectAdapter($event)"
          />
        }
      </mns-sfield>

      @for (field of schema(); track field.key) {
        <mns-sfield
          [label]="field.label"
          [hint]="t('sources.form.paramHint', { min: field.min, max: field.max })"
        >
          <mns-sinput
            type="number"
            [value]="numText(value().params[field.key])"
            [disabled]="disabled()"
            (valueChange)="setParam(field.key, $event)"
          />
        </mns-sfield>
      }

      <mns-sfield [label]="t('sources.form.formatsLabel')" [hint]="t('sources.form.formatsHint')">
        <div class="flex flex-wrap gap-2">
          @for (format of formats; track format) {
            <button
              type="button"
              class="format-toggle inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              [class.border-accent]="isFormatPicked(format)"
              [class.bg-accent-soft]="isFormatPicked(format)"
              [class.text-accent]="isFormatPicked(format)"
              [class.border-border-strong]="!isFormatPicked(format)"
              [attr.aria-pressed]="isFormatPicked(format)"
              [disabled]="disabled()"
              (click)="patch({ formats: toggle(format) })"
            >
              @if (isFormatPicked(format)) {
                <mns-icon name="Check" [size]="13" />
              }
              {{ label(format) }}
            </button>
          }
        </div>
      </mns-sfield>

      <div class="grid gap-4 sm:grid-cols-2">
        <mns-sfield [label]="t('sources.form.backgroundLabel')">
          <mns-select
            [options]="backgroundOptions()"
            [value]="value().style.background"
            [ariaLabel]="t('sources.form.backgroundLabel')"
            [searchable]="false"
            (changed)="setBackground($event)"
          />
        </mns-sfield>
        <mns-sfield [label]="t('sources.form.accentLabel')" [hint]="t('sources.form.accentHint')">
          <div class="flex items-center gap-2">
            <input
              type="color"
              class="h-[38px] w-12 flex-shrink-0 rounded-[10px] border border-border-strong bg-surface cursor-pointer"
              [value]="value().style.accentColor"
              [disabled]="disabled()"
              [attr.aria-label]="t('sources.form.accentLabel')"
              (input)="onColorInput($event)"
            />
            <mns-sinput
              [mono]="true"
              [value]="value().style.accentColor"
              [disabled]="disabled()"
              (valueChange)="setAccent($event)"
            />
          </div>
        </mns-sfield>
      </div>

      <mns-sfield
        [label]="t('sources.form.intervalLabel')"
        [hint]="t('sources.form.intervalHint', { min: intervalMin, max: intervalMax })"
      >
        <mns-sinput
          type="number"
          [value]="numText(value().syncIntervalMinutes)"
          [disabled]="disabled()"
          (valueChange)="patch({ syncIntervalMinutes: toNumber($event) })"
        />
      </mns-sfield>

      <mns-toggle-row
        icon="Refresh"
        [label]="t('sources.form.enabledLabel')"
        [desc]="t('sources.form.enabledDesc')"
        [checked]="value().enabled"
        [disabled]="disabled()"
        (toggled)="patch({ enabled: $event })"
      />

      @if (showErrors() && errors().length > 0) {
        <ul class="form-errors flex flex-col gap-1 text-offline text-sm">
          @for (error of errors(); track error) {
            <li>{{ t('sources.form.errors.' + error) }}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class SourceForm {
  private readonly transloco = inject(TranslocoService);

  readonly adapters = input.required<AdapterDescriptor[]>();
  readonly value = model.required<SourceFormValue>();
  /** True for an existing source: its adapter cannot change any more. */
  readonly adapterLocked = input(false);
  /** Read-only, for viewers. */
  readonly disabled = input(false);
  /** Errors stay hidden until the parent's first submit attempt. */
  readonly showErrors = input(false);

  protected readonly formats = SLIDE_FORMATS;
  protected readonly intervalMin = SYNC_INTERVAL_MIN_MINUTES;
  protected readonly intervalMax = SYNC_INTERVAL_MAX_MINUTES;
  protected readonly toNumber = toNumber;
  protected readonly numText = numText;

  protected readonly adapter = computed(() =>
    this.adapters().find((a) => a.type === this.value().adapterType),
  );
  protected readonly schema = computed(() => this.adapter()?.paramsSchema ?? []);
  protected readonly errors = computed(() => validateSourceForm(this.value(), this.schema()));

  protected readonly adapterOptions = computed<SelectOption[]>(() =>
    this.adapters().map((a) => ({ value: a.type, label: a.label })),
  );
  protected readonly backgroundOptions = computed<SelectOption[]>(() =>
    SLIDE_BACKGROUNDS.map((b) => ({
      value: b,
      label: this.transloco.translate('sources.form.background.' + b),
    })),
  );

  protected patch(change: Partial<SourceFormValue>): void {
    this.value.update((v) => ({ ...v, ...change }));
  }

  protected selectAdapter(type: string): void {
    const adapter = this.adapters().find((a) => a.type === type);
    this.value.update((v) => withAdapter(v, adapter));
  }

  protected setParam(key: string, raw: string): void {
    this.value.update((v) => ({ ...v, params: { ...v.params, [key]: toNumber(raw) } }));
  }

  protected setBackground(background: string): void {
    const picked = SLIDE_BACKGROUNDS.find((b) => b === background);
    if (!picked) return;
    this.setStyle({ background: picked });
  }

  protected onColorInput(event: Event): void {
    this.setAccent((event.target as HTMLInputElement).value);
  }

  protected setAccent(accentColor: string): void {
    this.setStyle({ accentColor: accentColor.trim() });
  }

  protected isFormatPicked(format: SlideFormat): boolean {
    return this.value().formats.includes(format);
  }

  protected toggle(format: SlideFormat): SlideFormat[] {
    return toggleFormat(this.value().formats, format);
  }

  protected label(format: SlideFormat): string {
    return formatLabel(format);
  }

  private setStyle(change: { background?: SlideBackground; accentColor?: string }): void {
    this.value.update((v) => ({ ...v, style: { ...v.style, ...change } }));
  }
}
