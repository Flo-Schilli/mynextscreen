import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import de from '../../assets/i18n/de.json';
import en from '../../assets/i18n/en.json';
import { AVAILABLE_LANGS, DEFAULT_LANG } from './i18n.constants';

/**
 * Transloco test harness wired to the real `de`/`en` translation files so
 * specs assert production strings — not stand-ins. Default language matches the
 * app ({@link DEFAULT_LANG}); switch via `TranslocoService.setActiveLang`.
 */
export function getTranslocoTestingModule(options: TranslocoTestingOptions = {}) {
  const { translocoConfig, langs, ...rest } = options;
  return TranslocoTestingModule.forRoot({
    langs: { de, en, ...langs },
    translocoConfig: {
      availableLangs: [...AVAILABLE_LANGS],
      defaultLang: DEFAULT_LANG,
      fallbackLang: DEFAULT_LANG,
      reRenderOnLangChange: true,
      ...translocoConfig,
    },
    preloadLangs: true,
    ...rest,
  });
}
