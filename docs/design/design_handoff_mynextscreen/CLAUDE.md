# CLAUDE.md — Working instructions for Claude Code

You are implementing the **myNextScreen** digital-signage console in a real
**Angular 21 + Tailwind 4** codebase, from the design references in this handoff
bundle.

## Read first (in this folder)
1. `README.md` — what the product is, every screen, interactions, state.
2. `design-tokens.md` + `tailwind-theme.css` — the exact design tokens (drop-in).
3. `components.md` — the primitive catalog (build these first).
4. `angular-architecture.md` — project structure, signals/routing/theming patterns.
5. `reference/` — the HTML/JSX prototypes = the precise visual spec.

## Golden rules
- The files in `reference/` are **design references, not code to copy**. Recreate
  the designs as idiomatic Angular 21 + Tailwind 4. The JSX uses inline styles
  reading CSS vars — translate those to Tailwind utilities + components.
- **This is high-fidelity.** Match colours, type, spacing, radii, shadows, and
  interaction states exactly. When unsure of a value, open the relevant
  `reference/*.jsx` and read it — don't guess.
- If the repo already has conventions (lint rules, folder layout, a UI library),
  **follow them** and adapt these docs. If it's empty, scaffold per
  `angular-architecture.md`.
- Use the bundle's `tailwind-theme.css` as `src/styles.css` so every token,
  theme, and accent works out of the box. Don't invent new colours.

## Angular conventions (non-negotiable)
- Standalone components only; **signals** for state (`signal`/`computed`/`effect`,
  `input()`/`output()`/`model()`); **new control flow** (`@if`/`@for`/`@switch`);
  `ChangeDetectionStrategy.OnPush`; lazy feature routes. Prefer **zoneless**.
- No NgModules. No jQuery. No emoji. No icon fonts (port the SVG icon set).
- Keep components small and composable; the UI primitives in `components.md` are
  shared building blocks — build them once under `app/ui/`.

## Theming
- Theme/accent/density are **`<html>` attributes** (`data-theme`, `data-accent`,
  `data-density`) driven by a `ThemeService` (signals + `effect` + localStorage).
- Because semantic tokens switch via the attribute, just use `bg-surface`,
  `text-muted`, `border-border`, `text-accent`, etc. — do **not** sprinkle `dark:`
  variants.
- **Instance Admin amber** (`#f5a623`→`#f97316`, `elevated-soft`) is for instance
  chrome ONLY (its sidebar active item, header tile, topbar identity chip,
  "Superuser" badges). Content tabs/cards keep the normal accent.

## Build order (suggested)
1. `tailwind-theme.css` + fonts + `<html>` attrs; confirm dark/light/accent switch.
2. `IconComponent` (port `reference/icons.jsx`).
3. UI primitives: Card, CardHead, Btn, Badge, StatusDot, Bar, Ring, Avatar/
   Identicon/UserAvatar, Count, Empty, PageHeader, Select, Switch, Overlay, ToastHost.
4. Layout: app-shell (sidebar + topbar + user-menu) + ThemeService + AuthService + routing.
5. Features in priority order: Dashboard → Screens → Settings → Audit → the rest.
6. **Instance Admin** (its own shell + 4 tabs + `LoadGraph` chart). Data from
   `reference/admin_data.jsx`.

## Definition of done (per screen)
- Visual diff vs the matching `reference/*.jsx` (layout, spacing, type, colour) is
  faithful in both dark and light themes and at the documented breakpoints
  (1100px, 880px, 560px).
- Interaction states present: hover/active/focus, loading, empty, error where
  applicable; overlays close on `Esc`/backdrop; tabs/filters work.
- Entrance animations never leave content invisible; `prefers-reduced-motion`
  respected.
- No console errors; `OnPush`/signals used; no NgModule introduced.

## Data
Mock data lives in `reference/data.jsx` and `reference/admin_data.jsx`. Port to
typed services that return signals; keep the same shapes so screens bind cleanly.
The Instance-Admin `LOAD` object (cpu[]/ram[]/transcodeWindows/cores/ramTotalGB)
feeds the CPU/RAM chart — later back it with a metrics endpoint polled for the
last 24h.

## Out of scope
- `reference/tweaks-panel.jsx` and the prototype's tweak controls are **prototype
  tooling, not product** — ignore them.
- The auth flow is a demo flag (`mns_authed`); wire to real auth when the backend
  exists.
