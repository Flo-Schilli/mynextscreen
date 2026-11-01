# Configuration

Everything is read from the environment (`@nestjs/config`). `.env.example` at
the repository root is the annotated template; this page is the reference.

## Required

| Variable                 | What it is                                                                                                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`           | PostgreSQL DSN, e.g. `postgres://mynextscreen:secret@localhost:5432/mynextscreen`                                                                                                                                                                                                           |
| `JWT_ACCESS_SECRET`      | Signing secret for access tokens. **Minimum 32 characters** — the backend refuses to start with anything shorter. Generate with `openssl rand -base64 48`.                                                                                                                                  |
| `SECRETS_ENCRYPTION_KEY` | Encrypts every stored secret (per-org SMTP passwords, ntfy tokens, TV devmode passphrases, screen pairing keys) with AES-256-GCM. **Exactly 32 bytes, base64** — the backend refuses to start without it. Generate with `openssl rand -base64 32`. See [Secrets at rest](#secrets-at-rest). |

## Required in production

| Variable          | What happens without it                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_BASE_URL` | CORS fails closed rather than reflecting whatever origin asks. Also the base for links in account emails.                           |
| `PLAYER_BASE_URL` | The player's origin is not allow-listed for CORS, and the add-screen hint cannot tell operators which address to open on a display. |

## Secrets at rest

No secret is ever stored in plaintext. Values the backend only has to compare
(passwords, reset/verify tokens, refresh tokens, screen API keys, agent tokens)
are hashed. Values it has to hand on again (SMTP passwords, ntfy tokens, TV
devmode passphrases, the API key parked for a pairing screen) are encrypted
with `SECRETS_ENCRYPTION_KEY`, and a `CHECK` constraint on each of those columns
makes PostgreSQL itself reject anything that is not encrypted.

**Upgrading from a release where the key was optional:** set the key and
deploy. On its first start the backend encrypts every value an older release
stored in plaintext, then validates the constraints, before it serves a single
request. Nothing else to do; the step is safe to repeat. Stop the old backend
before starting the new one — do not run both versions side by side across this
upgrade. If the key does not match the one the stored secrets were encrypted
with, the backend refuses to start and says so.

**Back the key up separately from database dumps.** A dump only contains
ciphertext; without the key those secrets are gone and have to be re-entered.
Do not rotate the key by simply replacing it — the backend would no longer be
able to read the stored values.

## Two-factor authentication (MFA)

Users can protect their account with a TOTP authenticator app (SHA-1, six
digits, 30-second steps — what every common app supports). There is nothing to
configure in the environment; the TOTP secret is one more value encrypted with
`SECRETS_ENCRYPTION_KEY`, and the ten single-use recovery codes are stored as
hashes only.

**Who has to use it.** MFA belongs to the user, not to an organisation. It is
mandatory for a user who is a super-admin, or who belongs to at least one
organisation that requires it — and then it applies to every organisation that
user belongs to. Everybody else may set it up voluntarily under
_Settings → Security_. A user for whom MFA is mandatory and who has not set it
up yet can still sign in with the password, but only reaches the set-up wizard
until it is done; nobody is locked out by switching the requirement on.

**Requiring it for an organisation.** An organisation admin switches it on in
the organisation settings. Only an admin whose own session is MFA-confirmed can
switch it on, so nobody locks themselves out. Members without MFA get an email
(at most once a day per organisation) and are taken through the set-up on their
next request. Switching it off is always possible.

**New or lost device.** Moving the factor to a new phone under
_User settings → Security_ needs the password and a code from the current
authenticator — or, if that is gone, one of the recovery codes (_Use a
recovery code_). The same goes for switching optional MFA off and for issuing
new recovery codes. Each recovery code works once, and the user is emailed
whenever one is used. A user who has neither the authenticator nor a recovery
code left needs an admin to reset the second factor, which also ends all of
that user's sessions and emails them:

- an organisation admin, from the member list, for members of their
  organisation — not for super-admins, not for themselves, and not for users
  who also belong to an organisation the admin does not administer (the reset
  applies everywhere, so a super-admin has to do it then);
- a super-admin, from the user list, for anyone but themselves.

After a reset a user for whom MFA is mandatory sets it up again at the next
sign-in. Every reset is written to the audit log of each of the user's
organisations.

**Upgrading to the first release with MFA:** nothing to configure beyond the
mandatory `SECRETS_ENCRYPTION_KEY` (see above). Super-admins are taken into the
set-up wizard on their next request — including sessions that were open during
the upgrade — and cannot use the dashboard until they have finished it. Have
an authenticator app ready before deploying.

Ten wrong codes for one user within 15 minutes block further attempts for the
rest of that window (`429`).

### Emergency: the only super-admin is locked out

If a super-admin has lost both the authenticator and the recovery codes and
there is no second super-admin who could reset them, remove the second factor
directly in the database. With the Ansible deployment (rootless Podman), as the
deploy user on the server — replace the email address:

```bash
podman exec -i mynextscreen-postgres psql -U mynextscreen -d mynextscreen <<'SQL'
BEGIN;
DELETE FROM user_mfa_recovery_codes
  WHERE user_id = (SELECT id FROM users WHERE email = lower('admin@example.org'));
DELETE FROM user_mfa
  WHERE user_id = (SELECT id FROM users WHERE email = lower('admin@example.org'));
COMMIT;
SQL
```

The super-admin then signs in with the password and is taken straight into the
set-up wizard; MFA stays mandatory. Be aware of what this path does not do:
it writes **no audit entry**, and it does not end sessions that are already
open. Anyone with shell access to the database host can do this, which is one
more reason to keep that access as narrow as the dashboard's.

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
| `OUTBOUND_ALLOWED_HOSTS`          | —                        | Comma-separated exceptions to the SSRF guard. Organisation-configurable targets — ntfy URL, per-org SMTP host, live-stream source — may not resolve to loopback, private, link-local or CGNAT addresses unless listed here. Needed for an internal relay, e.g. `ntfy.lan,192.168.1.50`. |
| `SITE_AGENT_OFFLINE_THRESHOLD_MS` | `180000`                 | How long without a heartbeat before a site agent counts as offline. Deliberately longer than the screens' threshold: an agent missing one check-in matters far less than a display going dark, and a venue uplink that blips should not paint the whole site red.                       |
| `SITE_AGENT_APP_ID`               | `com.mynextscreen.webos` | The webOS application a site agent keeps in the foreground.                                                                                                                                                                                                                             |

One more knob lives in the player rather than the environment:
`window.__SIGNAGE_TRUSTED_ORIGINS__` in `apps/player/src/index.html` decides
which origins may hand a player its server URL over `postMessage`. Deployments
that do not use the LG webOS shell should pin it — see the comment in that file.

## Observability

| Variable               | Default | What it is                                                                                                                                                                                    |
| ---------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `METRICS_SCRAPE_TOKEN` | —       | Bearer token Prometheus must present to scrape `GET /api/metrics`. **Unset disables the endpoint (404), never exposes it.** `openssl rand -base64 32`. See [Observability](observability.md). |
