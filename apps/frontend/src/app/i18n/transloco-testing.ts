import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import de from '../../assets/i18n/de.json';
import en from '../../assets/i18n/en.json';
import { AVAILABLE_LANGS, DEFAULT_LANG } from './i18n.constants';

/**
 * Transloco test harness wired to the real `de`/`en` translation files so
 * specs assert production strings — not stand-ins. Default language matches the
 * app ({@link DEFAULT_LANG}); switch via `TranslocoService.setActiveLang`.
 *
 * Registers the message-format plugin so ICU params/pluralization resolve in
 * tests exactly as in production (`{count, plural, …}`, `{name}`).
 */
export function getTranslocoTestingModule(options: TranslocoTestingOptions = {}) {
  const { translocoConfig, langs, ...rest } = options;
  const moduleWithProviders = TranslocoTestingModule.forRoot({
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
  // Register the message-format plugin so ICU params/pluralization resolve in
  // tests exactly as in production (`{count, plural, …}`, `{name}`).
  moduleWithProviders.providers = [
    ...(moduleWithProviders.providers ?? []),
    provideTranslocoMessageformat(),
  ];
  return moduleWithProviders;
}
