import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { provideI18n } from './i18n/i18n.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withNavigationErrorHandler((error) => {
        const msg = String(error);
        if (msg.includes('dynamically imported module') || msg.includes('ChunkLoadError')) {
          window.location.reload();
        }
      }),
    ),
    provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
    provideI18n(),
  ],
};
