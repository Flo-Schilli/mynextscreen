# Feature 013: Notifications & Monitoring

## Introduction

Deliver a complete notification system so that users are alerted to important system events — screen going offline, transcoding completing or failing, etc. — through the channels they prefer. Three channels are supported: in-app (bell icon + dropdown in the top bar), email (SMTP), and ntfy (push notifications via HTTP). Each user independently controls which channels they receive notifications on. Organisation Admins configure the org-level channel credentials (SMTP settings, ntfy URL/token).

### Architecture Context

- **Vision alignment:** "The system tracks screen online/offline status via heartbeat", "Three notification channels: in-app, email, ntfy", "Each user configures which channels they receive notifications on", "Top bar has notification bell with unread badge", "User Settings page includes personal notification preferences", "Organisation Settings includes notification channel configuration"
- **Components involved:** NotificationModule (new), DashboardGateway (existing — Socket.IO), ScreenModule (existing — heartbeat + online/offline events), TranscodingModule (existing — transcoding events), UserModule (existing — UserOrganisationMembership entity), OrganisationModule (existing)
- **New patterns:** NotificationHub fan-out service, abstract EmailProvider interface, ntfy HTTP push channel, per-user per-channel preference table
- **Existing infrastructure reused:** DashboardGateway's Socket.IO org rooms for in-app delivery; NestJS EventEmitter events already emitted by ScreenModule (`screen.online`, `screen.offline`) and TranscodingModule (`transcoding.complete`, `transcoding.failed`)

## Goals

- A central NotificationHub receives system events and fans out to all configured, user-preferred channels
- In-app notifications are stored in the database and pushed to the connected client via Socket.IO
- Email notifications are sent via SMTP using nodemailer (generic, works with any mail server)
- ntfy notifications are sent via HTTP POST to a configurable URL with an optional auth token, configured per organisation
- Each user can independently toggle each channel on/off from their User Settings page
- Organisation Admins can configure SMTP credentials and ntfy URL/token from Org Settings
- The notification bell in the top bar shows a live unread badge and opens a dropdown panel listing recent notifications
- Unread count updates in real time via the existing Socket.IO connection

## Tasks

### TASK-013-001: Notification Entity & Migration
**Description:** As the system, I want a `Notification` entity and TypeORM migration so that in-app notifications can be persisted and queried.

**Token Estimate:** ~25k tokens
**Predecessors:** none
**Successors:** TASK-013-003, TASK-013-004
**Parallel:** yes — can run alongside TASK-013-002
**Model:** —

**Acceptance Criteria:**
- [x] `Notification` entity with fields:
  - `id` — UUID, primary key
  - `userId` — UUID, FK to users table, not nullable
  - `organisationId` — UUID, FK to organisations table, not nullable
  - `eventType` — string enum: `screen.offline`, `screen.online`, `transcoding.complete`, `transcoding.failed` (extensible)
  - `title` — string, short human-readable summary (e.g. "Screen offline")
  - `message` — string, longer description (e.g. "Screen 'Main Hall Left' has gone offline")
  - `read` — boolean, default `false`
  - `createdAt` — datetime, default now
- [x] TypeORM migration creates the `notifications` table with indexes on `(userId, read)` and `(userId, createdAt)`
- [x] `NotificationRepository` or TypeORM repository injection set up in `NotificationModule`
- [x] Unit tests for entity creation and basic repository queries (find unread by user, mark as read)
- [x] Typecheck and lint pass

---

### TASK-013-002: User Notification Preferences & Org Notification Config
**Description:** As the system, I want per-user channel preference storage and per-org notification config storage so that the hub knows which channels to dispatch to.

**Token Estimate:** ~35k tokens
**Predecessors:** none
**Successors:** TASK-013-003
**Parallel:** yes — can run alongside TASK-013-001
**Model:** —

**Acceptance Criteria:**
- [x] `UserNotificationPreference` entity (or extend `UserOrganisationMembership` with nullable boolean columns — choose new entity for cleaner separation):
  - `id` — UUID, PK
  - `userId` — UUID, FK
  - `organisationId` — UUID, FK
  - `inAppEnabled` — boolean, default `true`
  - `emailEnabled` — boolean, default `false`
  - `ntfyEnabled` — boolean, default `false`
  - Unique constraint on `(userId, organisationId)`
- [x] `OrganisationNotificationConfig` entity (or columns on `Organisation` entity — use a separate entity for encapsulation):
  - `id` — UUID, PK
  - `organisationId` — UUID, FK, unique
  - `smtpHost` — string, nullable
  - `smtpPort` — integer, nullable
  - `smtpUser` — string, nullable
  - `smtpPassword` — string, nullable (stored encrypted or as plaintext with a TODO for encryption)
  - `smtpFrom` — string, nullable (sender address)
  - `smtpSecure` — boolean, default `false` (STARTTLS vs TLS)
  - `ntfyUrl` — string, nullable (full base URL, e.g. `https://ntfy.sh`)
  - `ntfyTopic` — string, nullable
  - `ntfyToken` — string, nullable
- [x] TypeORM migrations for both new tables
- [x] `UserNotificationPreferenceService` with methods: `getForUser(userId, orgId)`, `upsert(userId, orgId, prefs)` — creates default record if none exists
- [x] `OrgNotificationConfigService` with methods: `getForOrg(orgId)`, `upsert(orgId, config)`
- [x] REST endpoints (add to existing controllers or create new ones):
  - `GET /api/users/me/notification-preferences` — returns preferences for current user in current org
  - `PATCH /api/users/me/notification-preferences` — update channel toggles
  - `GET /api/organisations/:id/notification-config` — Org Admin only, returns SMTP + ntfy config
  - `PATCH /api/organisations/:id/notification-config` — Org Admin only, upserts config
- [x] Unit tests for service methods and endpoint access control
- [x] Typecheck and lint pass

---

### TASK-013-003: NotificationHub Service
**Description:** As the system, I want a central NotificationHub service so that any module can dispatch a notification event and the hub fans it out to all appropriate channels based on user preferences.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-013-001, TASK-013-002
**Successors:** TASK-013-004, TASK-013-005, TASK-013-006, TASK-013-007
**Parallel:** no
**Model:** —

**Acceptance Criteria:**
- [x] `NotificationHub` service in `NotificationModule` with a primary method:
  ```ts
  dispatch(event: NotificationEvent): Promise<void>
  ```
  where `NotificationEvent` is:
  ```ts
  interface NotificationEvent {
    orgId: string;
    eventType: NotificationEventType;
    title: string;
    message: string;
    resourceId?: string; // e.g. screen ID
  }
  ```
- [x] On `dispatch()`:
  1. Fetch all users in the organisation (via `UserOrganisationMembership`)
  2. For each user, load their `UserNotificationPreference` (auto-create default if missing)
  3. For each enabled channel per user, call the appropriate channel handler:
     - `inAppEnabled` → `InAppNotificationChannel.send(userId, orgId, notification)`
     - `emailEnabled` → `EmailNotificationChannel.send(userId, orgId, notification)` (if org SMTP is configured)
     - `ntfyEnabled` → `NtfyNotificationChannel.send(orgId, notification)` (if org ntfy is configured; ntfy is org-level, not per-user)
  4. Each channel call is fire-and-forget (async, non-blocking, errors are caught and logged)
- [x] Channel handlers are injected via interfaces (`InAppChannel`, `EmailChannel`, `NtfyChannel`) — hub depends on abstractions
- [x] `NotificationModule` exports `NotificationHub` for use by other modules
- [x] Unit tests: mock all three channel handlers, verify dispatch calls correct handlers based on user prefs, verify missing config skips channel gracefully
- [x] Typecheck and lint pass

---

### TASK-013-004: In-App Notification Channel
**Description:** As a user, I want in-app notifications to be stored in the database and pushed to my browser in real time so that I see alerts without leaving the dashboard.

**Token Estimate:** ~35k tokens
**Predecessors:** TASK-013-001, TASK-013-003
**Successors:** TASK-013-008
**Parallel:** no
**Model:** —

**Acceptance Criteria:**
- [x] `InAppNotificationChannel` service:
  - Saves a new `Notification` record to the DB for the target user
  - Emits a Socket.IO event to the user's session via `DashboardGateway`
  - Socket.IO event type: `notification.new`, payload: `{ id, eventType, title, message, read: false, createdAt }`
- [x] `DashboardGateway` extended to support per-user rooms in addition to org rooms:
  - On connection, client also joins a room named `user:{userId}`
  - `InAppNotificationChannel` emits to `user:{userId}` room
- [x] REST endpoints added to `NotificationModule`:
  - `GET /api/notifications` — returns the 50 most recent notifications for the current user in the current org, ordered by `createdAt` desc; query param `unreadOnly=true` to filter
  - `PATCH /api/notifications/:id/read` — marks a single notification as read
  - `PATCH /api/notifications/read-all` — marks all unread notifications for the current user + org as read
  - `GET /api/notifications/unread-count` — returns `{ count: number }` for badge display
- [x] Unit tests for channel send, REST endpoints, Socket.IO emit
- [x] Typecheck and lint pass

---

### TASK-013-005: Email Channel with SMTP Provider
**Description:** As the system, I want an email notification channel using SMTP so that users receive email alerts when their email channel is enabled and the org has SMTP configured.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-013-002, TASK-013-003
**Successors:** none
**Parallel:** yes — can run alongside TASK-013-006
**Model:** —

**Acceptance Criteria:**
- [x] Abstract `EmailProvider` interface:
  ```ts
  interface EmailProvider {
    sendMail(options: MailOptions): Promise<void>;
  }
  interface MailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }
  ```
- [x] `SmtpEmailProvider` implementation using `nodemailer`:
  - Constructor accepts SMTP config (host, port, user, password, secure, from)
  - `sendMail()` creates a nodemailer transporter per call (or lazily cached) and sends the message
  - Errors are thrown so the hub can catch and log them
- [x] `EmailNotificationChannel` service:
  - Accepts injected `OrgNotificationConfigService`
  - On `send(userId, orgId, notification)`:
    1. Load org SMTP config — if incomplete (no host), skip silently
    2. Fetch the user's email address from the user record
    3. Instantiate (or reuse) `SmtpEmailProvider` with the org config
    4. Call `sendMail()` with a simple plain-text email: subject = notification title, body = notification message
- [x] `nodemailer` added to `backend/package.json` dependencies
- [x] `@types/nodemailer` added to dev dependencies
- [x] Unit tests for `SmtpEmailProvider` (mock nodemailer transporter) and `EmailNotificationChannel` (mock provider)
- [x] Typecheck and lint pass

---

### TASK-013-006: ntfy Channel
**Description:** As the system, I want an ntfy notification channel so that organisations can receive push notifications via a self-hosted or cloud ntfy instance.

**Token Estimate:** ~20k tokens
**Predecessors:** TASK-013-002, TASK-013-003
**Successors:** none
**Parallel:** yes — can run alongside TASK-013-005
**Model:** —

**Acceptance Criteria:**
- [x] `NtfyNotificationChannel` service:
  - On `send(orgId, notification)`:
    1. Load org notification config — if `ntfyUrl` or `ntfyTopic` is missing, skip silently
    2. HTTP POST to `{ntfyUrl}/{ntfyTopic}` with:
       - Header `Content-Type: text/plain`
       - Header `Authorization: Bearer {ntfyToken}` if token is configured
       - Header `Title: {notification.title}`
       - Body: `notification.message`
    3. Use NestJS `HttpModule` (`@nestjs/axios`) for the HTTP call
    4. Non-2xx responses are logged as warnings but do not throw
- [x] `HttpModule` (from `@nestjs/axios`) imported in `NotificationModule` if not already present
- [x] Unit tests for `NtfyNotificationChannel`: mock HTTP client, verify correct URL construction, headers, and body; verify missing config skips gracefully
- [x] Typecheck and lint pass

---

### TASK-013-007: Event Integration — Wire System Events to NotificationHub
**Description:** As the system, I want existing module events (screen offline, transcoding complete/failed) to automatically trigger notifications so that users are alerted without any manual wiring per module.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-013-003
**Successors:** none
**Parallel:** yes — can run alongside TASK-013-004, TASK-013-005, TASK-013-006
**Model:** —

**Acceptance Criteria:**
- [x] `NotificationEventListener` service in `NotificationModule` decorated with `@OnEvent()` handlers:
  - `@OnEvent('screen.offline')` → dispatch notification:
    - `eventType: 'screen.offline'`
    - `title: 'Screen offline'`
    - `message: 'Screen "{screenName}" ({location}) has gone offline.'`
    - `resourceId: screenId`
  - `@OnEvent('screen.online')` → dispatch notification (informational, users may not want this — channel prefs handle it):
    - `eventType: 'screen.online'`
    - `title: 'Screen online'`
    - `message: 'Screen "{screenName}" ({location}) is back online.'`
    - `resourceId: screenId`
  - `@OnEvent('transcoding.complete')` → dispatch notification:
    - `eventType: 'transcoding.complete'`
    - `title: 'Transcoding complete'`
    - `message: 'Content "{contentTitle}" has finished transcoding and is ready to use.'`
    - `resourceId: contentId`
  - `@OnEvent('transcoding.failed')` → dispatch notification:
    - `eventType: 'transcoding.failed'`
    - `title: 'Transcoding failed'`
    - `message: 'Content "{contentTitle}" failed to transcode. Please re-upload the file.'`
    - `resourceId: contentId`
- [x] Each handler extracts the `orgId` from the event payload (all existing events must carry `orgId`)
- [x] If an existing event payload does not include `orgId`, update the emitting service to include it (minimal change)
- [x] Handlers call `NotificationHub.dispatch()` and await; errors are caught and logged
- [x] Unit tests: mock `NotificationHub`, assert `dispatch()` called with correct payload for each event type
- [x] Typecheck and lint pass

---

### TASK-013-008: Frontend — Notification Bell, Dropdown & Real-Time Updates
**Description:** As a user, I want a notification bell in the top bar that shows my unread count and opens a dropdown with recent notifications so that I can see alerts at a glance.

**Token Estimate:** ~55k tokens
**Predecessors:** TASK-013-004
**Successors:** TASK-013-009
**Parallel:** no
**Model:** —

**Acceptance Criteria:**
- [x] `NotificationBellComponent` in the top bar (replaces the existing placeholder bell):
  - Displays a bell icon with an unread count badge (hidden if count is 0)
  - Badge number capped at display of "99+" if count exceeds 99
  - Clicking the bell opens/closes a `NotificationDropdownComponent`
  - On mount: calls `GET /api/notifications/unread-count` to initialise badge
  - Subscribes to `notification.new` Socket.IO events: increments badge, prepends notification to dropdown list
- [x] `NotificationDropdownComponent` (shown as a panel anchored below the bell):
  - Lists the 50 most recent notifications, ordered newest first
  - Each row: event type icon (coloured), title, message (truncated to ~80 chars), relative timestamp (e.g. "3 minutes ago")
  - Unread notifications have a subtle highlighted background; read ones are visually muted
  - "Mark all as read" button at the top — calls `PATCH /api/notifications/read-all`, resets badge to 0, updates all rows to read style
  - Clicking a notification row marks it as read (`PATCH /api/notifications/:id/read`) and navigates to the relevant resource if applicable (e.g. clicking a `screen.offline` notification navigates to `/screens/{resourceId}`)
  - Clicking outside the dropdown closes it
  - Shows "No notifications yet" empty state when list is empty
- [x] `NotificationService` (Angular service):
  - Fetches notification list and unread count
  - Exposes an observable/signal for unread count
  - Handles `notification.new` Socket.IO event and updates state
- [x] All API calls use the existing HTTP interceptor (auth headers, org header)
- [x] Dark-themed, consistent with existing top bar styling
- [x] Unit tests for `NotificationService` (mock HTTP and Socket.IO)
- [x] Typecheck and lint pass

---

### TASK-013-009: Frontend — User Notification Preferences UI
**Description:** As a user, I want to manage my notification channel preferences from the User Settings page so that I only receive alerts through the channels I want.

**Token Estimate:** ~30k tokens
**Predecessors:** TASK-013-008
**Successors:** TASK-013-010
**Parallel:** no
**Model:** —

**Acceptance Criteria:**
- [x] Notification preferences section added to the `/settings/user` (or `/user-settings`) page:
  - Section header: "Notification Channels"
  - Three toggle rows, one per channel:
    - **In-app** — "Receive notifications in the dashboard" (toggle)
    - **Email** — "Receive notifications by email" (toggle; shows a note "Configure email in Organisation Settings" if org SMTP is not set up)
    - **ntfy** — "Receive notifications via ntfy" (toggle; shows a note "Configure ntfy in Organisation Settings" if org ntfy URL is not set up)
  - On toggle change: immediately calls `PATCH /api/users/me/notification-preferences` (debounced 300 ms)
  - Loading state while fetching current preferences on mount
  - Success/error toast feedback on save
- [x] Preferences are loaded from `GET /api/users/me/notification-preferences` on page init
- [x] Unit tests for the preferences component (mock HTTP service)
- [x] Typecheck and lint pass

---

### TASK-013-010: Frontend — Org Notification Config UI
**Description:** As an Org Admin, I want to configure SMTP and ntfy settings from the Organisation Settings page so that email and ntfy notification channels work for my organisation.

**Token Estimate:** ~40k tokens
**Predecessors:** TASK-013-009
**Successors:** none
**Parallel:** no
**Model:** —

**Acceptance Criteria:**
- [ ] Notification configuration section added to the Org Settings page (Org Admin only):
  - **SMTP section:**
    - Fields: Host, Port (number input), Username, Password (password input, shows "••••••••" if saved), From address, Secure (checkbox — enables TLS; unchecked = STARTTLS)
    - "Save SMTP Settings" button — calls `PATCH /api/organisations/:id/notification-config`
    - "Send test email" button — calls a new endpoint `POST /api/organisations/:id/notification-config/test-email` which sends a test message to the currently authenticated user's email
    - Password field: if a password is already saved, placeholder shows "Saved — leave blank to keep current"; submitting a blank password field preserves the existing password
  - **ntfy section:**
    - Fields: ntfy URL (e.g. `https://ntfy.sh`), Topic, Auth token (optional, password input)
    - "Save ntfy Settings" button
    - "Send test notification" button — calls `POST /api/organisations/:id/notification-config/test-ntfy` which sends a test ntfy push
  - Both sections show success/error toast on save
  - Both sections show current saved values on load (password shown as placeholder only)
- [ ] Backend: add `POST /api/organisations/:id/notification-config/test-email` endpoint — sends a test email to the requesting user's address using the org's SMTP config; returns 200 on success, 422 with error details if SMTP config is incomplete or sending fails
- [ ] Backend: add `POST /api/organisations/:id/notification-config/test-ntfy` endpoint — sends a test ntfy message; returns 200 on success, 422 on failure
- [ ] Unit tests for both test endpoints (mock email provider and HTTP client)
- [ ] Typecheck and lint pass

---

### TASK-013-011: Unit Tests — NotificationHub Integration
**Description:** As the development team, I want integration-level unit tests for the NotificationHub so that the full fan-out logic is verified end to end with all channels mocked.

**Token Estimate:** ~25k tokens
**Predecessors:** TASK-013-003, TASK-013-004, TASK-013-005, TASK-013-006, TASK-013-007
**Successors:** none
**Parallel:** yes — can run alongside TASK-013-008
**Model:** —

**Acceptance Criteria:**
- [ ] Test suite for `NotificationHub.dispatch()` covering:
  - User with all channels enabled and org fully configured → all three channels called
  - User with only in-app enabled → only `InAppNotificationChannel.send()` called
  - Email enabled but org SMTP not configured → email channel skipped, in-app called
  - ntfy enabled but org ntfy URL missing → ntfy channel skipped
  - Multiple users in org with different preferences → each user's channels called independently
  - Channel throws an error → error is caught and logged, other channels still called
- [ ] Test suite for `NotificationEventListener` event handlers:
  - Each event type (`screen.offline`, `screen.online`, `transcoding.complete`, `transcoding.failed`) dispatches the correct `NotificationEvent` payload to the hub
- [ ] All tests use Jest with NestJS testing module; no real DB or HTTP calls
- [ ] Typecheck and lint pass

## Task Dependency Graph

```
TASK-013-001 ──────────────────────────────→ TASK-013-004 ──→ TASK-013-008 ──→ TASK-013-009 ──→ TASK-013-010
     │                                              ↑
     │                                              │
TASK-013-002 ──→ TASK-013-003 ──→ TASK-013-005     │
                      │                             │
                      ├──→ TASK-013-006             │
                      │                             │
                      └──→ TASK-013-007 ────────────┘
                      │
                      └──→ TASK-013-011 (also needs 004, 005, 006, 007)
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-013-001 | ~25k | none | yes (with 002) | — |
| TASK-013-002 | ~35k | none | yes (with 001) | — |
| TASK-013-003 | ~40k | 001, 002 | no | — |
| TASK-013-004 | ~35k | 001, 003 | no | — |
| TASK-013-005 | ~30k | 002, 003 | yes (with 006, 007) | — |
| TASK-013-006 | ~20k | 002, 003 | yes (with 005, 007) | — |
| TASK-013-007 | ~30k | 003 | yes (with 004, 005, 006) | — |
| TASK-013-008 | ~55k | 004 | no | — |
| TASK-013-009 | ~30k | 008 | no | — |
| TASK-013-010 | ~40k | 009 | no | — |
| TASK-013-011 | ~25k | 003, 004, 005, 006, 007 | yes (with 008) | — |

**Total estimated tokens:** ~365k

## Functional Requirements

- FR-1: System events (screen offline, screen online, transcoding complete, transcoding failed) trigger notification dispatch via the NotificationHub
- FR-2: In-app notifications are persisted in the database and pushed to connected clients via Socket.IO in real time
- FR-3: Email notifications are sent via SMTP using credentials configured per organisation
- FR-4: ntfy notifications are sent via HTTP POST to a URL and topic configured per organisation, with optional token authentication
- FR-5: Each user can independently enable or disable each notification channel (in-app, email, ntfy) per organisation
- FR-6: Organisation Admins can configure SMTP credentials and ntfy URL/topic/token from the Org Settings page
- FR-7: The notification bell in the top bar shows a live unread count badge, updated in real time via Socket.IO
- FR-8: The notification dropdown shows the 50 most recent notifications with read/unread status
- FR-9: Users can mark individual notifications or all notifications as read
- FR-10: If a channel is enabled by the user but the org has not configured that channel's credentials, the channel is silently skipped
- FR-11: Channel dispatch errors do not block other channels or fail the originating event handler

## Non-Goals

- No SMS channel
- No webhook channel (beyond ntfy)
- No notification templates or per-event-type channel overrides (all events use the same per-user channel preferences)
- No notification retention/cleanup policy (notifications accumulate indefinitely — a future cleanup job is out of scope)
- No read receipts or delivery status tracking for email or ntfy
- No per-event-type opt-out (users get all event types or none per channel; granular event filtering is a future feature)
- No notification sound or browser push notifications (Web Push API)
- No password encryption at rest for SMTP credentials (noted as a TODO, not implemented in this feature)

## Design Considerations

- **ntfy is org-level, not per-user:** a single ntfy topic per org receives all notifications for that org. The `ntfyEnabled` user preference controls whether the hub fires the ntfy call when processing that user — but in practice, since ntfy is org-scoped, the hub should fire ntfy at most once per event (not once per user). The hub should deduplicate: if any user in the org has `ntfyEnabled: true`, send one ntfy notification per event dispatch. This avoids N duplicate ntfy messages for N users.
- **DashboardGateway per-user rooms:** the existing gateway already uses org rooms. Adding `user:{userId}` rooms is a small, backward-compatible change — existing org-room broadcasts are unaffected.
- **SMTP password handling:** passwords are stored in plaintext in this iteration. A TODO comment should be added in the entity noting that production deployments should use column-level encryption or a secrets manager. The `PATCH` endpoint should treat a blank/absent `smtpPassword` field as "keep existing value" to avoid accidentally clearing a saved password.
- **In-app channel as the default:** all new users get `inAppEnabled: true` by default. Email and ntfy default to `false` to avoid spamming users who haven't configured those channels.

## Technical Considerations

- `NotificationModule` must import `TypeOrmModule.forFeature([Notification, UserNotificationPreference, OrganisationNotificationConfig])`, `HttpModule` (for ntfy), and must have `DashboardGateway` injected (or use EventEmitter to avoid a circular dependency — prefer EventEmitter if gateway import causes circular deps)
- The `DashboardGateway` currently lives in its own module; check if it is exported from that module before importing it into `NotificationModule`. If not, export it and add the gateway's module to `NotificationModule` imports.
- `nodemailer` is a CommonJS package; import it with `import * as nodemailer from 'nodemailer'` or use `createRequire` to avoid ESM interop issues with the NestJS TypeScript build
- The ntfy HTTP call uses `@nestjs/axios` (`HttpService.post()`), which returns an RxJS Observable — use `firstValueFrom()` from `rxjs` to await it
- When `screen.offline` / `screen.online` events are emitted by `ScreenModule`, confirm the payload shape includes `orgId`, `screenId`, `screenName`, and `location`. If not, update the `ScreenService` heartbeat timeout handler to include these fields — this is a minimal, non-breaking addition
- Similarly, confirm `transcoding.complete` / `transcoding.failed` events from `TranscodingModule` include `orgId`, `contentId`, and `contentTitle`
- The test endpoint `POST /api/organisations/:id/notification-config/test-email` should be a thin wrapper: instantiate `SmtpEmailProvider` from saved config, call `sendMail()`, return the result — no notifications are created in the DB for test sends
- Consider rate-limiting the test endpoints (1 request per minute per org) to prevent abuse — a simple in-memory rate limiter or NestJS Throttler is sufficient

## Success Metrics

- A screen going offline triggers a notification for all users in the org who have at least one channel enabled
- In-app notification badge updates without a page refresh within 2 seconds of the event
- SMTP and ntfy test buttons successfully deliver a message when credentials are valid
- Users can configure their channel preferences and those preferences are respected on the next notification dispatch
- The notification dropdown lists recent notifications with correct read/unread state

## Open Questions

1. **ntfy deduplication scope:** Should ntfy fire once per org per event (regardless of how many users have it enabled) or once per user? Recommendation in Design Considerations is once per org — confirm this matches the intended behaviour before implementing TASK-013-003.
2. **`screen.online` notifications:** Users may find online notifications noisy. Should `screen.online` events only trigger notifications if the screen was previously marked offline for more than N minutes? Leaving as-is (always notify) for now — can be refined later.
3. **Email address source:** User email addresses are managed by Hanko (external identity provider). Confirm that the backend stores the user's email in the local `users` table (populated during first login) so `EmailNotificationChannel` can look it up without calling the Hanko API at notification time.
