# Screen-Groups Reskin — Umsetzungsplan

Reskin der Screen-Groups-Domain (`apps/frontend/src/app/screen-groups/`) auf das
myNextScreen-Design. Referenz-Spec: `reference/groups.jsx`. Phase-3-View laut
`IMPLEMENTATION-PLAN.md` — hier aber **erweiterter Scope** (zwei bewusste
Entscheidungen, siehe unten), nicht nur reines Styling.

## Entscheidungen (mit dem Nutzer abgestimmt)

1. **Split-Zuweisung:** Vom bestehenden CDK-Drag&Drop **auf das Klick-Popover-Modell
   umbauen** (wie `groups.jsx` `WallCell`). Drag&Drop entfällt.
2. **Farbe/Icon:** **Backend-Felder ergänzen** (`color` + `icon` auf `screen_groups`),
   inkl. Farb-Picker im Create/Edit-Modal und Gradient-Kachel in allen Views.

---

## Soll/Ist-Vergleich

### Main-View (`screen-groups.ts` + `screen-group-table.ts`)

| Aspekt | IST | SOLL (`groups.jsx` `GroupsPage`) |
| --- | --- | --- |
| Layout | HTML-`<table>` (Name/Mode/Grid/Count/Actions) | Responsive **Card-Grid** `repeat(auto-fill, minmax(290px,1fr))` |
| Karte | Tabellenzeile, alte `.btn`-Klassen | Gradient-Icon-Kachel (color+icon) · Name · „N screens" · Mode-Badge · **Mini-Preview-Strip** (bis 4 Monitor-Thumbs) · Content-Footer · Ghost-„Open"-Btn |
| Mode-Badge | `.mode-badge` (hartkodierte Hex) | `mns-badge` tone=`accent` (split, `cols×rows`) / `neutral` (mirror) |
| Header | `mns-page-header` ✅ (schon Primitive) | `mns-page-header` + `sub` = Gruppen-Anzahl |
| Empty | `mns-empty` ✅ | `mns-empty` ✅ (passt) |
| Loading/Error | `<p class="loading-text">` / `<p class="error">` | Token-konforme States |

### Detail-View (`screen-group-detail.ts` + Kinder)

| Aspekt | IST | SOLL (`groups.jsx` `GroupDetail`) |
| --- | --- | --- |
| Back | `mns-btn ghost` in PageHeader | „← All groups"-Pill über dem Inhalt |
| Header | `mns-page-header` + Badges + „Switch to…"-Btn | **Header-Card**: Gradient-Icon + Name + Mode-/Screen-Badges + Delete-Btn |
| Live-Preview | nur bei `allCellsAssigned`, separate Komponente | **Immer sichtbare „Live preview"-Card** (CardHead + WallPreview) |
| Split-Assign | CDK-DnD Sidebar→Zelle (`grid-editor`) | **MonitorFrame-Grid**, Klick auf Zelle → **Popover** (Screen wählen / „Leave empty") |
| Mode/Layout | separates `switch-mode-modal` | **Inline** „Display mode"-Card: `ModeToggle` + `Stepper` (Cols/Rows) + „N of M panels assigned" |
| Screens-Liste | `mirror-list` (mirror) bzw. keine (split) | **„Group screens"-Card**: Liste placed screens (Panel-# · Thumb · Name · Res · StatusDot · Remove) + dashed `<select>` „Add a screen…" |
| Tokens | alte `--color-*`-Tokens, teils kaputtes CSS (`var(--color-accent) 08`) | neue Tokens (`--surface`, `--border`, `--accent`, `--online`, `--warn`) / Tailwind-Utilities |

### Modals

| Aspekt | IST | SOLL |
| --- | --- | --- |
| Wrapper | eigene `.modal-overlay`/`.modal` (alle 5 Group-Modals) | `mns-overlay` + `mns-modal` (Gradient-Header-Icon, Footer-Slot) |
| Mode-Auswahl | `<select>` | **`ModeToggle`** (zwei große Mode-Cards mit Icon+Beschreibung) |
| Grid-Größe | `<input type=number>` | **`Stepper`** (−/+ , min/max) |
| Farbe | — | **Farb-Picker** (7 Swatches, `COLORS`) |
| Screens beim Erstellen | — | **Multi-Select-Liste** (Checkbox + Thumb + StatusDot) → direkt zuweisen |

### Datenmodell-Lücke

`groups.jsx` nutzt pro Gruppe `color`, `icon` und ein repräsentatives `content`.
Backend hat nur `name/mode/gridColumns/gridRows`. → `color`+`icon` werden ergänzt.
`content` (Live-Vorschau-Quelle) bleibt clientseitig wie bisher
(`screen-group-wall-preview` lädt Content + extrahiert Thumbnail); der
Mini-Preview-Strip der Card degradiert ohne Quelle zu Monitor-Platzhaltern.

---

## Umsetzung

### Phase A — Backend: `color` + `icon`

1. **Schema** `apps/backend/src/db/schema.ts` (`screenGroups`): zwei Spalten
   `color: text().notNull().default('#6d6cf6')`, `icon: text().notNull().default('Groups')`.
2. **Migration** `nx run backend:db-generate` → review → `db-migrate`.
3. **DTOs** `create-/update-screen-group.dto.ts`: `color?` (`@IsString` + Hex-Regex via
   `@Matches(/^#([0-9a-fA-F]{6})$/)`), `icon?` (`@IsString`, optional `@IsIn(ICON_ALLOWLIST)`).
4. **Service** `screen-group.service.ts`: `color`/`icon` in `createGroup`/`updateGroup`
   durchreichen; in `findAll`/`findOne`-Select aufnehmen (Default für Altbestand greift).
5. **Tests** `screen-group.service.spec.ts` + Controller-Specs: color/icon-Persistenz,
   Default-Werte, Hex-Validierung (Coverage-Gate ~85 % halten).

### Phase B — Neue/erweiterte UI-Primitive

Prüfen, ob generisch genug für `app/ui/`, sonst lokal in `screen-groups/`:
- **`ModeToggle`** (zwei Mode-Cards, `value`/`change`) — group-spezifisch → lokal.
- **`Stepper`** (`label`, `value`, `min`, `max`, `change`) — generisch → Kandidat für `app/ui/`.
- **`MonitorFrame`** (Monitor-Rahmen mit optionalem `slice`, Label, StatusDot, Empty-State)
  + **`WallMount`** — group-spezifisch → lokal in `screen-groups/`.
- **Color-Picker** (7 Swatches) — klein, lokal im Modal.
- Vorhandene Primitive nutzen: `mns-overlay`, `mns-modal`, `mns-card`, `mns-card-head`,
  `mns-btn`, `mns-badge`, `mns-status-dot`, `mns-icon`, `mns-empty`, `mns-page-header`.

### Phase C — Main-View → Card-Grid

1. `screen-group-table.ts` **ersetzen** durch `screen-group-card.ts` (presentational):
   Inputs `group`, Outputs `open`/`edit`/`delete`; Gradient-Icon, Mini-Preview-Strip,
   Mode-Badge, Content-Footer, Ghost-„Open".
2. `screen-groups.ts` Template: Card-Grid statt Tabelle; `mns-page-header` `sub` =
   `{n} group(s)`; Loading/Error auf Tokens. Smart-Container-Logik (Service/Subscribe)
   **unverändert** beibehalten.
3. Specs: `screen-group-table.spec.ts` → `screen-group-card.spec.ts`; `screen-groups.spec.ts`
   auf Card-Grid-Selektoren anpassen.

### Phase D — Create/Edit-Modal → `mns-modal` + ModeToggle/Stepper/Color

1. `screen-group-create-modal.ts` & `screen-group-edit-modal.ts`: `mns-overlay`+`mns-modal`,
   `FormsModule`/Signals beibehalten, `<select>`→`ModeToggle`, Number-Inputs→`Stepper`,
   Color-Picker, (Create) Screen-Multi-Select. `color`/`icon` in DTO-Emit aufnehmen.
2. `delete-modal` + `add-screen-modal` ebenfalls auf `mns-overlay`/`mns-modal` umstellen
   (reines Restyling).
3. Specs entsprechend aktualisieren (Modus-Toggle-Klicks, Stepper-Buttons, Color-Auswahl).

### Phase E — Detail-View

1. **`switch-mode-modal` entfernen** — Mode-Wechsel + Grid-Größe inline in „Display mode"-Card
   (`ModeToggle` + `Stepper`). `patch()`-artige Update-Calls über bestehenden Service
   (`update(orgId,id,{mode,gridColumns,gridRows})`).
2. **`grid-editor` (DnD) ersetzen** durch `screen-group-wall.ts`: `MonitorFrame`-Grid mit
   `WallCell`-Popover (Assign/Leave-empty). CDK-Imports + `onDropToCell/onDropToSidebar`
   aus `screen-group-detail.ts` entfernen; `assignScreenToCell`/`removeScreenFromGroup`
   bleiben (vom Popover statt vom Drop getriggert). `@angular/cdk/drag-drop` aus
   diesem Feature entfernen, falls nirgends sonst genutzt.
3. **Header-Card** + **„Group screens"-Card** + **„Live preview"-Card** aufbauen;
   bestehende `wall-preview`-Content-Logik (Thumbnail-Extraktion) als Quelle für
   `MonitorFrame.content` wiederverwenden.
4. `mirror-list` in die „Group screens"-Card integrieren bzw. auf neuen Look bringen.
5. Specs: `grid-editor.spec` → `wall.spec` (Popover-Interaktion); `detail.spec` auf
   Inline-Mode-Switch + Popover-Assign + Header-Card umschreiben (größter Test-Aufwand).

### Phase F — Abschluss

- Token-/Theme-Check (dark + light), Breakpoints 1100/880/560 px, `prefers-reduced-motion`.
- `mns-overlay` schließt auf Esc/Backdrop; Popover schließt auf Outside-Click.
- Gates: `npx nx affected -t lint typecheck test build`; `format:check`; Backend-Coverage.
- Keine `console.log`, kein `any`, OnPush/Signals, Standalone.

---

## Betroffene Dateien (Überblick)

**Backend:** `db/schema.ts`, neue Migration, `dto/create-…`, `dto/update-…`,
`screen-group.service.ts` (+ Specs).

**Frontend — ersetzen/neu:** `screen-group-card.ts` (statt `-table.ts`),
`screen-group-wall.ts` (statt `-grid-editor.ts`), lokale `mode-toggle.ts`/`stepper.ts`/
`monitor-frame.ts`. **Umbauen:** `screen-groups.ts`, `screen-group-detail.ts`,
alle 5 Modals, `screen-group-mirror-list.ts`, `screen-group-wall-preview.ts`,
`screen-group.model.ts` (color/icon), `screen-group.service.ts` (Frontend, color/icon).
**Entfernen:** `screen-group-switch-mode-modal.ts`, `screen-group-grid-editor.ts`
(+ deren Specs). **`app/ui/`:** ggf. `stepper.component.ts` + Export im Barrel.

## Risiken / Hinweise

- **Größter Aufwand = Tests:** Detail-Specs (717 Z.) und Grid-Editor-Specs (204 Z.)
  müssen neu, da Interaktionsmodell wechselt (DnD → Popover).
- **Migration:** Defaults (`color`/`icon`) sichern Altbestand ab; in Prod nie `db-push`.
- **Scope-Kontrolle:** Inline-Mode-Switch ersetzt ein bestehendes (getestetes) Modal —
  bewusst, weil Design es so vorsieht.
- **Reihenfolge:** A (Backend) zuerst, damit Frontend gegen reale `color`/`icon`-Felder
  baut; B (Primitive) vor C–E.
