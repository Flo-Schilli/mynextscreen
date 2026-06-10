import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as schema from '../db/schema';
import type { DrizzleDB } from '../db/drizzle.types';
import { DRIZZLE } from '../db/database.constants';
import { TEST_PG_URI_FILE } from './test-db-uri';

/**
 * Per-worker test database harness backed by the shared Postgres container that
 * `global-setup.ts` starts. Each Jest worker provisions its own database
 * (`test_w<id>`) so suites running in parallel never clobber one another.
 *
 * Usage in a spec:
 * ```ts
 * let db: DrizzleDB;
 * beforeAll(async () => { db = await initTestDb(); });
 * beforeEach(async () => { await truncateAll(); });
 * afterAll(async () => { await closeTestDb(); });
 * ```
 */

let pool: Pool | null = null;
let db: DrizzleDB | null = null;

const TABLE_NAMES = [
  'organisations',
  'users',
  'user_organisation_memberships',
  'screen_groups',
  'screens',
  'contents',
  'playlists',
  'playlist_items',
  'schedule_entries',
  'live_streams',
  'live_stream_activations',
  'notifications',
  'organisation_notification_configs',
  'user_notification_preferences',
  'audit_entries',
  'sliced_renditions',
];

function baseUri(): string {
  const uri = fs.existsSync(TEST_PG_URI_FILE)
    ? fs.readFileSync(TEST_PG_URI_FILE, 'utf8').trim()
    : (process.env.DATABASE_URL ?? '');
  if (!uri) {
    throw new Error('Test Postgres URI not found — is the Jest globalSetup running?');
  }
  return uri;
}

/** Provision (or reuse) this worker's database, run migrations, and return the client. */
export async function initTestDb(): Promise<DrizzleDB> {
  if (db) return db;

  const workerId = process.env.JEST_WORKER_ID ?? '1';
  const dbName = `test_w${workerId}`;
  const adminUri = baseUri();

  const admin = new Pool({ connectionString: adminUri });
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${dbName}`);
  } finally {
    await admin.end();
  }

  const workerUri = adminUri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);
  pool = new Pool({ connectionString: workerUri });
  db = drizzle(pool, { schema, casing: 'snake_case' });
  await migrate(db, {
    migrationsFolder: path.join(__dirname, '..', 'db', 'migrations'),
  });
  return db;
}

export function testDb(): DrizzleDB {
  if (!db) {
    throw new Error('initTestDb() must be called in beforeAll before using testDb()');
  }
  return db;
}

/** Remove all rows between tests for a clean slate (cheaper than re-migrating). */
export async function truncateAll(): Promise<void> {
  const client = testDb();
  await client.execute(
    sql.raw(`TRUNCATE TABLE ${TABLE_NAMES.join(', ')} RESTART IDENTITY CASCADE`),
  );
}

export async function closeTestDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

/** Convenience provider for Nest TestingModule wiring. */
export function drizzleTestProvider() {
  return { provide: DRIZZLE, useValue: testDb() };
}
