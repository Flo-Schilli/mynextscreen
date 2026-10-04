# myNextScreen

A **multi-tenant digital signage platform** for concert venues. Organisations manage screens (TVs) distributed across their venue, upload and transcode images and videos into a shared content library, build playlists, schedule them across screens, and stream live video — all controlled from an Angular web dashboard. Screens communicate via a **protocol abstraction layer** (JSON over HTTP + SSE as the first implementation), designed to support additional protocols such as SMIL in the future.

## Core Concepts

### Organisations

- Created two ways: a **super-admin** provisions one, or someone signs up and gets their own with themselves as Org Admin. Self-signup is a feature flag (`SIGNUP_ENABLED`); a closed instance turns it off and provisions by hand
- A self-created organisation starts with default storage limits and cannot be used until the address is verified; never-verified sign-ups and their orphaned organisation are deleted again after a day
- Each organisation is fully isolated: own screens, content, playlists, schedules, and users
- An organisation maps to a single venue (or logical unit)
- Each organisation has a configurable **default/fallback playlist** shown when no playlist is scheduled
- **Storage limits** are enforced per organisation, separately for original files and transcoded files
- All screens within an organisation share a single **time zone** (tied to the venue's physical location)

### Users & Roles

- Authenticated via **internal auth** (email + password)
- A user can belong to **multiple organisations**, with a separate role per organisation
- Three roles per organisation:
  - **Org Admin** — full control within the organisation (users, screens, content, schedules, live streams)
  - **Editor** — manage content, playlists, schedules, and live streams; no access to user or screen management
  - **Viewer** — read-only dashboard access
- Super-admin is a separate system-level role, not tied to an organisation
- Each user configures their own **notification preferences** (in-app, email, ntfy — independently toggleable)

### Screens

- A screen enrols itself: the player shows a **six-digit pairing code**, and an Org Admin claims it while adding the screen with
  - Name / label
  - Resolution or aspect ratio
  - Physical location description (e.g. "Main Hall Entrance Left")
- The credential handed back is exchanged once for a session. Nothing long-lived stays on the display, and nobody ever copies a key around.
- Screens authenticate every request with a **short-lived access token**, renewed through a rotating refresh token. Losing a screen means re-pairing it, not rotating a key that never expires.
- Screens communicate via a **protocol abstraction layer** (JSON over HTTP + SSE is the first implementation; architecture allows adding more, e.g. SMIL)
  - On startup, the screen **pulls** its full state from the server
  - Afterwards, the server **pushes** updates in real time via SSE
- Each screen sends a **heartbeat** to report online/offline status
- Media URLs are signed rather than credentialed and stay stable for at least a day, so ordinary HTTP caching keeps a display playing through a short outage
- A screen that cannot reach the server keeps retrying with its own credentials instead of demanding attention; it recovers by itself when the server comes back

### Screen Groups

- Screens can be grouped for synchronised playback
- Two modes:
  - **Mirror mode** — all screens in the group display identical content, frame-synced
  - **Split mode (video wall)** — the admin defines a grid layout (e.g. 2x2, 3x1) and assigns each screen a row/column position; the server automatically slices content to fit each screen's portion; transitions and playback are frame-synced across the group
- Live streams on a group always display the same feed on all screens (mirror behaviour), even in split mode
- A screen can belong to at most one group

### Content Library

- Per-organisation library of uploaded images and videos
- Metadata per item: title, description, tags/categories, target resolution/format
- On upload, the server **transcodes** to a single target format optimised for playback
  - Default video format: **H.264 MP4**
  - Default image format: **WebP** (with JPEG fallback)
- **Original files are kept** alongside transcoded versions (allows re-transcoding if target formats change)
- Transcoded files are stored on the **filesystem**, not in the database
- Storage usage is tracked and enforced against per-organisation limits (original and transcoded separately)
- Re-uploading a content item **overwrites** the previous version (no versioning)

### Playlists

- Ordered list of content items from the library
- Each item has a **display duration** (relevant for images; videos play their full length)
- Playlists are reusable and can be assigned to multiple screens or groups

### Schedules

- **Calendar-style interface** (day / week / month views) — similar to Google Calendar
- Each screen or screen group has its own calendar
- Playlists are added by clicking a time slot or dragging to select a time range, then picking a playlist from a dropdown
- Playlist blocks are **resizable** by dragging edges (adjust start/end time) and **movable** by drag-and-drop to a different slot
- Colour-coded blocks per playlist for quick visual identification
- Visual indicators for **gaps** in the schedule (highlighted in a subtle warning colour, showing that the fallback playlist will play)
- **Recurring schedules** — option to repeat a playlist block daily, weekly, or on specific weekdays
- Side panel showing a summary of the selected day's schedule as a simple timeline list
- No overlapping time slots allowed
- If no playlist is scheduled for the current time, the organisation's **default/fallback playlist** is shown

### Live Streams

- A live stream is a separate mode, **not** part of a playlist
- Admin or Editor provides a stream URL; the source is checked before use, so it cannot be pointed at the server's own network
- The server ingests it with **FFmpeg**, transcodes to **HLS**, and serves the segments to the target screen(s)
- Activating a live stream on a screen overrides the current playlist/schedule
- When the stream source stops, the screen **automatically falls back** to the scheduled playlist

### Audit Log

- All significant actions are recorded from the start:
  - Content uploads, deletions, and replacements
  - Playlist creation, modification, and deletion
  - Schedule changes
  - Live stream activation and deactivation
  - Screen pairing, re-pairing, and status changes
  - User role changes and invitations
- Each entry records: timestamp, user, organisation, action, and affected resource
- Viewable by Org Admins within their organisation; super-admin sees all

### Notifications & Monitoring

- The system tracks screen online/offline status via heartbeat
- Three notification channels:
  - **In-app** — badge/alert in the dashboard
  - **Email** — SMTP, configured per organisation. Account mail (verification, invitations, password resets) goes through the instance's own mail settings instead, so a broken organisation config can never lock someone out of their account
  - **ntfy** — configurable URL and token per organisation, stored encrypted when the instance has an encryption key
- Each user configures which channels they receive notifications on

## Admin Panel

### Layout

- **Sidebar navigation** — collapsible, dark-themed, always visible on desktop; hamburger menu on mobile
- **Top bar** — organisation switcher (dropdown), current user avatar, notification bell with unread badge, global search
- **Main content area** — full-width, card-based layouts with consistent spacing

### Navigation Structure

- **Dashboard** — overview landing page
  - Screen status grid: colour-coded tiles (green = online, red = offline, grey = unregistered) with screen name and location
  - Storage usage bar (original / transcoded against limit)
  - Upcoming schedule timeline (next 24h)
  - Recent activity feed (uploads, schedule changes, screen events)
- **Screens** — list/grid view of all registered screens
  - Detail view: live preview thumbnail (if supported), status, heartbeat history, assigned group, current playlist, re-pairing
  - Register new screen form
- **Screen Groups** — list of groups with mode indicator (mirror / split)
  - Visual grid editor for split mode: drag screens onto a grid layout, assign row/column positions
  - Preview of how content will be sliced across the wall
- **Content Library** — grid view with thumbnails, filterable by tags/categories
  - Upload area with drag-and-drop, showing transcoding progress
  - Detail view: preview, metadata editing, transcoding status, file sizes (original + transcoded)
- **Playlists** — list of playlists
  - Playlist editor: drag-and-drop reordering of items, per-item duration input, total duration display, inline preview
- **Schedules** — calendar view (day / week / month)
  - Drag-and-drop playlist blocks onto time slots per screen or group
  - Colour-coded by playlist, visual gap detection (shows where fallback would activate)
  - Recurring schedule support (daily, weekly, specific weekdays)
  - Side panel with day summary as a timeline list
- **Live Streams** — list of configured stream sources
  - One-click activate/deactivate per screen or group
  - Stream health indicator
- **Audit Log** — searchable, filterable log of all actions within the organisation
- **Settings** (Org Admin only)
  - Organisation details and time zone
  - User management: invite, assign roles, remove
  - Default/fallback playlist selection
  - Storage limits display
  - Notification channel configuration (email service, ntfy URL/token)
- **User Settings** (all roles)
  - Personal notification preferences (toggle per channel)
  - Organisation switcher / list of memberships

### Design Principles

- **Dark mode first** — optimised for control-room and backstage environments; light mode available
- **Status at a glance** — screen health and schedule state visible without drilling down
- **Bulk actions** — multi-select on screens, content, and playlists for assign/delete/tag operations
- **Real-time updates** — dashboard and screen status update live via push (no manual refresh)
- **Responsive** — usable down to phone width for on-site work, with the schedule calendar falling back to a list where a grid would not fit

## Tech Stack

- **Frontend:** Angular 22, Tailwind CSS v4, PostCSS
- **Backend:** NestJS, Drizzle ORM, PostgreSQL
- **Authentication:** internal email + password — JWT access cookie + Redis refresh tokens (users), pairing code + rotating session tokens (screens)
- **Storage:** Filesystem for transcoded and original media; PostgreSQL for everything relational, including screen sessions
- **Screen protocol:** JSON over HTTP + SSE (protocol abstraction layer; extensible to additional protocols such as SMIL)

> **Status.** Everything above is built, with one exception: the protocol
> abstraction exists and has exactly one implementation, the JSON adapter. SMIL
> is what the abstraction was designed for, not something that ships today.
