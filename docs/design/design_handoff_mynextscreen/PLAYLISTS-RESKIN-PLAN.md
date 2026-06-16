# Playlists Reskin — Umsetzungsplan

**Feature-Dir:** `apps/frontend/src/app/playlists/`
**Design-Referenz:** `docs/design/design_handoff_mynextscreen/reference/playlists.jsx`
**Token-Doku:** `design-tokens.md` · **Primitive-Katalog:** `components.md`
**Referenz-Reskins (bereits umgesetzt, als Vorlage nutzen):** `apps/frontend/src/app/screens/`, `apps/frontend/src/app/content/`

Diese Datei ist selbst-enthaltend: ein frisch gestarteter Agent kann sie über Nacht
abarbeiten, ohne zurückzufragen. Alle Token-Namen, Primitive-Selektoren, Datei-Pfade
und Zeilennummern sind unten konkret benannt. **Nur Code in `playlists/` und ggf.
`playlist.model.ts` anfassen — keine Backend-Änderungen außer in „Offene
Entscheidungen“ explizit freigegeben.**

## Aktueller Stand — Dateien „fertig“ vs. „offen“

Status-Inventar nach Lesen aller Dateien + `grep "var(--color-"` + `grep "modal-overlay"`:

| Datei | Reskin-Status | Begründung |
|---|---|---|
| `playlists.ts` (Container) | **Großteils fertig** | Nutzt `mns-page-header`, `mns-btn`, `mns-empty`, `mns-overlay`, `mns-modal` (Delete-Modal). Nutzt **keine** alten `--color-*`-Tokens. Inline-CSS `.warning-text` mit Hardcoded-Hex (`#fbbf24`, `#92400e…`) → sollte `--warn`/`--warn`-dim werden. Reines Loading-`<p>`/Error-`<p>` noch ungestylt. |
| `playlist-grid.ts` | **Teilweise** | Nutzt neue `--surface-2/-3`, `--border`, `--accent`, `--text`, `--text-muted`, `--shadow`. **1 Alt-Token:** `var(--color-text-secondary)` (Z. 79). Komplett handgerollte Card statt `mns-card` + `mns-thumb` + `mns-badge`. Kein Thumbnail-Strip wie Referenz. |
| `playlist-editor.ts` | **Teilweise** | Nutzt überwiegend neue Tokens. **4 Alt-Tokens:** `var(--color-border)` (Z. 250, 470), `var(--color-text-muted)` (Z. 419), `var(--color-bg-primary)`+`var(--color-accent)` (Z. 435–436). Komplette Eigen-CSS-Struktur statt `mns-card`/`mns-card-head`/`mns-badge`; kein Loop-Preview, kein Transition-Picker-Styling, keine Playback-Settings-Karte, keine Assigned-Screens-Karte. |
| `playlist-add-content-modal.ts` | **NICHT reskinned** | Alte `.modal-overlay`/`.modal`-Struktur, **9 Alt-Tokens** (`--color-border`, `--color-text-secondary`, `--color-bg-tertiary`, `--color-text-primary`, `--color-accent`, `--color-bg-primary`, `--color-text-muted`). Muss auf `mns-overlay`+`mns-modal` + Such-Popover-Look der Referenz umgebaut werden. |
| `playlist-assign-screen-modal.ts` | **NICHT reskinned (Struktur)** | Alte `.modal-overlay`/`.modal`-Struktur (kein eigenes CSS, erbt globale Modal-Klassen). Keine `--color-*`-Tokens, aber falsche Modal-Primitive + native `<select>` statt `mns-select`. |
| `playlist-create-form.ts` | **NICHT reskinned** | `.form-card` mit **5 Alt-Tokens** (`--color-bg-secondary`, `--color-border`, `--color-shadow`×2). Native `<input>`/Buttons statt `mns-sinput`/`mns-btn`. Referenz hat kein separates Create-Form — Anlage passiert im New-Playlist-Modal. |
| `playlist-format.service.ts` | **Fertig** | Reine Formatierung (Dauer/Datum), kein Styling. Behalten. |
| `playlist.service.ts` | **Fertig** | HTTP-Layer, kein Styling. Behalten. |
| `playlist.model.ts` | **Fertig (ggf. erweitern)** | Typen. Felder `color`/`loop`/`shuffle`/`screenIds` fehlen ggü. Referenz → siehe Offene Entscheidung 1/2/3. |

**Zusammenfassung Auftrag-Vorgabe bestätigt:** 4 Dateien mit Alt-`--color-*`-Tokens
(`playlist-grid.ts`, `playlist-editor.ts`, `playlist-add-content-modal.ts`,
`playlist-create-form.ts`); 2 Alt-`.modal-overlay`-Modals (`add-content`,
`assign-screen`); 1 bereits auf `mns-overlay` migriertes Modal (Delete-Modal in
`playlists.ts`); `mns-page-header` vorhanden.

---

## Offene Entscheidungen

> Jede Entscheidung blockiert Teile der Umsetzung. **Empfehlung** ist die Default-Wahl,
> falls niemand widerspricht. Optionen mit Aufwand/Konsequenz.

### 1. Loop-Preview-Karte (Referenz Z. 273–352) — bauen oder weglassen?
Die Referenz hat eine prominente animierte „Loop preview“-Karte (rAF-Player,
segmentierte Timeline, Play/Prev/Next, „Now playing“). Das aktuelle Backend liefert
kein synchron abspielbares Loop-Modell; die Inline-`<video>`/`<img>`-Preview pro Item
existiert bereits.
- **Option A — voll bauen:** rAF-Loop-Player als Standalone-Component
  (`playlist-loop-preview.ts`), beschleunigt (`PREVIEW_SPEED=3`), segmentierte
  Timeline aus `item.durationSeconds`. Rein clientseitig, kein Backend nötig. Hoher
  Aufwand (~Referenz Z. 89–352 portieren), `requestAnimationFrame` + `prefers-reduced-motion`.
- **Option B — statische Vorschau behalten:** Bestehende Inline-Preview (Editor
  Z. 181–197) auf neue Tokens/`mns-card` heben, keinen Loop-Player.
- **Empfehlung: Option A**, weil POLICY „voll dem Design entsprechen“ verlangt und der
  Player rein clientseitig (signals + `effect`/rAF) ohne Backend machbar ist. Inline-
  Item-Preview bleibt zusätzlich erhalten (Klick auf Thumbnail).

### 2. Per-Playlist `color` (Accent-Farbe) — Schema erweitern?
Referenz speichert pro Playlist eine `color` (7-Farb-Palette, Z. 8) und nutzt sie für
Gradient-Icon-Tile in Grid-Card + Editor-Header + Timeline. Backend `Playlist` hat
**kein** `color`-Feld (siehe `playlist.model.ts` Z. 1–8).
- **Option A — Backend erweitern:** Migration `playlists.color text`, DTO + Controller,
  PATCH-Endpoint nutzen. Voll referenztreu, aber Backend-Migration (außerhalb
  Frontend-Scope, CI-Coverage-Gate beachten).
- **Option B — clientseitig deterministisch ableiten:** Farbe aus `playlist.id`-Hash
  (wie `IdenticonComponent`-Hash) → stabile Farbe ohne Persistenz. Kein Backend, kein
  Color-Picker.
- **Option C — Accent-Tile ohne Farbwahl:** Standard-Accent-Gradient
  (`linear-gradient(135deg,var(--accent),var(--accent-2))`) für alle, kein `color`.
- **Empfehlung: Option B** für diese Nacht (kein Backend-Risiko, optisch nah an
  Referenz). Color-Picker (Editor Z. 462–470, Modal Z. 571–579) wird dann
  **weggelassen** und als Folge-Issue notiert. Falls voll referenztreu gewünscht →
  Option A separat einplanen.

### 3. `loop` / `shuffle` Playback-Settings (Referenz Z. 456–471) — Schema erweitern?
Referenz hat Toggles „Loop continuously“ + „Shuffle order“. Backend kennt das nicht.
- **Option A — Backend erweitern** (Migration `loop bool`, `shuffle bool` + DTO).
- **Option B — Playback-Karte weglassen**, Folge-Issue.
- **Empfehlung: Option B** (Backend-Scope). Die „Playback“-Karte entfällt zunächst;
  Layout (Editor-Rechtsspalte) trägt dann nur die „Assigned screens“-Karte.

### 4. Assigned-Screens im Editor (Referenz Z. 473–500) — vorhanden im Backend?
Referenz zeigt zugewiesene Screens + Inline-Zuweisen/Entfernen im Editor. Im aktuellen
Modell hat eine Playlist **keine** `screenIds`; Screen-Zuweisung läuft über Schedules
bzw. die **Bulk-Assign-to-Screen**-Aktion (`playlist.service.bulkAssignScreen`).
- **Option A — Assigned-Screens-Karte im Editor bauen** auf Basis vorhandener
  Bulk-Assign-API (für eine einzelne Playlist). Erfordert API-Klärung, ob eine
  GET-Route „Screens dieser Playlist“ existiert (vermutlich nicht).
- **Option B — Karte weglassen**, Screen-Zuweisung bleibt bei der Grid-Bulk-Aktion +
  Assign-Modal (bereits vorhanden, wird nur reskinned).
- **Empfehlung: Option B** — kein neues Datenmodell. Die „Assigned screens“-Karte
  entfällt; das vorhandene `playlist-assign-screen-modal.ts` wird reskinned und bleibt
  der Zuweisungsweg.

### 5. Create-Flow: Inline-Form (Ist) vs. Modal (Referenz) — vereinheitlichen?
Referenz erstellt im **New-Playlist-Modal** (Name + Farbe + Content-Mehrfachauswahl,
Z. 528–634). Ist-Stand: separate Inline-`playlist-create-form.ts` (nur Name).
- **Option A — auf Modal umstellen:** `playlist-create-form.ts` durch ein
  `mns-overlay`+`mns-modal`-Create-Modal ersetzen. Content-Mehrfachauswahl beim Anlegen
  ist optional (Backend: erst `create`, dann pro Auswahl `addItem`).
- **Option B — Inline-Form behalten, nur reskinnen** (`mns-card`/`mns-sinput`/`mns-btn`).
- **Empfehlung: Option A ohne initiale Content-Auswahl** — Modal-Look wie Referenz
  (Header-Icon-Tile + Name-Feld via `mns-sinput`), aber Items werden wie bisher erst im
  Editor hinzugefügt (hält die Service-Orchestrierung simpel). Content-Mehrfachauswahl
  im Create-Modal = optionaler Stretch, sonst Folge-Issue.

### 6. Transition-Felder: `transitionDurationMs`-Stepper behalten?
Referenz hat **keinen** ms-Stepper, nur einen Transition-Picker (Cut/Fade/Dissolve/
Slide/Zoom). Das Backend kennt `transitionDurationMs` + ein größeres TransitionType-Enum
(`slide-left/-right/-up/-down`, `zoom-in/-out`; `playlist.model.ts` Z. 10–29).
- **Option A — `transitionDurationMs`-Feld behalten** (Funktionalität nicht verlieren),
  als kompakten Stepper im neuen Item-Row-Look.
- **Option B — entfernen** zugunsten reiner Referenz-Treue.
- **Empfehlung: Option A** — Funktion bewahren (POLICY „bestehende Services/Signals
  behalten“). Transition-`<select>` → `mns-select` mit dem vollen Backend-Enum;
  ms-Wert als kompakter Stepper daneben (Referenz-`DurStepper`-Look, Z. 137–147).

### 7. Drag-&-Drop: CDK behalten oder HTML5-DnD der Referenz?
Referenz nutzt HTML5 `draggable`/`onDrag*`. Ist-Stand nutzt **Angular CDK**
(`cdkDropList`/`cdkDrag`/`moveItemInArray`) inkl. funktionierender Persistenz
(`onDrop` → `reorderItems`).
- **Empfehlung (keine echte Offenheit): CDK behalten.** Funktional identisch, robuster,
  bereits verdrahtet. Nur die **Optik** angleichen: Drag-Handle-Icon (6-Punkt-SVG via
  `mns-icon` falls vorhanden, sonst Inline-SVG aus Referenz Z. 183), Item-Row-Look,
  `over`/`dragging`-States über CDK-Klassen (`.cdk-drag-placeholder`, `.cdk-drag-preview`).
  Alt-Token `--color-bg-primary`/`--color-accent` in den CDK-Preview-Styles (Editor
  Z. 435–436) auf `--surface`/`--accent` umstellen.

---

## Soll/Ist-Vergleich

### A) Main / Grid-View

| Aspekt | Ist (`playlist-grid.ts` / `playlists.ts`) | Soll (Referenz Z. 639–757) | Aktion |
|---|---|---|---|
| Page-Header | `mns-page-header` ✓ | Title „Playlists“, Sub „N playlists“, Action „New playlist“ | Sub-Text ergänzen (Count), `+ Plus`-Icon ✓ |
| Empty-State | `mns-empty` ✓ | `Empty` icon `Playlists`, „Load sample“ Action | Beibehalten, Icon ggf. `List`→ Playlist-Icon |
| Grid-Layout | `repeat(auto-fill,minmax(18rem,1fr))`, `gap:1rem` | `minmax(300px,1fr)`, `gap:var(--gap)` | `gap` → `var(--gap)`, minmax 18rem≈300px ok |
| Karte | Handgerollte `.playlist-card` (`--surface-2`, `--shadow`) | `mns-card hover`, Gradient-Icon-Tile 44×44, Name + „N items · dur“, Dots-Menu, **Thumbnail-Strip** (bis 6), Footer: Screen-Badge + „Open“ | Neu auf `mns-card`; Icon-Tile (Offene Entsch. 2); Strip aus `item.content`-Thumbs via `mns-thumb`/Inline; Dots-Menu (Open/Duplicate/Delete) |
| Felder | Items / Duration / Created (Label-Value-Listen) | Items+Dur in Subtitle; Screen-Count-Badge; Shuffle-Badge | Created entfällt aus Card-Body, in Subtitle wandern |
| Default-Badge | `.default-badge` (`--accent`, weiß) | (Referenz kennt kein „default“) | Als `mns-badge tone="accent"` „Default“ erhalten (Produktfeature) |
| Auswahl/Bulk | `select-all` + `selection-checkbox` + `bulk-action-toolbar` | (kein Bulk in Referenz) | **Behalten** (Produktfeature); Checkbox in Card-Header integrieren, `--color-text-secondary` (Z. 79) → `--text-muted` |
| Aktionen | Klick öffnet Editor | Dots-Menu (Open editor / Duplicate / Delete) + „Open“-Btn | Dots-Menu ergänzen; Duplicate ist Referenz-Feature → Offene Entsch. (optional, Backend hat keinen Duplicate-Endpoint → weglassen, nur Open/Delete) |

### B) Editor / Detail-View (inkl. Item-Reorder)

| Aspekt | Ist (`playlist-editor.ts`) | Soll (Referenz Z. 357–523) | Aktion |
|---|---|---|---|
| Back-Button | „Close“-Btn rechts oben | „‹ All playlists“-Button oben links (`--surface`/`--border`) | Back-Button links als `mns-btn variant="outline"` mit `ChevronLeft`-Icon |
| Header | `.editor-header` (Eigen-CSS), Inline-Rename via `input`+Save/Cancel | `mns-card` mit Gradient-Icon-Tile 52×52, Inline-Rename-Input (transparent, fokus → `--surface-2`/`--border-strong`), Badges (Items/Dur/Screens/Shuffle), `Delete`-Btn | Auf `mns-card`; Inline-Rename behalten; Badges via `mns-badge`; `Set as Default`-Btn (Produktfeature) behalten |
| Loop-Preview | — | „Loop preview“-Karte (Offene Entsch. 1) | Option A: neue `playlist-loop-preview.ts` |
| Sequence-Karte | `.items-section` (Eigen-CSS), `border-top:var(--color-border)` (Z. 250) | `mns-card` + `mns-card-head` „Sequence“ / Sub „Drag to reorder…“, `icon="List"`, right = „Add content“-Popover-Btn | Auf `mns-card`+`mns-card-head`; Alt-Token Z. 250 → `--border` (oder via Card-Head entfernt) |
| Item-Row | `.item-row` (`--surface`/`--border`), Drag-Handle `&#9776;`, Thumb, Title+Type, Dauer-`<input number>`, Transition-`<select>`, ms-`<input>`, Remove `&#10005;` | Draggable Row: 6-Punkt-Handle, Index-Nummer (mono), 56×34 Thumb mit Play-Glyph, Title + Typ-Icon, Dauer (Video=fix Pill mit Clock, Bild=`DurStepper`), `TransPicker`, Remove-Trash-Btn; aktiv/`over`/`dragging`-States | Row neu stylen (siehe Offene Entsch. 6/7); Video→fixe Clock-Pill, Bild→Stepper; `mns-select` für Transition; Trash via `mns-icon`/`mns-btn` |
| Reorder-Mechanik | CDK `cdkDropList`/`cdkDrag`, `moveItemInArray`, Persist via `reorderItems` ✓ | HTML5-DnD (clientseitig) | **CDK behalten** (Offene Entsch. 7), nur Optik + CDK-Preview-Tokens (Z. 435–436 `--color-bg-primary`/`--color-accent` → `--surface`/`--accent`) |
| Total-Duration | `.total-duration` Footer (`--surface`/`--border`) | In Header-Badges + Preview-Sub | In `mns-card-head`-Sub oder Header-Badge integrieren; alte Footer-Box entfernen |
| Empty-Items | `.empty-items` Text+Btn | Gestrichelte Box `--border-strong`/`--surface-2`, `+`-Icon + „No items yet…“ | Auf `mns-empty`-ähnlich oder gestrichelte Box mit neuen Tokens |
| Playback-Settings | — | Loop/Shuffle-Toggles + Color-Picker (Offene Entsch. 2/3) | **Weglassen** (Empfehlung) — Folge-Issue |
| Assigned-Screens | — | Karte mit Screen-Liste + Assign-Select (Offene Entsch. 4) | **Weglassen** (Empfehlung) — Zuweisung via Grid-Bulk-Modal |
| Inline-Preview | `.preview-section` (`--color-border` Z. 470), `<img>/<video controls>` | (Referenz: nur Loop-Preview) | Behalten als Klick-auf-Thumbnail-Detail; Alt-Token Z. 470 → `--border`; in `mns-card` packen |

### C) Modals

| Modal | Ist | Soll (Referenz) | Aktion |
|---|---|---|---|
| Delete-Confirm (`playlists.ts` Z. 131–153) | `mns-overlay`+`mns-modal` ✓ | (Bestätigungsdialog) | Fertig; nur `.warning-text` (`playlists.ts` Z. 197–204) Hardcoded-Hex → `--warn` + `--warn`-dim |
| Add-Content (`playlist-add-content-modal.ts`) | `.modal-overlay`/`.modal`, 9 Alt-Tokens, Typ-Filter-Buttons, Thumb-Grid | Referenz: **Such-Popover** (`AddContent` Z. 217–269) — `mns-sinput`-Suche + scrollbare Trefferliste mit Thumb+Name+Add-Icon | Auf `mns-overlay`+`mns-modal` (oder Popover); `mns-sinput` Suche; Liste mit `mns-thumb`; Alt-Tokens → `--surface(-2/-3)`, `--border(-strong)`, `--accent`, `--text(-muted)`. Typ-Filter (All/Images/Videos) als Produktfeature behalten, als `mns-btn variant="soft"`/`ghost`-Toggle |
| Assign-Screen (`playlist-assign-screen-modal.ts`) | `.modal-overlay`/`.modal`, native `<select>` | (kein direktes Pendant; Screen-Liste-Look aus Editor Z. 473–500) | Auf `mns-overlay`+`mns-modal`; native `<select>` → `mns-select` (Optionen aus `screens`); Buttons → `mns-btn`; Spec (`playlist-assign-screen-modal.spec.ts`) prüft `.modal-overlay`-Selektor → mit anpassen |
| New-Playlist (Referenz Z. 528–634) | existiert nicht; Ist hat Inline-`playlist-create-form.ts` | Modal: Header-Icon-Tile, Name-Feld, Farb-Picker, Content-Mehrfachauswahl, Create/Cancel-Footer | Offene Entsch. 5: Inline-Form → `mns-overlay`+`mns-modal` mit `mns-sinput` (Name) + `mns-btn` (Create/Cancel). Farb-Picker + Content-Auswahl optional |

---

## Umsetzung (Phasen)

> Reihenfolge nach Risiko/Abhängigkeit. Nach jeder Phase: `npx nx lint frontend`,
> `npx nx typecheck frontend`, `npx nx test frontend` grün halten (Frontend-Tests sind
> harter CI-Gate, `pool: 'forks'`). Keine `dark:`-Varianten — semantische Tokens nutzen.

### Phase 0 — Vorbereitung & Entscheidungen
- Offene Entscheidungen 1–7 mit dem Auftraggeber klären bzw. Empfehlungen übernehmen
  (Default: Preview=A, color=B-deterministisch, Playback/Assigned-Karten weglassen,
  Create=Modal ohne Item-Auswahl, ms-Stepper behalten, CDK behalten).
- `playlist.model.ts` nur erweitern, falls Entsch. 2/3 → Option A gewählt (sonst keine
  Modell-Änderung).
- Bestätigen: Primitive-Selektoren existieren (`mns-card`, `mns-card-head`, `mns-btn`,
  `mns-badge`, `mns-status-dot`, `mns-icon`, `mns-empty`, `mns-page-header`,
  `mns-select`, `mns-switch`, `mns-sinput`, `mns-sfield`, `mns-thumb`, `mns-overlay`,
  `mns-modal`) — alle in `apps/frontend/src/app/ui/index.ts` exportiert.

### Phase 1 — Token-Sanierung (schnelle, risikoarme Wins)
Reine Suchen-Ersetzen-Schicht, **kein** Strukturumbau, hält Tests grün:
- `playlist-grid.ts` Z. 79: `var(--color-text-secondary)` → `var(--text-muted)`.
- `playlist-editor.ts`: Z. 250 + Z. 470 `var(--color-border)` → `var(--border)`;
  Z. 419 `var(--color-text-muted)` → `var(--text-faint)`; Z. 435 `var(--color-bg-primary)`
  → `var(--surface)`; Z. 436 `var(--color-accent)` → `var(--accent)`.
- `playlist-add-content-modal.ts`: alle `--color-*` (Z. 107, 109, 115, 116, 119, 121,
  132, 133, 141, 156, 157) → `--border`, `--text-muted`, `--hover`, `--text`, `--accent`,
  `--surface`, `--text-faint` (siehe Mapping unten).
- `playlist-create-form.ts`: Z. 41 `--color-bg-secondary`→`--surface`, Z. 42
  `--color-border`→`--border`, Z. 47/48 `--color-shadow`→`--shadow` (oder Box-Shadow
  durch `var(--shadow)` ersetzen).
- `playlists.ts` Z. 197–204: `.warning-text` Hardcoded-Hex → `color:var(--warn)`,
  `background: rgb(245 166 35 / .14)` (warn-dim), `border:1px solid var(--warn)`.

**Token-Mapping (Alt → Neu):**
`--color-bg-primary`→`--surface` · `--color-bg-secondary`→`--surface` (Karten) bzw.
`--surface-2` (verschachtelt) · `--color-bg-tertiary`→`--surface-3` oder `--hover` ·
`--color-border`→`--border` · `--color-text-primary`→`--text` ·
`--color-text-secondary`/`--color-text-muted`→`--text-muted` (bzw. `--text-faint` für
Hints/Icons) · `--color-accent`→`--accent` · `--color-shadow`→ in `var(--shadow)`.

### Phase 2 — Grid-Card auf Primitive (`playlist-grid.ts`)
- `.playlist-card` → `<mns-card hover>`-Wrapper (Selektor `mns-card`, input `hover`,
  `clickable`).
- Gradient-Icon-Tile 44×44 `rounded-[12px]` (Farbe: Offene Entsch. 2 → deterministisch
  aus `playlist.id`).
- Kopf: Name (15.5/700) + Sub „{n} items · {dur}“ (`format.formatDuration(...)`).
- Thumbnail-Strip: erste bis zu 6 `playlist.items[].content` als kleine `mns-thumb`
  (`type='video'` zeigt Play-Glyph) bzw. `<img [src]="thumbUrl(...)">`; leer →
  gestrichelte „Empty“-Box `--border-strong`/`--surface-2`.
- Footer: `mns-badge tone="accent"` Screen/Items + „Open“ als `mns-btn variant="ghost" size="sm"`.
- Dots-Menu (Open editor / Delete) — Duplicate weglassen (kein Backend-Endpoint).
- **Selection/Bulk behalten:** `app-selection-checkbox` + `app-select-all-checkbox`
  + `app-bulk-action-toolbar` weiter einbinden; Checkbox in den Card-Header integrieren,
  `$event.stopPropagation()` auf Klick beibehalten.
- Default-Badge → `mns-badge tone="accent"`.

### Phase 3 — Editor-Grundgerüst (`playlist-editor.ts`)
- Back-Button („‹ All playlists“) als `mns-btn variant="outline"` mit `ChevronLeft`.
- Header → `mns-card` (Flex-Row): Gradient-Icon-Tile 52×52 + Inline-Rename-Input
  (transparent → Fokus `--surface-2`/`--border-strong`) + Badge-Reihe (`mns-badge`:
  Items/Dur/Screens/Shuffle entfällt) + `Set as Default`-Btn (Produktfeature, behalten)
  + `Delete`-Btn (`mns-btn variant="danger"`).
- Sequence-Karte → `mns-card` + `mns-card-head` (title „Sequence“, sub „Drag to reorder ·
  set duration & transition per item“, `icon="List"`, right = Add-Content-Trigger-Btn).
- Total-Duration in Header-Badge oder Card-Head-Sub verlagern; alte `.total-duration`-Box
  entfernen.

### Phase 4 — Item-Row + Reorder-Optik (`playlist-editor.ts`)
- CDK-Struktur (`cdkDropList`/`cdkDrag`/`cdkDragHandle`) **beibehalten** — nur Optik.
- Row-Look: `--surface-2`-Bg, `--border`, `rounded-[12px]`, Hover/Drag-States via
  CDK-Klassen. 6-Punkt-Drag-Handle (Inline-SVG aus Referenz Z. 183 oder `mns-icon` falls
  passendes Icon existiert), Index-Nummer (mono, `--text-faint`), 56×34 Thumb mit
  Play-Glyph für Video.
- Dauer: Video → fixe Pill (Clock-Icon + `mono`-Wert, `--surface`/`--border`), Bild →
  kompakter Stepper (−/Wert/+, `--surface`/`--border-strong`). Stepper ruft weiter
  `durationChange.emit({item,value})`.
- Transition: native `<select>` → `mns-select` (`[options]` aus `TRANSITION_OPTIONS`,
  `[(value)]` → `transitionChange.emit`). ms-Stepper (Offene Entsch. 6) als kompakter
  Stepper behalten, ruft `transitionDurationChange.emit`.
- Remove → `mns-btn variant="ghost"`/Icon-Button mit `Trash` (`--text-faint`, Hover
  `--offline`).
- CDK-Preview/Placeholder-Styles: Alt-Tokens bereits in Phase 1 ersetzt — Preview-Look an
  Row angleichen.

### Phase 5 — Inline-Item-Preview als Karte (`playlist-editor.ts`)
- `.preview-section` → `mns-card` + `mns-card-head` („Preview: {title}“, right = Close-Btn).
- `<img>`/`<video controls>` mit neuen Tokens; max-height beibehalten.

### Phase 6 — Loop-Preview-Karte (nur falls Offene Entsch. 1 → Option A)
- Neue Standalone-Component `playlist-loop-preview.ts` (`OnPush`, signals).
- Portiere `useLoopPlayer` (Referenz Z. 89–132) als Angular: `signal` für `idx`/`elapsed`/
  `playing`, `effect()` + `requestAnimationFrame`, Cleanup via `DestroyRef`/`afterNextRender`.
- Monitor-Frame (16:9), Play/Prev/Next-Buttons (Primary-Gradient für Play), „Now playing“-
  Block, segmentierte Timeline (`flex: item.dur`, klickbar → `seek`).
- `prefers-reduced-motion`: kein Auto-Play/keine rAF-Animation, statisches Frame zeigen.
- Inputs: `items` (`PlaylistItem[]`), `loop` (falls Entsch. 3 = Option B → fix `true`),
  `thumbUrl`/`previewUrl`-Funktionen (wie Editor).

### Phase 7 — Modals & Create-Flow
- **Add-Content** (`playlist-add-content-modal.ts`): `.modal-overlay`/`.modal` →
  `mns-overlay`+`mns-modal` (title „Add content“, icon „Plus“). Suche via `mns-sinput`
  (`icon="Search"`), scrollbare Trefferliste (Thumb + Name + Typ-Sub + Add-Icon).
  Typ-Filter (All/Images/Videos) als `mns-btn`-Toggle behalten. Alt-Tokens (Phase 1)
  schon weg.
- **Assign-Screen** (`playlist-assign-screen-modal.ts`): `.modal-overlay`/`.modal` →
  `mns-overlay`+`mns-modal` (title „Assign to screen“, icon „Screens“/„List“). Native
  `<select>` → `mns-select`; Buttons → `mns-btn`. **Spec mitziehen:**
  `playlist-assign-screen-modal.spec.ts` querySelektiert `.modal-overlay` → auf neue
  Struktur/Testids anpassen (sonst rot).
- **Create-Modal** (Offene Entsch. 5 → Option A): `playlist-create-form.ts` zu einem
  Modal (`mns-overlay`+`mns-modal`, title „New playlist“, icon „List“) umbauen oder durch
  neue Datei ersetzen. `mns-sinput` Name + `mns-btn` Create/Cancel. Parent-Verdrahtung
  (`openCreateForm`/`submitCreate`/`cancelCreate` in `playlists.ts`) bleibt; nur Template-
  Einbindung wechselt. **Spec mitziehen:** `playlist-create-form.spec.ts`.

### Phase 8 — Politur & Done-Check
- Visual-Diff gegen `reference/playlists.jsx` in **dark + light**, Breakpoints 1100/880/560.
- Hover/Focus/Active/Empty/Error-States; Overlays schließen auf `Esc`/Backdrop (via
  `mns-overlay`).
- Keine Console-Errors, kein `--color-*` mehr (`grep -rn "var(--color-" playlists/` =
  leer), kein `.modal-overlay` mehr (`grep -rn "modal-overlay" playlists/` = nur ggf.
  Specs, die mit angepasst wurden).
- `OnPush` + signals; **wichtig (Memory-Lehre):** beim Umbau auf `OnPush` keine
  imperativen Feld-Subscriptions stehen lassen, die die View nicht triggern — State in
  Signals halten oder `ChangeDetectorRef.markForCheck()` (vgl. Audit-Log/Settings-Regression).
- `<mns-icon>`-Host ist `display:contents` — absolute/rotate-Klassen wirken nicht direkt;
  für positionierte Icons (Play-Glyph, Drag-Handle) ein positioniertes `<span>` umhüllen
  (Memory-Lehre).
- Alle Erfolg/Fehler-Rückmeldungen über die globale `ToastService` (kein lokales Banner) —
  bereits so im Container; beibehalten.

---

## Betroffene Dateien

> Pfade absolut ab `apps/frontend/src/app/playlists/`.

### Umbauen (Reskin, Logik weitgehend erhalten)
- `apps/frontend/src/app/playlists/playlists.ts` — `.warning-text`-Tokens (Z. 197–204);
  ggf. Template-Einbindung Create-Modal (Phase 7); Loading-/Error-`<p>` stylen.
- `apps/frontend/src/app/playlists/playlist-grid.ts` — komplett auf `mns-card`/`mns-thumb`/
  `mns-badge`/`mns-btn`, Thumbnail-Strip, Dots-Menu; Alt-Token Z. 79. Selection/Bulk behalten.
- `apps/frontend/src/app/playlists/playlist-editor.ts` — Header/Sequence/Item-Row/Preview
  auf Primitive; Alt-Tokens Z. 250/419/435/436/470; CDK behalten, Optik neu;
  `mns-select` für Transition; Dauer-Stepper.
- `apps/frontend/src/app/playlists/playlist-add-content-modal.ts` — `mns-overlay`+`mns-modal`
  + `mns-sinput`-Suche + Thumb-Liste; alle 9 Alt-Tokens.
- `apps/frontend/src/app/playlists/playlist-assign-screen-modal.ts` — `mns-overlay`+`mns-modal`
  + `mns-select` + `mns-btn`.
- `apps/frontend/src/app/playlists/playlist-create-form.ts` — zu Create-**Modal**
  umbauen (Offene Entsch. 5) bzw. nur reskinnen, falls Option B.

### Neu (nur falls Entscheidung dafür)
- `apps/frontend/src/app/playlists/playlist-loop-preview.ts` — Loop-Preview-Karte
  (nur Offene Entsch. 1 → Option A).

### Specs mitziehen (sonst CI rot)
- `apps/frontend/src/app/playlists/playlist-assign-screen-modal.spec.ts` — `.modal-overlay`-
  Selektor → neue Struktur.
- `apps/frontend/src/app/playlists/playlist-create-form.spec.ts` — bei Modal-Umbau.
- `apps/frontend/src/app/playlists/playlist-editor.spec.ts` — Item-Row-Selektoren/`<select>`
  → `mns-select`.
- `apps/frontend/src/app/playlists/playlist-grid.spec.ts` — `.playlist-card`-Selektoren.
- `apps/frontend/src/app/playlists/playlist-add-content-modal.spec.ts` — Struktur/Selektoren.
- `apps/frontend/src/app/playlists/playlists.spec.ts` — falls Template-Einbindungen ändern.

### Behalten (nicht anfassen)
- `apps/frontend/src/app/playlists/playlist.service.ts` — HTTP-Layer.
- `apps/frontend/src/app/playlists/playlist-format.service.ts` — Formatierung.
- `apps/frontend/src/app/playlists/playlist.model.ts` — nur erweitern, falls Entsch. 2/3
  = Option A (sonst unverändert).

### Entfernen
- Keine Datei ersatzlos entfernen. Falls Create-Modal als **neue** Datei entsteht, wird
  `playlist-create-form.ts` ersetzt (Datei umbenennen/Inhalt austauschen) — keine
  verwaisten Imports zurücklassen (`playlists.ts` Import Z. 6 + `imports`-Array Z. 41).

---

## Risiken / Hinweise

1. **Backend-Lücken (color/loop/shuffle/assigned-screens):** Referenz zeigt vier
   Features, die das aktuelle Datenmodell nicht kennt. Empfehlung: clientseitige Farbe +
   Karten weglassen (Folge-Issues), um in dieser Nacht ohne Migration/Coverage-Gate-Risiko
   zu bleiben. Voll-Treue erfordert Backend-Migrationen (Offene Entsch. 2/3/4).
2. **Frontend-Tests sind harter CI-Gate** (`continue-on-error` entfernt, `pool:'forks'`).
   Jede DOM-Struktur-/Selektor-Änderung muss in der zugehörigen `.spec.ts` nachgezogen
   werden — sonst bricht `nx test frontend`. Specs sind oben pro Datei gelistet.
3. **OnPush-Regression-Falle:** Beim Umbau bestehender Felder auf `OnPush` nicht
   imperative Subscriptions belassen, die die View nicht re-rendern (dokumentierte
   Regression in Audit-Log/Settings). State in Signals; ggf. `markForCheck()`.
4. **`mns-icon` Host = `display:contents`:** Positionier-/Rotate-Klassen am Icon-Host
   wirken nicht — Play-Glyph/Drag-Handle/Trans-Chevron in positionierte `<span>` wrappen.
5. **CDK vs. HTML5-DnD:** CDK behalten (funktioniert + persistiert), nur Optik angleichen.
   `moveItemInArray` + `reorderItems`-Flow in `playlists.ts` (Z. 523–536) unangetastet.
6. **`transitionDurationMs` + größeres Transition-Enum:** Backend hat 8 Transition-Werte
   (inkl. slide-/zoom-Richtungen) und ms-Feld; Referenz nur 5 Werte ohne ms. Funktion
   bewahren (Offene Entsch. 6) statt Referenz-Enum blind übernehmen.
7. **Keine `dark:`-Varianten:** semantische Tokens (`bg-surface`, `text-muted`,
   `border-border`, `text-accent` …) schalten per `<html data-theme>`. Nur Tailwind-
   Utilities, möglichst kein Custom-CSS (CLAUDE.md: TailwindCSS only).
8. **Toast-Konvention:** alle Rückmeldungen über globalen `ToastService` (kein lokales
   Banner); `warning` mappt auf `info` (bereits so in `playlists.ts` Z. 700–703).
9. **Bulk-/Selection-Feature ist Produkt, nicht in Referenz:** beim Card-Reskin nicht
   versehentlich entfernen — `SelectionService`-Provider + Checkboxen + Toolbar bleiben.
10. **Light-Theme + Breakpoints (1100/880/560) im Done-Check** nicht vergessen (CLAUDE.md
    Definition of done).
