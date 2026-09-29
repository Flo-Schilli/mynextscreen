# Changelog

Notable changes per release, with the operator actions each one requires.
Versions follow the root `package.json`; a release is cut with
`npm run version:patch && git push --follow-tags`.

## 0.13.0

### Fixed — the settings overlay could not be crossed with a TV remote

Entering a server URL on an LG screen needed a Magic Remote pointer. The arrow
keys did nothing: webOS runs a plain web app without spatial navigation, so they
arrive as ordinary keydown events, and a browser only ever moves focus with Tab
— which no remote has.

Moving the focus was not the fix either. On webOS a text field that takes the
focus pops the on-screen keyboard open, and that keyboard then takes the arrow
keys for itself, so every attempt to step to the next control reopened the
keyboard and the remote ended up toggling between the two fields.

The overlay now moves a selection that is not the focus. Arrow keys walk a
highlight over the fields and the buttons, **OK** opens the keyboard on the
highlighted field or presses the highlighted button, **Back** gives the keyboard
up again and leaves the highlight where it was. Nothing is focused until OK asks
for it, so the keyboard only ever appears on request — including when the
overlay opens, which used to focus the Server URL field straight away.

### Added — LG screens no longer fall into the TV's screen saver

Displays blanked after a few idle minutes. webOS gives a web app no switch for
the screen saver, and since webOS 6 it cannot be turned off in the TV settings
either; it starts whenever nothing is playing back full screen, which is exactly
what a playlist of images, or a pairing code, looks like to the TV.

The app now takes the veto the power service does offer: it subscribes to
`com.webos.service.tvpower/power/registerScreenSaverRequest` and answers every
announced start with `ack: false`, the way Kodi and RetroArch hold the screen.
Sent to the background it acknowledges instead, so a TV that someone is watching
still behaves like a TV.

**Operator action:** LG screens do not update themselves. Rebuild the package
(`ares-package player-applications/lg-tvos --outdir ./build`) and install it on
each screen with `ares-install`; pairing survives, the two URLs stay in place.

After installing, confirm the veto took: `ares-inspect --device <tv> --app
com.mynextscreen.webos --open` reports `[keep-awake] the power service refused
the subscription` if the TV denied it. `com.webos.service.tvpower` has no public
ACG, so a screen outside developer mode may refuse the call.

The screen saver is not the TV's only timer. **Auto power off** and the **sleep
timer** under Settings → General switch the set off no matter what an app asks
for, and have to be disabled on the TV itself.

## 0.12.1

### Fixed — invitation links were dead the moment they were sent

An invited user who clicked the link in their email got "Invalid or expired
token", however fresh the link was. Inviting someone wrote the set-password
token into the user row in **plaintext**, while redeeming it looks the token up
by its SHA-256 fingerprint, the way every other mailed token in the codebase is
stored. The two never matched, so `POST /api/auth/set-password` answered 404 for
every invite.

There was no way around it either: an invitee starts unverified, and
forgot-password deliberately no-ops for unverified accounts, so the account
could not be activated at all.

Inviting now persists the token through `UserService.setPasswordResetToken()`,
the single writer that hashes. A regression test redeems the raw token from the
emitted invite event and fails against the old code.

**Operator action:** anyone invited before this release must be **invited again**
— their stored token is a plaintext value that the fixed lookup will not match.
Remove the pending member and add them back; the new invite email works.

## 0.12.0

### Added — unpairing a screen from the remote

The disconnect existed but no TV could reach it. It lives in the player's info
panel, which opens with the **i** key, and a TV remote has no **i**. Nor could a
plain remote have pressed the button: nothing in the player takes focus, so
there was no way to move to it without a Magic Remote pointer.

The webOS shell now owns the entry point. Its settings overlay — **Settings** or
the **Blue** button, the same key that has always opened it — has a **Disconnect
screen** button, and the shell asks the player to unpair over the same
`postMessage` channel it already uses to hand over the server URL.

- The button takes **two presses**: the first arms it for five seconds. Unpairing
  cannot be undone from the remote; the screen has to be claimed again with a new
  code.
- The per-screen **`showDisconnectButton`** toggle governs this too. A screen
  with the disconnect switched off in the dashboard refuses the request, and the
  overlay says so instead of failing silently.
- The unpair request passes the same sender checks as the server-URL handoff
  (allow-listed origin, the embedding window, and that window being the
  top-level document). The one deliberate difference: a handoff is refused once
  a display is paired, an unpair is not — the shell may reset a display, never
  silently re-point it at another server.
- The player answers with the outcome, so the overlay can distinguish a
  successful unpair from a locked screen, an unpaired one, or a player that
  never answered.

**Operator action:** none for the backend. To use it on a TV, repackage and
reinstall the webOS app (`player-applications/lg-tvos/`); older shells keep
working and simply have no disconnect button.

## 0.11.1

### Fixed — the webOS app could not be downloaded

The LG webOS `.ipk` had no download button in the screens help panel, on any
installation. Renaming the project in 0.11.0 changed the application id in
`player-applications/lg-tvos/appinfo.json` to `com.mynextscreen.webos`, and
`ares-package` names the package after it. The backend kept a second, hardcoded
copy of the old id and looked for `com.cbf.webos_0.11.0_all.ipk`, a file CI
never produced, so it reported the download as unavailable and the button never
rendered. The id and version are now read from the manifest — the same file the
packaged name comes from — and cannot drift apart again. A manifest that is
missing or malformed now only costs the download, is logged, and leaves the
setup guide reachable.

Second cause, for arm64 hosts only: the arm64 backend image contained no `.ipk`
at all. The package is architecture independent, but it is baked into the image,
and CI built it for the amd64 job alone when the arm64 images were introduced.
Both backend images now carry it.

The module had no tests, which is why a rename could remove a feature unnoticed.
It now has sixteen, including one that fails if the packaged id and the id the
backend expects ever diverge again.

**Operator action:** pull the new backend image. Nothing else changes; no
migration, no configuration.

## 0.11.0

The release that made the repository public: one name, no borrowed marks, and
documentation that matches the code.

### Changed — the project is called myNextScreen

The admin interface has said so for months; everything else still said "Signage
Server", and the webOS app called itself "Digital Signage" with the application
id `com.cbf.webos`. Four names for one product, none of which matched the logo
in the sidebar. They are now one.

Renamed: the product name in emails, `SMTP_FROM`, the package, the Nx path
mapping (`@mynextscreen/shared-types`), browser-storage keys, the postMessage
handoff type, the JWT issuer and audiences, container and unit names, the podman
network, the Caddy access log, the fail2ban jail, the database role and
database, the service user, and the repository itself
(`Flo-Schilli/mynextscreen`), which moves the GHCR image paths with it.

Dropped: `screen.mynextscreen.app` as the built-in default player URL. An
instance that has no `PLAYER_BASE_URL` now says so in the add-screen hint
instead of naming a deployment it has nothing to do with.

Deleted: `docs/`, 54 files of planning and design-handoff material that
documented how the software came to be rather than how to use it. The history
still has them.

Corrected: README, ARCHITECTURE and VISION still described screens as
authenticating with a long-lived API key issued by an org admin. That stopped
being true in 0.10.0.

### Changed — the launcher icon, the favicon and the idle screen are our own

The webOS launcher icon was a third-party logo, and `default-screen.png` — what
a display shows when nothing is scheduled — was a band's. Permission to use a
mark is not permission to ship it to everyone who installs the software, and
AGPL passes on rights to the code, not to a bundled image. All three are now one
drawing, optically sized per use: 80 px for the launcher, 16 px for the tab, and
full screen with the wordmark for an idle display, which also now says it is
idle rather than leaving a bystander to guess it is broken.

Both web apps ship a favicon that survives 16 px. The player referenced one that
never existed and served a 404.

### Fixed — two things a staged demo made visible

- **Dates followed the browser locale, the rest of the UI did not.** Nothing
  here is translated, so `toLocaleDateString()` without a locale localised
  nothing; it mixed languages, rendering "Montag, 28. September" inside a panel
  headed "Schedules". Fifteen call sites now share one locale constant.
- **The unread-notification count fetched before it knew which organisation it
  was counting for**, so the request went out without `X-Organisation-Id` and
  the backend answered 400 — on every page load, in every browser console. It
  now follows the selected organisation, and re-reads when someone switches,
  which it never did before.

### Documentation

The README is a page for someone deciding whether to look at this at all:
screenshots of the running system, three commands to start it. Everything an
operator needs moved into `docs/` (installation, configuration, screens).
ARCHITECTURE and VISION were corrected against the code — both still described
an email provider, a screen registration flow and a local content cache that do
not exist.

### CI

`actions/checkout` and `actions/setup-node` moved to v7, pinned by SHA with the
exact tag written beside each one.

### Required operator actions

This release renames deployment identity. A running instance does not migrate
itself — plan a rebuild rather than an upgrade.

1. **Pull from the new image path.** `ghcr.io/flo-schilli/mynextscreen/{backend,frontend,player}`.
   The old path keeps its existing tags and receives nothing further.
2. **The database role, the database and the service user are now `mynextscreen`.**
   Back up first (`ansible/download_db.yml` against the old host), then restore
   into the new instance.
3. **Quadlet units, the podman network and the env files are renamed.** Remove
   the `signage-*` units before deploying, or the host runs both sets.
4. **Everyone is logged out once.** The JWT issuer and audiences changed, so
   existing access tokens are refused. Users simply log in again.
5. **Every screen re-pairs, and every webOS TV needs the new app.** The
   application id changed, which makes it a new app to the TV: the old one stays
   installed and the new one starts empty. Browser-storage keys changed too, so
   a paired display starts over.

## 0.10.1

### Changed — the webOS shell stops asking for an API key

0.10.0 left the key field in the shell's settings overlay and kept the key on
the TV, on the argument that the shell's storage survives an app update of the
player iframe. That argument no longer holds: the dashboard stopped handing out
keys at all, so there is nothing for an operator to type into that field. A
screen is enrolled by the six-digit code it shows on the display.

- The settings overlay asks for the **Server URL** and an optional Player URL,
  and explains that the code on screen is what enrols the display.
- The key written by 0.9.x is **deleted from the TV** on the first start.
- The handoff message carries only `serverUrl`. The player takes it, persists it
  and pairs against it — which also fixes the case where the player guessed
  `api.<its own hostname>` and got it wrong.
- **The handoff can no longer enrol a display.** An `apiKey` in the message is
  ignored. It used to be honoured for shells from 0.9.x, which also meant any
  sender past the trust check could enrol a display with a key it invented.
- **A handoff is accepted only from the top-level embedding window.** The shell
  is one; a page faking the shell's opaque origin by framing through a
  `sandbox="allow-scripts"` document is not. Deployments without the webOS shell
  should drop the opaque origin entirely — `window.__SIGNAGE_TRUSTED_ORIGINS__`
  in the player's `index.html`, which now documents itself.

### Changed — disconnect moves into the info panel

It was a button pinned to the top-right corner of the content at all times, on a
device whose entire purpose is to show content. It now sits in the info panel
(the **i** key), next to the screen, playlist and status it belongs with. The
per-screen `showDisconnectButton` toggle still governs it.

The panel no longer auto-hides once it has been opened deliberately; only the
informational flash on start does. Five seconds is not enough to find and hit a
button with a TV remote.

### Required operator actions

1. **Reinstall the webOS app on every TV that runs the 0.9.x shell.** Its handoff
   can no longer enrol a display. Screens that are already paired keep running on
   their session and are not affected; a screen that has to enrol again with an
   old shell will sit on a pairing code until the app is updated.

A screen whose storage is cleared shows a code again; enrol it with **Repair**
on the existing screen, which keeps its name, playlists and schedules.

## 0.10.0

The screen API key stops being a permanent credential, and the backend container
stops running as root. Eight commits; `v0.9.0..v0.10.0` for the full list.

### Required operator actions

1. **Add `UserNS=keep-id:uid=1000,gid=1000` to the backend unit.** The image now
   runs as a non-root user, and under rootless podman a plain non-root uid lands
   in the subuid range and cannot write the media bind mount. The shipped quadlet
   template has the line; a hand-written unit without it fails every upload,
   transcode and slice with a permission error. `CHOWN` and `DAC_OVERRIDE` are
   dropped from its capabilities.
2. **Screens re-enrol themselves, but only if they can reach the new session
   route.** The API key is now accepted on `POST /screens/session` and nowhere
   else. A player from before 0.10.0 cannot authenticate at all against a
   0.10.0 backend — deploy both together.

### Changed — the screen API key is now an enrolment credential

Previously it was issued once at pairing, never renewed, had no expiry and no
revocation, and travelled on every request. It sat in the player's localStorage,
in the webOS shell's storage — shown in cleartext in a settings overlay
reachable from the remote — and as `?token=` in every media URL, which put it in
the DOM, the `Referer` chain and every access log line.

- **Media URLs carry a signed grant** instead of a credential: HMAC over screen
  id and path, key derived from `JWT_ACCESS_SECRET`. Bucketed to a day with a
  per-screen offset so the URL stays byte-stable and `max-age=86400` keeps
  working; only the path is signed.
- **Screens hold a session**: a 15-minute access token with its own JWT
  audience, plus a rotating refresh token in Postgres (not Redis — a lost
  snapshot would strand the fleet). A 60-second grace window makes concurrent
  refreshes from the player's five independent consumers legitimate rather than
  a replay; a real replay is refused and logged without revoking the family.
- **The player keeps no key on disk** once a session exists, renews on a 401
  rather than on a clock a TV cannot be trusted with, and jitters its SSE
  reconnect so a fleet does not come back in lockstep.
- **The heartbeat reports the player build**, shown in the admin screen detail.
- The webOS key field is a password input and is never pre-filled; empty means
  "keep the stored key". The shell still holds the key on purpose — its storage
  is what survives an app update of the player iframe.
- `?token=` is gone as an authentication mechanism.

### Fixed

- The backend container runs as a non-root user. FFmpeg parses user-uploaded
  media in it, so a parser bug was root inside the container.
- SSRF: the per-org SMTP send path and live-stream start now run the resolved
  address check that until then only the test endpoints did.
- The screen API key is redacted from the Caddy and nginx access logs.
- Two player bugs surfaced by the above: hls.js froze the credential in a
  closure at attach time, and the Safari native-HLS branch could never have
  worked.

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
  action to a commit SHA. Dependabot and `SECURITY.md` added (`11bfbdc`). A
  CodeQL workflow is in place but stays skipped: code scanning needs GitHub
  Advanced Security on a private repository, so it activates by itself if this
  repository is made public.
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
