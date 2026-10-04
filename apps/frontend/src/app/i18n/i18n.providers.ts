import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeEn from '@angular/common/locales/en';
import {
  APP_INITIALIZER,
  EnvironmentProviders,
  LOCALE_ID,
  makeEnvironmentProviders,
  Provider,
} from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { environment } from '../../environments/environment';
import { AVAILABLE_LANGS, DEFAULT_LANG } from './i18n.constants';
import { LanguageService } from './language.service';
import { TranslocoHttpLoader } from './transloco-http.loader';

/**
 * `LOCALE_ID` factory — resolves to the active language's Angular locale
 * (e.g. `de-DE`) so `DatePipe`/number pipes format per the chosen language.
 */
function localeIdFactory(language: LanguageService): string {
  return language.locale();
}

/** Eagerly construct {@link LanguageService} at bootstrap so the initial
 * language (localStorage → navigator.language → default) is applied before the
 * first render. */
function initLanguage(language: LanguageService): () => void {
  return () => {
    language.lang();
  };
}

/**
 * Provides Transloco runtime i18n (de/en), the locale coupling for Angular
 * date/number pipes, and the message-format plugin for pluralization.
 */
export function provideI18n(): EnvironmentProviders {
  registerLocaleData(localeDe);
  registerLocaleData(localeEn);

  const providers: Provider[] = [
    {
      provide: LOCALE_ID,
      useFactory: localeIdFactory,
      deps: [LanguageService],
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initLanguage,
      deps: [LanguageService],
      multi: true,
    },
  ];

  return makeEnvironmentProviders([
    ...providers,
    provideTransloco({
      config: {
        availableLangs: [...AVAILABLE_LANGS],
        defaultLang: DEFAULT_LANG,
        fallbackLang: DEFAULT_LANG,
        reRenderOnLangChange: true,
        missingHandler: {
          useFallbackTranslation: true,
          logMissingKey: !environment.production,
        },
        prodMode: environment.production,
      },
      loader: TranslocoHttpLoader,
    }),
    provideTranslocoMessageformat(),
  ]);
}
