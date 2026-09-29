# Implementation Summary

## Overview

The LG WebOS application is a thin shell that loads the existing Angular web player in a fullscreen iframe and tells it which server it belongs to. The LG app is a deployment vehicle, not a separate player implementation.

## Architecture

```
┌─────────────────────────────────────────────┐
│              LG WebOS TV                    │
│  ┌───────────────────────────────────────┐  │
│  │   myNextScreen App (index.html)     │  │
│  │                                       │  │
│  │  1. Check localStorage for settings   │  │
│  │  2. If missing → show settings UI     │  │
│  │  3. Load web player in iframe         │  │
│  │  4. On iframe load → postMessage      │  │
│  │     { type: 'signage-connect',        │  │
│  │       serverUrl }                     │  │
│  │                                       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  iframe (fullscreen)            │  │  │
│  │  │  ┌───────────────────────────┐  │  │  │
│  │  │  │  Angular Web Player       │  │  │  │
│  │  │  │  ConnectionService        │  │  │  │
│  │  │  │  ← listens for            │  │  │  │
│  │  │  │    'signage-connect'      │  │  │  │
│  │  │  │  → pairs with a 6-digit   │  │  │  │
│  │  │  │    code on screen         │  │  │  │
│  │  │  └───────────────────────────┘  │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Enrolment Flow — pairing code

The shell holds no credential. A screen enrols itself: the player asks the
backend for a six-digit code, shows it on the TV, and polls until an operator
claims it in the dashboard. The claim delivers a screen API key to the player,
which immediately exchanges it for a session and then drops it — so no
long-lived credential ever rests on the device.

### Sequence

1. User enters the **Server URL** in the LG app settings overlay (stored in `localStorage`)
2. `initApp()` reads the settings and deletes any `api_key` written by an earlier version
3. Player URL is resolved: `localStorage.player_url`, else fetched once from `{serverUrl}/api/config` when the settings are saved
4. The iframe `src` is set to the player URL (no query parameters)
5. On iframe `load`, the app sends:
   ```javascript
   iframe.contentWindow.postMessage({
     type: 'signage-connect',
     serverUrl: serverUrl
   }, playerOrigin);
   ```
6. The web player's `ConnectionService` has a `window.addEventListener('message', ...)` listener
7. The listener accepts the message only from the embedding window, on an allow-listed origin, and only while the player is unpaired
8. Without an `apiKey` the player takes the server URL, persists it and points pairing at it; the dialog requests a fresh code from that server
9. The operator enters the code in the dashboard → the player receives its key, exchanges it for a session, and content plays

### The shell has to be updated

A shell from 0.9.x still sends an `apiKey`. The player **ignores it** and takes
only the `serverUrl`, so such a shell no longer enrols its display — the display
shows a pairing code instead and has to be claimed in the dashboard once.

The branch existed so old and new could run side by side. It also meant that any
sender past the trust check could enrol a display with a key it made up, so it
went as soon as nothing needed it.

### Fallback: Direct Browser Access

When the web player is opened directly in a browser (not in an iframe):
- No `postMessage` is sent
- `tryAutoConnect()` resumes from a stored refresh token (plus screen and org id)
- If there is nothing to resume, the pairing dialog appears and shows a code
- The `postMessage` listener remains active but simply never receives a message

### Security Considerations

- **Targeted origin**: The message goes to the player's own origin, never `'*'`.
  It names the server this display belongs to, which a page that happened to
  answer the load has no business learning.
- **Origin allow-list on the receiving end**: The player accepts a handoff only
  from `window.parent`, only when that parent is the top-level document, only
  from its own origin or the opaque `'null'` origin of the `file://`-hosted
  shell, and only while it is not yet paired. A paired display cannot be
  re-pointed by a message.
- **`'null'` proves nothing on its own**: any page can obtain an opaque origin by
  framing through a `sandbox="allow-scripts"` document. Requiring the sender to
  be the top-level window blocks that nesting; a deployment without this shell
  should drop `'null'` outright via `window.__SIGNAGE_TRUSTED_ORIGINS__` in the
  player's `index.html`.
- **The handoff cannot enrol**: it carries a URL. Enrolment happens only through
  a pairing code that an operator claims in the dashboard.
- **Nothing to steal on the device**: The settings overlay is reachable from the
  remote at any time. It holds two URLs and no credential.

## Key Files

### LG App (this directory)

| File | Purpose |
|------|---------|
| `index.html` | Main HTML: iframe, settings overlay, settings JS logic, remote key listener |
| `app.js` | Core logic: `initApp()` checks settings, `loadPlayer()` sets iframe src and sends postMessage |
| `remote-nav.js` | Remote navigation in the settings overlay: arrow keys move a highlight, OK focuses a field (opening the keyboard) or presses a button, Back gives the keyboard up |
| `keep-awake.js` | Vetoes the TV's screen saver over `com.webos.service.tvpower`, for as long as the app is on screen |
| `appinfo.json` | WebOS application metadata and permissions |

### Web Player (separate project)

| File | Purpose |
|------|---------|
| `apps/player/src/app/connection/connection.service.ts` | `ConnectionService` — `postMessage` listener, `startPairing()`/`pollPairing()`, `connect()`, `tryAutoConnect()` |
| `apps/player/src/app/connection/connection-dialog.ts` | Shows the pairing code and polls for the claim |
| `apps/player/src/app/connection/screen-session.service.ts` | Holds the session; rotates the refresh token |

## Settings Storage

Values are stored in `localStorage`:

| Key | Required | Description |
|-----|----------|-------------|
| `server_url` | Yes | Signage server URL |
| `player_url` | Yes | Player URL; fetched from `{server_url}/api/config` on save, or entered by hand |

`api_key` was written by versions up to 0.9.x. It is deleted on the first start
of 0.10.0 or later.

## Error Handling

- **Missing settings**: If `server_url` or `player_url` are absent, the settings overlay opens automatically
- **Invalid player URL**: Anything but `http:`/`https:` is refused, so a tampered setting cannot turn the shell into a loader for arbitrary schemes
- **iframe load failure**: An error message is displayed ("Error loading content. Please check your connection.")
- **Invalid postMessage**: The web player ignores messages with a missing or non-string `serverUrl`, a wrong `type`, an untrusted sender, or any message at all once it is paired

## Timing Note

The LG app sends `postMessage` on iframe `load`, while the player's `ngOnInit`
has already started pairing against the server URL it guessed from its own
hostname. So the handoff regularly arrives after a code is on screen.

That is handled rather than tolerated: the player only replaces the URL when it
actually differs, then requests a new code, and a generation counter discards
the answer of the request that lost the race. Without the counter the slower of
the two servers could put a code on the display that nobody is polling.
