import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit config — `src/db/schema.ts` is the single source of truth.
 * `casing: 'snake_case'` maps camelCase column keys → snake_case physical names;
 * this MUST match the runtime `drizzle()` client in `database.module.ts`, or
 * generated SQL silently diverges from the queries the app issues.
 * DATABASE_URL is required for generate/migrate/push (never committed; see .env).
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
