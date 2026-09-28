# Admin-Frontend responsive machen (bis Handy-Portrait ~375px)

## Context

Das Angular-Admin-Frontend (`apps/frontend`) hat bereits eine **solide Responsive-Grundlage** in der Shell
(Sidebar collapse→overlay, Topbar-Vereinfachung, Padding-Skalierung über `1100/880/768/560px`-Media-Queries).
Aber die **Inhalts-Views** sind durchweg desktop-first gebaut: breite Tabellen mit `min-width: 900px`,
ein pixel-positioniertes Kalender-Grid, ein Video-Wall-Editor mit `max-width`-Caps, fixe Control-Breiten im
Playlist-Editor und Form-Grids ohne Mobile-Fallback. Auf einem Handy bricht das Layout oder erzwingt
horizontales Scrollen.

**Ziel:** Voll nutzbar bis **Handy-Portrait (~375px)**; breite Tabellen werden auf schmalen Screens zu
**gestapelten Karten**; die komplexen Views (Schedule-Kalender Tag/Woche, Video-Wall-Editor) bekommen
**dedizierte Mobile-Layouts**. Scope ist nur `apps/frontend` — der Player (`apps/player`) läuft Vollbild
auf TVs und ist nicht betroffen.

**Konvention:** Künftig **Tailwind-Responsive-Prefixes** (`sm:` 640 / `md:` 768 / `lg:` 1024 / `xl:` 1280)
in Templates statt neuer custom `@media`-Blöcke. Mobile-first: Basis-Styles = schmal, größere Screens per Prefix
hochskalieren. Tailwind 4 ist hier CSS-first (`apps/frontend/src/styles.css`), Default-Breakpoints gelten.

---

## Phase 0 — Foundation & Sanity-Checks

- **Viewport-Meta prüfen**: sicherstellen dass `apps/frontend/src/index.html` ein
  `<meta name="viewport" content="width=device-width, initial-scale=1">` hat (sonst greift kein Responsive-Layout).
- **Touch-Targets**: globale Regel/Utility, dass interaktive Icon-Buttons auf Touch ≥ 40–44px sind
  (WCAG 2.5.5). Betrifft v.a. Topbar-Buttons, Resize-Handles, Chip-Buttons.
- **Shell-Feinschliff** (`apps/frontend/src/app/shell/`):
  - User-Dropdown (`app-topbar.ts`, fixe `280px`) → `max-width: calc(100vw - 24px)` damit es bei <320px nicht überläuft.
  - Bestätigen dass Hamburger/Overlay-Flow (`layout.ts` `mobileOpen`, `app-sidebar.ts` transform) sauber bei 375px funktioniert.

---

## Phase 1 — Modals, Overlays & Forms (Querschnitt, hoher Hebel)

Diese Primitives werden überall verwendet — ein Fix wirkt breit.

- **`apps/frontend/src/app/ui/overlay.component.ts`** (`mns-modal`):
  - Panel hat `w-full` + `maxWidth.px` — auf Mobile zusätzlich Höhe begrenzen: `max-h-[calc(100dvh-2rem)]` +
    `overflow-y-auto` am Body, damit lange Formulare auf dem Handy scrollbar bleiben statt abzuschneiden.
  - `dvh` statt `vh` wegen mobiler Browser-Toolbars.
- **Form-Grids**: alle mehrspaltigen Form-Layouts auf Mobile einspaltig. Pattern: `grid-cols-1 md:grid-cols-2`.
  Repräsentativ: `screens/screen-form.ts`, `schedules/schedule-form-modal.ts`,
  `live-streams/live-stream-create-modal.ts` (das fixe `repeat(2,1fr)`), `screen-groups/*-form`.
- **Legacy `.modal` / `.form-actions`** in `styles.css` (Zeile ~463/514): `.form-actions` auf Mobile
  `flex-col` damit Buttons stapeln statt zu quetschen.

---

## Phase 2 — Breite Tabellen → Karten-Stapel

Drei Tabellen teilen dasselbe Muster (`overflow-x-auto` + `min-w-[900px]` Grid). Ziel: ab `md:` die
Grid-Tabelle, darunter gestapelte Karten (Label-Wert-Paare pro Datensatz).

Betroffene Dateien:

- `apps/frontend/src/app/audit-log/audit-log-table.ts` (7 Spalten, **expandable Rows + Tag-Divider** — komplexester Fall)
- `apps/frontend/src/app/admin/users/all-users.ts` (6 Spalten, fixes inline `grid-template-columns`)
- `apps/frontend/src/app/admin/organisations/org-member-list.ts` (gebundenes `cols`)

**Vorgehen pro Tabelle:**

- Grid-Header + Grid-Rows in `hidden md:grid` hüllen (Tabellenansicht nur ab Tablet).
- Darunter `md:hidden` Karten-Stack: pro Eintrag eine `mns-card`-artige Box mit gestapelten
  „Label: Wert"-Zeilen. Bei Audit-Log die wichtigsten Felder (Zeit, User, Action-Badge, Resource) prominent,
  Details als ausklappbarer Block (vorhandene `expandedId`-Logik wiederverwenden).
- Tag-Divider (`row.kind === 'divider'`) in beiden Layouts rendern.
- Keine Datenlogik duplizieren — nur das Template um eine zweite, schmale Darstellung erweitern; die
  vorhandenen Helper (`actionMeta`, `getUserDisplay`, `formatDetails`, `rows()`) bleiben.

> Falls die zwei Darstellungen ein Template zu groß machen: eine kleine presentational
> `audit-log-card.ts` / `user-card-row.ts` auslagern (eine Datei pro Tabelle, <200 Zeilen).

---

## Phase 3 — Schedule-Kalender: dediziertes Mobile-Layout

`apps/frontend/src/app/schedules/schedule-calendar-grid.ts` ist der härteste Teil: Tag/Woche ist ein
pixel-positioniertes Time-Grid (`[style.top.px]`/`[style.height.px]`), Monat ein festes `grid-cols-7`.
Drag&Drop/Resize sind maus-orientiert.

**Mobile-Strategie (unter `md:`):**

- **Tag/Woche → Agenda-Liste**: statt Time-Grid eine chronologische Liste der Blöcke des sichtbaren Tages
  (Zeit-Range + Playlist-Name + Badges), tap-to-edit über vorhandenes `blockClick`/`blockEnter`-Output.
  Erstellen über einen „+ Slot hinzufügen"-Button statt Klick-auf-Stunde (`createSlot`-Output wiederverwenden).
- **Woche auf Mobile** auf **Single-Day** reduzieren (nur `visibleDays()[0]` bzw. ausgewählter Tag), da 7 Spalten
  nebeneinander unbrauchbar sind. Day-Switcher (vor/zurück) ergänzen — Datums-Navigation liegt im Parent
  (`schedules`-Container), dort die View-Mode-Logik erweitern.
- **Monat**: `grid-cols-7` bleibt (Kalender ist intrinsisch 7-spaltig), aber Zell-Höhe/Chips schrumpfen;
  Chips ggf. zu „•N"-Punkt-Indikator + Tap öffnet Tagesliste.
- Time-Grid-Markup bleibt für `md:`+ unverändert; Mobile bekommt einen eigenen `@if`-Zweig.

> Drag&Drop bewusst desktop-only; Mobile editiert via Tap→Formular. Das ist der pragmatische Teil der
> „dedizierten Layouts" und vermeidet fragiles Touch-Drag auf dem pixel-Grid.

---

## Phase 4 — Video-Wall-Editor: Touch-Layout

`apps/frontend/src/app/screen-groups/screen-group-wall.ts`:

- `max-width: 420px/680px`-Caps responsiv machen (`100%` bis `md:`, Cap erst ab Tablet).
- Grid behält Aspect-Ratio (`aspect-[16/9]`-Container), Zellen werden auf Mobile größer/touch-tauglich.
- **Popover** (nach oben positioniert, Zeile ~95) auf Mobile als **Bottom-Sheet** (am Viewport-Boden,
  `fixed inset-x-0 bottom-0`) statt frei positioniertem Popover — verhindert Overflow am Screen-Rand.

---

## Phase 5 — Playlist-Editor & Dashboard

- **`apps/frontend/src/app/playlists/playlist-editor.ts`**: Item-Row ist ein enger Flex mit fixen
  Control-Breiten (`w-[140px]` Transition-Select, 52px Duration-Spinner). Auf Mobile `flex-wrap` +
  Controls `w-full sm:w-auto`, sodass Dauer/Transition unter den Titel umbrechen statt zu überlaufen.
- **`apps/frontend/src/app/dashboard/dashboard.ts`**: KPI-Row `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
  (fehlender <560px-Fall). Screen-Grid nutzt bereits `auto-fill minmax()` → ok.
- **`dashboard-schedule-timeline.ts`**: fixe Spaltenbreiten (90px) — in `overflow-x-auto`-Wrapper hüllen
  (kleiner, abgegrenzter Bereich; hier ist horizontales Scrollen akzeptabel).

---

## Phase 6 — Easy Wins verifizieren (kein/wenig Aufwand)

Card-Grids nutzen schon `auto-fill, minmax()` → nur gegenprüfen, nicht umbauen:
`screens/screen-grid.ts`, `content/content-grid.ts`, Playlist-Liste, `dashboard-screen-grid.ts`.
Bulk-Action-Toolbar (`shared/selection/bulk-action-toolbar.ts`): Buttons auf Mobile umbrechen/kompaktieren.

---

## Wiederverwendung statt Neubau

- Tailwind-Responsive-Prefixes + bestehende Design-Tokens (`--card-pad`, `bg-surface`, etc.) — **kein** neues
  Theming nötig.
- Presentational/Smart-Split bleibt: alle Änderungen sind Template/CSS-seitig in den vorhandenen
  presentational Components; Daten-/State-Logik in den Services/Container-Components bleibt unberührt.
- Vorhandene Outputs (`blockClick`, `createSlot`, `expandedId`, `selectResource`) für Mobile-Interaktion
  wiederverwenden — keine neuen Event-Pfade.

## Empfohlene Aufteilung (umsetzungsseitig)

Pro Phase ein eigener Commit/PR (bzw. eigener Agent je sauber abgrenzbarem Teil — Phasen 2–5 sind unabhängig).
Reihenfolge nach Hebel: **0 → 1 → 2 → 5 → 6 → 3 → 4** (Querschnitt & Tabellen zuerst, harte Custom-Views zuletzt).

## Verifikation

End-to-end pro Phase:

1. `npx nx serve frontend` und mit **Playwright-MCP** bei drei Viewports testen: **375×812** (Handy),
   **768×1024** (Tablet), **1280×800** (Desktop). Pro betroffener View: Snapshot + visuell auf
   Overflow/abgeschnittene Controls prüfen.
2. Kritische Flows auf 375px durchklicken: Sidebar-Overlay öffnen/schließen, ein Modal-Formular abschicken,
   Audit-Log-Eintrag aufklappen, Schedule-Tag-Agenda öffnen + Block tappen, Video-Wall-Zelle zuweisen.
3. `npx nx run-many -t lint typecheck test build --projects=frontend` muss grün sein
   (CI `format:check` ist harter Gate — vor Commit `npx nx format:check frontend` bzw. Prettier laufen lassen).
4. `@typescript-reviewer`-Agent vor jedem PR (CLAUDE.md-Konvention).

> Hinweis: Frontend-Tests sind dünn (~8 Specs) und ohne Coverage-Gate; keine künstlichen Tests nur fürs Gate.
> Wo sich für die Mobile-Card-Komponenten ein sinnvoller Render-Test anbietet, einen knappen Vitest-Spec ergänzen.
