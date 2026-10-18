import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// cookie-parser is a CommonJS `export =` module; import-equals is the only form
// that stays callable under TS 6.0 without enabling esModuleInterop (which would
// break jest.spyOn on namespace imports elsewhere).
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { raw } from 'express';
import helmet from 'helmet';
import { resolveNdiHlsMaxUploadBytes } from './live-stream/ndi-hls-limits';
import { registerBodyParsers } from './common/body-parsers';
import { requireBearerHeader } from './live-stream/require-bearer-header';

export const CAPTURE_LICENSE_TEXT_ROUTE = '/api/agents/me/capture-plugin/license-text';

const NDI_HLS_SEGMENT_TYPE = 'video/mp2t';
const NDI_HLS_PLAYLIST_TYPE = 'application/vnd.apple.mpegurl';

/**
 * Everything `main.ts` configures on the HTTP app before it listens: security
 * headers, body parsers, cookies, CORS, the `/api` prefix and the global
 * validation pipe. Shared with the app-configuration spec, so a regression in
 * any of it (the body parsers once left every JSON route with an empty body)
 * fails CI. The app must be created with `bodyParser: false`.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);

  // Security headers on every API response. This matters beyond the SPA: the
  // container publishes the backend port, so the API is reachable without the
  // Caddy headers in front of it.
  app.use(
    helmet({
      // The API returns JSON, media files and HLS playlists, never HTML pages,
      // so a page-oriented CSP buys nothing. Kept minimal and explicit instead.
      contentSecurityPolicy: {
        directives: { 'default-src': ["'none'"], 'frame-ancestors': ["'none'"] },
      },
      // The player and the admin SPA are separate origins and legitimately load
      // media from the API, which helmet's same-origin default would block.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  // The HLS upload route takes raw bytes. Registered here, ahead of Nest's own
  // JSON/urlencoded parsers (which Nest adds at init), and scoped to that path
  // and two content types, so every other route keeps its normal parsing.
  // The cheap Bearer-header check runs first so an unauthenticated client
  // cannot make the server buffer a body; the agent guard verifies the token.
  app.use(
    '/api/agents/me/live-streams',
    requireBearerHeader,
    raw({
      type: [NDI_HLS_SEGMENT_TYPE, NDI_HLS_PLAYLIST_TYPE],
      limit: resolveNdiHlsMaxUploadBytes(config),
    }),
  );
  // Nest's own body parsers are off (`bodyParser: false`): a path-scoped
  // `json()` carries the same internal name as Nest's global one, which makes
  // Nest skip registering it and leaves every other route without JSON parsing.
  registerBodyParsers(app, { licenseTextRoute: CAPTURE_LICENSE_TEXT_ROUTE });
  app.use(cookieParser());
  // The admin SPA (PUBLIC_BASE_URL) sends credentialed cookies; the player app
  // (PLAYER_BASE_URL) is a separate origin that calls the public pairing routes
  // and the screen-auth routes with Bearer/X-Pairing-Secret headers. Allow both
  // when configured; otherwise (dev with neither set) reflect the request origin.
  // An array origin reflects the matching origin, which is compatible with
  // `credentials: true` (unlike a wildcard).
  const publicBaseUrl = config.get<string>('PUBLIC_BASE_URL');
  const playerBaseUrl = config.get<string>('PLAYER_BASE_URL');
  const allowedOrigins = [publicBaseUrl, playerBaseUrl].filter(
    (origin): origin is string => !!origin,
  );
  // Fail closed in production: reflecting any origin together with
  // `credentials: true` means every site can call the API with the user's
  // cookies. In development neither base URL is usually set, so reflection
  // stays available there.
  if (allowedOrigins.length === 0 && config.get<string>('NODE_ENV') === 'production') {
    throw new Error('PUBLIC_BASE_URL (and PLAYER_BASE_URL, if used) must be set in production');
  }
  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
