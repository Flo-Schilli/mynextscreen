# Implementation Summary

## Overview

The LG WebOS application is a thin shell that loads the existing Angular web player in a fullscreen iframe and authenticates it via `postMessage`. The LG app is a deployment vehicle, not a separate player implementation.

## Architecture

```
┌─────────────────────────────────────────────┐
│              LG WebOS TV                    │
│  ┌───────────────────────────────────────┐  │
│  │   Digital Signage App (index.html)    │  │
│  │                                       │  │
│  │  1. Check localStorage for settings   │  │
│  │  2. If missing → show settings UI     │  │
│  │  3. Load web player in iframe         │  │
│  │  4. On iframe load → postMessage      │  │
│  │     { type: 'signage-connect',        │  │
│  │       serverUrl, apiKey }             │  │
│  │                                       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  iframe (fullscreen)            │  │  │
│  │  │  ┌───────────────────────────┐  │  │  │
│  │  │  │  Angular Web Player       │  │  │  │
│  │  │  │  ConnectionService        │  │  │  │
│  │  │  │  ← listens for            │  │  │  │
│  │  │  │    'signage-connect'      │  │  │  │
│  │  │  │  → calls connect()        │  │  │  │
│  │  │  └───────────────────────────┘  │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Authentication Flow — postMessage

The LG app authenticates the embedded web player using `window.postMessage`. This avoids putting credentials in the iframe URL.

### Sequence

1. User enters **Server URL** and **API Key** in the LG app settings overlay (stored in `localStorage`)
2. `initApp()` reads settings from `localStorage`
3. Player URL is resolved: `localStorage.player_url || serverUrl + '/player/'`
4. The iframe `src` is set to the player URL (no query parameters)
5. On iframe `load`, the app sends:
   ```javascript
   iframe.contentWindow.postMessage({
     type: 'signage-connect',
     serverUrl: serverUrl,
     apiKey: apiKey
   }, '*');
   ```
6. The web player's `ConnectionService` has a `window.addEventListener('message', ...)` listener
7. The listener filters for `event.data.type === 'signage-connect'`
8. It extracts `serverUrl` and `apiKey` from `event.data` and calls `this.connect(serverUrl, apiKey)`
9. `connected()` becomes `true`, the connection dialog disappears, and content plays

### Fallback: Direct Browser Access

When the web player is opened directly in a browser (not in an iframe):
- No `postMessage` is sent
- `tryAutoConnect()` checks `localStorage` for previously saved credentials
- If none exist, the connection dialog appears for manual input
- The `postMessage` listener remains active but simply never receives a message

### Security Considerations

- **`'*'` as target origin**: Acceptable because the LG app controls the iframe `src` and the player validates message shape (not origin). The player only acts on messages with `type: 'signage-connect'` and valid data.
- **No credentials in URL**: The iframe URL contains no query parameters. Credentials are only transmitted via `postMessage`, which does not appear in browser history or server logs.

## Key Files

### LG App (this directory)

| File | Purpose |
|------|---------|
| `index.html` | Main HTML: iframe, settings overlay, settings JS logic, remote key listener |
| `app.js` | Core logic: `initApp()` checks settings, `loadPlayer()` sets iframe src and sends postMessage |
| `appinfo.json` | WebOS application metadata and permissions |

### Web Player (separate project)

| File | Purpose |
|------|---------|
| `player/src/app/connection/connection.service.ts` | `ConnectionService` — has `postMessage` listener, `connect()`, `tryAutoConnect()` |
| `player/src/app/app.ts` | `App.ngOnInit()` calls `tryAutoConnect()`, shows connection dialog if not connected |

## Settings Storage

Values are stored in `localStorage`:

| Key | Required | Description |
|-----|----------|-------------|
| `server_url` | Yes | Signage server URL |
| `api_key` | Yes | API key for this screen |
| `player_url` | No | Override player URL (development only) |

## Error Handling

- **Missing settings**: If `server_url` or `api_key` are absent, the settings overlay opens automatically
- **iframe load failure**: An error message is displayed ("Error loading content. Please check your connection.")
- **Invalid postMessage**: The web player ignores messages with missing or incorrect `type`, `serverUrl`, or `apiKey`

## Timing Note

The LG app sends `postMessage` on iframe `load`. The web player's `tryAutoConnect()` runs on `ngOnInit`. There is a brief window where the connection dialog may flash before the `postMessage` arrives and `connect()` succeeds. This is cosmetic and acceptable.
