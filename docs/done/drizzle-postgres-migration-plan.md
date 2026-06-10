# Plan (PR #1): Migrate TypeORM/SQLite → Drizzle ORM / PostgreSQL

> Phase 1 of 2. Phase 2 (Hanko → internal cookie auth) is in
> `internal-auth-migration-plan.md` and builds on this PR.

## Context

The digital-signage backend persists data with **TypeORM + better-sqlite3**. We are
moving persistence to **Drizzle ORM on PostgreSQL** to match the team's other
projects (`~/GIT/Github/immich-upload-portal`, `~/GIT/Github/mynexttrip`), which
already run NestJS + Drizzle + Postgres.

**This PR changes the persistence layer only — behavior stays identical. Hanko auth
is untouched here.** Decided with the user: **PostgreSQL** target (not SQLite),
**greenfield** (the dev DB can be wiped — no data migration), Drizzle-first sequencing.

Reference files to copy syntax from:
- `~/GIT/Github/myNextTrip/db/schema.ts`, `drizzle.config.ts`,
  `apps/api/src/database/database.module.ts` (best schema/DB-module reference).

## Load-bearing decisions
| Topic | Choice | Reason |
|---|---|---|
| Casing | `casing: 'snake_case'` in both `drizzle.config.ts` AND runtime `drizzle(pool, {schema, casing:'snake_case'})` | Schema keys stay camelCase = identical to current entity props, so `row.organisationId` is unchanged across services. **Config/runtime mismatch silently breaks queries.** |
| Enums | `text().$type<EnumT>()` importing existing `*.enum.ts` | Already validated by class-validator at the boundary; `pgEnum` adds rigid `ALTER TYPE` migrations for no gain. |
| `originalSizeBytes`/`transcodedSizeBytes` | `bigint({ mode: 'number' })` | Services do `Number(...)` arithmetic; `mode:'bigint'` breaks it. ~9 PB ceiling is safe. |
| `tags`/`details` (simple-json) | `jsonb().$type<...>()` | Native; Drizzle (de)serializes automatically. |
| `updatedAt` | builder with `.$onUpdate(() => new Date())` | Drizzle does NOT auto-bump like TypeORM `@UpdateDateColumn`. |
| Boot migration | `migrate()` in `main.ts` before `app.listen()` | Replaces `migrationsRun:true`; single-command container start. |
| Tests | **Real Postgres via Testcontainers** (`@testcontainers/postgresql`), not pg-mem/mocks | The single `DRIZZLE` client has deep fluent chains that are brittle to mock; pg-mem doesn't support all generated SQL. Real DB makes the ~85% coverage genuine. |

## Steps
1. **Deps** (`backend/package.json`): remove `typeorm`, `@nestjs/typeorm`, `better-sqlite3`;
   add `drizzle-orm`, `pg` (deps) + `drizzle-kit`, `@types/pg`, `@testcontainers/postgresql` (dev).
   Replace the four `migration:*` scripts (lines 21-24) with `db:generate`/`db:migrate`/`db:push`/`db:studio`.
2. **`backend/drizzle.config.ts`** — dialect `postgresql`, `casing:'snake_case'`,
   `schema:'./src/db/schema.ts'`, `out:'./src/db/migrations'`, `url: DATABASE_URL`.
3. **`backend/src/db/schema.ts`** — all 17 tables (one file). Import enum unions from existing
   `*.enum.ts`; shared `timestamps` builder with `$onUpdate`; `relations()` for every eager-loaded
   table (playlist items→content, screen-group, schedule, search, membership); export
   `$inferSelect`/`$inferInsert` per table (these replace the entity classes as row types).
   Representative patterns:
   - `contents`: `uuid().primaryKey().default(sql\`gen_random_uuid()\`)`,
     `.references(() => organisations.id, { onDelete:'cascade' })`, `bigint({mode:'number'})`,
     `jsonb().$type<string[]>().notNull().default([])`, `text().$type<ContentType>()`.
   - Unique-constraint tables (`user_organisation_memberships`, `live_stream_activations`,
     `user_notification_preferences`, `organisation_notification_configs`) → table-extras callback
     with `uniqueIndex(...).on(...)`. `screens` → `index(...).on(apiKeyHash)`.
   - `schedule_entries` nullable `screenId`/`groupId` → match current SET NULL/no-action behavior.
   - `users.id` stays **text** for now (Hanko ID); Phase 2 converts it to uuid.
4. **`backend/src/db/database.module.ts`** (+ constants/types) — `@Global()`, `PG_POOL` from
   `DATABASE_URL`, `DRIZZLE = drizzle(pool, {schema, casing:'snake_case'})`,
   `onApplicationShutdown→pool.end()`. Model on myNextTrip's database.module; use NestJS `ConfigService`.
5. **`backend/src/organisation/organisation-scope.service.ts`** — rewrite the generic base off
   `Repository<T>` to take `(db: DrizzleDB, table, entityName)` where `table` exposes `id` +
   `organisationId`; reimplement findAll/findOne/create/update/remove with
   `select/insert/update/delete` + `eq`/`and`. The 3 subclasses (`ScreenService`,
   `ScreenGroupService`, `LiveStreamService`) change `super(repository, name)` → `super(db, table, name)`.
   **Trickiest refactor — expect `PgTableWithColumns`/`AnyPgColumn` typing friction and casts.**
6. **Rewrite services** domain-by-domain, injecting `@Inject(DRIZZLE) db: DrizzleDB`. Mapping:
   `find({where})`→`select().from().where(eq/and)`; `findOne`→`.limit(1)` + `[row] ?? null`;
   `create+save`→`insert().values().returning()`; `save(existing)`→`update().set().where().returning()`;
   `remove`→`delete().where()`; `In`→`inArray`; `Between`→`between`/`gte+lte`;
   `relations:[...]`→`db.query.x.findMany({with:{...}})`; `findAndCount`→rows query + `count()` query.
   Delete each `*.entity.ts` as its domain is migrated; relocate any entity-only class-validator
   decorators to DTOs.
7. **app.module.ts** — remove `TypeOrmModule.forRootAsync`, add `DatabaseModule`; delete every
   per-module `TypeOrmModule.forFeature([...])`.
8. **Migrations** — delete `backend/src/migrations/*` + `backend/src/data-source.ts`; run
   `npm run db:generate` for a fresh baseline; add boot-time `migrate()` in `main.ts`. **Ensure the
   `.sql` migration files are copied into the Docker image** (add `assets` in `nest-cli.json` or a
   `COPY` in the Dockerfile — `.sql` isn't compiled).
9. **Tests** — Jest global-setup spins up one Postgres container exporting `DATABASE_URL`; per-suite
   helper runs `migrate()` once then `TRUNCATE ... CASCADE` between tests; provide `DRIZZLE` pointed
   at it. Rewrite the ~17 specs from `getRepositoryToken` mock-assertions to DB-state assertions.
   Keep pure-logic specs (file validation, rrule, ffprobe) as plain unit tests. **Largest effort.**
   CI fallback: a Postgres service container with the same `DATABASE_URL`.
10. **Deployment / env**:
    - `docker-compose.yml`: add `postgres:16-alpine` (named volume + `POSTGRES_*`), remove sqlite
      volume, backend `DATABASE_PATH`→`DATABASE_URL`, add `postgres` to `depends_on`.
    - `ansible/`: new `signage-postgres.container` quadlet on `signage.network`;
      `signage-backend.container.j2` gets `After=signage-postgres.service`, drop `/app/data` volume;
      `env.signage.j2` `DATABASE_PATH`→`DATABASE_URL`; rewrite `download_db.yml`/`upload_db.yml`
      to `pg_dump`/`pg_restore` via `podman exec` (`.db`→`.dump`).
    - `.env.example`: `DATABASE_PATH`→`DATABASE_URL` (+ `POSTGRES_*`).

## Risks (ranked)
1. Test rewrite scope vs ~85% gate (mitigate with shared seed/truncate helpers).
2. `OrganisationScopedService<T>` generic over Drizzle tables (typing pain, 3 services).
3. `bigint({mode:'number'})` — else storage math breaks silently.
4. `updatedAt` `$onUpdate` — else regression.
5. snake_case casing must match config + runtime client.
6. Boot `migrate()` + `.sql` assets present in the image.

## Verification
- `cd backend && npm run typecheck && npm run lint && npm run test:cov` (≥~85% gate) `&& npm run build`.
- `docker compose up --build` → Postgres up, backend runs boot `migrate()`, `GET /api/health` green.
- Manual smoke (still-Hanko'd UI): create org, upload content (transcode job), build playlist,
  schedule, verify dashboard SSE still streams — confirms no behavior regression.
