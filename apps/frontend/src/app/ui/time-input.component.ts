/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { formatIsoTime, parseLocalTime } from '../i18n/locale-date-input';
import { FIELD_BOX_CLASS, FIELD_INPUT_CLASS, LocaleTextField } from './locale-text-field';

/**
 * Time field in the app's language: 24-hour in German, AM/PM in English.
 * The model value is `HH:mm` or `''`, as `<input type="time">` produced.
 *
 * @example
 * <mns-time-input inputId="start" [(ngModel)]="startTime" />
 */
@Component({
  selector: 'mns-time-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TimeInputComponent), multi: true },
  ],
  template: `
    <div
      *transloco="let t"
      [class]="boxClass"
      [class.bg-surface]="tone() === 'surface'"
      [class.bg-surface-2]="tone() === 'raised'"
      [class.border-border-strong]="!showError()"
      [class.border-offline]="showError()"
      [class.ring-[3px]]="focused()"
      [style.--tw-ring-color]="'var(--accent-soft)'"
    >
      <input
        type="text"
        autocomplete="off"
        [id]="inputId()"
        [class]="inputClass"
        [placeholder]="t('ui.timeInput.placeholder')"
        [value]="text()"
        [disabled]="disabled()"
        [attr.aria-invalid]="showError()"
        [attr.title]="parseError() ? t('ui.timeInput.invalid') : null"
        (input)="onInput($event)"
        (focus)="focused.set(true)"
        (blur)="onBlur()"
        (keydown.enter)="commit()"
      />
    </div>
  `,
  host: { class: 'block' },
})
export class TimeInputComponent extends LocaleTextField {
  protected readonly boxClass = FIELD_BOX_CLASS;
  protected readonly inputClass = `${FIELD_INPUT_CLASS} font-mono`;

  protected format(iso: string, locale: string): string {
    return formatIsoTime(iso, locale);
  }

  protected parse(text: string): string | null {
    return parseLocalTime(text);
  }
}
