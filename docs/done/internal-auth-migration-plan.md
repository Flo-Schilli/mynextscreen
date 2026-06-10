# Plan (PR #2): Replace Hanko with internal email+password cookie auth

> Phase 2 of 2. Builds on PR #1 (`drizzle-postgres-migration-plan.md`), which
> migrates the backend to Drizzle/Postgres. This PR assumes that layer exists.

## Context

The backend authenticates users via **Hanko Cloud** (JWT validated against Hanko's
JWKS with `jose`). We are dropping the external dependency and owning auth in-house:
**email + password, JWT access token in an httpOnly cookie, opaque refresh token in
Redis**, matching `~/GIT/Github/immich-upload-portal` (the cleanest cookie-auth
reference).

Decided with the user: **httpOnly cookies**, **greenfield** (seed super-admins, no
user-data migration), keep **super-admin-only provisioning** (no open self-registration).
**Screen API-key auth (`api-key-auth.guard.ts`) is untouched.**

Reference files to copy syntax from:
- `~/GIT/Github/immich-upload-portal/apps/api/src/app/auth/{auth.service.ts,cookies.ts,jwt-auth.guard.ts,auth.controller.ts}`,
  `tokens/{token.service.ts,lua-scripts.ts}`, `users/users.service.ts`,
  `apps/frontend/src/app/core/{auth/auth.service.ts,http/auth.interceptor.ts}`.

## Load-bearing decisions
| Topic | Choice | Reason |
|---|---|---|
| Hashing | **bcrypt** (cost 12) | `bcrypt@^6` already a backend dep (used by `api-key-auth.guard.ts`); argon2 adds a 2nd native addon that risks breaking the rootless-Podman/musl image. |
| Tokens | Access JWT (HS256, `@nestjs/jwt`, short TTL, `jti`, payload `{sub,email,isSuperAdmin}`) + opaque refresh token in **Redis** (family + atomic rotate Lua + replay-revoke) | Direct copy of immich. Reuse BullMQ's Redis server via a dedicated ioredis client; **namespace keys `auth:`** to avoid `bull:` overlap. |
| Cookie transport | `access_token` (path `/`) + `refresh_token` (path `/api/auth`), `httpOnly`, `secure` from `NODE_ENV`, **`sameSite=strict`** (configurable via `COOKIE_SAMESITE`) | Admin SPA calls API via **relative `/api`** → served same-origin through `app.{domain}/api/*` (Caddyfile lines 7-11), so strict cookies ARE sent. `api.{domain}` vhost is for screens/players. **Verify SPA never uses an absolute `api.{domain}` base** — else `sameSite=none;secure` + CORS `credentials` + CSRF token. |
| `passwordHash` | **nullable** text | Models invitee-before-activation (super-admin provisions a user who then sets their own password via token). Login must explicitly reject null-hash accounts. |
| Super-admin runtime check | `users.isSuperAdmin` boolean column, carried in the JWT | With UUIDs, env-listed IDs are unknowable pre-seed. `SUPER_ADMIN_USER_IDS` is **retired** (breaking change) in favor of `SUPER_ADMIN_EMAILS` (seed input) + the column. |
| SSE auth | `fetch()` + `credentials:'include'` | `dashboard-sse.service.ts` uses `fetch` (NOT EventSource), so the access cookie is sent automatically same-origin — no query-token hack. |

## Steps
1. **Deps**: add `@nestjs/jwt`, `cookie-parser`, `ioredis` (direct), `@nestjs/throttler` (if missing);
   remove `jose`; frontend remove `@teamhanko/hanko-elements`. (`bcrypt` already present.)
2. **Schema** (`backend/src/db/schema.ts`): convert `users.id` → `uuid().defaultRandom()`; add
   `passwordHash` (nullable), `passwordResetToken` + `passwordResetTokenExpiresAt`, `isSuperAdmin`
   (bool, default false); keep `email` unique. `CREATE EXTENSION IF NOT EXISTS pgcrypto`. Drop
   email-verify columns (no open signup → trusted addresses). Generate migration.
3. **`backend/src/redis/redis.module.ts`** — `@Global()` ioredis provider (`REDIS_CLIENT`) from
   `REDIS_URL`, `maxRetriesPerRequest: null`.
4. **`backend/src/auth/password.service.ts`** — bcrypt `hash`/`verify`; `verify(null,...)` → false;
   verify never throws.
5. **`backend/src/auth/token.service.ts`** (+ `token.scripts.ts`) — copy immich; `@nestjs/jwt` for
   access, ioredis for refresh family/rotation/revoke; TTLs from env via a `parseTtlToSeconds` util.
6. **`backend/src/auth/cookies.ts`** + `cookie-parser` in `main.ts`; tighten
   `app.enableCors({origin: PUBLIC_BASE_URL, credentials:true})`.
7. **`backend/src/auth/jwt-auth.guard.ts`** — rewrite: keep `@Public()`/`@ScreenAuth()` reflector
   short-circuits; replace jose/JWKS body with reading `access_token` cookie →
   `tokens.verifyAccessToken` → `req.user = {userId,email}`. Cookie-only (drop the media `?token=`
   query fallback — same-origin `<img>/<video>` send the cookie; audit & fix any `?token=` URL builders).
   Keep `AuthenticatedUser`/`AuthenticatedRequest` exports.
8. **`backend/src/auth/roles.guard.ts`** — drop both `userService.findOrCreate(...)` calls
   (users pre-exist); super-admin via JWT-carried `isSuperAdmin` (no `SUPER_ADMIN_USER_IDS` read);
   keep membership lookup → `ForbiddenException` if missing.
9. **Auth controller + service** (`backend/src/auth/...`): endpoints
   `POST /api/auth/login` `@Public` (verify → set cookies → `{user}`),
   `POST /api/auth/refresh` `@Public` (rotate; reuse/unknown → clear + 401),
   `POST /api/auth/logout` `@Public` (revoke family + clear),
   `POST /api/auth/set-password` `@Public` (token+password → accept-invite / reset),
   `POST /api/auth/forgot-password` `@Public` (enumeration-safe),
   `POST /api/auth/change-password` (guarded), `GET /api/auth/me` (guarded).
   **No `/register`.** Throttle login/refresh/forgot. `login` rejects null-hash accounts.
   Keep `GET /api/me/profile` but compute `isSuperAdmin` from the DB column.
10. **User/membership** (`user.service.ts`, `membership.service.ts`): replace `findOrCreate` with
    `findByEmail`/`findById`/`createInvitee(email)` (null hash); on `addMember`, generate a
    `passwordResetToken` (24h) and email a set-password link `${PUBLIC_BASE_URL}/set-password?t=...`
    by **reusing the existing SMTP `EmailProvider`** in `notification/channels/` (per CLAUDE.md
    "Externe Calls hinter Interface/Modul").
11. **`backend/src/auth/super-admin.seeder.ts`** (`OnApplicationBootstrap`): for each
    `SUPER_ADMIN_EMAILS` entry, create the user (`isSuperAdmin:true`, hash from optional
    `SUPER_ADMIN_INITIAL_PASSWORD` else null + set-password token) if absent; promote if present.
    Idempotent.
12. **Frontend** (`frontend/src/app/`):
    - `auth/auth.service.ts` — rewrite to signals (`user` signal, `isAuthenticated` computed,
      `login/logout/refreshSession/loadCurrent/changePassword`), all `withCredentials:true`, no
      token storage; drop Hanko SDK / `getToken()`.
    - `auth/auth.interceptor.ts` — drop `Authorization`, add `withCredentials:true`, keep
      `X-Organisation-Id`; 401→`refreshSession()`→retry-once with single-flight (`shareReplay`)
      dedupe; skip refresh on `/api/auth/*`.
    - `auth/auth.guard.ts` — allow if `isAuthenticated()`, else `loadCurrent()` then re-check, else `/login`.
    - `login/login.{ts,html}` — Tailwind reactive email/password form (replace `<hanko-auth>`).
    - new `auth/set-password.{ts,html}` (reads `?t=`, calls set-password).
    - `dashboard/dashboard-sse.service.ts` — drop `Authorization` header, add `credentials:'include'`;
      `connect()` (line 37) + `scheduleSseReconnect` (line 200) gate on `isAuthenticated()`+orgId
      instead of `getToken()`; on SSE 401 call `refreshSession()` then reconnect.
    - Remove `@teamhanko/hanko-elements` dep; remove `hankoApiUrl` from `environments/*.ts`.
    - `frontend/docker-entrypoint.sh` — drop the `HANKO_API_URL` warning + envsubst loop.
13. **Config / Caddy / deployment**: remove `HANKO_API_URL` everywhere (`.env.example`,
    `docker-compose.yml`, `ansible/templates/env.signage.j2`, `.env.signage.example`, frontend env,
    entrypoint) and the `hanko_api_host` refs in `Caddyfile.j2` CSP (line 25) + the ansible var.
    Add a `handle /api/dashboard/events` block with `flush_interval -1` on the `app.{domain}` vhost.
    Add envs: `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `COOKIE_SECURE`,
    `COOKIE_SAMESITE`, `SUPER_ADMIN_EMAILS`, `SUPER_ADMIN_INITIAL_PASSWORD`, `PUBLIC_BASE_URL`.
14. **Tests**: rewrite `auth/jwt-auth.guard.spec.ts` (cookie JWT, not JWKS); new
    `password.service`/`token.service`/`auth.service`/`auth.controller`/`super-admin.seeder` specs;
    update `roles.guard.spec.ts` (drop findOrCreate, isSuperAdmin), `user.service`/`membership.service`
    specs. Hold backend ~80% gate.

## Risks (ranked)
1. **Cross-site cookies in prod** — relies on admin API staying relative `/api` (same-origin via
   `app.{domain}/api/*`). Verify SPA API base is relative end-to-end; else `sameSite=none`+CORS+CSRF.
2. bcrypt native build under rootless Podman (chosen because it already builds for screens).
3. Super-admin bootstrap; `SUPER_ADMIN_USER_IDS` retired → document the breaking env change.
4. SSE: `credentials:'include'` + 401→refresh→reconnect + Caddy `flush_interval -1`.
5. CSRF: `sameSite=strict` + custom `X-Organisation-Id` header on mutations; document mandatory
   double-submit token if `sameSite=none` ever adopted.
6. Nullable `passwordHash` — login must reject null-hash (test it).
7. Remove media `?token=` fallback — audit frontend URL builders.

## Verification
- Backend `typecheck`/`lint`/`test:cov`/`build`; frontend `npm run typecheck && npm test && npm run build`.
- `docker compose up --build`: seeder creates super-admin from `SUPER_ADMIN_EMAILS` +
  `SUPER_ADMIN_INITIAL_PASSWORD`.
- Browser E2E: log in via the new form → cookies set (DevTools: httpOnly access+refresh); navigate
  guarded routes; confirm dashboard **SSE** authenticates (cookie sent, events stream); let the
  access token expire → a request 401s → interceptor refreshes → retry succeeds; super-admin invites
  a user → set-password email link → invitee sets password → logs in; logout clears cookies and
  blocks API.
- Confirm screen API-key auth still works (register a screen, heartbeat) — must be unaffected.
- Grep the repo for `hanko`/`HANKO_API_URL`/`@teamhanko` → zero hits.
