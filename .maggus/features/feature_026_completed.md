# Feature 026: Production Deployment — Ansible, Podman Quadlets, and Caddy

## Introduction

Set up a complete production deployment pipeline for the signage server, following the same pattern as the Gigmanager project: Ansible playbooks build Docker images locally, ship them as tarballs to a Fedora/RHEL server, load them into rootless Podman, and manage them via systemd Quadlets. Caddy serves as the HTTPS reverse proxy with automatic Let's Encrypt certificates. Three subdomains route traffic to the three user-facing services (frontend, player, API), while Redis runs as an internal-only container.

### Architecture Context

- **Vision alignment:** The deployment enables the signage platform to run in production for concert venues (VISION.md §Core Concepts)
- **Components involved:** All four services — backend (NestJS + FFmpeg + Redis), frontend (Angular admin panel), player (Angular screen player), Redis (BullMQ job queue)
- **New infrastructure introduced:** Production Dockerfiles (multi-stage builds), Ansible playbook, Podman Quadlets, Caddy reverse proxy, fail2ban
- **Key difference from Gigmanager:** 4 services instead of 2, media volume for transcoded content, Redis container, SSE long-lived connections need Caddy flush tuning, `envsubst` for frontend Hanko URL injection at container startup
- **Architecture note:** ARCHITECTURE.md §Deployment section should be updated after this feature to document the production setup

## Goals

- Production-ready Docker images for backend, frontend, and player (multi-stage builds, minimal size)
- One-command deployment via `ansible-playbook` that builds, ships, and restarts all services
- HTTPS reverse proxy with three subdomains: `app.{domain}` (frontend), `player.{domain}` (player), `api.{domain}` (backend)
- Persistent data: SQLite database, media files, and Redis data survive container restarts
- Automatic service restart on server reboot (systemd linger)
- Database backup on every deployment
- Database download/upload playbooks for backup management
- Frontend Hanko API URL injected at container startup via `envsubst` (no rebuild needed per environment)

## Tasks

### TASK-026-001: Production Dockerfile for backend
**Description:** As a deployer, I want a production-optimised backend Docker image so that the NestJS server runs compiled code with only production dependencies and includes FFmpeg.

**Token Estimate:** ~25k tokens
**Predecessors:** none
**Successors:** TASK-026-005
**Parallel:** yes — can run alongside TASK-026-002, TASK-026-003, TASK-026-004

**Acceptance Criteria:**
- [x] New file `backend/Dockerfile.prod` (existing dev Dockerfile unchanged)
- [x] Multi-stage build: builder stage compiles TypeScript (`npm run build`), runtime stage copies only `dist/` and production `node_modules`
- [x] Base image: `node:22-alpine`
- [x] FFmpeg installed via `apk add --no-cache ffmpeg` in the runtime stage
- [x] `npm ci` in builder, `npm ci --omit=dev` in runtime
- [x] Runs `node dist/main` (not `npm run start:dev`)
- [x] Exposes port 3000
- [x] Image builds successfully: `docker build -f Dockerfile.prod -t signage-backend .`

### TASK-026-002: Production Dockerfile for frontend with envsubst
**Description:** As a deployer, I want a production-optimised frontend Docker image that injects the Hanko API URL at container startup so that the same image works across environments.

**Token Estimate:** ~30k tokens
**Predecessors:** none
**Successors:** TASK-026-005
**Parallel:** yes — can run alongside TASK-026-001, TASK-026-003, TASK-026-004

**Acceptance Criteria:**
- [x] New file `frontend/Dockerfile.prod` (existing dev Dockerfile unchanged)
- [x] Multi-stage build: builder stage runs `ng build --configuration production`, runtime stage uses `nginx:alpine`
- [x] `nginx.conf` created at `frontend/nginx.prod.conf` with SPA routing (`try_files $uri $uri/ /index.html`), static asset caching, hidden file blocking
- [x] Entrypoint script (`frontend/docker-entrypoint.sh`) runs `envsubst` on all `.js` files in `/usr/share/nginx/html/` to replace `${HANKO_API_URL}` placeholder, then starts nginx
- [x] `HANKO_API_URL` environment variable is required — if missing, container logs a warning but still starts
- [x] Image builds and serves the Angular app on port 80
- [x] Verify: `docker run -e HANKO_API_URL=https://test.hanko.io -p 8080:80 signage-frontend` → browsing `http://localhost:8080` loads the admin panel with the correct Hanko URL in the JS bundle

### TASK-026-003: Production Dockerfile for player
**Description:** As a deployer, I want a production-optimised player Docker image so that the screen player is served as static files via nginx.

**Token Estimate:** ~20k tokens
**Predecessors:** none
**Successors:** TASK-026-005
**Parallel:** yes — can run alongside TASK-026-001, TASK-026-002, TASK-026-004

**Acceptance Criteria:**
- [x] New file `player/Dockerfile.prod` (existing dev Dockerfile unchanged)
- [x] Multi-stage build: builder stage runs `ng build --configuration production`, runtime stage uses `nginx:alpine`
- [x] `nginx.conf` created at `player/nginx.prod.conf` with SPA routing, static asset caching, hidden file blocking
- [x] **Important:** Must NOT send `X-Frame-Options: DENY` header (player is loaded in iframes by LG webOS app)
- [x] Serves on port 80
- [x] Image builds and serves the player app

### TASK-026-004: Podman Quadlet files and network definition
**Description:** As a deployer, I want systemd Quadlet unit files for all services so that Podman manages them as auto-starting systemd services.

**Token Estimate:** ~35k tokens
**Predecessors:** none
**Successors:** TASK-026-005
**Parallel:** yes — can run alongside TASK-026-001, TASK-026-002, TASK-026-003
**Model:** opus — complex multi-service orchestration with dependency ordering

**Acceptance Criteria:**
- [x] Directory `ansible/quadlets/` created with the following files:
- [x] `signage.network` — Podman network named `signage`
- [x] `signage-redis.container` — Redis 7 Alpine, on `signage` network, no published ports (internal only), volume for persistence
- [x] `signage-backend.container` — Backend image, depends on Redis, on `signage` network, published port 3000, volumes for `/app/data` (SQLite) and `/app/media` (media files), environment variables: `DATABASE_PATH`, `REDIS_URL=redis://systemd-signage-redis:6379`, `MEDIA_BASE_PATH`, `HANKO_API_URL`, `SUPER_ADMIN_USER_IDS`, `MAX_FILE_SIZE_BYTES`, `FFMPEG_VIDEO_CRF`, `FFMPEG_VIDEO_PRESET`, `FFMPEG_VIDEO_MAXRATE`, `FFMPEG_VIDEO_BUFSIZE`
- [x] `signage-frontend.container` — Frontend image, depends on backend, on `signage` network, published port 4200, environment variable `HANKO_API_URL` passed through for envsubst
- [x] `signage-player.container` — Player image, on `signage` network, published port 4300
- [x] All containers use `Pull=never` (images loaded from tarballs)
- [x] All containers use `Image=localhost/signage-{service}:latest`
- [x] Backend container has `:Z` SELinux label on volume mounts
- [x] `.env.signage` environment file for all secret/configurable values, referenced by backend and frontend Quadlets via `EnvironmentFile`
- [x] Service startup order: network → redis → backend → frontend + player

### TASK-026-005: Ansible deploy playbook
**Description:** As a deployer, I want a single Ansible playbook that builds all images locally, ships them to the server, and deploys the full stack so that I can deploy with one command.

**Token Estimate:** ~50k tokens
**Predecessors:** TASK-026-001, TASK-026-002, TASK-026-003, TASK-026-004
**Successors:** TASK-026-007
**Parallel:** no
**Model:** opus — orchestration across many files with complex dependencies

**Acceptance Criteria:**
- [x] `ansible/deploy.yml` with three plays: Build (localhost), Deploy (server), Cleanup (localhost)
- [x] `ansible/hosts.ini` with `[local]` and `[servers]` groups (server hostname templated)
- [x] **Play 1 — Build locally:**
  - Builds 3 Docker images using `Dockerfile.prod` for each (backend, frontend, player)
  - Saves each as `.tar` tarball
- [x] **Play 2 — Server setup and deploy:**
  - Installs packages: podman, firewalld, caddy, fail2ban, sqlite3, acl, net-tools
  - Creates service user with linger enabled
  - Opens firewall ports 80/443
  - Creates directory structure: `app/`, `app/data/`, `app/media/`, `app/backups/`
  - Backs up existing SQLite DB (if exists) with timestamp
  - Copies Quadlet files and `.env.signage` to quadlet directory
  - Copies tarballs to server, loads into Podman, tags with `localhost/` prefix
  - Generates Caddyfile from template
  - Sets up fail2ban filter and jail for Caddy
  - Reloads systemd and restarts all services in correct order
- [x] **Play 3 — Cleanup:**
  - Removes local `.tar` files
- [x] `ansible/.env.signage.example` with all required environment variables documented
- [x] Running `ansible-playbook -i hosts.ini deploy.yml -K` completes without errors

### TASK-026-006: Caddy reverse proxy configuration
**Description:** As a deployer, I want a Caddyfile template that routes three subdomains to the correct services with HTTPS and security headers.

**Token Estimate:** ~25k tokens
**Predecessors:** none
**Successors:** TASK-026-005
**Parallel:** yes — can run alongside TASK-026-001 through TASK-026-004

**Acceptance Criteria:**
- [x] `ansible/templates/Caddyfile.j2` with three site blocks:
- [x] `app.{{ domain_name }}` → reverse proxy to `localhost:4200` (frontend), SPA fallback
- [x] `player.{{ domain_name }}` → reverse proxy to `localhost:4300` (player), **no** `X-Frame-Options` header (allow iframe embedding)
- [x] `api.{{ domain_name }}` → reverse proxy to `localhost:3000` (backend)
- [x] All three blocks have: JSON access logging with rotation, security headers (X-Content-Type-Options, X-XSS-Protection, HSTS, Referrer-Policy, Permissions-Policy, -Server)
- [x] `app.{{ domain_name }}` has CSP allowing `self`, Hanko scripts/connections, `unsafe-inline` for styles
- [x] `api.{{ domain_name }}` has: `X-Real-IP` header pass-through, `/api/docs*` blocked with 404, SSE-friendly config (`flush_interval -1` on `/api/screens/*/events`)
- [x] `player.{{ domain_name }}` has: CSP allowing media from `api.{{ domain_name }}`, `X-Frame-Options` explicitly set to `ALLOWALL` or omitted
- [x] Caddy log output to `/var/log/caddy/{subdomain}.access.log`

### TASK-026-007: Database backup and restore playbooks
**Description:** As a deployer, I want Ansible playbooks to download and upload the SQLite database so that I can manage backups.

**Token Estimate:** ~15k tokens
**Predecessors:** TASK-026-005
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] `ansible/download_db.yml` — fetches `data/signage.db` from server to `ansible/backups/signage_YYYYMMDD_HHMMSS.db`
- [x] `ansible/upload_db.yml` — stops backend service, uploads `ansible/signage.db` to server, starts backend service
- [x] Both playbooks use the same `hosts.ini` and variable structure as `deploy.yml`

### TASK-026-008: Fail2ban configuration templates
**Description:** As a deployer, I want fail2ban to automatically ban IPs that make repeated failed authentication attempts against the API.

**Token Estimate:** ~10k tokens
**Predecessors:** none
**Successors:** TASK-026-005
**Parallel:** yes — can run alongside all other tasks

**Acceptance Criteria:**
- [x] `ansible/templates/fail2ban-caddy-filter.conf.j2` — regex matching Caddy JSON log entries with status 401 or 403
- [x] `ansible/templates/fail2ban-caddy-jail.conf.j2` — jail config: maxretry=5, findtime=600, bantime=3600, watches `/var/log/caddy/*.access.log`

## Task Dependency Graph

```
TASK-026-001 (backend Dockerfile) ────────┐
TASK-026-002 (frontend Dockerfile) ───────┤
TASK-026-003 (player Dockerfile) ─────────┼──→ TASK-026-005 (deploy playbook) ──→ TASK-026-007 (db playbooks)
TASK-026-004 (Quadlets) ──────────────────┤
TASK-026-006 (Caddyfile) ────────────────┘
TASK-026-008 (fail2ban) ─────────────────┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-026-001 | ~25k | none | yes (with 002, 003, 004, 006, 008) | — |
| TASK-026-002 | ~30k | none | yes (with 001, 003, 004, 006, 008) | — |
| TASK-026-003 | ~20k | none | yes (with 001, 002, 004, 006, 008) | — |
| TASK-026-004 | ~35k | none | yes (with 001, 002, 003, 006, 008) | opus |
| TASK-026-005 | ~50k | 001, 002, 003, 004, 006, 008 | no | opus |
| TASK-026-006 | ~25k | none | yes (with 001, 002, 003, 004, 008) | — |
| TASK-026-007 | ~15k | 005 | no | — |
| TASK-026-008 | ~10k | none | yes (with all) | haiku |

**Total estimated tokens:** ~210k

## Functional Requirements

- FR-1: `ansible-playbook -i hosts.ini deploy.yml -K` must build, ship, and deploy all services end-to-end
- FR-2: Backend must run compiled NestJS code with FFmpeg available for transcoding
- FR-3: Frontend must serve the Angular admin panel with Hanko API URL injected at container startup (not build time)
- FR-4: Player must serve the Angular player app without `X-Frame-Options: DENY` (iframe-friendly)
- FR-5: Redis must be internal-only (no published ports), accessible to backend via Podman network
- FR-6: SQLite database and media files must persist across container restarts via host-mounted volumes
- FR-7: All services must auto-start on server reboot via systemd linger
- FR-8: HTTPS must be automatic via Caddy + Let's Encrypt on all three subdomains
- FR-9: The existing development Dockerfiles and docker-compose.yml must remain unchanged
- FR-10: SSE endpoints (`/api/screens/*/events`) must work through the Caddy reverse proxy without buffering
- FR-11: Database must be backed up automatically before each deployment

## Non-Goals

- No CI/CD pipeline (manual Ansible run only)
- No Proton Pass integration (plain `.env` files for secrets)
- No Kubernetes or Docker Swarm support
- No horizontal scaling (single-server deployment)
- No monitoring/alerting beyond fail2ban (Grafana, Prometheus, etc.)
- No blue-green or rolling deployments (services restart sequentially)

## Technical Considerations

- **SSE through Caddy:** Caddy buffers responses by default. The API subdomain needs `flush_interval -1` for the SSE endpoints to work properly. Without this, screens won't receive real-time updates.
- **envsubst approach:** The frontend production build contains `${HANKO_API_URL}` as a literal string in the compiled JS. The Docker entrypoint runs `envsubst` on the JS files before starting nginx. This means the same image works for any Hanko project — just change the env var.
- **Podman networking:** Containers on the same Podman network can reach each other via `systemd-{quadlet-name}` hostnames. The backend reaches Redis at `systemd-signage-redis:6379`.
- **SELinux:** Volume mounts on Fedora/RHEL need `:Z` suffix for proper SELinux labeling.
- **Media volume size:** Media files (originals + transcoded + slices) can grow large. The volume should be on a partition with sufficient space.
- **ARCHITECTURE.md update:** The Deployment section should be updated to document the production setup (Ansible + Podman + Caddy) after this feature ships.

## Success Metrics

- Full deployment from scratch completes in under 15 minutes
- All three subdomains serve HTTPS with valid certificates
- Backend API responds at `api.{domain}/api/screens/me`
- Frontend loads at `app.{domain}` with correct Hanko integration
- Player loads at `player.{domain}` and can connect to the API
- SSE events reach connected screens in real time
- Services survive server reboot and auto-start

## Open Questions

None — all resolved during planning.
