import { Directive, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';
import { AppLang, DEFAULT_LANG, LOCALE_BY_LANG, isAppLang } from '../i18n/i18n.constants';

/**
 * Shared behaviour of the date and time fields: a text box that shows the
 * value in the active app locale while the form model keeps the ISO string.
 *
 * Typing does not touch the model; the text is read on blur or Enter. Text that
 * does not parse is kept so it can be corrected, flagged, and reported to the
 * model as empty, so a `required` validator or a filter never runs on a value
 * the field no longer shows.
 */
@Directive()
export abstract class LocaleTextField implements ControlValueAccessor {
  private readonly transloco = inject(TranslocoService);
  private readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  /**
   * Read from Transloco rather than `LanguageService`, which keeps the two in
   * sync: constructing that service switches Transloco's language, and doing
   * so from inside a view Transloco is rendering re-enters the render. The app
   * builds it at bootstrap, but nothing guarantees that for every host.
   */
  protected readonly lang = computed<AppLang>(() => {
    const lang = this.activeLang();
    return isAppLang(lang) ? lang : DEFAULT_LANG;
  });
  protected readonly locale = computed(() => LOCALE_BY_LANG[this.lang()]);

  /** Forwarded to the inner `<input>`, for labels and tests. */
  readonly inputId = input<string | undefined>(undefined);
  /** Set by the parent for errors the field cannot see, e.g. end before start. */
  readonly invalid = input<boolean>(false);
  /** `raised` matches the filter bars, which sit on a surface-2 background. */
  readonly tone = input<'surface' | 'raised'>('surface');

  protected readonly value = signal('');
  protected readonly text = signal('');
  protected readonly parseError = signal(false);
  protected readonly disabled = signal(false);
  protected readonly focused = signal(false);
  protected readonly showError = computed(() => this.parseError() || this.invalid());

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected abstract format(iso: string, locale: string): string;
  protected abstract parse(text: string, locale: string): string | null;

  constructor() {
    // Re-render in the new locale on a language switch, unless the box holds
    // text that did not parse: that is the user's to fix, not ours to replace.
    effect(() => {
      const locale = this.locale();
      untracked(() => {
        if (!this.parseError()) this.text.set(this.format(this.value(), locale));
      });
    });
  }

  writeValue(value: string | null | undefined): void {
    const iso = value ?? '';
    this.value.set(iso);
    this.parseError.set(false);
    this.text.set(this.format(iso, this.locale()));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
  }

  protected onBlur(): void {
    this.focused.set(false);
    this.commit();
    this.onTouched();
  }

  /** Reads the typed text into the model. */
  protected commit(): void {
    const raw = this.text().trim();
    if (!raw) {
      this.parseError.set(false);
      this.setValue('');
      return;
    }
    const iso = this.parse(raw, this.locale());
    if (iso === null) {
      this.parseError.set(true);
      this.setValue('');
      return;
    }
    this.parseError.set(false);
    this.text.set(this.format(iso, this.locale()));
    this.setValue(iso);
  }

  /** For a value picked rather than typed, e.g. from the calendar. */
  protected pick(iso: string): void {
    this.parseError.set(false);
    this.text.set(this.format(iso, this.locale()));
    this.setValue(iso);
  }

  private setValue(iso: string): void {
    if (iso === this.value()) return;
    this.value.set(iso);
    this.onChange(iso);
  }
}

/** Classes for the bordered box around the input, shared by both fields. */
export const FIELD_BOX_CLASS =
  'flex items-center rounded-[10px] border transition-all duration-[180ms]';
export const FIELD_INPUT_CLASS =
  'flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-text placeholder:text-faint outline-none disabled:opacity-60';
