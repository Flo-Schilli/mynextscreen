# Schedules Reskin — Umsetzungsplan

**Verzeichnis:** `apps/frontend/src/app/schedules/`
**Design-Referenz:** `docs/design/design_handoff_mynextscreen/reference/schedules.jsx`
**Tokens:** `docs/design/design_handoff_mynextscreen/design-tokens.md`
**Primitive:** `apps/frontend/src/app/ui/` (Barrel: `ui/index.ts`)
**Etablierte Reskin-Referenz im Repo:** `apps/frontend/src/app/screens/screens.ts` (mns-overlay/mns-modal/mns-btn-Muster)

## Aktueller Status (Ist)

Das Feature ist **größtenteils reskinnt**, aber an mehreren Stellen unfertig:

- **Page-Header** vorhanden (`<mns-page-header title="Schedules" icon="Schedules" [sub]=…>`), `schedules.ts:48`.
- **Toolbar** (`schedule-toolbar.ts`) nutzt **rohes `<select>`** (kein `mns-select`), Unicode-Pfeile (`&#8592;`/`&#8594;`) statt `mns-icon`, eigenen Segment-Control und einen Custom `.create-btn` statt `mns-btn`.
- **Kalender-Grid** (`schedule-calendar-grid.ts`) ist eigenständig gestylt (Tag/Woche/Monat, Drag&Drop, Resize, Gap-Indikatoren). Es ist **nicht** das visuelle Vorbild aus der Referenz: kein „now line", keine Lane-Cluster für überlappende Blöcke, keine Konflikt-/Override-Marker, kein heute-Spalten-Highlight im Wochenraster mit `accent-soft`, Unicode-Repeat-Glyph (`&#8634;`) statt Icon, Block-Layout/Typo abweichend.
- **Side-Panel** (`schedule-side-panel.ts`): Custom-Karte statt `mns-card`/`mns-card-head`; entspricht grob dem „Today/UpcomingToday"-Gedanken der Referenz, aber ohne Live-/Override-Badges, ohne Now-Logik, ohne Klick-zu-Edit.
- **Form-Modal** (`schedule-form-modal.ts`): **ALTES `.modal-overlay`-Modal** (rohe `<select>`/`<input>`, `.btn`-Klassen). Das ist das in der Aufgabe genannte verbleibende Alt-Modal. Muss auf `mns-overlay`/`mns-modal` + Primitive umgestellt werden.
- **Smart-Komponente** (`schedules.ts`): noch **nicht** OnPush/Signals — klassische Felder + `subscribe`, Drag mutiert `block.top/height` in-place (Kommentar `schedules.ts:740`–744 verlässt sich bewusst auf Zone-CD).

**Wichtigster konzeptioneller Unterschied Ist↔Referenz:** Die Referenz ist **Org-weit** (alle Screens als 7-Tage-Wochenraster, jeder Eintrag trägt seine eigenen Ziel-Screens, Konflikt-/Live-Override-Erkennung über Einträge hinweg). Das Ist ist **target-gefiltert** (ein Screen/eine Gruppe gleichzeitig via `selectedTargetId`) und kennt Tag/Woche/**Monat** plus echtes Drag&Drop/Resize gegen ein Backend mit Overlap-409. Das ist eine **echte Produkt-/Backend-Divergenz**, nicht nur Styling — siehe Offene Entscheidungen 1.

---

## Offene Entscheidungen

> Jede Entscheidung blockiert Umfang/Architektur. Bitte vor Phase 2 klären. Default-Empfehlung ist jeweils markiert; bei „nur Reskin"-Vorgaben sind alle datenmodell-verändernden Optionen abwählbar.

### 1. Org-weites Wochenraster (Referenz) vs. target-gefilterter Multi-View (Ist)
Die Referenz zeigt **alle Screens gleichzeitig** in einem 7-Spalten-Wochenraster; jeder Block trägt eine Liste von Ziel-Screens (`screenIds`) und einen `name`. Das Ist filtert auf **genau ein** Ziel (`selectedTargetId`, Screen ODER Gruppe), bietet zusätzlich Tag- und Monatsansicht und persistiert Drag/Resize gegen das Backend.

- **Option A (empfohlen): Hybrid — Ist-Datenmodell behalten, Referenz-Optik aufsetzen.** Wochenraster bleibt eine Zeit-y-/Tag-x-Matrix für das gewählte Target; Block-Optik, Now-Line, Lane-Cluster, Konflikt-/Override-Marker aus der Referenz übernehmen. Target-Selector, Tag/Monat-Views, Drag&Drop **bleiben** (sind echte Mehrwerte gegenüber der Referenz). Kein Backend-Umbau. Geringstes Risiko, höchste Wiederverwendung.
- **Option B: Voll-Match — Org-weites Raster.** `name`-Feld pro Schedule, Mehrfach-Screens pro Eintrag, org-weite Konflikt-Engine, Drag&Drop entfallen. Erfordert Backend-Schema (`name`, n:m Screen-Zuordnung) + DTO/Migration. Hoher Aufwand, bricht bestehende Specs/Services.
- **Option C: Org-weites Raster nur visuell, Datenmodell unverändert.** Block-„Name" = Playlist-Name; alle Targets nebeneinander durch zusätzliche Spalten-Gruppierung. Komplexes Layout, fragwürdiger Mehrwert.

**Empfehlung: A.** Match der *Optik* der Referenz, Erhalt der *funktional reicheren* Ist-Architektur (Services, Signals, Backend bleiben).

### 2. Konflikt- & Live-Override-Banner (Referenz `ConflictBanner`/`OverrideBanner`)
Die Referenz erkennt clientseitig Überlappungen (gleicher Screen, gleicher Tag, überlappende Zeit) und Live-Stream-Overrides und zeigt aufklappbare Banner + rote/gelbe Block-Marker.

- **Option A (empfohlen für Voll-Match): Konflikt-Banner clientseitig implementieren** auf Basis der bereits geladenen `entries` (pro Target). Da das Ist sowieso 409-Overlap am Backend hat, ist das eine zusätzliche *visuelle* Vorwarnung. Live-Override braucht Stream-Daten (siehe 3).
- **Option B: Nur Optik, keine Banner.** Banner weglassen; Backend-409 bleibt einzige Konfliktquelle. Schnellster Weg, aber sichtbarer Feature-Verlust ggü. Referenz.

**Empfehlung: A für Konflikt-Banner** (rein clientseitig, kein Backend), **B/defer für Live-Override** bis Stream-Verknüpfung steht (siehe 3).

### 3. Live-Stream-Override-Anzeige
Referenz markiert Schedules, die von einem Live-Stream übersteuert werden (`warn`-Farbe, Stream-Icon, Banner). Das Ist hat keine Verknüpfung Schedule↔aktiver Stream im Frontend.

- **Option A (empfohlen): Defer.** Als eigene Folge-Story; benötigt Endpoint „aktive Streams je Screen/Gruppe". Nicht im Reskin-Scope.
- **Option B: Sofort implementieren** — erfordert `live-stream`-Service-Call + Mapping. Höherer Aufwand, abhängig von Backend-Verfügbarkeit.

**Empfehlung: A (defer).** Warn-Token (`--warn`/`--warn-dim`) im Grid trotzdem vorbereiten (Block-Border/Marker), damit spätere Aktivierung rein datengetrieben ist.

### 4. „One-off" (einmaliger Termin) vs. Recurrence-Modell
Referenz unterscheidet `mode: 'recurring' | 'once'` mit eigenem Datum + `1×`-Marker. Das Ist nutzt `rrule: string | null` (none/daily/weekly/weekdays) mit konkretem `startTime`/`endTime`-Datum.

- **Option A (empfohlen): Mapping ohne Datenmodell-Änderung.** `rrule === null` ⇒ „One-off"-Optik (gestrichelter linker Block-Rand + `1×`-Badge, Referenz `schedules.jsx:251`). Recurrence-UI im Modal als Segmented-Buttons (Repeats weekly / One-off) statt Dropdown, intern weiter auf `RecurrenceType` gemappt.
- **Option B: Eigenes `mode`-Feld + Datum** wie Referenz. Backend-Änderung, redundant zu `rrule`.

**Empfehlung: A.** Nutzt vorhandenen `ScheduleRecurrenceService` unverändert.

### 5. Modal-Breite / Primitive `mns-modal`
`mns-modal` ist auf `max-w-[520px]` fixiert (`overlay.component.ts:68`). Die Referenz nutzt ein **breiteres** Modal (660–680px) mit zweispaltigem Tag/Zeit-Layout, Playlist-Grid und Screen-Liste mit Suche.

- **Option A (empfohlen): `mns-modal` um optionales `width`-Input erweitern** (`maxWidth` als Style-Var; Default 520, Schedule nutzt 680). Kleiner, abwärtskompatibler Primitive-Patch — nutzt allen künftigen Reskins.
- **Option B: Eigenes breites Modal im Feature** (wie Referenz `Modal`-Shell). Dupliziert Overlay-Logik, widerspricht „Primitive einmal bauen".
- **Option C: Inhalt in 520px quetschen** (Felder einspaltig). Verschlechtert UX/Visual-Diff merklich.

**Empfehlung: A.** Patch an `ui/overlay.component.ts` (ein optionales `widthPx`/`maxWidthClass`-Input).

### 6. View-Modi: Tag/Woche/Monat behalten?
Referenz kennt nur **Week** + **List**. Das Ist kennt **Day/Week/Month** (+ Drag&Drop, Side-Panel).

- **Option A (empfohlen): Day/Week/Month behalten**, Segment-Control auf Referenz-Optik bringen (gepolstertes Pill-Segment mit aktiver `bg-surface`+`shadow`, Referenz `schedules.jsx:877`). Mehrwert ggü. Referenz erhalten.
- **Option B: Auf Week + List reduzieren** wie Referenz. Verlust von Tag-/Monatsansicht; bricht Specs.

**Empfehlung: A.** Optik aus Referenz, Funktionsumfang des Ist erhalten.

### 7. Smart-Komponente: OnPush/Signals-Migration jetzt?
`schedules.ts` ist noch zonen-basiert; Drag mutiert Block-Objekte in-place (`schedules.ts:745`–766). Andere Reskins (Audit-Log, Settings — siehe MEMORY) wurden bereits auf OnPush gezogen und hatten dabei Subscribe-Regressionen.

- **Option A (empfohlen): Reskin OHNE OnPush-Migration der Smart-Komponente.** Präsentations-Children (Grid/Toolbar/Side-Panel/Modal) bleiben/werden OnPush + Signals; die Smart-`Schedules` bleibt vorerst zonen-basiert, damit Drag/Resize-In-Place-Mutation funktioniert (Kommentar `schedules.ts:740` respektieren). Geringeres Regressionsrisiko.
- **Option B: Volle OnPush+Signals-Migration** inkl. immutabler Drag-Updates (Signal je Block). Sauberer, aber höheres Risiko + größerer Diff; Drag muss auf immutable umgebaut werden.

**Empfehlung: A** für den Reskin; B als separate Folge-Story (Memory-Eintrag „OnPush + imperative subscribe regression" beachten).

### 8. Farbe-Picker (`PRESET_COLOURS`) vs. Playlist-Farbe
Referenz leitet die Block-Farbe aus der **Playlist** ab (`colorOf`). Das Ist hat einen **eigenen Colour-Picker** pro Schedule (`colour`-Feld + Preset-Swatches + `<input type=color>`).

- **Option A (empfohlen): Colour-Picker behalten**, nur reskin (Swatches als Pills, `accent`-Ring bei Auswahl). `colour`-Feld bleibt im DTO. Kein Backend-Eingriff.
- **Option B: Farbe aus Playlist** wie Referenz — entfernt UI, ignoriert `colour`. Datenmodell-Bruch (Playlist hat im Frontend kein `color` garantiert).

**Empfehlung: A.**

---

## Soll/Ist-Vergleich

### Kalenderansichten (Day / Week / Month)

| Aspekt | Soll (Referenz `schedules.jsx`) | Ist (`schedule-calendar-grid.ts`) | Aktion |
|---|---|---|---|
| Container | `mns-card` mit `padding:0; overflow:hidden`, `CardHead` „Week schedule" + Sub + `Calendar`-Icon + Nav rechts (`:162`–171) | rohe `.time-grid`/`.month-grid` div mit eigenem Border/Shadow | In `mns-card` (pad=false) hüllen, `mns-card-head` für Titel/Nav |
| Border-Radius | `--r-lg` (16) Card, Blöcke `8px` | `--r-xl`(14)/`8px` | Card → `rounded-lg`; Blöcke `rounded-[8px]` ok |
| Wochen-Header heute | Spalte mit `bg: accent-soft`, Text `accent` (`:182`–186) | `.today` nur `accent 8%`-bg + Text | Heute-Spalte: ganze Spalte `accent-soft`, Header-Text/Datum `text-accent` |
| Stundenraster | Gutter 54px, `HOUR_PX=46`, 06:00–23:00, mono `text-faint` Labels (`:111`–199) | Gutter 3.5rem, 24h, `hourHeight=60`, mono `text-faint` | Beibehalten; Labels-Optik passt grob — Token `text-faint` ist schon korrekt |
| Now-Line | accent-Linie 2px + Glow + Punkt, nur heute & in Range (`:218`–223) | **fehlt** | **Neu:** Now-Indikator (computed top, nur sichtbare heutige Spalte) |
| Überlappende Blöcke | Lane-Cluster nebeneinander (`layoutDay`, `:117`–147) | Backend verhindert Overlap (409) → i.d.R. keine Overlaps; kein Lane-Layout | Bei Option-1-A: Lane-Layout optional (rrule-Occurrences können überlappen). Mindestens defensiv lassen |
| Block-Optik | `color-mix 20% surface` bg, linker 3px-Rand (`solid`/`dashed` bei one-off), Border `color-mix 60%`; disabled `surface-2`+opacity .55 (`:236`–256) | Voll-Farbe-bg, `#fff`-Titel + Text-Shadow, 3px Linksrand | **Reskin:** Block-bg auf `color-mix(in srgb, {colour} 20%, var(--surface))`, Titel `text-text`, Zeit mono `text-muted`; linker Rand `dashed` wenn `rrule===null` (one-off) |
| Block-Marker | Konflikt `Alert` rot, Override `Stream` warn, one-off `1×`-Badge, disabled `Power` (`:249`–252) | nur Repeat-Glyph `&#8634;`, Group-Badge | Repeat-Glyph → `mns-icon name="Refresh"`; `1×`-Badge für `rrule===null`; Konflikt-Marker (Entsch. 2) |
| Tag-Ansicht | Referenz hat keine separate Tag-Optik (List+Week) | eigene Day-Spalte | Optik der Week-Spalte wiederverwenden (Entsch. 6A) |
| Monats-Ansicht | Referenz hat keine Monatsansicht | `.month-grid`, Chips pro Tag (`:359`–432) | Reskin: Chips `color-mix 20%`-bg statt Voll-Farbe; today-Badge `accent`; Repeat-Glyph → Icon; Card-Hülle |
| Gap-Indikator | nicht in Referenz | `.gap-indicator` „Fallback playlist" (`:339`–357) | Reskin auf `--warn`-Token (bereits warn-basiert) — Labels/Optik leicht angleichen, behalten |
| Drag/Resize | nicht in Referenz | vorhanden | Behalten; `cursor: grab`/`grabbing` ok |

### Schedule-Block / Event-Darstellung (List/Side-Panel)

| Aspekt | Soll (Referenz) | Ist | Aktion |
|---|---|---|---|
| List-View | `ScheduleCard` Grid + `UpcomingToday`-Rail (`:270`–363, 744–782) | **fehlt** — Ist hat nur Side-Panel neben dem Grid | Entsch. 6A: List-View **optional**. Falls behalten-only-Week: Side-Panel als „Today"-Karte reskinnen |
| Side-Panel Container | `mns-card` + `mns-card-head` „Today" + Clock-Icon, Sub `Weekday · n scheduled` (`:749`–750) | Custom `.side-panel` mit uppercase `<h3>` | In `mns-card`/`mns-card-head` umbauen, Icon `Clock` |
| Side-Panel Item | Zeit mono 46px, Farbpunkt, Name 13.5/700, Live/Override-Badge, „until {end}" (`:761`–776) | Farb-Strich + Name + Target + Zeit | Reskin: Zeit-Spalte mono `text-muted`, Farbpunkt `rounded`, Name `font-bold`; Live-Badge (Entsch. 3 defer) |
| Klick-zu-Edit | Item öffnet Editor (`onOpen`) | Side-Panel-Items nicht klickbar | **Neu:** Item-Klick → `blockEnter`/Edit-Modal |
| Repeat-Marker | n/a (Referenz nutzt one-off-Badge) | `&#8634;` Unicode | → `mns-icon name="Refresh"` |
| Group-Badge | n/a | `G`-Badge | als `mns-badge tone="accent" soft` „Group" |
| Status (active/paused) | StatusDot online/offline + „Active/Paused" + Switch (`:348`–360) | n/a (kein enable/disable im Ist) | Entsch. 2/6: enable/disable existiert im Ist nicht → entfällt, sofern nicht Option B |

### Modals (Create/Edit)

| Aspekt | Soll (Referenz `ScheduleEditor`/`Modal`) | Ist (`schedule-form-modal.ts`) | Aktion |
|---|---|---|---|
| Shell | breites Modal 680px, icon-tile `Calendar`, Titel/Sub, Close ✕, Footer mit Border (`:378`–406, 513–526) | **`.modal-overlay`/`.modal` (Alt-CSS)** | **Ersetzen** durch `mns-overlay`+`mns-modal` (Entsch. 5A: `mns-modal` um `widthPx` erweitern → 680) |
| Schließen | Backdrop-Klick + `Esc` (`:379`–383) | Backdrop-Klick + `Esc` (vorhanden) | `mns-overlay` liefert beides |
| Name-Feld | `SInput`-artig, autofocus (`:527`–530) | Referenz hat Name; **Ist hat kein Name-Feld** (Datenmodell ohne `name`) | Bei Entsch. 1A: kein Name-Feld nötig (Block = Playlist). Optional weglassen |
| Playlist-Wahl | **Grid aus Karten** mit Farbkachel + Items-Count + Check (`:533`–557) | rohes `<select>` | **Reskin:** Playlist als wählbare Karten-Grid (Buttons mit `accent`-Border/`accent-soft`-bg bei Auswahl, Check-Icon) |
| Target-Wahl | Screen-Liste mit Suche + Checkbox + Thumb + StatusDot, Multi-Select (`:613`–648) | rohes `<select>` (single) + Gruppen-Optgroup | Entsch. 1A: single-Target bleibt → `mns-select` (Entsch. nutzt `mns-select` mit optgroup-Ersatz) ODER reskinnte Liste mit Suche (single-select). **Empfehlung:** `mns-select` für Screen/Gruppe |
| When/Recurrence | Segmented „Repeats weekly / One-off" + DayToggle (Mo–So Pills + Presets) ODER Datepicker (`:559`–594, 414–446) | Dropdown none/daily/weekly/weekdays + Checkbox-Reihe | **Reskin:** Recurrence als Segment-Buttons; weekday-Auswahl als Pill-Toggles (`accent`-bg aktiv) + Presets (Daily/Mon–Fri/Weekends); intern auf `RecurrenceType` mappen (Entsch. 4A) |
| Time-Window | zwei `type=time` mono inputs + „→" + Presets-Pills + Invalid-Hint (`:448`–476) | rohe `type=date`+`type=time` (Start/End) | **Reskin:** mono Time-Inputs, Pfeil-Trenner, Preset-Pills, Invalid-Border `--offline`. Date-Inputs behalten (Ist hat echtes Start/End-Datum) |
| Priority | Segment Normal/High mit Icons + Hint (`:596`–611) | **fehlt** (kein `priority` im Datenmodell) | Entsch. 1A: entfällt (kein Backend-Feld). Sonst Backend-Story |
| Colour | n/a (Referenz nutzt Playlist-Farbe) | Swatch-Reihe + `type=color` | Entsch. 8A: behalten, Swatches als Pills + `accent`-Ring |
| Footer-Buttons | `Btn danger` Delete (links) · Spacer · `Btn outline` Cancel · `Btn primary` Save mit Check-Icon, disabled wenn invalid (`:516`–525) | `.btn .btn-danger/.btn-secondary/.btn-primary` | **Reskin:** `mns-btn` (danger/outline/primary), `slot="footer"` wie `screens.ts:132` |
| Validierung | live `valid`-Flag steuert Primary-Button (`:494`–495) | Parent validiert nach Submit (`schedules.ts:580`) | Optik: Save-Button als `ghost`/disabled wenn invalid; Logik kann beim Parent bleiben |
| Info-Box (Split-Gruppe) | n/a | `.info-box`/`.info-box-warn` für Mirror/Split | Reskin auf `--accent`/`--warn` Surface-Token, behalten (echter Mehrwert) |

---

## Umsetzung (Phasen)

> Reihenfolge so gewählt, dass jede Phase isoliert lauffähig + testbar ist. Specs (`*.spec.ts`) nach jeder Phase anpassen/grün halten. Annahme: **Offene Entscheidungen 1A, 2A, 3A(defer), 4A, 5A, 6A, 7A, 8A** (Reskin-Optik, minimaler Backend-Eingriff). Abweichungen bitte vor Phase 2 markieren.

### Phase 0 — Primitive vorbereiten (Voraussetzung)
1. `ui/overlay.component.ts`: `mns-modal` um optionales Breiten-Input erweitern (Entsch. 5A). Z.B. `widthPx = input<number>(520)` und `max-w-[520px]` durch `[style.maxWidth.px]="widthPx()"` ersetzen. Default unverändert → keine Regression bei `screens.ts`.
2. Verifizieren: `npx nx test frontend` (screens-Modal-Spec bleibt grün).

### Phase 1 — Toolbar reskinnen (`schedule-toolbar.ts`)
1. Target-`<select>` → `mns-select` (`ui/select.component.ts`). Da `mns-select` keine optgroups kennt: Optionen flach mit Präfix („Screen · …" / „Group · …") oder zwei `mns-select`. **Empfehlung:** ein `mns-select` mit Label-Präfix; `id="targetSelect"` für Specs am Wrapper erhalten.
2. Nav-Pfeile → `mns-icon name="Chevron"` (rechts normal, links `rotate(180deg)`); „Today" als `mns-btn variant="outline" size="sm"`.
3. View-Segment: Optik exakt an Referenz `:877` (Pill-Container `bg-surface-2 border-border rounded-[11px] p-[3px]`, aktiver Button `bg-surface text-text shadow`, inaktiv `text-muted`). Day/Week/Month bleiben.
4. Create-Button → `mns-btn variant="primary" icon="Plus"` „New schedule", `ml-auto`.
5. Tailwind-Utilities statt der `styles`-Blöcke verwenden (Token-Klassen `bg-surface-2`, `border-border`, `text-muted` …). `id`/Selektoren für `schedule-toolbar.spec.ts` prüfen/erhalten.

### Phase 2 — Form-Modal ersetzen (`schedule-form-modal.ts`) — größtes Stück
1. `.modal-overlay`/`.modal` entfernen; in `mns-overlay (closed)="dismiss.emit()"` + `mns-modal title=… icon="Calendar" [widthPx]="680"` wrappen (Muster: `screens.ts:124`–149).
2. Playlist-Auswahl als **Karten-Grid** (Buttons, `accent`-Border + `accent-soft`-bg + Check bei Auswahl) — Referenz `:533`–557.
3. Target: `mns-select` (single) mit Screen/Gruppen-Optionen; Split-Info-Box reskin (`--accent`/`--warn` Surfaces).
4. Recurrence: Segment-Buttons (Repeats weekly / One-off) → mappt auf `RecurrenceType` (`none`=one-off, sonst weekly/weekdays). Weekday-Pills + Presets (Entsch. 4A). `ScheduleRecurrenceService` **unverändert** weiternutzen.
5. Time-Window: mono `type=time`-Inputs + „→"-Trenner + Preset-Pills + Invalid-Border. Start/End-**Datum** als kleinere Date-Inputs behalten.
6. Colour-Swatches als Pills + `accent`-Ring (Entsch. 8A).
7. Footer: `mns-btn` danger/outline/primary in `slot="footer"`.
8. Inputs/Outputs (`save`/`remove`/`dismiss` + alle `initial*`) **unverändert** lassen → Parent `schedules.ts` muss nicht angefasst werden. `schedule-form-modal.spec.ts` an neue DOM-Struktur anpassen.

### Phase 3 — Kalender-Grid reskinnen (`schedule-calendar-grid.ts`)
1. Grid in `mns-card` (pad=false, `overflow-hidden`) + `mns-card-head` (Titel/Sub/Nav) hüllen — Nav kann auch in Toolbar bleiben; Referenz hat sie im Card-Head. **Empfehlung:** Card-Head-Titel „Week schedule" + Sub-Range, Nav bleibt in Toolbar (Ist-Architektur).
2. Heute-Spalte: ganze Spalte `accent-soft`, Header `text-accent`.
3. **Now-Line** ergänzen (computed `topPx` aus aktueller Zeit × `hourHeight`; nur heutige Spalte, nur wenn in sichtbarem Stundenbereich). Accent-Linie + Glow + Punkt.
4. Blöcke reskinnen: bg `color-mix(in srgb, {colour} 20%, var(--surface))`, Titel `text-text`, Zeit mono `text-muted`, linker 3px-Rand (`solid`, bei `rrule===null` `dashed` + `1×`-Badge). Repeat-Glyph `&#8634;` → `mns-icon name="Refresh"`.
5. Konflikt-Marker (Entsch. 2A): clientseitige Overlap-Erkennung über `entries` → roter Block-Border + `Alert`-Icon. Warn/Override-Marker als `--warn`-Border vorbereiten (Entsch. 3 defer, datengetrieben).
6. Monats-Chips reskin: `color-mix 20%`-bg, Repeat-Icon, today-Badge `accent`.
7. Gap-Indikator behalten, Optik leicht angleichen (`--warn`-Token bereits genutzt).
8. Drag/Resize-Handles + In-Place-Mutation **unangetastet** lassen (Entsch. 7A). `schedule-calendar-grid.spec.ts` anpassen.

### Phase 4 — Side-Panel reskinnen (`schedule-side-panel.ts`)
1. Custom-Karte → `mns-card` + `mns-card-head` „Today"/`Clock`-Icon, Sub `Weekday · n scheduled`.
2. Items: mono Zeit-Spalte `text-muted`, Farbpunkt, Name `font-bold`, „until {end}". Repeat-/Group-Marker als Icon/`mns-badge`.
3. Items klickbar → neuer Output `entryClick` → Parent öffnet Edit (Referenz `onOpen`). `schedule-side-panel.spec.ts` anpassen.

### Phase 5 — Smart-Komponente angleichen (`schedules.ts`)
1. Inline-`styles` (`.slice-status`, `.calendar-layout`) auf Token-Utilities prüfen; `slice-status` auf `mns`-konforme Surface/Tokens.
2. Falls Side-Panel `entryClick` ergänzt: Handler verdrahten (öffnet `openEditModal`).
3. **Kein** OnPush-Umbau (Entsch. 7A) — Kommentar `schedules.ts:740` respektieren.
4. Page-Header bleibt; Sub-Text ggf. an Referenz-Stil angleichen (`n schedules · m active`).

### Phase 6 — Verifikation
1. `npx nx run-many -t lint typecheck test --projects=frontend` grün.
2. `npx nx build frontend` ohne Fehler.
3. Visueller Abgleich dark+light gegen `schedules.jsx` (Now-Line, Block-bg, Modal, Toolbar-Segment).
4. `format:check` vor Commit (Memory: langer Tailwind-Token-Umbruch hat schon Main gebrochen).

---

## Betroffene Dateien (reale Pfade)

### Umbauen (Reskin, Logik weitgehend erhalten)
- `apps/frontend/src/app/schedules/schedule-toolbar.ts` — Phase 1 (mns-select, mns-btn, mns-icon, Segment-Optik).
- `apps/frontend/src/app/schedules/schedule-form-modal.ts` — Phase 2 (Alt-`.modal-overlay` → `mns-overlay`/`mns-modal`; größter Diff).
- `apps/frontend/src/app/schedules/schedule-calendar-grid.ts` — Phase 3 (Now-Line, Block-bg, Marker, Card-Hülle, Icons).
- `apps/frontend/src/app/schedules/schedule-side-panel.ts` — Phase 4 (mns-card/card-head, klickbar).
- `apps/frontend/src/app/schedules/schedules.ts` — Phase 5 (Styles/Tokens, ggf. entryClick-Handler).

### Patchen (Primitive, abwärtskompatibel)
- `apps/frontend/src/app/ui/overlay.component.ts` — `mns-modal` optionales `widthPx`-Input (Phase 0, Entsch. 5A).

### Specs anpassen (parallel zu jeweiliger Phase)
- `apps/frontend/src/app/schedules/schedule-toolbar.spec.ts`
- `apps/frontend/src/app/schedules/schedule-form-modal.spec.ts`
- `apps/frontend/src/app/schedules/schedule-calendar-grid.spec.ts`
- `apps/frontend/src/app/schedules/schedule-side-panel.spec.ts`
- `apps/frontend/src/app/schedules/schedules.spec.ts`

### Unverändert (Logik wiederverwenden — NICHT anfassen)
- `apps/frontend/src/app/schedules/schedule.service.ts` (HTTP-CRUD)
- `apps/frontend/src/app/schedules/schedule.model.ts` (Typen)
- `apps/frontend/src/app/schedules/schedule-calendar.service.ts` (Block-/Month-/Timeline-Berechnung)
- `apps/frontend/src/app/schedules/schedule-recurrence.service.ts` (RRULE-Mapping)
- deren `*.spec.ts` (sofern Verhalten unverändert)

### Neu (optional, nur bei gewählter Option)
- *(keine neuen Dateien bei Empfehlungs-Set 1A/2A/3A/4A/5A/6A/7A/8A)* — Konflikt-Erkennung (Entsch. 2A) kann als kleine Methode in `schedule-calendar.service.ts` ergänzt werden statt eigener Datei. Eigene Banner-Komponente (`schedule-conflict-banner.ts`) nur falls Banner wie Referenz gewünscht.

---

## Risiken / Hinweise

1. **`mns-modal`-Breiten-Patch betrifft alle Konsumenten.** `widthPx` mit Default 520 belassen, sonst bricht `screens.ts`/dessen Spec. Verifizieren via `screens.spec.ts:437` (`mns-modal`-Query).
2. **OnPush-Falle (Memory: „OnPush + imperative subscribe regression").** Smart-`Schedules` bewusst zonen-basiert lassen (Entsch. 7A); Drag mutiert Block-Objekte in-place (`schedules.ts:740`–766). Würde man Children auf OnPush + immutable ziehen, MUSS Drag auf Signal/immutable umgestellt werden — sonst „eingefrorene" Blöcke.
3. **`mns-icon` ist `display:contents` (Memory).** Rotations-/Positions-Klassen direkt am `<mns-icon>` werden ignoriert — für Chevron-180°/Now-Punkt in positionierten `<span>` wrappen bzw. `[style.transform]` am Icon nutzen (wie `mns-select` es macht, `select.component.ts:50`–53).
4. **`format:check` ist harter CI-Gate (Memory).** Lange Tailwind-Token-Ketten brechen beim Auto-Wrap die HTML-Struktur — Prettier lokal laufen lassen, nicht manuell umbrechen.
5. **Frontend-Tests sind harter Gate** (kein `continue-on-error`). Jede Phase die Specs synchron halten; `pool: 'forks'` ist gesetzt (TestBed-Isolation).
6. **Org-weite Referenz ≠ target-gefiltertes Ist (Entsch. 1).** Konflikt-/Override-/Lane-Features der Referenz sind teils nur sinnvoll bei mehreren überlappenden Einträgen; im target-gefilterten Ist mit Backend-Overlap-409 sind Overlaps selten. Konflikt-Erkennung daher als *visuelle Vorwarnung* (clientseitig) verstehen, nicht als neue Quelle der Wahrheit.
7. **`mns-select` kennt keine `<optgroup>`.** Screen/Gruppen-Trennung der Referenz/Ist muss über Label-Präfixe oder zwei Selects gelöst werden. `id="targetSelect"`/`id="modalTarget"` für Specs am Wrapper erhalten.
8. **Toolbar-Specs hängen an konkreten Selektoren/Texten** (`schedule-toolbar.spec.ts`). Bei Umbau auf Primitive Buttons/Labels prüfen, dass Test-Hooks (z.B. „Today", view-Buttons) weiter auffindbar bleiben.
9. **Live-Override (Entsch. 3) bewusst deferred** — Warn-Token im Grid trotzdem vorbereiten, damit spätere Aktivierung rein datengetrieben ohne erneutes Reskin geht.
10. **Recurrence-Mapping (Entsch. 4A):** „One-off" = `rrule===null`. Sicherstellen, dass das Modal beim Wechsel One-off↔weekly die `weekdays` korrekt zurücksetzt (sonst sendet `buildRrule` inkonsistente RRULEs).
