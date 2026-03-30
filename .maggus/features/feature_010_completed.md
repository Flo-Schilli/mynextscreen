# Feature 010: Dashboard & App Shell

## Introduction

Build the application shell (sidebar, top bar, layout) and the dashboard overview page — the "first working page" that gives a control-room view of screen status, storage usage, upcoming schedule, and recent activity.

### Architecture Context

- **Vision alignment:** "Sidebar navigation — collapsible, dark-themed", "top bar — organisation switcher, notification bell, global search", "screen status grid", "storage usage bar", "upcoming schedule timeline", "recent activity feed"
- **Components involved:** Frontend shell (new), DashboardGateway (new — Socket.IO gateway for real-time), all backend modules (read-only queries)
- **New patterns:** Socket.IO WebSocket gateway, real-time dashboard updates, responsive layout

## Goals

- App shell with collapsible sidebar, top bar with org switcher, and main content area
- Dashboard overview: screen status grid, storage bar, upcoming schedule, recent activity
- Real-time updates via Socket.IO (screen status changes, transcoding events)
- Organisation switcher for users with multiple org memberships
- Responsive: full desktop layout, tablet-friendly, monitoring-only on mobile

## Tasks

### TASK-010-001: App Shell — Sidebar & Top Bar
**Description:** As a user, I want a consistent navigation shell so that I can access all sections of the application.

**Token Estimate:** ~55k tokens
**Predecessors:** none
**Successors:** TASK-010-003, TASK-010-004
**Parallel:** yes — can run alongside TASK-010-002

**Acceptance Criteria:**
- [x] App layout component with three zones: sidebar, top bar, main content area (router outlet)
- [x] **Sidebar:**
  - Links: Dashboard, Screens, Content Library, Playlists, Schedules, Audit Log, Settings
  - Collapsible: toggle button collapses to icon-only mode
  - Dark-themed with active route highlighting
  - On mobile: hidden by default, hamburger menu toggles it as an overlay
- [x] **Top bar:**
  - Organisation switcher (dropdown) — fetches user's memberships, switches `X-Organisation-Id` header
  - Current user avatar/initial circle
  - Notification bell with unread badge (placeholder — badge always 0 until notifications feature)
  - Global search input (placeholder — functional search in a future iteration)
- [x] **Main content area:** full-width, renders routed components
- [x] Sidebar state (collapsed/expanded) persisted in localStorage
- [x] Selected organisation persisted in localStorage, loaded on app init
- [x] Dark mode as default, light mode toggle in top bar (CSS custom properties switch)
- [x] Responsive: sidebar collapses on tablet, becomes hamburger on mobile
- [x] ⚠️ BLOCKED: Verify in browser: sidebar navigates between routes, org switcher works, collapses correctly on resize — requires running dev server with backend; automated build verification passed

### TASK-010-002: Dashboard Gateway (Socket.IO Backend)
**Description:** As the system, I want a WebSocket gateway so that the dashboard receives real-time updates without polling.

**Token Estimate:** ~40k tokens
**Predecessors:** none
**Successors:** TASK-010-003
**Parallel:** yes — can run alongside TASK-010-001

**Acceptance Criteria:**
- [x] `DashboardGateway` — NestJS WebSocket gateway using Socket.IO
- [x] JWT authentication on connection: validate Hanko JWT from handshake auth, reject invalid tokens
- [x] On connection: client joins a room named by their current `organisationId`
- [x] Listen for internal events (via NestJS EventEmitter):
  - Screen status change (`screen.online`, `screen.offline`) → emit to org room
  - Transcoding progress (`transcoding.progress`) → emit to org room
  - Transcoding complete/failed (`transcoding.complete`, `transcoding.failed`) → emit to org room
  - Schedule change (`schedule.updated`) → emit to org room
- [x] Event payload format: `{ type: string, data: any, timestamp: string }`
- [x] Unit tests for room assignment and event routing
- [x] Typecheck and lint pass

### TASK-010-003: Dashboard Overview Page
**Description:** As a user, I want a dashboard overview so that I can see the status of screens, storage, schedule, and recent activity at a glance.

**Token Estimate:** ~80k tokens
**Predecessors:** TASK-010-001, TASK-010-002
**Successors:** TASK-010-004
**Parallel:** no
**Model:** opus

**Acceptance Criteria:**
- [x] `/dashboard` route (default after login) with four sections:
- [x] **Screen Status Grid:**
  - Colour-coded tiles: green (online), red (offline), grey (never connected)
  - Each tile shows screen name and location
  - Tiles update in real time via Socket.IO (no page refresh)
  - Clicking a tile navigates to the screen detail page
- [x] **Storage Usage Bar:**
  - Horizontal bar showing original and transcoded usage as stacked segments
  - Labels: used/total for each, percentage
  - Warning colour if usage > 80%, danger colour if > 95%
- [x] **Upcoming Schedule Timeline:**
  - Next 24 hours, showing scheduled playlists per screen as a compact timeline
  - Colour-coded by playlist, screen name as row label
  - Gaps shown with fallback indicator
- [x] **Recent Activity Feed:**
  - Last 20 audit log entries (from feature 011, or direct query if 011 isn't done yet)
  - Each entry: timestamp, user, action description
  - Auto-updates via Socket.IO for new entries
- [x] All sections load data from existing API endpoints
- [x] Dark-themed, card-based layout with consistent spacing
- [x] Responsive: sections stack vertically on tablet/mobile
- [x] ⚠️ BLOCKED: Verify in browser: all four sections render with real data, screen tiles update when status changes — requires running dev server with backend; automated build verification passed

### TASK-010-004: Organisation Switcher Logic
**Description:** As a user with multiple org memberships, I want to switch between organisations so that I see data for the correct organisation.

**Token Estimate:** ~25k tokens
**Predecessors:** TASK-010-001, TASK-010-003
**Successors:** none
**Parallel:** no

**Acceptance Criteria:**
- [x] On app init: fetch user's memberships via `GET /api/users/me/memberships`
- [x] `GET /api/users/me/memberships` endpoint returns list of orgs with roles (add to UserModule if not exists)
- [x] Org switcher dropdown shows org names with the user's role in each
- [x] Switching org: updates `X-Organisation-Id` on all subsequent API calls, reconnects Socket.IO to new room, reloads dashboard data
- [x] If user has only one org: switcher shows it but isn't interactive
- [x] Selected org persisted in localStorage; on reload, auto-selects it
- [x] If stored org is no longer valid (membership removed): fall back to first available org
- [x] Unit test for backend endpoint
- [x] ⚠️ BLOCKED: Verify in browser: switching org refreshes all dashboard data — requires running dev server with backend; automated build verification passed

## Task Dependency Graph

```
TASK-010-001 ──→ TASK-010-003 ──→ TASK-010-004
TASK-010-002 ──┘
```

| Task | Estimate | Predecessors | Parallel | Model |
|------|----------|--------------|----------|-------|
| TASK-010-001 | ~55k | none | yes (with 002) | — |
| TASK-010-002 | ~40k | none | yes (with 001) | — |
| TASK-010-003 | ~80k | 001, 002 | no | opus |
| TASK-010-004 | ~25k | 001, 003 | no | — |

**Total estimated tokens:** ~200k

## Functional Requirements

- FR-1: The app shell provides consistent navigation across all pages
- FR-2: The sidebar is collapsible and responsive (hamburger on mobile)
- FR-3: The organisation switcher lets users switch between their orgs
- FR-4: The dashboard shows screen status, storage usage, upcoming schedule, and recent activity
- FR-5: Screen status tiles update in real time via WebSocket
- FR-6: Storage usage bar shows original and transcoded usage with warning thresholds
- FR-7: The dashboard is the default page after login

## Non-Goals

- No functional global search (placeholder only — full search in a later feature)
- No notification delivery (bell is a placeholder with badge = 0)
- No dashboard customisation (fixed layout)
- No live preview thumbnails on screen tiles

## Design Considerations

- Use a CSS grid or flexbox layout for the dashboard sections: 2x2 on desktop, 1-column stack on mobile
- Screen status grid: CSS grid with auto-fill, responsive tile sizing
- Storage bar: HTML/CSS progress bar with Tailwind utilities (no charting library needed)
- Timeline: simple HTML table or custom CSS grid — keep it lightweight

## Technical Considerations

- Socket.IO connection should reconnect automatically on network interruption
- The organisation switcher needs to be a global state (Angular service or signal) that all components react to
- Dashboard data should load in parallel (multiple API calls on page init)
- The recent activity feed may not have data until feature 011 (audit log) is implemented — show "No recent activity" gracefully
- Consider using Angular's `@defer` for lazy-loading dashboard sections

## Success Metrics

- A user logs in and sees a functional dashboard with real data
- Screen status updates are visible within seconds of a heartbeat change
- Organisation switching reloads all data without a full page refresh

## Open Questions

None — all resolved.
