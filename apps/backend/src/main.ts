import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as path from 'path';
import { AppModule } from './app.module';
import { configureApp } from './app-setup';

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
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);

  await runMigrations(config.getOrThrow<string>('DATABASE_URL'));
  configureApp(app);
  await app.listen(3000);
}
void bootstrap();
