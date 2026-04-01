# Feature 025: LG webOS Player — Connect via Web Player with postMessage Authentication

## Introduction

Rework the LG webOS TV application to act as a thin shell that loads the existing Angular web player in an iframe and authenticates it via `postMessage`. The LG app collects **Server URL** and **API Key** from the user via a settings UI, loads the web player in a fullscreen iframe, and sends credentials to the player via `postMessage`. The web player gains a `postMessage` listener that auto-connects when credentials arrive, bypassing the connection dialog. When opened directly in a browser (without an embedding parent), the connection dialog still appears as a fallback.

All legacy GarlicHub, UUID, and friendly-name code is removed from the LG app.

### Architecture Context

- **Vision alignment:** Screens authenticate via API keys (VISION.md §Screens). The LG app becomes a deployment vehicle for the existing web player, not a separate player implementation.
- **Components involved:**
  - `player-applications/lg-tvos/` — LG webOS shell app (rewritten)
  - `player/src/app/connection/connection.service.ts` — gains postMessage listener
  - `player/src/app/app.ts` — auto-connect flow adjusted
- **Existing patterns respected:** The web player's `ConnectionService` already handles `connect(serverUrl, apiKey)`. We add a new input channel (postMessage) alongside the existing localStorage auto-connect.
- **No backend changes required.**

## Goals

- LG webOS app loads the web player and authenticates it without exposing credentials in URLs
- Web player auto-connects when it receives valid credentials via postMessage
- Web player connection dialog remains functional for direct browser access
- Clean removal of all legacy GarlicHub/UUID/friendly-name code from LG app
- Development-friendly: optional Player URL override for split server/player setups

## Tasks

### TASK-025-001: Rewrite LG webOS settings UI and storage
**Description:** As a TV operator, I want to enter the Server URL and API Key (and optionally a Player URL) in the LG app settings so that the app knows how to connect to my signage server.

**Token Estimate:** ~30k tokens
**Predecessors:** none
**Successors:** TASK-025-002
**Parallel:** yes — can run alongside TASK-025-003

**Acceptance Criteria:**
- [x] Settings overlay has three fields: "Server URL" (required), "API Key" (required), "Player URL" (optional)
- [x] Server URL and API Key are validated as non-empty on save; Server URL is validated as a proper URL
- [x] Player URL hint text explains: "Leave empty to use Server URL + /player/. Only set for development."
- [x] Values are persisted in localStorage with keys: `server_url`, `api_key`, `player_url`
- [x] All legacy code removed: UUID generation, friendly name, `backend=GarlicHub`, `DEFAULT_SPA_URL`, `LEGACY_NAME_KEY`, `getDeviceIdentifier()`, `window.regenerateUUID`
- [x] STORAGE_KEYS updated to `{ serverUrl: 'server_url', apiKey: 'api_key', playerUrl: 'player_url' }`
- [x] "Save & Reload" button persists values and reloads the page
- [x] Settings overlay opens automatically if Server URL or API Key are missing
- [x] Settings overlay still opens on Settings/Blue remote button press
- [x] Cancel button closes overlay without saving

### TASK-025-002: Rewrite LG webOS app.js — iframe loading and postMessage
**Description:** As a TV operator, I want the LG app to load the web player in a fullscreen iframe and send it my credentials via postMessage so that the player connects automatically without me interacting with it.

**Token Estimate:** ~35k tokens
**Predecessors:** TASK-025-001
**Successors:** TASK-025-004
**Parallel:** no

**Acceptance Criteria:**
- [x] `initApp()` checks for saved `server_url` and `api_key`; if missing, shows settings overlay
- [x] Player URL is resolved as: `localStorage.player_url || (serverUrl + '/player/')`
- [x] iframe `src` is set to the resolved player URL (no query parameters — credentials are NOT in the URL)
- [x] On iframe `load` event, the app sends a postMessage to the iframe:
  ```javascript
  iframe.contentWindow.postMessage({
    type: 'signage-connect',
    serverUrl: serverUrl,
    apiKey: apiKey
  }, '*');
  ```
- [x] Loading message ("Loading Digital Signage...") is shown while iframe loads
- [x] Loading message hides and iframe becomes visible on load
- [x] Error message shown if iframe fails to load
- [x] No `deviceId`, `uuid`, or `backend` parameters in the URL
- [x] `buildTargetUrl()` function removed entirely
- [x] `getDeviceIdentifier()` function removed entirely

### TASK-025-003: Web player — add postMessage listener for auto-connect
**Description:** As a web player instance embedded in an iframe, I want to listen for a `signage-connect` postMessage so that I can auto-connect without showing the connection dialog.

**Token Estimate:** ~40k tokens
**Predecessors:** none
**Successors:** TASK-025-004
**Parallel:** yes — can run alongside TASK-025-001, TASK-025-002

**Acceptance Criteria:**
- [x] `ConnectionService` registers a `window.addEventListener('message', ...)` listener on construction
- [x] Listener filters for messages where `event.data.type === 'signage-connect'`
- [x] Listener extracts `serverUrl` and `apiKey` from `event.data`
- [x] Listener calls `this.connect(serverUrl, apiKey)` (existing method)
- [x] Listener ignores messages with missing `serverUrl` or `apiKey`
- [x] Listener is cleaned up on service destroy (if applicable)
- [x] `tryAutoConnect()` flow is unchanged — localStorage auto-connect still works
- [x] `App.ngOnInit()` still calls `tryAutoConnect()` first; if that returns false, the player waits for either postMessage or manual dialog input
- [x] Connection dialog is still shown when `connected()` is false (handles direct browser access)
- [x] When postMessage arrives and `connect()` succeeds, `connected()` becomes true and the dialog disappears
- [x] Unit tests verify: postMessage with valid data triggers connect, invalid/missing data is ignored
- [x] No changes to the connection dialog component itself

### TASK-025-004: End-to-end integration test and documentation update
**Description:** As a developer, I want to verify the full LG → iframe → postMessage → web player flow works and update the LG app documentation accordingly.

**Token Estimate:** ~20k tokens
**Predecessors:** TASK-025-002, TASK-025-003
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [ ] Manual test: LG app settings entered → iframe loads web player → postMessage sent → player auto-connects → content plays
- [ ] Manual test: web player opened directly in browser → connection dialog appears → manual connect works
- [ ] Manual test: LG app with custom Player URL (development setup) → iframe loads from custom URL → postMessage works
- [ ] README.md updated: remove all GarlicHub/UUID references, document new settings (Server URL, API Key, Player URL)
- [ ] QUICKSTART.md updated with new setup steps
- [ ] IMPLEMENTATION.md updated to describe postMessage authentication flow
- [ ] Remove or update VALIDATION.md and test.html if they reference removed functionality

## Task Dependency Graph

```
TASK-025-001 ──→ TASK-025-002 ──→ TASK-025-004
TASK-025-003 ────────────────────┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-025-001 | ~30k | none | yes (with 003) | — |
| TASK-025-002 | ~35k | 001 | no | — |
| TASK-025-003 | ~40k | none | yes (with 001) | — |
| TASK-025-004 | ~20k | 002, 003 | no | — |

**Total estimated tokens:** ~125k

## Functional Requirements

- FR-1: The LG app settings UI must collect Server URL (required), API Key (required), and Player URL (optional)
- FR-2: The LG app must load the web player in a fullscreen iframe at `${serverUrl}/player/` (or custom Player URL if set)
- FR-3: The LG app must send credentials to the iframe via `postMessage` with type `signage-connect` after the iframe loads
- FR-4: The web player must listen for `signage-connect` postMessage and call `connect(serverUrl, apiKey)` when received
- FR-5: The web player connection dialog must still appear when the player is not embedded (direct browser access)
- FR-6: Credentials must never appear in the iframe URL
- FR-7: All legacy GarlicHub, UUID, and friendly-name code must be removed from the LG app

## Non-Goals

- No changes to the backend API
- No new authentication mechanisms (still uses existing screen API keys)
- No multi-backend support (GarlicHub compatibility removed)
- No automatic screen registration from the LG app
- No remote management of LG app settings (settings are local to each TV)

## Technical Considerations

- **postMessage security:** Using `'*'` as target origin is acceptable here since the LG app controls the iframe src and the web player validates message shape (not origin). The player only acts on messages with the correct `type` field and valid `serverUrl`/`apiKey` data.
- **iframe same-origin:** In production (same server), the player and API share an origin, so no CORS issues. In development (different ports), the Angular dev server's proxy or CORS config may need to allow the LG app's origin.
- **X-Frame-Options:** The backend/player must NOT send `X-Frame-Options: DENY`. Verify that NestJS and the Angular build output don't add this header.
- **postMessage timing:** The LG app sends the postMessage on iframe `load`. The web player's `tryAutoConnect()` runs on `ngOnInit`. There's a potential race where `tryAutoConnect()` fails (no localStorage) and the player shows the dialog briefly before the postMessage arrives. This is acceptable — the dialog will disappear once `connect()` succeeds. If this flash is undesirable, a small delay or a "waiting for connection" state could be added in a follow-up.

## Success Metrics

- LG TV loads web player and starts displaying content without manual interaction beyond initial settings setup
- No credentials visible in iframe URLs or browser history
- Direct browser access to web player still works with manual connection dialog
- All legacy GarlicHub references eliminated from codebase

## Open Questions

None — all resolved during planning.
