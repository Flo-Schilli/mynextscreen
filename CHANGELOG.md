# Changelog

Notable changes per release, with the operator actions each one requires.
Versions follow the root `package.json`; a release is cut with
`npm run version:patch && git push --follow-tags`.

## 0.9.0

Security and dependency hardening across the whole stack, from a full audit of
0.8.4. 27 commits; the ones worth naming are referenced below.

### Required operator actions

Read this before deploying. Four of these will stop a deployment that ignores
them.

1. **Set `vault_signage_postgres_password`.** The production database password
   no longer falls back to `signage`; the playbook now aborts without the vault
   variable (`bc38ebf`). **Rotate the password on the live host while doing
   this** — until now it was very likely still the default.
2. **`JWT_ACCESS_SECRET` must be at least 32 characters.** The backend refuses
   to start otherwise (`8f0f5b0`). Generate with `openssl rand -base64 48`.
3. **`PUBLIC_BASE_URL` is required in production.** CORS now fails closed
   rather than reflecting any origin alongside `credentials: true` (`8f0f5b0`).
   Set `PLAYER_BASE_URL` too if the player runs on its own origin.
4. **The nginx images listen on 8080 and run as UID 101.** The frontend and
   player containers no longer run as root (`3cf4933`). The shipped quadlets
   publish `127.0.0.1:50001:8080` / `127.0.0.1:50003:8080`; a hand-written unit
   or compose file that still maps to container port 80 has to be updated.
5. **All published container ports bind to loopback.** Anything reaching the
   backend, frontend or player other than through Caddy has to go through the
   reverse proxy from now on (`3cf4933`).
6. **Migration `0016` invalidates links that are in flight.** Email
   verification, password reset and email change tokens are stored hashed, so
   the plaintext values already mailed out stop working (`0842f4a`). Affected
   users request a new link; nothing else is lost.
7. **Set `SECRETS_ENCRYPTION_KEY`** (`openssl rand -base64 32`) to encrypt the
   per-org SMTP passwords and ntfy tokens at rest (`8706fa8`). Optional: without
   it they are stored in plaintext as before, and the backend warns at boot.
   Existing rows are read either way and re-encrypted on their next write.
8. **Deployments pin the image tag to the version in `package.json`**, not
   `latest` (`11bfbdc`). Deploy from the checkout of the release you want, or
   pass `-e signage_image_tag=1.2.3`.

### Fixed — tenancy

- Cross-tenant takeover through `organisations/:orgId/members`: an org admin of
  any organisation could add themselves to any other one. The `RolesGuard` now
  resolves the organisation from route params and is default-deny, so a route
  without an access declaration is refused instead of allowed (`76199ff`).
- Cross-tenant read/write of the notification config (including SMTP
  credentials), `schedules/current` without org scoping, unauthorised screen SSE
  subscriptions, live-stream HLS routes without a tenancy check, and screen
  impersonation inside an organisation (`76199ff`).
- Super-admin member routes returned raw user rows — password hashes and live
  reset tokens included (`c616646`).

### Fixed — authentication

- Password change and reset now revoke every existing session. The acting
  device keeps working; all others are signed out (`da00a0e`).
- Verification, reset and email-change tokens are stored as SHA-256
  fingerprints (`0842f4a`).
- JWTs pin algorithm, issuer and audience on both sign and verify; passwords are
  length-bounded; failed logins spend the same time whether or not the account
  exists (`8f0f5b0`).
- Screen authentication looks up an indexed key fingerprint instead of
  bcrypt-comparing against every screen row — a scaling defect and a cheap CPU
  exhaustion vector (`5ce6602`).

### Fixed — input and outbound traffic

- SSRF through org-configurable targets: `ntfyUrl`, per-org `smtpHost` and
  live-stream `sourceUrl` are checked for scheme and for private, loopback,
  link-local and CGNAT addresses — at save time and again against the resolved
  addresses before each request. Internal hosts can be allow-listed with
  `OUTBOUND_ALLOWED_HOSTS` (`2ab90d8`).
- Stored XSS through `image/svg+xml`: uploads are typed from their magic bytes,
  SVG cannot match, and downloads send a derived content type with `nosniff`
  (`4758534`).
- Upload size is enforced while the body is read (Multer) and capped in nginx
  via `MAX_UPLOAD_SIZE` (`4758534`).
- Storage quota accounting is atomic; parallel uploads can no longer overshoot
  the limit or corrupt the counter (`995a55f`).

### Fixed — player, media and runtime

- The player accepts a `signage-connect` handoff only from an allow-listed
  origin, only from the embedding window, and only while unconnected. The LG
  webOS shell posts to the player's own origin instead of `*` (`42a178a`).
- FFmpeg processes are terminated on shutdown, escalated to SIGKILL when they
  ignore SIGTERM, capped in number (`MAX_CONCURRENT_LIVE_STREAMS`, default 4)
  and given an input timeout; protocol allow-lists are explicit (`dc94924`).
- Video-wall slices are written inside the organisation's media directory, so
  they count against the quota and are removed with the organisation
  (`d5f34d9`).
- `helmet` sets security headers on the API itself, and rate limiting keys on
  the real client IP instead of the proxy — the login limit was platform-wide,
  which made a five-request lockout of every user possible (`14f0523`).

### Changed — dependencies and build

- All runtime advisories closed: Angular 21.2.24, axios 1.20.0, NestJS 11.2.6
  (multer 2.4.0), nodemailer 10, postcss, body-parser, qs, form-data, nanoid,
  Nx 22.7.12 (`9d7678b`, `abfdaa6`, `dd6eded`). `npm audit --omit=dev` is empty.
- **`npm ci` requires npm 11.6.2**, the version pinned in `package.json`. CI and
  all three Dockerfiles install it first; npm 10 cannot install this lockfile
  (`3cf4933`).
- CI gates on `npm audit --omit=dev --audit-level=high` and a Trivy image scan
  that runs before the push, publishes an SBOM and provenance, and pins every
  action to a commit SHA. Dependabot, CodeQL and `SECURITY.md` added
  (`11bfbdc`).
- Fonts are self-hosted. They were loaded from Google and blocked by the
  production CSP, so the UI had been falling back to system fonts (`3cf4933`).
- Dev compose binds Postgres, Redis and Mailpit to `127.0.0.1` (`ec91148`).

### New environment variables

All optional unless noted.

| Variable                      | Purpose                                                                    |
| ----------------------------- | -------------------------------------------------------------------------- |
| `SECRETS_ENCRYPTION_KEY`      | Encrypts per-org SMTP passwords and ntfy tokens at rest (32 bytes, base64) |
| `OUTBOUND_ALLOWED_HOSTS`      | Comma-separated hosts allowed past the SSRF guard (internal ntfy/SMTP)     |
| `MAX_CONCURRENT_LIVE_STREAMS` | Cap on simultaneous FFmpeg encoders (default 4)                            |
| `MAX_UPLOAD_SIZE`             | nginx request-body cap in the frontend image (default `100m`)              |
