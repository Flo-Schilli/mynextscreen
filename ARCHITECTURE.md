# Architecture

## Overview

A multi-tenant digital signage platform built with **NestJS** (backend), **Angular 21** (frontend), **SQLite3** (database), and **Redis** (job queue). The server manages screens, content, playlists, schedules, and live streams for concert venues. Screens communicate via a protocol abstraction layer (JSON over HTTP + SSE as the first implementation).

## API Layer

- **REST API** over HTTP, JSON request/response bodies
- **Authentication:**
  - **Users** — Hanko Cloud (external identity provider), JWT tokens carrying `userId`, `organisationId`, and `role` claims
  - **Screens** — API key per screen, passed via `Authorization` header
- **Authorisation** — NestJS guards enforce role-based access per organisation:
  - Super-admin: system-level operations (provision orgs, view global audit log)
  - Org Admin: full control within their organisation
  - Editor: content, playlists, schedules, live streams
  - Viewer: read-only
- **Multi-tenancy** — every query is scoped by `organisationId`, extracted from the JWT or API key; no cross-tenant data access is possible at the service layer
- **Entity IDs** — UUIDs for all entities

## Backend

### Runtime & Startup

- **NestJS** application with modular architecture (one module per domain)
- **TypeORM** with SQLite3 for relational data
- **BullMQ + Redis** for background job processing
- **FFmpeg** as a child process for content and live stream transcoding
- On startup: initialise DB connection, connect to Redis, register BullMQ workers

### Key Modules

| Module | Responsibility |
|---|---|
| **AuthModule** | Hanko Cloud JWT validation, API key validation, guards for role-based access |
| **OrganisationModule** | CRUD for organisations, storage limit enforcement, default playlist config, time zone |
| **UserModule** | User-org membership, role assignment, notification preferences |
| **ScreenModule** | Screen registration, API key generation/regeneration, heartbeat tracking, online/offline status |
| **ScreenGroupModule** | Group management, mirror/split mode config, grid layout for video walls |
| **ContentModule** | Upload handling, metadata CRUD, storage tracking, triggers transcoding jobs |
| **TranscodingModule** | BullMQ workers: video → H.264 MP4, image → WebP (JPEG fallback), storage accounting |
| **PlaylistModule** | Playlist CRUD, ordered items with per-item duration |
| **ScheduleModule** | Calendar-based schedule CRUD, recurring rules (RRULE/iCal standard), conflict detection (no overlaps), fallback resolution |
| **LiveStreamModule** | Stream URL management, FFmpeg process lifecycle, override/fallback logic |
| **ScreenProtocolModule** | Protocol abstraction layer; JSON adapter (first), renders screen state for pull + SSE push |
| **NotificationModule** | Notification hub: in-app, email (abstract interface), ntfy; per-user channel preferences |
| **AuditLogModule** | Records all significant actions with timestamp, user, organisation, action, affected resource |
| **SearchModule** | Global search across screens, content, and playlists within the current organisation |
| **DashboardGateway** | Socket.IO WebSocket gateway for real-time dashboard updates (screen status, schedule changes) |

## Data & Persistence

- **SQLite3** — all relational data: organisations, users, memberships, screens, groups, content metadata, playlists, schedules, audit log, notifications
- **Filesystem** — media storage in a configurable base path:
  ```
  /data/media/{organisationId}/originals/{contentId}.{ext}
  /data/media/{organisationId}/transcoded/{contentId}.{ext}
  ```
- **Redis** — BullMQ job queue for transcoding jobs; no application data stored in Redis
- **Storage tracking** — per-organisation byte counters for originals and transcoded files, checked on upload against configurable limits

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

1. **Startup pull** — screen sends `GET /api/screens/{id}/state` with API key → receives full state (current playlist, schedule, content URLs)
2. **SSE push** — screen opens `GET /api/screens/{id}/events` (SSE endpoint) → receives real-time updates (schedule change, live stream override, content update)
3. **Heartbeat** — screen sends `POST /api/screens/{id}/heartbeat` at a configurable interval; server marks screen offline if no heartbeat within timeout threshold

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
- **Progress:** worker reports progress via BullMQ events → DashboardGateway pushes to frontend via Socket.IO
- **Storage accounting:** on completion, original and transcoded file sizes are added to the organisation's usage counters
- **Re-upload:** overwrites both original and transcoded files, updates storage counters

## Live Streaming

- **Activation:** Org Admin or Editor provides a stream URL and target screen(s)/group → `LiveStreamService` spawns an FFmpeg child process
- **FFmpeg process:** ingests the source stream, transcodes to HLS segments served via HTTP
- **Override:** activating a live stream sends an SSE event to target screens, overriding the current playlist
- **Fallback:** `LiveStreamService` monitors the FFmpeg process; when the source stops or the stream is deactivated, it sends an SSE event to resume the scheduled playlist
- **Abstraction:** `LiveStreamService` manages FFmpeg process lifecycle behind an interface, allowing future replacement with a dedicated media server (e.g. MediaMTX)

## Notifications

- **NotificationHub** — central service that receives events (screen offline, transcoding complete, etc.) and fans out to configured channels
- **Channels:**
  - **In-app** — stored in DB, delivered to dashboard via Socket.IO
  - **Email** — abstract `EmailProvider` interface (implementation injected at startup; e.g. SendGrid, SES, SMTP)
  - **ntfy** — HTTP POST to configurable URL with auth token, per organisation
- **User preferences** — each user toggles channels independently; hub checks preferences before dispatching
- **Organisation config** — ntfy URL/token and email provider settings stored per organisation

## Audit Log

- Every significant action produces an `AuditEntry`:
  - `timestamp`, `userId`, `organisationId`, `action` (enum), `resourceType`, `resourceId`, `details` (JSON)
- Recorded via a NestJS interceptor or explicit service calls
- Queryable by Org Admins (scoped to their org) and super-admin (global)
- Filterable by action type, user, resource, and date range

## Frontend

- **Angular 21** with **Tailwind CSS v4** and **PostCSS**
- **Dark mode first** — CSS custom properties for theme switching
- **Socket.IO client** for real-time dashboard updates (screen status, notifications, transcoding progress)
- **Global search** — searches across screens, content, and playlists within the current organisation
- **Component structure** mirrors backend modules: screens, content, playlists, schedules, live streams, settings
- **Calendar component** for schedule management (day/week/month views, drag-and-drop playlist blocks, RRULE-based recurring schedules)
- **Responsive** — full functionality on tablet, monitoring-only on mobile

## Deployment

- **Docker Compose** for both local development and production
- **Services:**
  - `signage-server` — NestJS application (API + WebSocket + SSE + BullMQ workers)
  - `redis` — job queue backend
- **External services:**
  - Hanko Cloud — authentication (no self-hosted container needed)
- **Volumes:**
  - `db-data` — SQLite database file
  - `media-data` — original and transcoded media files
- **Configuration** — environment variables:
  - `DATABASE_PATH` — SQLite file location
  - `MEDIA_BASE_PATH` — media storage root
  - `REDIS_URL` — Redis connection string
  - `HANKO_API_URL` — Hanko Cloud endpoint for JWT validation
  - `FFMPEG_PATH` — path to FFmpeg binary (default: system PATH)
- **Local dev:** `docker compose up` starts all services; hot-reload for both backend and frontend
