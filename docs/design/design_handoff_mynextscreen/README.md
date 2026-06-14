# Handoff: myNextScreen — Digital Signage Console (Angular 21 + Tailwind 4)

## Overview
**myNextScreen** is a digital-signage management console. Operators pair displays
("screens"), upload and transcode media, build playlists, schedule content, run
live streams, and review an audit log — all scoped to an **organisation**. A
separate, elevated **Instance Admin** area lets a superuser oversee the whole
instance: every organisation, user, storage allocation, host disk, and live
CPU/RAM load (with transcode-correlated spikes).

This bundle is the design reference for rebuilding that console as a real
**Angular 21 + Tailwind 4** application.

## About the design files
The files in `reference/` are **design references authored in HTML/React (JSX)** —
prototypes that show the intended look, layout, and behaviour. **They are not
production code to copy.** Your job is to **recreate these designs as idiomatic
Angular 21 + Tailwind 4**, using the conventions described in
`angular-architecture.md` and the tokens in `tailwind-theme.css`.

- The JSX is plain function components with inline styles reading CSS variables.
  Treat them as an exact spec for structure, measurements, copy, and states —
  then express them with Tailwind utility classes + Angular components.
- `reference/styles.css` is the source of truth for the design tokens; it has
  already been translated into `tailwind-theme.css` (drop-in).

## Fidelity
**High-fidelity (hifi).** Every screen has final colours, typography, spacing,
radii, shadows, and interaction states. Recreate pixel-faithfully. Exact values
are in `design-tokens.md` and `tailwind-theme.css`; per-component specs are in
`components.md`; per-screen structure is below and in the reference files.

## Target stack & conventions (summary — full detail in `angular-architecture.md`)
- **Angular 21**: standalone components only, **signals** for state
  (`signal`/`computed`/`input()`/`output()`), new control flow (`@if`/`@for`/`@switch`),
  `ChangeDetectionStrategy.OnPush` (ideally zoneless), lazy-loaded feature routes.
- **Tailwind 4**: CSS-first (`@import "tailwindcss"` + `@theme`), **no
  tailwind.config.js**. Theme via `<html data-theme data-accent data-density>`.
- **Icons**: 24×24 line icons, 1.7 stroke, `currentColor`. Reproduce the set in
  `reference/icons.jsx` as an Angular icon component or inline SVGs. (No icon
  font; no emoji.)
- **No external UI kit** — build the small primitive set in `components.md`.

---

## Global layout

### Authenticated shell (`reference/shell.jsx`)
Two-column app shell, full viewport, no body scroll (`height:100vh; overflow:hidden`).

- **Sidebar** (`<aside>`): width **252px**, collapses to **78px**
  (`transition: width .22s cubic-bezier(.22,.61,.36,1)`). `bg-rail`, right border
  `1px var(--border)`.
  - Header (height ≥73px): gradient logo tile 34×34 `rounded-[10px]`
    (`linear-gradient(135deg, var(--accent), var(--accent-2))`) + wordmark
    "my**NextScreen**" (the "NextScreen" half uses the accent gradient as text
    fill). Collapse chevron button 30×30.
  - Nav items: 11px 13px padding, `rounded-[11px]`, 14.5px. Active = `bg-accent-soft`,
    `text-accent`, weight 700, plus a 4×22 gradient pill at `left:-8`. Hover =
    `bg-hover`. Optional count badge on the right.
  - Nav order: Dashboard, Screens, Screen Groups, Content Library, Playlists,
    Schedules, Live Streams, Audit Log, Settings. Logout pinned to the footer.
- **Main column**: `<header>` topbar (height **73px**, sticky, `backdrop-blur(14px)`,
  `bg = color-mix(in srgb, var(--bg) 72%, transparent)`) + scrollable `<main>`
  (`padding: 28px 28px 48px`; inner `max-width:1320px; margin:0 auto`).
  - Topbar: search input (max-width 460, left search icon, right `⌘K` chip),
    spacer, theme toggle (40×40 `rounded-[11px]` bordered), bell (with offline
    dot when alerts>0), 1×30 divider, then the **user menu**.
  - User menu button shows org name + role and a 36px avatar; opens a 280px
    popover (identity header, current-org chip, then actions: **Instance Admin**
    [amber, superuser], Switch organisation, Profile & settings, Log out).

### Responsive collapses (from the prototype)
```
@media (max-width:1100px){ .main-grid{grid-template-columns:1fr} .kpi-row{grid-template-columns:repeat(2,1fr)} .adm-kpi{grid-template-columns:repeat(2,1fr)} .adm-two{grid-template-columns:1fr} }
@media (max-width:560px){ .kpi-row,.adm-kpi{grid-template-columns:1fr} .metric-row{grid-template-columns:repeat(2,1fr)} }
@media (max-width:880px){ .auth-brand{display:none} }
```

---

## Screens / views

> Each screen below lists purpose + layout + the reference file. Components used
> throughout (Card, Btn, Badge, StatusDot, Bar, Ring, Avatar, Count, etc.) are
> specified once in `components.md`. Page header pattern (`PageHeader`): title
> 27px/800/`-0.025em`, sub 14.5px `text-muted`, optional right-aligned actions.

### 1. Login (`reference/auth.jsx`)
- **Purpose**: authenticate; demo just flips an auth flag in `localStorage`
  (`mns_authed`).
- **Layout**: split — left brand panel (hidden < 880px), right form column
  (email, password, submit). Theme/accent tweakable even on this screen.

### 2. Dashboard (`reference/dashboard.jsx`, `dashboard_widgets.jsx`)
Two states driven by a `dataState` flag (`onboarding` | `filled`):
- **Onboarding**: progress banner with a `Ring` (done/4) + 4 `StepCard`s
  (Add screen → Upload content → Build playlist → Schedule & publish). Completing
  all four transitions to the filled dashboard.
- **Populated**: KPI row of 4 `Stat` cards (Screens online, Content items,
  Active playlists, Open alerts — each with a sparkline); main grid
  `minmax(0,1.9fr) minmax(0,1fr)` (live screens grid + Storage donut + Alerts);
  bottom grid `1fr 1fr` (upcoming Schedules + Activity timeline).

### 3. Screens (`reference/pages.jsx`)
Filter pills (All/Online/Warning/Offline with counts) + responsive card grid
(`repeat(auto-fill, minmax(248px,1fr))`) of `ScreenTile`s (thumbnail with status
chip + resolution chip, name, location, now-playing). "Add screen" opens the
pairing modal (`reference/modals.jsx`): code → name → location → orientation →
resolution; then a spinner "pairing" state → success.

### 4. Screen Groups (`reference/groups.jsx`)
Groups of screens with a mini video-wall preview (split/mirror, rows×cols),
member screens, and assigned content.

### 5. Content Library (`reference/content.jsx`)
Media grid/list (images + video) with transcode renditions, size, screens-using,
and which playlists reference each item. Has an empty state.

### 6. Playlists (`reference/playlists.jsx`)
Playlist cards (item count, duration, screens, colour). Drag-reorder editing.

### 7. Schedules (`reference/schedules.jsx`)
Time-anchored schedule entries (time, day, target, playlist, colour, "in N h").

### 8. Live Streams (`reference/streams.jsx`)
Stream cards with simulated monitor (animated sweep/scan/VU), protocol (RTMP/HLS/SRT),
quality/fps/bitrate/latency, target (screens/groups/all), live/connecting/offline.

### 9. Audit Log (`reference/audit.jsx`)
Filter bar (search + Action/User/Type selects + From/To dates), grouped table with
day dividers, colour-coded action badges, expandable detail rows, pagination (12/page),
Export CSV. Custom `Select` and `DateField` controls. Empty state when unseeded.

### 10. Settings (`reference/settings.jsx`)
Tabbed (underline tab bar): **User Management** (seat summary + users table with
inline role select + remove/revoke + Invite modal), **Notification Config** (SMTP
card + ntfy card + alert-rules toggles), **Storage** (originals/transcoded bars +
summary stats). Reusable form primitives `SInput`, `SField`, `Switch`, `ToggleRow`.

### 11. Profile & settings (`reference/profile.jsx`)
Personal account: name, email, gravatar toggle, notification channels.

### 12. ⭐ Instance Admin (`reference/admin.jsx` + `admin_data.jsx`) — elevated mode
Entered from the user-menu "Instance Admin" item; renders a **distinct full-screen
shell** (its own sidebar + topbar). **Amber (`#f5a623` → `#f97316`)** is the only
"elevated/instance" signal — sidebar active item, header icon tile, topbar identity
chip ("Superuser"), and the per-user "Superuser" badge. Everything else uses the
normal tokens (content tabs keep the indigo accent underline).

- **Sidebar**: "SYSTEM" label, single amber-active **Instance Admin** item,
  **Back to workspace**, footer version + `stable` channel dot, Logout.
- **Topbar**: search ("Search organisations, users…"), theme toggle, bell, divider,
  amber identity chip (name + "Superuser") with avatar.
- **Header**: ← **Back** button + amber icon tile + "Instance Admin" title + sub.
- **Tabs** (underline, indigo accent): Dashboard · Organisations · Users · Audit Log.
  The right-aligned page action changes per tab (New organisation / Invite user /
  Export CSV).

**Dashboard tab** (top → bottom):
1. **KPI row** (4 `StatTile`): Organisations (2 · "1 Business · 1 Trial"),
   Users (dual readout: **2** Verified green / **1** Pending amber + "3 total"
   pill), Screens (10 · "7 online across instance"), Host disk free (389.2 GB ·
   "of 474.4 GB · 18.0% used").
2. **Storage — Allocated vs Used** (`minmax(0,1.55fr)`) + **Host Disk**
   (`minmax(0,1fr)`):
   - Storage: "All organisations" badge; two labelled bars — Originals
     **183.9 MB / 6.0 GB · 3.0%** (info colour), Transcoded **75.1 MB / 6.0 GB ·
     1.2%** (accent-2); then a 2-col per-org legend (ExampleOrg 213.3 MB used · 6 GB,
     TestOrg2 45.7 MB used · 6 GB).
   - Host Disk: `/app/media` badge; `Ring` 18% + Used 85.2 GB / Free 389.2 GB +
     bar + "389.2 GB free of 474.4 GB".
3. **System load** (full width) — see "System load chart" below.
4. **Organisations snapshot** (`1.55fr`, per-org usage bar rows) + **Instance**
   (`1fr`, Health=Healthy badge, Version v2.8.1·stable, Uptime, Region, Last backup).

**System load chart** (the most recent addition):
- Card "System load" / "CPU & memory · last 24 hours" with an amber
  "Transcode peaks shaded" badge.
- Two readouts: **CPU · 8 cores → 34%** (peak 89%) and **Memory · 16 GB → 60%**
  (9.6 GB · peak 11.5 GB).
- A single **uniformly-scaled SVG** (`viewBox 0 0 1000 240`, `width:100%`,
  `height:auto`): 0/25/50/75% + 100% gridlines (dashed except baseline) with
  0/50/100% y-labels; **CPU** = solid accent line + gradient area fill; **Memory**
  = dashed `info` line drawn on top (so it stays visible); end-dots for current
  values; x-axis ticks "24h ago · 18h · 12h · 6h · now".
- **Transcode windows** are shaded `accent-soft` rectangles behind the series
  (data: `LOAD.transcodeWindows` index ranges) — this is the whole point: CPU
  spikes to ~84–89% inside them while RAM climbs and holds. Data arrays
  (`cpu[]`, `ram[]`, 25 hourly samples) are in `reference/admin_data.jsx`.

**Organisations tab**: table — Organisation (avatar + name + plan badge + owner),
Users, Screens (online/total with status dot), Storage (mini bar + "used / N GB · %"),
Created, Manage action. Header action "New organisation".

**Users tab**: 4-metric summary strip (Total / Verified / Pending / Instance admins),
then table — User (avatar + name + amber "Superuser" badge if instanceAdmin + email),
Organisation chip, Role badge, Status (Verified green / Pending amber), Last active,
action (⋯ for verified, "Resend" for pending). Header action "Invite user".

**Audit Log tab** (instance-scoped — org-level events stay in the per-org log):
table — Timestamp (time + relative), Actor (amber avatar or system gear), Action
badge (colour-coded), Organisation (or "Instance"), Detail (resource + sub-detail).
Header action "Export CSV".

---

## Interactions & behaviour
- **Routing**: sidebar nav swaps the main view. Instance Admin is a separate
  top-level mode (full shell replacement), entered from the user menu and exited
  via "Back" / "Back to workspace".
- **Theme/accent/density**: reflected on `<html>` (`data-theme`, `data-accent`,
  `data-density`); theme toggle in both topbars. All colours/gaps come from tokens.
- **Tabs**: underline tab bar; active tab gets a 2px `border-accent` bottom + `text`
  colour, inactive `text-muted`. Switching fades content in (`fadeIn .25s`).
- **Hovers**: buttons translateY(-1px) + brightness(1.06); cards (hover variant)
  lift translateY(-2px) + `shadow-lg` + `border-strong`; nav/menu items → `bg-hover`.
- **Animations**: card entrance `fadeUp .5s cubic-bezier(.22,.61,.36,1)` with small
  per-card delays; status dots `pulseDot 1.8s`; pairing spinner `spin .8s`; success
  `ringPulse 1.2s`. **Important:** make the visible end-state the default and animate
  *from* hidden — never leave content stuck at `opacity:0` if the animation doesn't
  run (SSR, print, reduced-motion). Honour `prefers-reduced-motion`.
- **Toasts**: bottom-right stack, auto-dismiss ~3.4s, tone-coloured icon (online/
  warn/accent), title + optional desc.
- **Counts**: KPI numbers count up (~900ms cubic ease-out) via the `Count` helper.
- **Modals/overlays**: fixed, `rgba(4,6,11,.55)` + `backdrop-blur(6px)`, centered,
  `Esc`/backdrop to close, content `fadeUp .3s`.

## State management (Angular signals)
- `theme`, `accent`, `density` — signals synced to `<html>` attributes (persist to
  localStorage).
- `authed` — boolean signal (demo persists `mns_authed`).
- `route` / current feature — router state; `adminMode` is its own route/mode.
- `org` + `orgs` — current organisation context (the per-org screens use it).
- `dataState` (`onboarding`|`filled`) → derives the seeded collections (screens,
  content, playlists, schedules, activity, alerts).
- Instance Admin reads `ADMIN_MOCK` (orgs, users, host disk, meta, **LOAD** for the
  CPU/RAM chart, audit). Replace mocks with real services/HTTP later.
- Toasts: a signal array with timed removal.

## Design tokens
See `design-tokens.md` for the complete table and `tailwind-theme.css` for the
drop-in. Headlines: fonts Hanken Grotesk / JetBrains Mono; radii 8/12/16/22;
status online `#2ecc71` / warn `#f5a623` / offline `#ef4757` / info `#3b9dff`
(+14% dim bgs); accent palettes indigo (default)/teal/amber/blue; dark + light
surface/text/border ramps; density gap 14/20/26 & card-pad 16/22/28; elevated
amber `#f5a623`→`#f97316`.

## Assets
- **Fonts**: Hanken Grotesk + JetBrains Mono (Google Fonts in the prototype) — load
  via `<link>` or self-host.
- **Icons**: inline SVG set in `reference/icons.jsx` (24×24, 1.7 stroke,
  currentColor). Recreate as an Angular component; no icon font.
- **Avatars**: deterministic SVG identicon (Gravatar-style) generated from an
  email/name hash (`Identicon`), or gradient initials (`Avatar`). No external image
  service.
- **Thumbnails / stream monitors / video-wall previews**: pure CSS gradients +
  keyframe animations (no bitmap assets).
- No raster images or brand assets ship with the design — everything is code-drawn.

## Files (in `reference/`)
- `myNextScreen Prototype.html` — entry; lists script load order.
- `styles.css` — tokens + base + keyframes (source for `tailwind-theme.css`).
- `icons.jsx` — icon set. `components.jsx` — UI primitives. `data.jsx` — app mock data.
- `shell.jsx` — sidebar/topbar/user-menu. `auth.jsx` — login. `modals.jsx` — overlay,
  add-screen modal, toasts.
- `dashboard.jsx`, `dashboard_widgets.jsx` — dashboard + widgets.
- `pages.jsx`, `groups.jsx`, `content.jsx`, `playlists.jsx`, `schedules.jsx`,
  `streams.jsx`, `audit.jsx`, `settings.jsx`, `profile.jsx` — feature views.
- `admin.jsx` + `admin_data.jsx` — **Instance Admin** (shell, 4 tabs, system-load chart).
- `app.jsx` — root: routing, theme sync, modal/toast hosts, adminMode wiring.
- `tweaks-panel.jsx` — prototype-only tweak panel (NOT part of the product; ignore).

## Companion docs in this bundle
- `tailwind-theme.css` — paste into `src/styles.css`.
- `design-tokens.md` — every token value.
- `components.md` — primitive catalog with props, sizes, and Tailwind equivalents.
- `angular-architecture.md` — Angular 21 project structure, signals patterns,
  routing, theming, the icon/chart approach.
- `CLAUDE.md` — working instructions for Claude Code in the target repo.
