/**
 * Central i18n configuration for the Admin SPA.
 *
 * Scope: frontend only. Player and backend are out of scope (see
 * docs/plans/02-i18n-frontend.md).
 */

/** Languages the Admin SPA ships translations for. */
export const AVAILABLE_LANGS = ['de', 'en'] as const;

export type AppLang = (typeof AVAILABLE_LANGS)[number];

/** Default and fallback language. */
export const DEFAULT_LANG: AppLang = 'de';

/** localStorage key the active language is persisted under. */
export const LANG_STORAGE_KEY = 'mynextscreen_lang';

/** Angular `LOCALE_ID` used for date/number formatting per language. */
export const LOCALE_BY_LANG: Record<AppLang, string> = {
  de: 'de-DE',
  en: 'en-US',
};

/** First day of the week in the date picker: Monday (1) for de, Sunday (0) for en. */
export const WEEK_START_BY_LANG: Record<AppLang, number> = {
  de: 1,
  en: 0,
};

/** Type guard narrowing an arbitrary string to a supported {@link AppLang}. */
export function isAppLang(value: string | null | undefined): value is AppLang {
  return value === 'de' || value === 'en';
}

/**
 * Resolve the initial language: persisted choice first, then the browser's
 * `navigator.language` as first-fill, then the default.
 */
export function resolveInitialLang(
  stored: string | null,
  browserLang: string | null | undefined,
): AppLang {
  if (isAppLang(stored)) {
    return stored;
  }
  const browserPrefix = (browserLang ?? '').slice(0, 2).toLowerCase();
  if (isAppLang(browserPrefix)) {
    return browserPrefix;
  }
  return DEFAULT_LANG;
}
