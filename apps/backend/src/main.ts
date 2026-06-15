import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
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
