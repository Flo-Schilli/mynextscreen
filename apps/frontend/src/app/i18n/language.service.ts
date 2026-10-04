import { computed, inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  AppLang,
  AVAILABLE_LANGS,
  isAppLang,
  LANG_STORAGE_KEY,
  LOCALE_BY_LANG,
  resolveInitialLang,
} from './i18n.constants';

/**
 * Owns the active UI language: resolves the initial value (localStorage →
 * `navigator.language` → default), persists changes, and keeps Transloco plus
 * the document `lang` attribute in sync. The active locale string
 * ({@link LOCALE_BY_LANG}) drives Angular `DatePipe`/number formatting.
 *
 * Business logic lives here, not in the switcher component.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);

  private readonly _lang = signal<AppLang>(
    resolveInitialLang(this.readStored(), this.readBrowserLang()),
  );

  /** The active language (`'de' | 'en'`). */
  readonly lang = this._lang.asReadonly();

  /** The Angular locale id for the active language (e.g. `de-DE`). */
  readonly locale = computed(() => LOCALE_BY_LANG[this._lang()]);

  /** All selectable languages, for the switcher UI. */
  readonly available = AVAILABLE_LANGS;

  constructor() {
    this.apply(this._lang());
  }

  /** Switch the active language and persist the choice. */
  setLang(lang: AppLang): void {
    if (lang === this._lang()) {
      return;
    }
    this._lang.set(lang);
    this.apply(lang);
  }

  private apply(lang: AppLang): void {
    this.transloco.setActiveLang(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Storage may be unavailable (private mode); ignore — in-memory only.
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }

  private readStored(): string | null {
    try {
      return localStorage.getItem(LANG_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private readBrowserLang(): string | null {
    if (typeof navigator === 'undefined') {
      return null;
    }
    return navigator.language ?? null;
  }
}

/** Re-export for consumers that only need the guard. */
export { isAppLang };
