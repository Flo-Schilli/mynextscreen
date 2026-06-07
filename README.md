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
| Backend        | NestJS 11, TypeORM                      |
| Database       | SQLite (better-sqlite3)                 |
| Job Queue      | BullMQ + Redis                          |
| Authentication | Hanko Cloud (users), API keys (screens) |
| Real-time      | Server-Sent Events (SSE)                |
| Media          | FFmpeg (transcoding + HLS)              |
| Runtime        | Node.js 22                              |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A [Hanko Cloud](https://www.hanko.io/) project (free tier available)

For local development without Docker:
- Node.js 22+
- Redis 7+
- FFmpeg installed and available on `PATH`

## Quick Start

```bash
# 1. Clone the repository
git clone https://codeberg.org/fschillhammer/signage-server.git
cd signage-server

# 2. Create your environment file
cp .env.example .env

# 3. Configure environment variables (see section below)
#    At minimum, set HANKO_API_URL

# 4. Start all services
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:3000

## Environment Variables

Copy `.env.example` to `.env` and configure the values below.

### Hanko Authentication (Required)

Signage Server uses [Hanko Cloud](https://www.hanko.io/) for user authentication. You need a Hanko project to run the application.

#### Setting up Hanko

1. Create a free account at [cloud.hanko.io](https://cloud.hanko.io)
2. Create a new project
3. In your project settings, add your application URL to the **Allowed Origins** (e.g., `http://localhost:4200` for local development)
4. Copy the **API URL** from the project dashboard — it looks like `https://abcdef12-3456-7890-abcd-ef1234567890.hanko.io`

#### Hanko Environment Variables

| Variable              | Description                                                      | Required |
| --------------------- | ---------------------------------------------------------------- | -------- |
| `HANKO_API_URL`       | Your Hanko project API URL (e.g., `https://your-project.hanko.io`) | **Yes**  |
| `SUPER_ADMIN_USER_IDS` | Comma-separated Hanko user IDs that should have super-admin access | No       |

The backend validates JWT tokens by fetching the JWKS from `HANKO_API_URL/.well-known/jwks.json`. The frontend uses the same URL to render the Hanko login/registration UI via `@teamhanko/hanko-elements`.

**Finding your Hanko User ID:** After your first login, your user ID is visible in the Hanko Cloud dashboard under **Users**. Add it to `SUPER_ADMIN_USER_IDS` to gain super-admin access for creating organisations.

### All Environment Variables

| Variable              | Description                                   | Default                | Required |
| --------------------- | --------------------------------------------- | ---------------------- | -------- |
| `DATABASE_PATH`       | Path to the SQLite database file              | `./data/signage.db`    | No       |
| `REDIS_URL`           | Redis connection string for BullMQ job queue  | `redis://localhost:6379` | No       |
| `MEDIA_BASE_PATH`     | Base path for uploaded and transcoded media    | `./media`              | No       |
| `FFMPEG_PATH`         | Path to FFmpeg binary                         | `ffmpeg` (system PATH) | No       |
| `FFMPEG_VIDEO_BITRATE`| Video transcoding bitrate                     | `2M`                   | No       |
| `HLS_OUTPUT_DIR`      | Directory for HLS live stream segments        | `/tmp/signage-hls`     | No       |
| `HANKO_API_URL`       | Hanko Cloud project API URL                   | —                      | **Yes**  |
| `SUPER_ADMIN_USER_IDS`| Comma-separated super-admin Hanko user IDs    | —                      | No       |

### Example `.env`

```env
# Database
DATABASE_PATH=./data/signage.db

# Redis
REDIS_URL=redis://localhost:6379

# Media storage
MEDIA_BASE_PATH=./media

# FFmpeg
# FFMPEG_PATH=/usr/bin/ffmpeg
# FFMPEG_VIDEO_BITRATE=2M

# Hanko Cloud (REQUIRED)
HANKO_API_URL=https://abcdef12-3456-7890-abcd-ef1234567890.hanko.io

# Super-admin access
SUPER_ADMIN_USER_IDS=your-hanko-user-id
```

## Docker Setup

### Development (Docker Compose)

The default `docker-compose.yml` spins up three services with hot-reload enabled:

| Service    | Port | Description                            |
| ---------- | ---- | -------------------------------------- |
| `frontend` | 4200 | Angular dev server with proxy to backend |
| `backend`  | 3000 | NestJS in watch mode                   |
| `redis`    | 6379 | Redis 7 (Alpine) for BullMQ           |

```bash
# Start all services with hot-reload
npm run dev

# Or equivalently
docker compose up --build
```

Source code is mounted as volumes, so changes to `backend/src/` and `frontend/src/` are picked up automatically.

Persistent data is stored in Docker volumes:
- `db-data` — SQLite database
- `media-data` — uploaded and transcoded media files

### Passing Environment Variables to Docker

To configure Hanko and other settings in Docker, you have two options:

**Option 1: Using an `.env` file (recommended)**

Docker Compose automatically reads `.env` from the project root. Add variables to your docker-compose.yml's `environment` section:

```yaml
services:
  backend:
    environment:
      - DATABASE_PATH=/app/data/signage.db
      - REDIS_URL=redis://redis:6379
      - MEDIA_BASE_PATH=/app/media
      - HANKO_API_URL=https://your-project.hanko.io
      - SUPER_ADMIN_USER_IDS=your-hanko-user-id
```

**Option 2: Inline with `docker compose`**

```bash
HANKO_API_URL=https://your-project.hanko.io docker compose up --build
```

**Option 3: Using `env_file` in docker-compose.yml**

Add to the backend service:

```yaml
services:
  backend:
    env_file:
      - .env
```

> **Note:** The `HANKO_API_URL` is needed by both the backend (for JWT validation) and the frontend (for the login UI). The backend reads it from the environment. The frontend uses it via `environment.ts` — for production builds, the placeholder `${HANKO_API_URL}` in `environment.production.ts` should be replaced at build time or via a runtime config mechanism.

### Production Deployment

The included Dockerfiles are development-oriented (they run dev servers). For production:

1. Build optimized images with production commands (`npm run build` + a static file server for the frontend, `npm run start` for the backend)
2. Set `HANKO_API_URL` and other environment variables in your deployment platform
3. Use a reverse proxy (e.g., nginx, Caddy) to serve the frontend and proxy `/api` requests to the backend
4. Ensure FFmpeg is installed in the backend container for media transcoding

## Local Development (Without Docker)

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Backend
cd backend
npm install
cp ../.env.example .env  # Edit with your settings
npm run start:dev

# Terminal 3: Frontend
cd frontend
npm install
npm start
```

### Database Migrations

```bash
cd backend

# Run pending migrations
npm run migration:run

# Generate a migration from entity changes
npm run migration:generate -- src/migrations/MigrationName

# Revert the last migration
npm run migration:revert
```

## Available Scripts

### Root

| Script        | Command                         |
| ------------- | ------------------------------- |
| `npm run dev` | Start all services via Docker Compose |
| `npm run lint` | Run linters for backend + frontend |
| `npm run test` | Run frontend unit tests         |
| `npm run typecheck` | TypeScript type checking (backend) |

### Backend (`cd backend`)

| Script                     | Command                              |
| -------------------------- | ------------------------------------ |
| `npm run start:dev`        | Start in watch mode                  |
| `npm run start`            | Start in production mode             |
| `npm run build`            | Compile TypeScript                   |
| `npm run test`             | Run unit tests (Jest)                |
| `npm run test:cov`         | Run tests with coverage              |
| `npm run lint` / `lint:fix`| ESLint                               |
| `npm run migration:run`    | Run pending database migrations      |
| `npm run migration:revert` | Revert last migration                |

### Frontend (`cd frontend`)

| Script          | Command                     |
| --------------- | --------------------------- |
| `npm start`     | Start Angular dev server    |
| `npm run build` | Production build            |
| `npm test`      | Run unit tests (Vitest)     |
| `npm run lint`  | ESLint                      |
| `npm run format`| Prettier formatting         |

## Project Structure

```
signage-server/
├── backend/                  # NestJS API server
│   └── src/
│       ├── auth/             # Hanko JWT validation, API key auth, role guards
│       ├── organisation/     # Multi-tenant org management
│       ├── user/             # User-org membership and roles
│       ├── screen/           # Screen registration and management
│       ├── screen-group/     # Screen grouping (mirror/split modes)
│       ├── content/          # Content library and transcoding pipeline
│       ├── playlist/         # Playlist CRUD
│       ├── schedule/         # Calendar scheduling with RRULE support
│       ├── live-stream/      # Live stream management (FFmpeg + HLS)
│       ├── screen-protocol/  # Protocol abstraction (JSON adapter; SMIL planned)
│       ├── notification/     # In-app, email, ntfy notifications
│       ├── audit-log/        # Audit trail
│       ├── dashboard/        # SSE service for real-time updates
│       ├── media/            # Filesystem media management
│       ├── search/           # Global search
│       └── migrations/       # TypeORM database migrations
├── frontend/                 # Angular 21 SPA
│   └── src/app/
│       ├── login/            # Hanko authentication UI
│       ├── auth/             # Auth service (token management)
│       ├── admin/            # Admin dashboard
│       ├── screens/          # Screen management
│       ├── content/          # Content library
│       ├── playlists/        # Playlist management
│       ├── schedules/        # Calendar scheduling
│       ├── screen-groups/    # Group management
│       ├── notifications/    # Notification center
│       ├── audit-log/        # Audit log viewer
│       ├── settings/         # User and org settings
│       └── shared/           # Shared components
├── docker-compose.yml        # Development orchestration
├── .env.example              # Environment variables template
├── ARCHITECTURE.md           # Technical architecture documentation
└── VISION.md                 # Product vision and feature details
```

## Authentication Flow

1. User visits the frontend and is presented with the Hanko login/registration UI
2. Hanko handles authentication (passkeys, email/password) and issues a JWT
3. The frontend includes the JWT as a `Bearer` token in all API requests
4. The backend validates the JWT against Hanko's JWKS endpoint (`HANKO_API_URL/.well-known/jwks.json`)
5. Screens authenticate separately using API keys issued by Org Admins

## License

Private — All rights reserved.
