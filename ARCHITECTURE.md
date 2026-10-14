# Architecture

## Overview

A multi-tenant digital signage platform built with **NestJS** (backend), **Angular 22** (frontend), **PostgreSQL** (database, via Drizzle ORM), and **Redis** (job queue + auth refresh tokens). The server manages screens, content, playlists, schedules, and live streams for concert venues. Screens communicate via a protocol abstraction layer (JSON over HTTP + SSE as the first implementation).

## Monorepo & Build

The repository is an **Nx integrated monorepo** with a single root `package.json` and `package-lock.json` (one install, one dependency set, the canonical version). Configuration lives in `nx.json` (targets, caching, `production` named-inputs) and `tsconfig.base.json` (TS path mappings).

- **Projects** — `apps/backend` (NestJS), `apps/frontend` and `apps/player` (Angular 22), and `libs/shared-types` (shared TypeScript types consumed via the `@mynextscreen/shared-types` path alias). Apps carry **no** own `package.json`; each declares its targets in `project.json` (build/serve/test/typecheck/lint/format, plus `db-*` drizzle-kit targets on backend).
- **Test runners** — mixed: backend uses **Jest** (enforces the coverage gate), frontend uses **Vitest** via `ng test`, player uses **Vitest** via `vitest run`.
- **Build outputs** — backend → `dist/apps/backend` (`main.js`); frontend/player → `dist/apps/{frontend,player}/browser`.
- **CI** (`.github/workflows/ci.yml`) — one `lint-test-build` job installs at the root, then runs `nx affected -t lint typecheck test build` on PRs (only projects touched by the diff, base resolved via `nrwl/nx-set-shas`) and `nx run-many` on `main`/tags (full graph). A separate `docker` job builds the three prod images from the **repo-root context** (`apps/<app>/Dockerfile.prod`) and pushes to GHCR on `main`/tags only.

## API Layer

- **REST API** over HTTP, JSON request/response bodies
- **Authentication:**
  - **Users** — internal email + password (bcrypt). Login issues a short-lived JWT access token (HTTP-only cookie) plus a refresh token stored in Redis; JWT claims carry `userId` and `role`. Org/role scope is resolved server-side per request from memberships.
  - **Screens** — enrolled by a six-digit pairing code claimed in the dashboard. The credential handed over is exchanged once for a short-lived access token (its own JWT audience, `mynextscreen-screen`) plus a rotating refresh token held in Postgres; both travel in the `Authorization` header. Media URLs carry an HMAC signature instead of a credential.
  - **Site agents** — a service inside a venue's network, enrolled with a one-time token an admin issues in the dashboard (an agent has no display to show a code on). It exchanges that once for a short-lived access token with its own JWT audience, `mynextscreen-agent`, plus a rotating refresh token in Postgres. It reaches the server outbound only.
- **Authorisation** — NestJS guards enforce role-based access per organisation:
  - Super-admin: system-level operations (provision orgs, view global audit log)
  - Org Admin: full control within their organisation
  - Editor: content, playlists, schedules, live streams
  - Viewer: read-only
- **Multi-tenancy** — every query is scoped by `organisationId`, extracted from the user or screen token; no cross-tenant data access is possible at the service layer
- **Entity IDs** — UUIDs for all entities

## Backend

### Runtime & Startup

- **NestJS** application with modular architecture (one module per domain)
- **Drizzle ORM** with PostgreSQL for relational data (schema in `src/db/`, migrations via drizzle-kit)
- **BullMQ + Redis** for background job processing (Redis also stores auth refresh tokens)
- **FFmpeg** as a child process for content and live stream transcoding
- On startup: initialise DB connection, connect to Redis, register BullMQ workers

### Key Modules

| Module                   | Responsibility                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AuthModule**           | Internal email+password auth (bcrypt), JWT access cookie + Redis refresh tokens, screen enrolment and session tokens, guards for role-based access |
| **OrganisationModule**   | CRUD for organisations, storage limit enforcement, default playlist config, time zone                                                              |
| **UserModule**           | User-org membership, role assignment, notification preferences                                                                                     |
| **ScreenModule**         | Pairing and re-pairing, screen sessions (rotating refresh tokens), heartbeat tracking, online/offline status                                       |
| **ScreenGroupModule**    | Group management, mirror/split mode config, grid layout for video walls                                                                            |
| **SiteAgentModule**      | On-premise agents: enrolment, rotating sessions, per-screen remote-control settings, command channel and telemetry                                 |
| **ContentModule**        | Upload handling, metadata CRUD, storage tracking, triggers transcoding jobs                                                                        |
| **TranscodingModule**    | BullMQ workers: video → H.264 MP4, image → WebP (JPEG fallback), storage accounting                                                                |
| **PlaylistModule**       | Playlist CRUD, ordered items with per-item duration; dynamic playlists: rule DTO, pure resolver, `playlist-resolve` queue, rule scheduler          |
| **ContentSourceModule**  | Website adapters, guarded HTTP client, `content-source-sync` queue (sync + daily cleanup), slide renderer (sharp), event pool + facets API         |
| **ScheduleModule**       | Calendar-based schedule CRUD, recurring rules (RRULE/iCal standard), conflict detection (no overlaps), fallback resolution                         |
| **LiveStreamModule**     | Stream URL management, FFmpeg process lifecycle, override/fallback logic                                                                           |
| **ScreenProtocolModule** | Protocol abstraction layer; JSON adapter (first), renders screen state for pull + SSE push                                                         |
| **NotificationModule**   | Notification hub: in-app, email (abstract interface), ntfy; per-user channel preferences                                                           |
| **AuditLogModule**       | Records all significant actions with timestamp, user, organisation, action, affected resource                                                      |
| **SearchModule**         | Global search across screens, content, and playlists within the current organisation                                                               |
| **DashboardSseModule**   | SSE-based real-time dashboard updates (screen status, transcoding progress, schedule changes, notifications)                                       |

## Data & Persistence

- **PostgreSQL** (via Drizzle ORM) — all relational data: organisations, users, memberships, screens, groups, content metadata, playlists, schedules, audit log, notifications
- **Filesystem** — media storage in a configurable base path:
  ```
  {MEDIA_BASE_PATH}/{organisationId}/originals/{contentId}.{ext}
  {MEDIA_BASE_PATH}/{organisationId}/transcoded/{contentId}.{ext}
  ```
- **Redis** — BullMQ job queues (transcoding, slicing, content-source sync/cleanup, playlist resolve) plus _user_ refresh tokens; no other application data
- **Screen sessions live in PostgreSQL**, not Redis, and deliberately so: Redis runs without `appendonly`, and a lost snapshot window would leave every screen that rotated inside it holding a token the server has never seen. With no credential left on the device, that is a visit per display
- **Storage tracking** — per-organisation byte counters for originals and transcoded files, checked on upload against configurable limits
- **Content-source tables** (migration `0027_content_sources`):
  - `content_sources` — adapter type + params (jsonb), slide `formats` and `style`, `syncIntervalMinutes`, `enabled`, `nextSyncAt`, last sync status/error/summary
  - `source_events` — one row per scraped event, unique on `(sourceId, externalId)`; listing data, details (`imageUrl`, `ticketUrl`, `priceCents`, `currency`), `dataHash` for change detection, `firstSeenAt`/`lastSeenAt`, `goneAt` when no longer listed
  - `source_event_slides` — rendered slide per `(sourceEventId, format)`, pointing at a content row, with the `renderHash` of everything it shows
  - `contents.managedBySourceId` — set on slides; such content is hidden from library, search, bulk operations and dashboard counters (storage totals still include it)
  - `playlists.kind` (`static` | `dynamic`), `rule` (jsonb), `nextResolveAt`, `lastResolvedAt`

## Site Agents

An LG consumer TV has no autostart and its Developer Mode session expires — and
when it does, the set deletes the installed app. The server cannot act on either
from outside the venue, and the player heartbeat alone cannot tell _the TV is
off_ from _the TV is on and the app is not running_.

A **site agent** is a separate service (`apps/site-agent`) that runs inside a
venue's LAN, pairs with one organisation and looks after the displays assigned
to it: it probes them, starts the app over SSAP, wakes them with Wake-on-LAN
before a schedule begins, and extends Developer Mode over SSH + the Luna bus.

- **Outbound only to the server**: an HTTPS config pull plus an SSE channel for
  operator commands. The one inbound port is its own setup page on the venue
  LAN, and `MNS_SETUP_PORT=0` removes even that. Enrolling and resetting there
  need a **setup code** issued by an OrgAdmin in the dashboard: org-scoped,
  single-use, short-lived. Nothing is printed to the container log for an
  operator to read. A deployment can supply the same code through
  `MNS_ENROLMENT_TOKEN` and run with `MNS_SETUP_PORT=0`, which leaves no inbound
  port at all; the variable is consulted only while no session is stored, so a
  restart does not try to spend a code again.
- **The TVs' private keys never leave the venue.** The server stores only the
  Developer Mode passphrase, encrypted; the agent fetches each key from the
  set's own key server. That passphrase is the only field in the system that is
  delivered to one caller in the clear and masked for another, which is why the
  agent's payload and the dashboard's are separate types.
- **The address is pinned, not configured.** `MNS_SERVER_URL` is required: the
  agent refuses to boot without it, and the setup page cannot change it. Without
  the pin an edited state file would have the agent present its real refresh
  token to an address of the attacker's choosing — not an escalation, since that
  file is readable by anyone who can write it, but the pin means a restored
  backup or a loose host mount cannot quietly move an agent. Since the setup
  code replaced the log PIN, this pin is the only thing standing between the
  agent and a rogue server, so it must be an `https://` address; `http://` is
  refused unless `MNS_ALLOW_INSECURE_SERVER_URL=true` is set for local
  development.
- **It works from cache.** The configuration is held on disk, so a venue keeps
  being looked after — including waking a set before a schedule — when the
  uplink is down.
- **Commands are not queued.** A command to a disconnected agent is refused with
  409, because a "start the app now" that fires six hours later is worse than
  none.
- The command channel's connection map is per process, like the screen and
  dashboard SSE streams. A horizontally scaled backend would reach an agent only
  from the instance it is connected to; the channel therefore carries nothing
  that must not be lost.

See [docs/site-agent.md](docs/site-agent.md).

## Content Sources & Dynamic Playlists

Venues publish their programme on websites. A **content source** turns such a
site into an event pool with rendered slides, and **dynamic playlists** pick
from that pool by rule and keep themselves current.

```
content_sources ──(content-source-sync: sync-<sourceId>)──▶ source_events ──▶ source_event_slides ──▶ contents (managed, hidden)
                                                                 │
playlists (kind=dynamic, rule) ◀──(playlist-resolve: resolve-<playlistId>)──┘  → playlist_items (materialised)
```

- **Adapters** (`content-source/adapters/`) implement `ContentSourceAdapter`:
  `paramsSchema` (the dashboard renders the form from it), `validateParams`,
  `listEvents` (listing pages, status, genres) and `fetchDetails` (image, ticket
  link, price from the detail page). Details are fetched only for new events,
  events whose listing hash changed, or while the image is still missing; when
  they fail, the old hash stays so the next sync fetches them again. A
  listing reports whether it was complete; only a complete listing marks
  missing events as gone, and only if it shows at least half of the current
  (not yet past) events. A listing that collapses below that, e.g. a
  maintenance page served with HTTP 200, marks nothing gone and ends the sync
  `partial`. The registry maps `adapterType` to the adapter.
- **HTTP** goes through `SourceHttpClient` only: every URL and redirect hop is
  checked against the adapter's host allowlist and the `OutboundGuard`
  (no private targets), 20 s timeout, 5 MB cap, retries on 5xx, 300 ms pause
  between requests. No new configuration: the allowlist lives on the adapter.
- **Sync** (`ContentSourceSyncService`, queue `content-source-sync`, job id
  `sync-<sourceId>`): list → upsert `source_events` → mark unlisted ones gone →
  render every current event (from yesterday on) in every configured format
  whose `renderHash` changed. A new slide becomes managed content via
  `ContentService.createManaged`; a changed one replaces the file under the
  same content id (`replaceManagedFile`), so playlist items stay valid. Both
  go through the regular quota, magic-byte check and transcoding queue. A new
  slide whose `source_event_slides` row cannot be stored is deleted again. The
  outcome is stored on the source as a summary, audited, and
  `content_source.synced` is emitted.
- **Slide renderer** (`slide/`) composes an SVG layer (artist, `Sa, 10.10.2026
• Venue`, status badge, QR code to the ticket shop) over the event image with
  sharp and writes JPEG. Landscape puts the fitted image full-frame with the
  text bottom left; portrait puts the image on top and the text below. The
  text is drawn with the system fonts, so the backend image ships `fontconfig`,
  DejaVu and Liberation.
- **Rule engine** (`playlist/`): `PlaylistRuleDto` validates the rule (date
  bounds as tagged objects: `{ mode: 'today' | 'fixed' | 'relativeDays' }`
  and `{ mode: 'none' | 'fixed' | 'relativeDays' }`); `resolvePlaylistRule`
  is a pure function over pool, rule, clock and organisation time zone. An
  event expires at the start of the next local day plus `graceHours`.
  `PlaylistRuleService.resolve` writes the result with
  `PlaylistService.replaceItems` (one transaction with row lock, diff against
  the stored items, `PLAYLIST_UPDATED` only on change; nothing is written when
  the stored rule no longer equals the one the resolve read) and sets
  `nextResolveAt` to the refresh interval or the earliest expiry of a shown
  event, whichever comes first. A failed job backs off to the refresh
  interval; a failed immediate resolve after create or rule update leaves the
  playlist due.
- **Triggers**: `content_source.synced` queues a resolve of every dynamic
  playlist fed by that source; `PlaylistRuleScheduler` and
  `ContentSourceScheduler` tick once a minute and queue whatever is due. The
  playlist scheduler lives in the playlist module because playlist depends on
  content-source, not the other way round. BullMQ job ids deduplicate across
  instances. A request that arrives while the job with that id is running
  marks the source or playlist due (`nextSyncAt`/`nextResolveAt` = now), and
  the running job keeps that value instead of writing its own, so the next
  tick queues it again. The tickers' own enqueues never mark a running job's
  source or playlist due; otherwise every run longer than a tick would repeat
  forever.
- **Protection**: dynamic playlists answer `409` on every manual item endpoint
  and on bulk-add; `PATCH /playlists/:id/rule` answers `409` for static ones.
  The kind is fixed at creation. Managed slides answer `409` to library
  delete, re-upload and metadata edits and to adding them to a static
  playlist (`400` in bulk operations); sources delete them through
  `ContentService.deleteManaged`.
- **Removal**: deleting a source locks its row, deletes its slides through
  `deleteManaged` (files and quota) and then the row; a running sync cannot
  add a slide meanwhile, its insert waits and fails on the foreign key.
  Playlists that showed a slide get `PLAYLIST_UPDATED`, and
  `content_source.removed` drops the source from every dynamic rule and
  re-resolves those playlists.
- **Cleanup**: the content-source ticker queues `cleanup-<day>` once per UTC
  day and adds it again hourly. A finished job is kept for two days, so these
  adds (also from a second instance) are no-ops; a failed one is removed at
  once, so the next add retries it.
  `ContentSourceCleanupService` deletes, per organisation, the slides of events
  that ended more than 14 local days ago or are gone, unless a playlist still
  references them, through `ContentService.deleteManaged` (files and quota). Gone
  events without slides are removed; past events the site still lists keep
  their row, so the next sync does not re-create them and refetch details.
- **API**: `content-sources` (CRUD, `POST :id/sync`, `GET :id/events`,
  `GET facets`, `GET adapters`; read for all roles, write for Org Admin and
  Editor), `POST /playlists` with `kind` + `rule`, `PATCH /playlists/:id/rule`,
  `POST /playlists/rule-preview`.

From materialised items onward nothing is special: screen state, schedules,
slicing and SSE treat a dynamic playlist like any other.

## Screen Communication

### Protocol Abstraction

A **ScreenProtocol** adapter interface decouples the server's internal screen state model from the wire format:

```
interface ScreenProtocolAdapter {
  renderState(screen: ScreenState): ProtocolPayload
  renderUpdate(event: ScreenEvent): ProtocolPayload
}
```

- **JsonProtocolAdapter** — first implementation, produces JSON payloads
- Additional adapters (e.g. SMIL for third-party players) can be added without changing core logic

### Communication Flow

1. **Startup pull** — screen sends `GET /api/screens/{id}/state` with its session token → receives full state (current playlist, schedule, signed content URLs)
2. **SSE push** — screen opens `GET /api/screens/{id}/events` (SSE endpoint) → receives real-time updates (schedule change, live stream override, content update)
3. **Heartbeat** — screen sends `POST /api/screens/{id}/heartbeat` at a configurable interval, reporting its player version; the server marks a screen offline when no heartbeat arrives within the timeout

Media is fetched with a **signed URL** rather than a credential: an HMAC over
screen id and path, keyed from `JWT_ACCESS_SECRET`, bucketed to a day with a
per-screen offset. The URL therefore stays byte-stable for at least 24 hours and
ordinary HTTP caching keeps working. Only the path is signed, so unknown query
parameters cannot invalidate it. The state appends `v=<content updatedAt>`
(for split-mode slices: the rendition's source hash) after the signature, so a
file replaced under the same content id gets a new URL. When transcoding of
such a file completes, every playlist that shows it is announced with
`PLAYLIST_UPDATED`, and the screens refetch their state. The dashboard
versions its thumbnail and file URLs the same way.

### Screen Groups & Sync

- **Loose sync** — when a group event occurs (playlist change, live stream start), the server sends an SSE event to all screens in the group simultaneously
- **Mirror mode** — all screens receive identical state
- **Split mode** — server computes each screen's viewport slice based on grid position and content dimensions; each screen receives its own cropped content URLs
- Live streams on a group always use mirror behaviour regardless of mode

## Content Transcoding

- **Upload flow:** file received → saved to originals path → BullMQ job enqueued → API returns immediately with `transcoding` status
- **Worker:** picks up job, spawns FFmpeg child process:
  - Video → H.264 MP4 (configurable bitrate/resolution)
  - Image → WebP (JPEG fallback for compatibility)
- **Progress:** worker reports progress via BullMQ events → DashboardSseService pushes to frontend via SSE
- **Storage accounting:** on completion, original and transcoded file sizes are added to the organisation's usage counters
- **Re-upload:** overwrites both original and transcoded files, updates storage counters; on completion the playlists showing the item are announced to their screens

## Live Streaming

- **Activation:** Org Admin or Editor provides a stream URL and target screen(s)/group → `LiveStreamService` spawns an FFmpeg child process
- **FFmpeg process:** ingests the source stream, transcodes to HLS segments served via HTTP
- **Override:** activating a live stream sends an SSE event to target screens, overriding the current playlist
- **Fallback:** `LiveStreamService` monitors the FFmpeg process; when the source stops or the stream is deactivated, it sends an SSE event to resume the scheduled playlist
- **Abstraction:** `LiveStreamService` manages FFmpeg process lifecycle behind an interface, allowing future replacement with a dedicated media server (e.g. MediaMTX)

## Notifications

- **NotificationHub** — central service that receives events (screen offline, transcoding complete, etc.) and fans out to configured channels
- **Channels:**
  - **In-app** — stored in DB, delivered to dashboard via SSE
  - **Email** — SMTP through nodemailer, behind an `EmailProvider` interface. Two separate paths: organisation notifications use the organisation's own SMTP settings, while account mail (verification, invitations, resets, address changes) goes through the environment-configured platform mailer
  - **ntfy** — HTTP POST to a configurable URL with an auth token, per organisation
- **Outbound targets are guarded** — an organisation configures its own ntfy URL, SMTP host and live-stream source, so each is checked against its resolved address and refused if it points at loopback, private, link-local or CGNAT space unless listed in `OUTBOUND_ALLOWED_HOSTS`
- **Credentials at rest** — per-organisation SMTP passwords and ntfy tokens are encrypted with AES-256-GCM when `SECRETS_ENCRYPTION_KEY` is set; without it they are stored in plaintext and the backend says so at boot
- **User preferences** — each user toggles channels independently; hub checks preferences before dispatching
- **Organisation config** — ntfy URL/token and email provider settings stored per organisation

## Audit Log

- Every significant action produces an `AuditEntry`:
  - `timestamp`, `userId`, `organisationId`, `action` (enum), `resourceType`, `resourceId`, `details` (JSON)
- Emitted as application events and written by `AuditListener` (`@OnEvent`), so recording an action never blocks the request that caused it
- Queryable by Org Admins (scoped to their org) and super-admin (global)
- Filterable by action type, user, resource, and date range

## Frontend

- **Angular 22** with **Tailwind CSS v4** and **PostCSS**
- **Dark mode first** — CSS custom properties for theme switching
- **SSE client** for real-time dashboard updates (screen status, notifications, transcoding progress)
- **Global search** — searches across screens, content, and playlists within the current organisation
- **Component structure** mirrors backend modules: screens, content, playlists, schedules, live streams, settings
- **Calendar component** for schedule management (day/week/month views, drag-and-drop playlist blocks, RRULE-based recurring schedules)
- **Responsive** — the layout adapts down to tablet and phone widths; the calendar grid falls back to a list below the `md` breakpoint

## Deployment

- **Local dev** — **Docker Compose** (`docker compose up`) starts backend, frontend, player, `redis`, and `postgres` with hot-reload.
- **Production** — images are built in CI and published to **GHCR**; **Ansible** + rootless **Podman** Quadlets deploy them behind **Caddy** (single public reverse proxy, SSE pass-through). Redis comes from the official image; PostgreSQL is provisioned alongside.
- **Services:**
  - `backend` — NestJS application (API + SSE + BullMQ workers)
  - `frontend` / `player` — Angular SPAs (served as static builds in prod)
  - `redis` — job queue + auth refresh tokens
  - `postgres` — relational data store
- **Volumes:**
  - `postgres-data` — PostgreSQL data directory
  - `media-data` — original and transcoded media files
- **Configuration** — key environment variables:
  `DATABASE_URL`, `REDIS_URL`, `MEDIA_BASE_PATH`, `JWT_ACCESS_SECRET` (required,
  minimum 32 characters) and `PUBLIC_BASE_URL` (required in production, CORS
  fails closed without it). The full reference is
  [docs/configuration.md](docs/configuration.md).

The first system super-admin is **not** seeded from config. On a fresh deployment
(no user yet) the public endpoints `GET /api/auth/setup-status` and `POST /api/auth/setup`
back a UI first-run flow that creates the initial super-admin; the create call is gated
on "no user exists" (atomic) and closes once the first account is made.
