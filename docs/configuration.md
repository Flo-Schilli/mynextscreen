# Configuration

Everything is read from the environment (`@nestjs/config`). `.env.example` at
the repository root is the annotated template; this page is the reference.

## Required

| Variable            | What it is                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL DSN, e.g. `postgres://mynextscreen:secret@localhost:5432/mynextscreen`                                                                          |
| `JWT_ACCESS_SECRET` | Signing secret for access tokens. **Minimum 32 characters** — the backend refuses to start with anything shorter. Generate with `openssl rand -base64 48`. |

## Required in production

| Variable          | What happens without it                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_BASE_URL` | CORS fails closed rather than reflecting whatever origin asks. Also the base for links in account emails.                           |
| `PLAYER_BASE_URL` | The player's origin is not allow-listed for CORS, and the add-screen hint cannot tell operators which address to open on a display. |

## Storage and media

| Variable                            | Default                 | What it is                                                                                                         |
| ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `MEDIA_BASE_PATH`                   | `./media`               | Root for originals and transcoded files. Layout: `{base}/{organisationId}/originals\|transcoded/{contentId}.{ext}` |
| `MAX_FILE_SIZE_BYTES`               | —                       | Upload limit                                                                                                       |
| `FFMPEG_PATH`                       | system `PATH`           | FFmpeg binary                                                                                                      |
| `FFMPEG_VIDEO_CRF`                  | `18`                    | 0 lossless, 18 visually lossless, 23 default, 28 low                                                               |
| `FFMPEG_VIDEO_PRESET`               | `slow`                  | `ultrafast` … `veryslow`                                                                                           |
| `FFMPEG_VIDEO_MAXRATE` / `_BUFSIZE` | `8M` / `16M`            | Bitrate cap and rate-control buffer                                                                                |
| `MAX_CONCURRENT_LIVE_STREAMS`       | `4`                     | Simultaneous live encoders. Each one can saturate a core.                                                          |
| `HLS_OUTPUT_DIR`                    | `/tmp/mynextscreen-hls` | Where live segments are written                                                                                    |

Per-organisation storage limits (original and transcoded, counted separately)
are set in the dashboard, not here.

## Sessions and cookies

| Variable          | Default                                | What it is                                |
| ----------------- | -------------------------------------- | ----------------------------------------- |
| `REDIS_URL`       | `redis://localhost:6379`               | Transcoding queue and user refresh tokens |
| `JWT_ACCESS_TTL`  | `15m`                                  | Access-token lifetime                     |
| `JWT_REFRESH_TTL` | `30d`                                  | User refresh-token lifetime               |
| `COOKIE_SECURE`   | `true` only when `NODE_ENV=production` | Set explicitly to override                |
| `COOKIE_SAMESITE` | `strict`                               | `strict` \| `lax` \| `none`               |

Screen sessions are not configurable: a screen holds a 15-minute access token
and a refresh token that rotates on every use and lives 180 days in PostgreSQL.

## Mail

Account mail — verification, invitations, password resets, email changes — goes
through these. Per-organisation SMTP for _notifications_ is configured in the
dashboard and is separate.

| Variable                      | Default                                     | What it is                                                    |
| ----------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `SMTP_HOST` / `SMTP_PORT`     | `localhost` / `1025`                        | In development these point at Mailpit                         |
| `SMTP_USER` / `SMTP_PASSWORD` | —                                           | Authentication is skipped when both are empty                 |
| `SMTP_FROM`                   | `myNextScreen <noreply@mynextscreen.local>` | Envelope sender                                               |
| `SMTP_SECURE`                 | `false`                                     | `true` for implicit TLS on 465; `false` for STARTTLS or plain |

## Sign-up

| Variable                                  | Default | What it is                                                                                               |
| ----------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `SIGNUP_ENABLED`                          | `true`  | `false` rejects public registration with 403 and hides it in the UI                                      |
| `SIGNUP_DEFAULT_STORAGE_ORIGINAL_BYTES`   | 5 GiB   | Limit granted to a self-created organisation                                                             |
| `SIGNUP_DEFAULT_STORAGE_TRANSCODED_BYTES` | 5 GiB   | As above, counted separately                                                                             |
| `SIGNUP_UNVERIFIED_TTL_HOURS`             | `24`    | How long a never-verified sign-up survives before an hourly job deletes it and its orphaned organisation |

There is no environment variable that creates the first super-admin. On an empty
database the dashboard offers a one-time setup screen instead, and that route
closes as soon as a user exists.

## Hardening

| Variable                          | Default                  | What it is                                                                                                                                                                                                                                                                              |
| --------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SECRETS_ENCRYPTION_KEY`          | —                        | Encrypts per-organisation SMTP passwords and ntfy tokens at rest (AES-256-GCM). Unset means they are stored in plaintext, and the backend says so at boot. `openssl rand -base64 32`.                                                                                                   |
| `OUTBOUND_ALLOWED_HOSTS`          | —                        | Comma-separated exceptions to the SSRF guard. Organisation-configurable targets — ntfy URL, per-org SMTP host, live-stream source — may not resolve to loopback, private, link-local or CGNAT addresses unless listed here. Needed for an internal relay, e.g. `ntfy.lan,192.168.1.50`. |
| `SITE_AGENT_OFFLINE_THRESHOLD_MS` | `180000`                 | How long without a heartbeat before a site agent counts as offline. Deliberately longer than the screens' threshold: an agent missing one check-in matters far less than a display going dark, and a venue uplink that blips should not paint the whole site red.                       |
| `SITE_AGENT_PROBE_INTERVAL_MS`    | `60000`                  | How often an agent is told to check its displays. Sent to the agent in its configuration.                                                                                                                                                                                               |
| `SITE_AGENT_APP_ID`               | `com.mynextscreen.webos` | The webOS application a site agent keeps in the foreground.                                                                                                                                                                                                                             |

One more knob lives in the player rather than the environment:
`window.__SIGNAGE_TRUSTED_ORIGINS__` in `apps/player/src/index.html` decides
which origins may hand a player its server URL over `postMessage`. Deployments
that do not use the LG webOS shell should pin it — see the comment in that file.
