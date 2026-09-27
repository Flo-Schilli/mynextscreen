import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as path from 'path';
import { AppModule } from './app.module';

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
