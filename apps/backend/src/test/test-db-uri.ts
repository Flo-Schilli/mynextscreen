import * as os from 'os';
import * as path from 'path';

/**
 * Path to the temp file where `global-setup.ts` writes the shared Postgres
 * connection URI. Kept in its own module (free of any `@testcontainers/*`
 * import) so specs that import `db-harness` do not transitively load
 * testcontainers — loading it runs `readFile` at module-init time, which
 * collides with specs that `jest.mock('fs/promises')` (TDZ on the mock const).
 */
export const TEST_PG_URI_FILE = path.join(os.tmpdir(), 'signage-test-pg-uri');
