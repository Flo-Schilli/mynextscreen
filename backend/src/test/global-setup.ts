import { PostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const TEST_PG_URI_FILE = path.join(os.tmpdir(), 'signage-test-pg-uri');

/**
 * Jest globalSetup: start ONE Postgres container for the whole run and write its
 * connection URI to a temp file. Each Jest worker reads that file and provisions
 * its own isolated database (see `db-harness.ts`), so parallel suites don't clash.
 */
export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  fs.writeFileSync(TEST_PG_URI_FILE, container.getConnectionUri());
  (globalThis as unknown as { __PG_CONTAINER__?: unknown }).__PG_CONTAINER__ = container;
}
