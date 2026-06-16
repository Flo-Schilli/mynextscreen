# Frontend-Redesign „myNextScreen" — Adoption des Design-Handoffs

## Context

In `docs/design/design_handoff_mynextscreen/` liegt ein vollständiges, hochauflösendes
(„hifi") Design-Handoff für die Admin-Konsole — von Claude Design erstellt. Es
beschreibt ein neues Token-System (Tailwind 4 CSS-first), eine UI-Primitive-Bibliothek,
neue Shell/Topbar/Sidebar, einen amber-akzentuierten Instance-Admin-Bereich und alle
Feature-Views — inkl. exakter Farben, Typo, Abstände, Radii, Schatten und
Interaktions-States. Die `reference/*.jsx` sind **Design-Referenzen (kein Copy-Paste)**;
sie sind als idiomatisches Angular 21 + Tailwind 4 nachzubauen.

Das bestehende `apps/frontend` ist **funktional vollständig**: alle Features, Services,
Signals, Routing, Guards und echte Backend-Anbindung existieren. Daher ist dies ein
**Re-Skin / Design-System-Adoption**, kein Rebuild: Funktion, Services, HTTP-Wiring,
Guards und Routen bleiben erhalten — die **Präsentationsschicht** (Tokens, Templates,
neue UI-Primitive, Icons, Shell-Chrome) wird ersetzt. Die Mock-Daten aus dem Handoff
(`reference/data.jsx`, `admin_data.jsx`) dienen nur als Form-Referenz; wir binden an die
**bestehenden echten Services**.

**Outcome:** Pixel-treue Umsetzung des neuen Designs in Hell/Dunkel, mit umschaltbaren
Accent-Paletten und Dichte, ohne Funktionsverlust.

### Entscheidungen (mit dem User abgestimmt)
- **Instance-Admin:** In-place restylen mit amber-Chrome. Bestehende `/admin/*`-Routen
  (verschachtelt in der Haupt-Shell, `superAdminGuard`) **bleiben** — KEINE separate
  Top-Level-Shell. Amber wird nur als Chrome-Signal für die Admin-Views/Topbar-Chip/
  „Superuser"-Badges eingesetzt.
- **Theming:** Voller Umfang — Theme (hell/dunkel) + Accent (indigo/teal/amber/blue) +
  Density (compact/regular/comfy), mit Picker-UI.
- **Vorgehen:** Phasiert — erst Fundament, dann Screens nach Priorität.
- **Scope:** `apps/frontend` (Admin) vollständig; `apps/player` an das neue Token-System
  angleichen (Basis-Tokens/Fonts/Farben, kein voller Screen-Rebuild).

---

## Phase 0 — Fundament (Tokens, Fonts, Theming)

1. **`apps/frontend/src/styles.css` ersetzen** durch die Drop-in
   `docs/design/.../tailwind-theme.css` (Tailwind-4 CSS-first: `@import "tailwindcss"`
   + `@theme` + `@theme inline`, `[data-theme]`/`[data-accent]`/`[data-density]`,
   Keyframes). Die aktuelle 384-Zeilen `styles.css` nutzt andere Token-Namen
   (`--color-bg-primary` etc.) und `@layer components`-Klassen (`.btn`, `.modal`,
   `.table-container`, …). Diese Altklassen **temporär behalten** (ans neue Token-System
   anpassen oder unten anhängen), bis die jeweiligen Screens auf UI-Primitive migriert
   sind — dann schrittweise löschen. So bleibt die App während der Migration lauffähig.
2. **Fonts** in `apps/frontend/src/index.html`: Hanken Grotesk (400–800) + JetBrains Mono
   (400–600) per Google-Fonts-`<link>` (preconnect). Initiale `<html>`-Attribute setzen:
   `data-theme="dark" data-accent="indigo" data-density="regular"`.
3. **`ThemeService` umbauen** (`apps/frontend/src/app/shell/theme.service.ts`):
   Statt `.light`-Klasse → Signals `theme`/`accent`/`density`, via `effect()` auf
   `document.documentElement.dataset` gespiegelt + `localStorage` (Migration des alten
   `signage_theme`-Keys: `light`→theme, sonst Defaults). API: `toggle()`,
   `setAccent()`, `setDensity()`. Bestehende `isDark()`-Konsumenten (Topbar-Toggle)
   anpassen.

## Phase 1 — UI-Primitive-Bibliothek (`apps/frontend/src/app/ui/`)

Neue, standalone, `OnPush`, signal-`input()`-basierte Primitive (Prefix `mns-`), exakt
nach `components.md`/`design-tokens.md`. Genau **einmal** bauen, dann überall verwenden:

- **Basis:** `IconComponent` (Port `reference/icons.jsx` → ein Inline-`<svg>`,
  24-viewBox, stroke 1.7, `currentColor`, `name`+`size` inputs; ersetzt die
  SVG-Strings-via-`SafeHtmlPipe`), `Card`, `CardHead`, `Btn`, `Badge`, `StatusDot`,
  `Bar`, `Ring`, `Avatar`/`Identicon`/`UserAvatar`, `Count`, `Empty`, `PageHeader`,
  `Select`, `Switch`/`ToggleRow`, `SInput`/`SField`, `Overlay`/`Modal`, `Thumb`.
- **Bestehendes wiederverwenden statt neu bauen:** `shared/toast/` (ToastService +
  Container — nur visuell an Toast-Spec anpassen, bottom-right), `shared/usage-bar.ts`/
  `storage-usage-bars.ts` (→ in `Bar` aufgehen lassen oder angleichen),
  `shared/selection/*` (Bulk-Auswahl bleibt, nur Styling).
- **Animationen:** Entrance (`fadeUp`/`fadeIn`) so gaten, dass der sichtbare End-State
  Default ist (nie bei `opacity:0` hängenbleiben); `prefers-reduced-motion` respektieren.

## Phase 2 — Shell & Navigation

Restyle (Funktion/Routing bleibt) in `apps/frontend/src/app/shell/`:
- **`app-sidebar.ts`:** 252px / kollabiert 78px (`width .22s cubic-bezier(.22,.61,.36,1)`),
  `bg-rail`; Gradient-Logo-Tile 34×34 + Wortmarke „my**NextScreen**" (NextScreen-Hälfte
  als Accent-Gradient-Textfill); Nav-Items `rounded-[11px]`, Active = `bg-accent-soft`/
  `text-accent`/700 + 4×22 Gradient-Pill links; Logout im Footer. Nav-Reihenfolge laut
  README. Icons via neuer `IconComponent`.
- **`app-topbar.ts`:** 73px sticky, `backdrop-blur(14px)`; Suchfeld (max 460,
  Search-Icon + `⌘K`-Chip), Theme-Toggle 40×40, Bell (Offline-Dot bei Alerts),
  Divider, **User-Menu**-Button (Org-Name + Rolle + 36px Avatar) → 280px-Popover
  (Identity, Org-Chip, Aktionen: **Instance Admin** [amber, nur Superuser], Switch
  organisation, Profile & settings, Log out). `notifications/` Bell-Dropdown integrieren.
- **`org-switch-modal.ts`:** auf neues `Overlay`/`Modal`-Primitiv + Tokens.
- **`layout.ts`:** Grid/Responsive (1100/880/560px-Breakpoints) an Design angleichen,
  `<main>` `padding:28px 28px 48px`, innen `max-width:1320px`.
- **Theme-/Accent-/Density-Picker:** Toggle in Topbar (hell/dunkel); Accent+Density
  als Auswahl in `settings/user` (Profile & settings) ergänzen — nutzt `ThemeService`.

## Phase 3 — Feature-Screens (Priorität: Dashboard → Screens → Settings → Audit → Rest)

Jede View bindet weiter ihre bestehenden Services/Signals; nur Templates + Styling
werden auf Tokens + UI-Primitive umgestellt. Referenz je View in `reference/*.jsx`:
- **Dashboard** (`dashboard/`): Onboarding-State (Ring + 4 StepCards) **und** Populated
  (4 Stat-KPIs mit Sparkline, Live-Screens-Grid + Storage-Donut + Alerts, Schedules +
  Activity). Ggf. `dataState`-Logik aus echten Daten ableiten.
- **Screens** (`screens/`): Filter-Pills + Card-Grid (`ScreenTile`), Pairing-Modal-Flow.
- **Settings** (`settings/`): Underline-Tabs (User Mgmt / Notification Config / Storage),
  Form-Primitive (`SInput`/`SField`/`Switch`/`ToggleRow`). + Accent/Density-Picker.
- **Audit Log** (`audit-log/`): Filterbar (Search + Select + Date), gruppierte Tabelle,
  Action-Badges, expandable rows, Pagination, Export CSV.
- **Restliche Views:** `screen-groups/`, `content/`, `playlists/`, `schedules/`,
  `live-streams/` (Stream-Monitor-CSS-Animationen), `profile/`, `register/`, `login/`,
  `setup/`, `set-password/`, `verify-email/`, `confirm-email-change/`, `search/`.
- **Login** (`login/`): Split-Layout (Brand-Panel links, < 880px ausgeblendet).

## Phase 4 — Instance-Admin (amber-Chrome, in-place)

In `apps/frontend/src/app/admin/` — Routen **unverändert** (`/admin/dashboard`,
`/admin/organisations`, `/admin/users`, `/admin/audit-log`):
- Amber-Chrome (`--color-elevated`/`-2`/`elevated-soft`) als einziges „elevated"-Signal:
  Header-Icon-Tile, „Superuser"-Badges, Admin-Topbar-Identity-Chip. Content-Tabs/Cards
  behalten den normalen (indigo) Accent.
- **Dashboard-Tab** (`instance-dashboard.ts`): 4 `StatTile`-KPIs (inkl. dualer
  Verified/Pending-Readout), Storage (Allocated vs Used, 2 Bars + Per-Org-Legende),
  Host-Disk (`Ring` + Bar), **`LoadGraph`** (hand-gerolltes SVG: CPU-Linie+Area,
  RAM-Dashed-Linie, Transcode-Shading), Orgs-Snapshot + Instance-Meta.
  - **`LoadGraph`** als neue Komponente unter `admin/` bauen (verbatim nach
    `components.md`/`admin.jsx`). Datenform `LOAD` (cpu[]/ram[]/transcodeWindows/cores/
    ramTotalGB) → später an Metrics-Endpoint binden; zunächst aus vorhandenen
    Instance-Stats/Mock speisen.
- **Organisations/Users/Audit-Tabs:** Tabellen + Header-Aktionen nach README umstylen,
  echte Services (`organisation.service`, `admin-user.service`, `instance-audit-log.service`).

## Phase 5 — Player angleichen

`apps/player/src/styles.css` (29 Zeilen) + `index.html`: Basis-Tokens (Fonts Hanken
Grotesk/JetBrains Mono, Surface/Text/Border-Farben, Radii) aus dem neuen System
übernehmen, soweit auf die Player-UI anwendbar. Kein voller Screen-Rebuild — nur
visuelle Angleichung an die Token-Basis.

---

## Kritische Dateien
- `apps/frontend/src/styles.css` ← `tailwind-theme.css` (Drop-in)
- `apps/frontend/src/index.html` (Fonts, `<html>`-data-Attribute)
- `apps/frontend/src/app/shell/theme.service.ts` (Attribut-basiertes Theming)
- Neu: `apps/frontend/src/app/ui/**` (Primitive + `IconComponent`)
- `apps/frontend/src/app/shell/{layout,app-sidebar,app-topbar,org-switch-modal}.ts`
- `apps/frontend/src/app/{dashboard,screens,settings,audit-log,...}/**`
- `apps/frontend/src/app/admin/**` (amber-Chrome + `LoadGraph`)
- `apps/player/src/{styles.css,index.html}`
- Referenz (read-only): `docs/design/design_handoff_mynextscreen/**`

## Nicht im Scope / Hinweise
- `reference/tweaks-panel.jsx` = Prototyp-Tooling → ignorieren.
- Auth bleibt echt (kein `mns_authed`-Demo-Flag).
- Zoneless ist im Handoff „bevorzugt", aber die App nutzt `provideZoneChangeDetection`.
  Umstellung auf zoneless ist **out of scope** dieses Re-Skins (separat, risikobehaftet).
- Token-/Klassen-Namen aus `tailwind-theme.css` verwenden — keine neuen Farben erfinden.
- Multi-Tenancy/Guards bleiben unverändert serverseitig durchgesetzt.

## Verifikation
- **Build/Lint/Typecheck:** `npx nx run-many -t lint typecheck build -p frontend player`
  (bzw. `npx nx affected`), Prettier (`format:check`). Strikt TS, kein `any`.
- **Tests:** `npx nx test frontend` (Vitest, harter Gate, `pool: 'forks'`),
  `npx nx test player`. Bestehende Specs (Topbar/Layout/Login/OrgSwitch/…) an neue
  Templates/Selektoren anpassen.
- **Visuell:** `npm run dev` → Admin auf :4200. Pro Screen Visual-Diff gegen die
  passende `reference/*.jsx` in **dark & light**, Accent-Wechsel (indigo/teal/amber/blue),
  Density (compact/regular/comfy), bei Breakpoints 1100/880/560px. Optional
  Playwright-MCP-Screenshots je Hauptscreen.
- **Definition of Done je Screen:** Hover/Active/Focus/Loading/Empty-States vorhanden;
  Overlays schließen per Esc/Backdrop; Entrance-Animationen stranden nie bei `opacity:0`;
  `prefers-reduced-motion` respektiert; keine Konsolenfehler; `OnPush`/Signals; keine
  NgModules.
