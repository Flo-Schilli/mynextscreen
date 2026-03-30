# Feature 001: Project Scaffolding & Docker Compose

## Introduction

Set up the monorepo structure with a NestJS backend and Angular 21 frontend, wire up Docker Compose for local development with Redis, and establish the foundational configuration and project conventions.

### Architecture Context

- **Vision alignment:** Establishes the tech stack defined in the vision (NestJS, Angular 21, Tailwind CSS v4, SQLite3)
- **Components involved:** All — this creates the project skeleton
- **New patterns:** Docker Compose service topology, environment variable configuration, monorepo structure

## Goals

- Working NestJS application that starts and responds to a health check endpoint
- Working Angular 21 application with Tailwind CSS v4 that renders a blank shell
- Docker Compose setup that starts backend, frontend, and Redis with a single command
- Hot-reload working for both backend and frontend in dev mode
- TypeORM configured and connected to SQLite3

## Tasks

### TASK-001-001: Initialise NestJS Backend
**Description:** As a developer, I want a NestJS project scaffold so that I have a working backend to build on.

**Token Estimate:** ~30k tokens
**Predecessors:** none
**Successors:** TASK-001-003, TASK-001-004
**Parallel:** yes — can run alongside TASK-001-002

**Acceptance Criteria:**
- [x] NestJS project created in `/backend` directory
- [x] `AppModule` with a `GET /api/health` endpoint returning `{ "status": "ok" }`
- [x] TypeORM configured with SQLite3 (database file at configurable path via `DATABASE_PATH` env var)
- [x] BullMQ module registered with Redis connection (configurable via `REDIS_URL` env var)
- [x] Environment variable loading via `@nestjs/config` with `.env` file support
- [x] ESLint and Prettier configured
- [x] `npm run start:dev` starts the app with hot-reload
- [x] Typecheck and lint pass

### TASK-001-002: Initialise Angular Frontend
**Description:** As a developer, I want an Angular 21 project scaffold with Tailwind CSS v4 so that I have a working frontend to build on.

**Token Estimate:** ~25k tokens
**Predecessors:** none
**Successors:** TASK-001-003
**Parallel:** yes — can run alongside TASK-001-001

**Acceptance Criteria:**
- [x] Angular 21 project created in `/frontend` directory
- [x] Tailwind CSS v4 with PostCSS configured and working
- [x] Dark mode CSS custom properties set up (dark as default, light mode available)
- [x] A minimal `AppComponent` rendering "Signage Server" as a placeholder
- [x] Proxy config for `/api` requests to the backend (dev mode)
- [x] ESLint configured
- [x] `npm start` starts the dev server with hot-reload
- [x] Verify in browser: placeholder page renders with dark background

### TASK-001-003: Docker Compose Setup
**Description:** As a developer, I want a single `docker compose up` command to start the entire stack so that onboarding is frictionless.

**Token Estimate:** ~20k tokens
**Predecessors:** TASK-001-001, TASK-001-002
**Successors:** TASK-001-004
**Parallel:** no

**Acceptance Criteria:**
- [x] `docker-compose.yml` at project root with services: `backend`, `frontend`, `redis`
- [x] Backend service builds from `/backend/Dockerfile`, exposes port 3000
- [x] Frontend service builds from `/frontend/Dockerfile`, exposes port 4200
- [x] Redis service uses official image, no persistence needed for dev
- [x] Named volumes: `db-data` (SQLite), `media-data` (media files)
- [x] Environment variables passed to backend: `DATABASE_PATH`, `REDIS_URL`, `MEDIA_BASE_PATH`
- [x] `docker compose up` starts all services and both apps are reachable
- [x] Hot-reload works in Docker via volume mounts for source code

### TASK-001-004: Project Configuration & Conventions
**Description:** As a developer, I want shared configuration and conventions documented so that all future work follows consistent patterns.

**Token Estimate:** ~15k tokens
**Predecessors:** TASK-001-001
**Successors:** none
**Parallel:** yes — can run alongside TASK-001-003

**Acceptance Criteria:**
- [x] `.env.example` file with all environment variables and sensible defaults
- [x] `.gitignore` covers node_modules, dist, .env, SQLite files, media directory
- [x] Root `package.json` with scripts: `dev` (starts Docker Compose), `lint`, `test`
- [x] TypeORM migration setup configured (empty initial migration)
- [x] Typecheck and lint pass across both projects

## Task Dependency Graph

```
TASK-001-001 ──→ TASK-001-003 ──→ (done)
     │                ↑
     ├──→ TASK-001-004
     │
TASK-001-002 ──┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-001-001 | ~30k | none | yes (with 002) | — |
| TASK-001-002 | ~25k | none | yes (with 001) | — |
| TASK-001-003 | ~20k | 001, 002 | no | — |
| TASK-001-004 | ~15k | 001 | yes (with 003) | haiku |

**Total estimated tokens:** ~90k

## Functional Requirements

- FR-1: The backend must start and respond to `GET /api/health` with HTTP 200
- FR-2: The frontend must render a page accessible at `http://localhost:4200`
- FR-3: The frontend must proxy `/api` requests to the backend in dev mode
- FR-4: `docker compose up` must start all services without manual steps
- FR-5: TypeORM must connect to SQLite3 and create the database file on first run
- FR-6: BullMQ must connect to Redis on backend startup

## Non-Goals

- No authentication yet
- No real UI beyond a placeholder page
- No production Docker configuration (multi-stage builds, etc.)
- No CI/CD pipeline

## Technical Considerations

- SQLite3 file should be stored in a Docker volume so it persists across container restarts
- Media base path should also be a Docker volume
- Angular proxy config (`proxy.conf.json`) needed for dev mode to avoid CORS issues
- Use Node 22 LTS as the base Docker image

## Success Metrics

- A new developer can clone the repo, run `docker compose up`, and see both apps running within 5 minutes
- Health check endpoint responds successfully
- Frontend renders the placeholder page with dark theme

## Open Questions

None — all resolved.
