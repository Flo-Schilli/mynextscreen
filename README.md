# Signage Server

A **multi-tenant digital signage platform** for concert venues. Organisations manage screens (TVs) distributed across their venue, upload and transcode images and videos into a shared content library, build playlists, schedule them across screens, and stream live video — all controlled from an Angular web dashboard.

## Features

- **Multi-tenant** — fully isolated organisations with separate screens, content, playlists, and users
- **Role-based access** — Org Admin, Editor, and Viewer roles per organisation; system-level super-admin
- **Content library** — upload images and videos with automatic transcoding (H.264 MP4, WebP)
- **Playlists** — build ordered playlists from content library items
- **Scheduling** — calendar-based scheduling with recurring rules (iCal RRULE)
- **Screen groups** — mirror and split modes for video walls
- **Live streaming** — ingest live streams via FFmpeg, serve HLS to screens
- **Real-time updates** — SSE-powered dashboard with live screen status
- **Notifications** — in-app, email (SMTP), and ntfy push notifications
- **Audit log** — full audit trail of all user and system actions
- **Screen protocol abstraction** — JSON adapter (first implementation), extensible to additional protocols (e.g. SMIL)

## Tech Stack

| Layer          | Technology                              |
| -------------- | --------------------------------------- |
| Frontend       | Angular 21, Tailwind CSS v4             |
| Backend        | NestJS 11, Drizzle ORM                  |
| Database       | PostgreSQL 16                           |
| Job Queue      | BullMQ + Redis                          |
| Authentication | Internal email + password — JWT access cookie + Redis refresh tokens (users), API keys (screens) |
| Real-time      | Server-Sent Events (SSE)                |
| Media          | FFmpeg (transcoding + HLS)              |
| Runtime        | Node.js 22                              |
| Monorepo       | Nx (single root `package.json`)         |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

For local development without Docker:
- Node.js 22+
- PostgreSQL 16+
- Redis 7+
- FFmpeg installed and available on `PATH`

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Flo-Schilli/digital-signage.git
cd digital-signage

# 2. Create your environment file
cp .env.example .env

# 3. Configure environment variables (see section below)
#    At minimum, set JWT_ACCESS_SECRET

# 4. Start all services (backend, frontend, player, redis, postgres)
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:4200
- **Player:** http://localhost:4300
- **Backend API:** http://localhost:3000

## Environment Variables

Copy `.env.example` to `.env` and configure the values below.

### Authentication (Required)

Signage Server uses **internal authentication** (email + password). Passwords are hashed with bcrypt; login issues a short-lived JWT **access token** (HTTP-only cookie) plus a **refresh token** stored in Redis. There is no external identity provider and no self-registration — super-admins are seeded from configuration on boot and provision everyone else.

#### Auth Environment Variables

| Variable                       | Description                                                              | Required |
| ------------------------------ | ------------------------------------------------------------------------ | -------- |
| `JWT_ACCESS_SECRET`            | Secret used to sign JWT access tokens. Generate with `openssl rand -base64 48` | **Yes**  |
| `JWT_ACCESS_TTL`               | Access-token lifetime (e.g. `15m`)                                       | No (`15m`) |
| `JWT_REFRESH_TTL`              | Refresh-token lifetime (e.g. `30d`)                                      | No (`30d`) |
| `COOKIE_SECURE`                | Force `Secure` cookies (defaults to `true` only when `NODE_ENV=production`) | No       |
| `COOKIE_SAMESITE`              | Cookie `SameSite` policy: `strict` (default) \| `lax` \| `none`          | No       |
| `PUBLIC_BASE_URL`              | Admin SPA base URL — used to build set-password/reset links and to lock down CORS | No       |

**First super-admin (first-run setup):** there is no env-based seeding. On a fresh deployment — while no user exists yet — opening the app routes you to a one-time setup screen where you create the initial super-admin account; you are logged in immediately and can then provision organisations. Once any user exists the setup screen is closed and normal login applies.

### All Environment Variables

| Variable              | Description                                   | Default                | Required |
| --------------------- | --------------------------------------------- | ---------------------- | -------- |
| `DATABASE_URL`        | PostgreSQL connection string                  | —                      | **Yes**  |
| `REDIS_URL`           | Redis connection string (BullMQ + refresh tokens) | `redis://localhost:6379` | No   |
| `MEDIA_BASE_PATH`     | Base path for uploaded and transcoded media    | `./media`              | No       |
| `MAX_FILE_SIZE_BYTES` | Upload size limit                             | —                      | No       |
| `FFMPEG_PATH`         | Path to FFmpeg binary                         | `ffmpeg` (system PATH) | No       |
| `FFMPEG_VIDEO_CRF` / `_PRESET` / `_MAXRATE` / `_BUFSIZE` | Video transcoding quality   | see `.env.example`     | No       |
| `JWT_ACCESS_SECRET`   | Secret for signing JWT access tokens          | —                      | **Yes**  |

### Example `.env`

```env
# Database (PostgreSQL)
DATABASE_URL=postgres://signage:signage@localhost:5432/signage

# Redis
REDIS_URL=redis://localhost:6379

# Media storage
MEDIA_BASE_PATH=./media

# FFmpeg
# FFMPEG_PATH=/usr/bin/ffmpeg
# FFMPEG_VIDEO_CRF=18

# Internal auth (REQUIRED) — generate with: openssl rand -base64 48
JWT_ACCESS_SECRET=change-me-in-production
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

# Super-admin: no env seeding — create the first one via the UI on first run.
```

## Docker Setup

### Development (Docker Compose)

The default `docker-compose.yml` spins up five services with hot-reload enabled:

| Service    | Port | Description                            |
| ---------- | ---- | -------------------------------------- |
| `frontend` | 4200 | Angular dev server with proxy to backend |
| `player`   | 4300 | Angular player app                     |
| `backend`  | 3000 | NestJS in watch mode                   |
| `redis`    | 6379 | Redis 7 (Alpine) — BullMQ + refresh tokens |
| `postgres` | 5432 | PostgreSQL 16 (Alpine)                 |

```bash
# Start all services with hot-reload
npm run dev

# Or equivalently
docker compose up --build
```

Source code is mounted as volumes, so changes to `apps/backend/src/`, `apps/frontend/src/`, and `apps/player/src/` are picked up automatically. The compose file sets sensible dev defaults for all env vars (including `DATABASE_URL` and a dev `JWT_ACCESS_SECRET`), so it runs out of the box.

Persistent data is stored in Docker volumes:
- `signage-postgres-data` — PostgreSQL data directory
- `media-data` — uploaded and transcoded media files

### Passing Environment Variables to Docker

The compose file already wires backend env vars for dev. To override (e.g. a real `JWT_ACCESS_SECRET`), use one of:

**Option 1: Inline with `docker compose`**

```bash
JWT_ACCESS_SECRET=$(openssl rand -base64 48) \
docker compose up --build
```

**Option 2: Using `env_file` in docker-compose.yml**

Add to the backend service:

```yaml
services:
  backend:
    env_file:
      - .env
```

> **Note:** Several compose vars use `${VAR:-default}` substitution (e.g. `JWT_ACCESS_SECRET`, `COOKIE_SECURE`), so values exported in your shell or `.env` override the dev defaults automatically.

### Production Deployment

Production does **not** use this compose file. CI builds the three app images (`apps/<app>/Dockerfile.prod`) and publishes them to **GHCR**; **Ansible** (`ansible/deploy.yml`) pulls them and runs them as rootless **Podman** Quadlets behind **Caddy** (the single public reverse proxy, with SSE pass-through). PostgreSQL and Redis are provisioned alongside. See `ansible/` for the full deployment. At minimum, production requires a strong `JWT_ACCESS_SECRET`, a `DATABASE_URL` pointing at PostgreSQL, and FFmpeg in the backend image (already included).

## Local Development (Without Docker)

This is an **Nx monorepo** — there is a single root `package.json`, so install once at the root (no per-app `npm install`). PostgreSQL, Redis, and FFmpeg must be reachable.

```bash
# 1. Install all dependencies (root only)
npm ci

# 2. Configure environment
cp .env.example .env   # set JWT_ACCESS_SECRET + DATABASE_URL

# 3. Apply the database schema
npx nx run backend:db-migrate

# 4. Start the apps (separate terminals)
npx nx serve backend     # NestJS watch mode → :3000
npx nx serve frontend    # Angular dev server → :4200
npx nx serve player      # Angular dev server → :4300
```

### Database Migrations (Drizzle)

Run from the repo root via Nx (delegates to `drizzle-kit`, cwd `apps/backend`):

```bash
# Generate a migration from schema changes (src/db/)
npx nx run backend:db-generate

# Apply pending migrations
npx nx run backend:db-migrate

# Push schema directly (dev only — never in prod)
npx nx run backend:db-push

# Open Drizzle Studio
npx nx run backend:db-studio
```

## Available Scripts

### Root (fan out across all projects via `nx run-many`)

| Script              | Command                                            |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start all services via Docker Compose              |
| `npm run lint`      | Lint backend + frontend + player + shared-types    |
| `npm run test`      | Run all tests (backend Jest · frontend/player Vitest) |
| `npm run typecheck` | TypeScript type checking across all projects       |
| `npm run format:check` | Prettier check across all projects              |

### Per project (via Nx)

```bash
npx nx build  <app>       # backend → dist/apps/backend · frontend/player → dist/apps/<app>/browser
npx nx serve  <app>       # backend: nest start --watch · frontend/player: ng/vite dev server
npx nx test   <app>       # backend: jest --coverage (gate) · frontend/player: Vitest
npx nx lint <app> / typecheck <app> / format:check <app>

# Only projects affected by the current diff (how CI runs on PRs):
npx nx affected -t lint typecheck test build
```

## Project Structure

```
digital-signage/
├── apps/
│   ├── backend/              # NestJS API server
│   │   ├── project.json      # Nx targets: build/serve/test/… + db-* (drizzle-kit)
│   │   └── src/
│   │       ├── auth/         # Internal email+password auth, API key auth, role guards
│   │       ├── organisation/ # Multi-tenant org management
│   │       ├── user/         # User-org membership and roles
│   │       ├── screen/       # Screen registration and management
│   │       ├── screen-group/ # Screen grouping (mirror/split modes)
│   │       ├── content/      # Content library and transcoding pipeline
│   │       ├── playlist/     # Playlist CRUD
│   │       ├── schedule/     # Calendar scheduling with RRULE support
│   │       ├── live-stream/  # Live stream management (FFmpeg + HLS)
│   │       ├── screen-protocol/ # Protocol abstraction (JSON adapter; SMIL planned)
│   │       ├── notification/ # In-app, email, ntfy notifications
│   │       ├── audit-log/    # Audit trail
│   │       ├── dashboard/    # SSE service for real-time updates
│   │       ├── media/        # Filesystem media management
│   │       ├── search/       # Global search
│   │       └── db/           # Drizzle schema + migrations/ (generated SQL)
│   ├── frontend/             # Angular 21 admin SPA (src/app/<domain>, shell/, shared/)
│   └── player/               # Angular 21 player app (connection/, playback/, player/)
├── libs/
│   └── shared-types/         # Shared TypeScript types (@signage/shared-types)
├── nx.json                   # Nx targets, named inputs, caching
├── tsconfig.base.json        # TS path mappings
├── package.json              # Single source of truth: version + all deps
├── docker-compose.yml        # Dev orchestration (backend/frontend/player/redis/postgres)
├── ansible/                  # Production deployment (Podman Quadlets + Caddy)
├── .env.example              # Environment variables template
├── ARCHITECTURE.md           # Technical architecture documentation
└── VISION.md                 # Product vision and feature details
```

## Authentication Flow

1. User opens the frontend and signs in with **email + password** on the built-in login screen
2. The backend verifies the bcrypt password hash, then issues a short-lived JWT **access token** as an HTTP-only cookie and stores a **refresh token** in Redis
3. The browser sends the access cookie automatically with each API request; the backend validates it with `JWT_ACCESS_SECRET` and refreshes via the refresh token when it expires
4. Org/role scope is resolved server-side per request from the user's memberships — every query is scoped by `organisationId`
5. Screens authenticate separately using API keys issued by Org Admins

## License

Private — All rights reserved.
