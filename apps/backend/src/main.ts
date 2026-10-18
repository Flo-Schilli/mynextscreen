import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
// cookie-parser is a CommonJS `export =` module; import-equals is the only form
// that stays callable under TS 6.0 without enabling esModuleInterop (which would
// break jest.spyOn on namespace imports elsewhere).
// eslint-disable-next-line @typescript-eslint/no-require-imports
import cookieParser = require('cookie-parser');
import { json, raw } from 'express';
import helmet from 'helmet';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as path from 'path';
import { AppModule } from './app.module';
import { resolveNdiHlsMaxUploadBytes } from './live-stream/ndi-hls-limits';
import { requireBearerHeader } from './live-stream/require-bearer-header';

/**
 * Two license texts of up to 256 KiB each, JSON-escaped (worst case six bytes
 * per character). Nest's default JSON limit (100 kB) would reject them.
 */
const CAPTURE_LICENSE_TEXT_BODY_LIMIT = '4mb';

const NDI_HLS_SEGMENT_TYPE = 'video/mp2t';
const NDI_HLS_PLAYLIST_TYPE = 'application/vnd.apple.mpegurl';

/**
 * Run pending Drizzle migrations at boot, before the app serves traffic.
 * Replaces TypeORM's `migrationsRun: true`. The `.sql` files are copied into
 * the build output via `nest-cli.json` assets, so `db/migrations` resolves
 * next to the compiled `main.js` at runtime.
 */
async function runMigrations(databaseUrl: string): Promise<void> {
  const logger = new Logger('Migrations');
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: path.join(__dirname, 'db', 'migrations'),
    });
    logger.log('Database migrations applied');
  } finally {
    await pool.end();
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  await runMigrations(config.getOrThrow<string>('DATABASE_URL'));

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
  // The agent's license text upload exceeds Nest's default JSON limit; the same
  // cheap Bearer check keeps unauthenticated clients from making us buffer it.
  app.use(
    '/api/agents/me/capture-plugin/license-text',
    requireBearerHeader,
    json({ limit: CAPTURE_LICENSE_TEXT_BODY_LIMIT }),
  );
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
  await app.listen(3000);
}
void bootstrap();
