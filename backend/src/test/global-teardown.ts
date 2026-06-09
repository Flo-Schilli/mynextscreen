import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as fs from 'fs';
import { TEST_PG_URI_FILE } from './global-setup';

/** Jest globalTeardown: stop the shared Postgres container and clean the URI file. */
export default async function globalTeardown(): Promise<void> {
  const container = (globalThis as unknown as { __PG_CONTAINER__?: StartedPostgreSqlContainer })
    .__PG_CONTAINER__;
  if (container) {
    await container.stop();
  }
  if (fs.existsSync(TEST_PG_URI_FILE)) {
    fs.rmSync(TEST_PG_URI_FILE);
  }
}
