# CLAUDE.md — Signage Server (Multi-Tenant Digital Signage Platform)

> **Signage Server** — Multi-Tenant Digital-Signage-Plattform für Konzert-Venues.
> Quelle der Wahrheit für Produkt/Features ist `VISION.md`, für die technische
> Architektur `ARCHITECTURE.md`. Bei Widersprüchen gewinnt der **tatsächliche Code**
> (siehe Hinweise unten). Diese Datei fasst zusammen, was beim Arbeiten am Repo
> wichtig ist.

## Project
Organisationen verwalten **Screens (TVs)** über ein Venue verteilt, laden Bilder/
Videos in eine geteilte **Content-Library** (mit Transcoding), bauen **Playlists**,
planen sie kalenderbasiert über Screens hinweg (**Schedules**) und streamen **Live-Video**
— alles über ein Angular-Admin-Dashboard. Screens ziehen ihren State per HTTP und
bekommen Updates per **SSE** gepusht. Ein separater **Player** (Angular) läuft auf
den Screens.

Kernideen:
- **Multi-Tenancy:** Jede **Organisation** ist voll isoliert (eigene Screens,
  Content, Playlists, Schedules, User). Provisioniert nur durch **Super-Admin**,
  keine Self-Registration. Jede Query ist serverseitig per `organisationId` gescoped.
- **Rollen pro Organisation:** Org Admin / Editor / Viewer. Ein User kann mehreren
  Orgs angehören (separate Rolle je Org). Super-Admin ist system-level.
- **Screens** registrieren sich per **API-Key** (einmalig angezeigt, regenerierbar),
  senden **Heartbeats** (online/offline) und cachen Content lokal (Playback läuft
  weiter, wenn die Verbindung abbricht).
- **Screen-Groups:** Mirror-Mode (identischer, frame-synchroner Inhalt) oder
  Split-Mode (Video-Wall-Grid; Server sliced Content pro Screen-Viewport).
- **Content:** Upload → Original gespeichert → BullMQ-Job transcodiert (Video →
  H.264 MP4, Bild → WebP/JPEG-Fallback). Original **und** Transcoded werden
  behalten. Storage-Limits pro Org (separat für Original/Transcoded) hart enforced.
- **Schedules:** Kalender (Tag/Woche/Monat), drag&drop Playlist-Blöcke, **RRULE**
  für Recurrence, keine Overlaps, Lücken → **Fallback-Playlist** der Org.
- **Live-Streams:** Eigener Modus (nicht Teil einer Playlist). FFmpeg ingestet die
  Quelle, transcodiert nach **HLS**, überschreibt die Schedule; bei Stream-Stop
  automatischer Fallback auf die geplante Playlist.
- **Audit-Log** für alle signifikanten Aktionen; **Notifications** über In-App / E-Mail
  (SMTP) / **ntfy**, pro User togglebar.

> **Hinweise zur Doku-Aktualität (Code gewinnt):**
> - **Echtzeit = SSE**, nicht WebSocket/Socket.IO (README-Tabelle ist veraltet).
>   Siehe `backend/src/dashboard/dashboard-sse.service.ts` + `@Sse`-Endpoints.
> - **Screen-Protokoll = JSON-Adapter** (`screen-protocol/json-protocol-adapter.ts`).
>   SMIL ist nur als Abstraktion vorgesehen (`ScreenProtocolAdapter`-Interface),
>   noch **nicht** implementiert — VISION/README nennen SMIL als ersten Wert,
>   real ist JSON über HTTP + SSE.

## Domain Model (Backend-Module = Domains)
```
Organisation         (Tenant; storage-limits, default/fallback playlist, time zone)
  ├── User-Membership { user, role(OrgAdmin|Editor|Viewer), notificationPrefs }
  ├── Screen          { name, resolution/aspect, location, apiKey, heartbeat, status }
  │     └── gehört zu max. 1 ScreenGroup { mode(mirror|split), gridLayout }
  ├── Content         { title, desc, tags, originalPath, transcodedPath, sizes, status }
  ├── Playlist        └── PlaylistItem { contentId, durationMs (für Bilder) }
  ├── Schedule        { screen|group, playlist, start/end, RRULE(recurring), color }
  ├── LiveStream      { sourceUrl, target screen(s)/group, ffmpeg lifecycle → HLS }
  ├── AuditEntry      { timestamp, userId, organisationId, action, resourceType/Id, details }
  └── Notification    { channel(inapp|email|ntfy), userPrefs }
```

> Schema-Hinweise:
> - **Entity-IDs sind UUIDs.** Multi-Tenancy serverseitig per Guard/Query-Scope
>   durchsetzen (Viewer darf nichts anlegen) — nie nur im Frontend ausblenden.
> - **Transcoded Files liegen im Filesystem, nicht in der DB.** Pfadschema:
>   `{MEDIA_BASE_PATH}/{organisationId}/originals|transcoded/{contentId}.{ext}`.
> - **Geld/Storage als Integer-Bytes**, Limits separat für Original/Transcoded.
> - **Split-/Slicing-Logik** liegt zentral (`screen/screen-state.service`,
>   `slice-content/`) — nicht pro Screen/Adapter duplizieren.

## Stack
- **Frontend (Admin):** Angular ~21.2 (Standalone, Signals, **zoneless-orientiert**),
  Tailwind CSS v4 (`@tailwindcss/postcss`), eigene Auth-UI (email+password). Tests: **Vitest**.
- **Player:** eigene Angular-21-App (`player/`), **hls.js** für Live-Streams. Tests: **Vitest**.
- **Backend:** NestJS 11 (modular, ein Modul pro Domain), **Drizzle ORM** + **PostgreSQL**
  (`pg`), **BullMQ + Redis** (Transcoding-Jobs), `@nestjs/schedule`, `@nestjs/jwt` + `bcrypt`
  (interne Auth), `rrule`, `nodemailer`, `class-validator`/`class-transformer`. Tests: **Jest**.
- **Auth:** **Interne Auth** (email+password, JWT-Access-Cookie + Redis-Refresh-Tokens,
  bcrypt-Hashing), **API-Keys** (Screens).
- **Media:** **FFmpeg** als Child-Process (Transcoding + HLS-Live).
- **Echtzeit:** **SSE** (Dashboard-Updates + Screen-Pushes).
- **Runtime:** Node.js 22. **Package-Manager: npm** (npm@11.6.2, kein pnpm/yarn).
- **Deployment:** Docker Compose (dev) · Ansible + rootless Podman Quadlets + Caddy
  (prod, `ansible/`). Repo-Remote: GitHub (`github.com/Flo-Schilli/digital-signage`).

## Project Structure
> **Nx integrated monorepo.** EIN Root-`package.json` + EIN `package-lock.json`
> (Single Source of Truth, Version + alle Deps), `nx.json` (Targets/Caching),
> `tsconfig.base.json` (Path-Mappings, u. a. `@signage/shared-types`). Apps haben
> **kein** eigenes `package.json` — nur ein `project.json` mit Nx-Targets
> (`nx:run-commands`). Gemischte Test-Runner: **Jest** (backend, Coverage-Gate),
> **Vitest** (frontend via `ng test`, player via `vitest run`).
```
apps/
  backend/                # NestJS API (REST + SSE + BullMQ-Worker)
    project.json          # Nx-Targets: build/serve/test/typecheck/lint/format + db-* (drizzle-kit)
    jest.config.ts        # Coverage-Gate 92/83/84/92; coverage → apps/backend/coverage
    drizzle.config.ts     # Drizzle-Kit Config (generate/migrate/push/studio)
    src/
      auth/               # Auth (Cookie email+password, API-Key-Auth, Role-Guards)
      organisation/       # Tenant-Mgmt, Storage-Limits, Fallback-Playlist, Time Zone
      user/               # Org-Membership, Rollen, Notification-Prefs
      screen/             # Registrierung, API-Key, Heartbeat, State-Service
      screen-group/       # Mirror/Split-Modi, Grid-Layout
      content/            # Upload, Metadata, triggert Transcoding-Jobs (dto/)
      slice-content/      # Video-Wall-Slicing pro Screen-Viewport
      playlist/           # Playlist-CRUD, geordnete Items mit Dauer
      schedule/           # Kalender-CRUD, RRULE-Recurrence, Overlap/Fallback
      live-stream/        # Stream-URL, FFmpeg-Lifecycle, Override/Fallback (HLS)
      screen-protocol/    # Adapter-Abstraktion; JsonProtocolAdapter (erster Impl)
      notification/       # Hub + channels/ (in-app, email, ntfy)
      audit-log/          # Audit-Trail
      dashboard/          # SSE-Service + Controller für Echtzeit-Updates
      media/              # Filesystem-Media-Handling
      search/             # Globale Suche (screens/content/playlists, org-scoped)
      db/                 # Drizzle-Schema + migrations/ (generierte SQL)
      health.controller.ts # Healthcheck
    Dockerfile.prod       # baut aus Repo-Root-Context (COPY package*.json …)
  frontend/               # Angular 21 Admin-SPA (src/app/<domain>, shell/, shared/)
    project.json          # build (@angular/build), serve, test (ng test → Vitest), …
    angular.json          # minimal — hält Vitest-Root am App-Dir (TestBed-Isolation)
  player/                 # Angular 21 Player-App (connection/, playback/, player/)
    project.json          # build (@angular/build), serve, test (vitest run), …
libs/
  shared-types/           # geteilte TS-Typen (Lib; nur lint/typecheck-Targets)
nx.json                   # Nx-Targets, namedInputs (production), Caching
tsconfig.base.json        # Path-Mappings (@signage/shared-types) für alle Projekte
package.json              # Single Source: Version + alle Deps (Root)
package-lock.json         # einziges Lockfile
player-applications/      # Native/Plattform-Player
  lg-tvos/                # LG webOS App (app.js, appinfo.json)
ansible/                  # Prod-Deployment: quadlets/, templates/ (Caddy, fail2ban), *.yml
docker-compose.yml        # Dev: backend(3000) · frontend(4200) · player(4300) · redis · postgres(5432)
ARCHITECTURE.md           # Technische Architektur (kanonisch)
VISION.md                 # Produkt-Vision & Feature-Details (kanonisch)
.maggus/                  # Maggus-Task-Runner (features/, bugs/, config.yml)
```
> Build-Outputs: backend → `dist/apps/backend/main.js`; frontend/player →
> `dist/apps/{frontend,player}/browser`.

## Active ECC Rules
- common
- typescript
- angular

## Default Skills to load
- nestjs-patterns       # Backend-Arbeit in backend/
- angular-developer     # Frontend-/Player-Arbeit in frontend/ bzw. player/

## Agents
- @typescript-reviewer  # vor jedem PR
- @build-error-resolver # bei Build-/Type-Fehlern
- @tdd-guide            # beim Schreiben von Tests

## Conventions
- **Strict TypeScript, kein `any`.**
- **Angular: Standalone Components, Signals, keine NgModules.** Business-Logik
  in Services, nicht in Components.
- **NestJS: ein Modul pro Domain.** DTOs immer mit `class-validator` validieren
  (`dto/`-Ordner pro Modul). Multi-Tenancy in Guards/Services durchsetzen.
- **Drizzle-Schema (`src/db/`) ist die Schema-Quelle.** Schema-Änderungen immer per
  Migration (`nx run backend:db-generate` → `db-migrate`), nie Auto-Sync/`db-push` in Prod.
- **TailwindCSS only** (v4), möglichst kein Custom-CSS.
- **Prettier** für Formatierung (alle drei Apps haben `.prettierrc` + `format`/`format:check`), **ESLint** ohne Formatierungsregeln.
- **npm** als Package-Manager — nie pnpm/yarn.
- **Versions-Single-source-of-truth = Root-`package.json`.** Release via
  `npm run version:patch && git push --follow-tags`; alles andere (Image-Tags,
  OCI-Labels, `/api/version`, `version.json`) leitet sich daraus ab — nie manuell.
  Die Sub-`package.json`/`package-lock.json`-Versionen (backend/frontend/player)
  pflegt der `version`-npm-Hook via `scripts/sync-versions.mjs` aus der Root-Version
  — nie manuell editieren; CI (`sync-versions.mjs --check`) erzwingt das.
- Externe Calls (ntfy, SMTP) hinter Interface/Modul, mockbar.
- Geheimnisse/API-Keys nie plaintext loggen; Config über ENV (`@nestjs/config`).

## Do NOT
- Keine NgModules — immer Standalone Components.
- Keine Business-Logik in Angular-Components — immer Services.
- Multi-Tenancy nicht nur im Frontend „verstecken" — serverseitig per Scope/Guard.
- Transcoded/Original-Files nicht in die DB schreiben — Filesystem unter `MEDIA_BASE_PATH`.
- Schema nicht manuell in der Postgres-DB ändern — immer Migration.
- Nicht manuell formatieren — Prettier macht das.
- Kein pnpm/yarn. Keine `.env`-Dateien committen.
- README-Stack-Tabelle nicht blind übernehmen (Echtzeit = **SSE**, Protokoll = **JSON**).

## Commands
```bash
# Alles per Docker (dev): backend:3000 · frontend:4200 · player:4300 · redis:6379
npm run dev                       # docker compose up --build

# Root-Scripts fächern per `nx run-many` über ALLE Projekte (backend/frontend/player/shared-types):
npm run lint                      # nx run-many -t lint
npm run test                      # nx run-many -t test  (backend Jest · frontend/player Vitest)
npm run typecheck                 # nx run-many -t typecheck
npm run format:check              # nx run-many -t format:check
# Release + lokale Prod-Images (Version aus Root-package.json):
npm run version:patch             # bump + commit + tag (push: git push --follow-tags)
npm run images:build              # baut alle 3 prod-Images aus Repo-Root-Context

# Nx direkt (vom Repo-Root):
npx nx affected -t lint typecheck test build   # nur vom Diff betroffene Projekte (so läuft CI auf PRs)
npx nx run-many -t lint typecheck test build   # alle Projekte (so läuft CI auf main)
npx nx build  <app>               # backend → dist/apps/backend · frontend/player → dist/apps/<app>/browser
npx nx serve  <app>               # backend: nest start --watch · frontend/player: ng dev-server (4200/4300)
npx nx test   <app>               # backend: jest --coverage (Gate) · frontend: ng test · player: vitest run
npx nx typecheck <app> / lint <app> / format:check <app>

# Backend-DB (Drizzle, via Nx run-commands → drizzle-kit, cwd apps/backend):
npx nx run backend:db-generate    # drizzle-kit generate (Migration aus Schema-Diff)
npx nx run backend:db-migrate     # drizzle-kit migrate
npx nx run backend:db-push        # drizzle-kit push
npx nx run backend:db-studio      # drizzle-kit studio
```

> **Lokal ohne Docker:** PostgreSQL (16+), Redis (7+) und FFmpeg müssen erreichbar/auf
> dem `PATH` sein; `.env.example` → `.env` kopieren und `JWT_ACCESS_SECRET` setzen
> (`openssl rand -base64 48`). Schema via `nx run backend:db-migrate` anlegen.

## Tests & Quality Gates
- **CI:** `.github/workflows/ci.yml` — Trigger push `main`, Tags `v*.*.*`, PRs.
  Job 1 `lint-test-build` (EIN Job, kein Matrix mehr): `npm ci` am Root,
  `sync-versions.mjs --check`, dann `nrwl/nx-set-shas` + `nx affected -t
  format:check / lint typecheck build / test` auf **PRs** bzw. `nx run-many`
  auf **main** (nichts wird übersprungen). Backend-Coverage-Gate läuft im
  `test`-Target (Jest); zusätzlich `ArtiomTr/jest-coverage-report-action`
  (`working-directory: apps/backend`) für PR-Kommentar + Artifact aus
  `apps/backend/coverage`. Job 2 `docker` (Matrix backend/frontend/player):
  baut alle drei prod-Images aus Repo-Root-Context (`file: apps/<app>/Dockerfile.prod`),
  **published nach GHCR nur auf main/Tags** (nicht bei PRs).
- **Coverage-Gate nur Backend** (`backend/jest.config.ts`, ~80% — gemessen ~85%).
  Frontend/Player ohne Schwelle (Test-Abdeckung dort dünn: ~8 bzw. ~3 Specs;
  Backend ~83 Suites / 900+ Tests). Keine künstlichen Tests nur fürs Gate.
- **Frontend-Tests sind in CI ein harter Gate** (kein `continue-on-error` mehr).
  Der frühere `TestBed`-State-Leak über Spec-Dateien (Vitest +
  `@analogjs/vite-plugin-angular`) lag am Plugin-Default-Pool `vmThreads`, der
  `@angular/core/testing` externalisiert und das TestBed-Singleton über
  VM-Contexts auf demselben Thread teilt — auf Low-Core-Runnern, wo Specs sich
  einen Worker teilen, leakt das. Fix: `pool: 'forks'` in `frontend/vitest.config.ts`
  (frische, prozess-isolierte Modul-Registry je Spec-Datei). Grün auch bei
  `singleFork`/`--no-file-parallelism`.
- Kein e2e-Setup; eine Backend-Integration-Spec (`playlist-transition.integration.spec.ts`).

## Environment (wichtigste Variablen)
| Variable | Zweck |
| --- | --- |
| `DATABASE_URL` | PostgreSQL-DSN (z. B. `postgres://signage:signage@localhost:5432/signage`) |
| `REDIS_URL` | BullMQ-Queue + Refresh-Tokens (`redis://localhost:6379`) |
| `MEDIA_BASE_PATH` | Root für Original/Transcoded Media |
| `JWT_ACCESS_SECRET` | **Pflicht** — Secret für JWT-Access-Token (`openssl rand -base64 48`) |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Token-Lebensdauer (z. B. `15m` / `30d`) |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` | Cookie-Härtung (Secure default nur bei `NODE_ENV=production`) |
| `PUBLIC_BASE_URL` | Basis-URL der Admin-SPA (Set-Password/Reset-Links + CORS) |
| `SUPER_ADMIN_EMAILS` | Komma-getrennte E-Mails, beim Boot als System-Super-Admins geseedet |
| `SUPER_ADMIN_INITIAL_PASSWORD` | Optionales Initial-Passwort für geseedete Super-Admins |
| `MAX_FILE_SIZE_BYTES` | Upload-Limit |
| `FFMPEG_PATH` | FFmpeg-Binary (default: System-PATH) |
| `FFMPEG_VIDEO_CRF` / `_PRESET` / `_MAXRATE` / `_BUFSIZE` | Transcoding-Qualität |

## Deployment (Prod) — GHCR-Pull-Modell
- **CI baut + published** die Images nach **GHCR** (`ghcr.io/flo-schilli/digital-signage/{backend,frontend,player}`).
- **Ansible** (`ansible/deploy.yml`) baut nichts lokal mehr — es `podman login`t
  (falls `ghcr_token` gesetzt) und **zieht** die Images. App-Quadlets sind Templates
  (`ansible/templates/signage-*.container.j2`) mit `AutoUpdate=registry` + `Pull=newer`;
  der Tag ist über `signage_image_tag` (default `latest`, pinbar auf `1.2.3`) steuerbar.
  Redis kommt direkt von `docker.io/library/redis:7-alpine`.
- **Versions-Surfaces:** Build-args `APP_VERSION/GIT_COMMIT/BUILD_DATE` → OCI-Labels
  in allen Images; Backend `GET /api/version`; Frontend & Player `GET /version.json`.
- **Caddy** als einziger öffentlicher Reverse Proxy (`templates/Caddyfile.j2`),
  inkl. SSE-Pass-Through (X-Real-IP) und **fail2ban**-Jail.
- Container-Härtung: `tini` als PID 1 (backend), `HEALTHCHECK` in allen Images
  (backend → `/api/health`, nginx → `/`). Backend bleibt rootless-gemapptes root
  wegen Host-Bind-Mounts (`%h/app/{data,media}`); erzwungenes `USER 1001` würde
  Schreibrechte auf die Volumes brechen.
- DB-Backup/Restore über `ansible/download_db.yml` / `upload_db.yml`.
- Auth-Flow: Frontend ↔ Backend (email+password) → JWT-Access-Cookie + Redis-
  Refresh-Token; Backend signiert/validiert mit `JWT_ACCESS_SECRET`. Screens nutzen API-Keys.
