# Drizzle Test Migration — DONE ✅

The TypeORM→Drizzle/Postgres migration rewrote all production code and introduced
a **Testcontainers-backed Jest harness** (`backend/src/test/`). The full spec
suite has now been re-migrated from the old repository-mock style to real-DB
assertions against that harness, all specs un-quarantined, and the coverage gate
restored.

## Final state

- **Harness** — `backend/src/test/{global-setup,global-teardown,db-harness}.ts`.
  One Postgres 16 container per run; each Jest worker provisions an isolated
  `test_w<id>` database, migrates it, and `TRUNCATE … CASCADE` between tests.
- **All ~48 quarantined specs migrated and un-quarantined.**
  `testPathIgnorePatterns` is back to just `['/node_modules/']`.
- **Coverage gate restored** in `backend/jest.config.ts` to the pre-migration
  values **92/83/84/92** (statements/branches/functions/lines). The CI PR-comment
  threshold (`.github/workflows/ci.yml`, ArtiomTr action) remains 92.
- **Full suite green:** 83 suites / 891 tests; measured coverage
  ~92.7 / 84.51 / 87.87 / 92.99.

## Migration pattern (kept for reference)

```ts
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import { DRIZZLE } from '../db/database.constants';

let db: DrizzleDB;
beforeAll(async () => { db = await initTestDb(); });
afterAll(async () => { await closeTestDb(); });
beforeEach(async () => {
  await truncateAll();
  const module = await Test.createTestingModule({
    providers: [SomeService, { provide: DRIZZLE, useValue: db }, /* mocked deps */],
  }).compile();
  service = module.get(SomeService);
});
```

- **Service specs:** seed rows with `db.insert(table).values(...)`, call the
  service, assert **DB state** (`db.select()...`) instead of repository-mock args.
- **Controller specs:** mostly mock the service (no DB) — entity imports redirected
  to type-only `../db/schema` and entity-relation fields removed from fixtures.

## Known harness caveat

The harness keys the per-run Postgres URI off a fixed temp file
(`os.tmpdir()/signage-test-pg-uri`) and worker DB name `test_w<JEST_WORKER_ID>`.
This is correct for a single Jest invocation with multiple workers (the CI run),
but **two concurrent `npx jest` processes race** on that file / DB name. If
parallel local verification is ever needed, give each run a unique URI-file path
or a lockfile.

## Reference specs

- `organisation/organisation.service.spec.ts`
- `organisation/storage.service.spec.ts`
