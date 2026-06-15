# Content Reskin — Umsetzungsplan

Reskin der Content-Library auf das myNextScreen-Design.

- **Verzeichnis:** `apps/frontend/src/app/content/`
- **Referenz-Spec:** `docs/design/design_handoff_mynextscreen/reference/content.jsx`
- **Etablierte Reskin-Referenz (Vorbild für Container-/Primitive-Muster):**
  `apps/frontend/src/app/screens/` + `docs/design/design_handoff_mynextscreen/SCREEN-GROUPS-RESKIN-PLAN.md`

## Aktueller Status — fertig vs. offen

Die View ist **teilreskinnt**. Bestandsaufnahme pro Datei:

| Datei | Reskin-Status | Tokens | Modal-Pattern |
| --- | --- | --- | --- |
| `content-library.ts` | **Teilweise fertig** — nutzt `mns-page-header`, `mns-empty`, `mns-overlay`+`mns-modal` (Delete-Confirm), `mns-btn`; eigene `.type-toggle`/`.tag-filter`-Chips noch custom, aber bereits auf **neuen** Tokens (`--surface-2/-3`, `--border`, `--accent`, `--text-muted/-faint`) | neu ✅ | `mns-overlay`/`mns-modal` ✅ (1 Modal) |
| `content-storage-bar.ts` | **Teilweise** — eigenes CSS, aber bereits **neue** Tokens (`--surface-2/-3`, `--border`, `--accent`, `--text-muted`); ein Hardcode `#8b5cf6` für „transcoded" | neu (1 Hardcode) | — |
| `content-grid.ts` | **Teilweise** — eigenes CSS auf **neuen** Tokens (`--surface-2/-3`, `--border`, `--accent`, `--text-faint/-muted`, `--shadow`); Hardcodes `#1a1a2e`, `#fbbf24`, `#ef4444`, `rgba(...)`-Overlay; HTML-Entity-„Icons" statt `mns-icon` | neu (Hardcodes) | — |
| `content-detail.ts` | **NICHT reskinnt** — durchgehend **alte** `var(--color-*)`-Tokens, `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-danger`-Klassen, eigene `.status-badge`/`.progress-bar`, Status-Hardcodes (`#22c55e`, `#f59e0b`, `#ef4444`) | **alt** ❌ | — |
| `content-upload-zone.ts` | **NICHT reskinnt** — **alte** `var(--color-*)`-Tokens, `.btn`/`.btn-primary`, Hardcodes (`#22c55e`, `#ef4444`, `rgba(59,130,246,…)`) | **alt** ❌ | — |
| `content-tag-modal.ts` | **NICHT reskinnt** — **alte** `var(--color-*)`-Tokens, **eigenes `.modal-overlay`/`.modal`**, `.btn`-Klassen, `.tag-chip` | **alt** ❌ | **alt `.modal-overlay`** ❌ |
| `content-playlist-modal.ts` | **NICHT reskinnt** — **alte** `var(--color-*)`-Tokens, **eigenes `.modal-overlay`/`.modal`**, `.btn`-Klassen | **alt** ❌ | **alt `.modal-overlay`** ❌ |
| `content-filter.service.ts` / `content-format.service.ts` / `content.service.ts` / `content.model.ts` | reine Logik, kein Styling | — | — |
| `*.spec.ts` | folgen den jeweiligen Komponenten | — | — |

**Verifiziert per grep im Verzeichnis:**
- `var(--color-*)` noch in **4 Dateien**: `content-detail.ts`, `content-upload-zone.ts`, `content-tag-modal.ts`, `content-playlist-modal.ts`.
- `.modal-overlay` noch in **2 Modals**: `content-tag-modal.ts`, `content-playlist-modal.ts` (+ deren `content-tag-modal.spec.ts`).
- `mns-overlay` bereits in **1 Modal** verwendet: das Delete-Confirm-Modal in `content-library.ts`.
- `mns-page-header` ist im `content-library.ts` vorhanden.

**Wichtige Architektur-Beobachtung:** Die reale App und die Referenz weichen **strukturell** voneinander ab — das ist mehr als ein Token-Tausch. Siehe „Offene Entscheidungen". Das Design der Card (`content.jsx › ContentCard`) zeigt **pro Karte zwei Storage-Bars (Original/Transcoded)**, ein **3-Punkt-Aktionsmenü** (Storage-details / Re-transcode / Clear transcoded / Delete), **Usage-Badges** (Playlists/Screens/„Not in use") und einen **„Needs transcoding"-Badge**. Die reale App rendert stattdessen eine schlichte Thumbnail-Card mit Checkbox + Bulk-Toolbar + eigener Detail-Vollansicht (`content-detail.ts`). Reference und reale App teilen also nur das grobe Konzept, nicht die Interaktion.

---

## Offene Entscheidungen

> Jede Entscheidung mit Optionen + Empfehlung. **Nichts stillschweigend annehmen** — ein
> Folgeagent darf nur mit getroffener Entscheidung an die strittigen Punkte (1, 2, 3, 4).
> Punkte 5–9 sind Detailentscheidungen mit klarer Empfehlung und dürfen ohne Rückfrage
> nach Empfehlung umgesetzt werden.

### 1. Reskin-Tiefe: reines Restyling vs. volle Design-Treue der Card

Die Referenz-Card (`content.jsx › ContentCard`, Z. 156–207) hat pro Karte: Thumb mit
Type-Badge, „Needs transcoding"-Warn-Badge, Titel + Dauer/„still image", **3-Punkt-CardMenu**,
**zwei Storage-Bars (Original grau / Transcoded accent)** mit mono-Größen, **Usage-Badges**.
Die reale Card (`content-grid.ts`) hat: Thumb (echtes `<img>`/Video-Placeholder),
Auswahl-Checkbox, Transcoding-Overlay, Titel + „type · size". Plus separate Bulk-Toolbar.

- **Option A — Reines Restyling (Tokens + Primitive, Funktion unverändert):** Nur Hardcodes/alte
  Tokens raus, `mns-card`/`mns-badge`/`mns-bar`/`mns-thumb`/`mns-icon` einsetzen, Auswahl-/Bulk-/
  Detail-Flow **unverändert**. Kleinster Aufwand, geringes Risiko, Tests bleiben weitgehend.
- **Option B — Volle Design-Treue der Card (CardMenu + 2 Storage-Bars + Usage-Badges):** Card
  nähert sich `content.jsx` an. Erfordert pro Item **Daten, die das Backend heute nicht liefert**
  (Renditions-Liste, Playlist-Nutzung, Screen-Count, „cleared"-Zustand) → siehe Entscheidung 2 & 3.
  Bestes visuelles Ergebnis, deutlich höherer Aufwand inkl. Backend.
- **Option C — Hybrid:** Card visuell an Referenz angleichen, aber nur mit **vorhandenen** Daten
  (echtes Thumbnail, Type-Badge, Transcoding-Status-Badge, **eine** Original-Bar relativ zum
  größten Item, Tags als Badges). CardMenu nur mit real existierenden Aktionen (Details/Delete).
  Behält Bulk-Selection bei. Guter Mittelweg ohne Backend-Zwang.

**Empfehlung:** **Option C.** Maximale optische Annäherung an `content.jsx` ohne Backend-Blocker;
echte Thumbnails statt Gradient-Mock sind sogar besser als die Referenz. Volle Design-Treue (B)
nur, wenn Entscheidung 2 + 3 bewusst „ja" sind.

### 2. „Clear transcoded files" / „Re-transcode" — Backend-Feature einführen?

`content.jsx` bietet pro Item „Clear transcoded files" (Renditions löschen, Original behalten)
und „Re-transcode now". Die reale App kennt das **nicht** (`content.service.ts` hat nur
`delete`, `bulkDelete`, `updateMetadata`, `reUpload`, `upload`). Kein Endpoint, kein
„cleared"-Flag im Schema.

- **Option A — Weglassen:** CardMenu/ConfirmModal ohne Clear/Re-transcode; nur Details + Delete.
- **Option B — Voll implementieren:** Backend `content`-Modul + Schema (`transcodedClearedAt`?),
  Endpoints `POST …/content/:id/clear-transcoded` + `…/retranscode`, BullMQ-Job-Trigger,
  Storage-Recompute, Audit-Log, SSE; Frontend-Service + Card + ConfirmModal. Großer Scope.

**Empfehlung:** **Option A (weglassen)** in diesem Reskin. Clear/Re-transcode ist ein
eigenständiges Produkt-Feature (separater PR mit Backend, Tests, Audit-Log), kein Styling.
Falls dennoch gewünscht → Entscheidung 1=B und Punkt 2=B zusammen planen.

### 3. Usage-Badges (Playlists / Screens / „Not in use") auf der Card

`content.jsx` zeigt pro Item, in welchen Playlists und auf wie vielen Screens es genutzt wird.
Diese Daten liefert `Content` (`content.model.ts`) heute **nicht**.

- **Option A — Weglassen:** Card zeigt stattdessen die vorhandenen **Tags** als `mns-badge` (Tags
  sind real vorhanden) — passt visuell zur Badge-Reihe der Referenz.
- **Option B — Backend liefert Usage:** `getAll` um `usedInPlaylists: string[]` + `screenCount`
  erweitern (Join über playlist_items + aktive Schedules). Mehr Query-Last, mehr Tests.

**Empfehlung:** **Option A** — Tags statt Usage. Visuell äquivalente Badge-Reihe, keine
Backend-Änderung, Tags sind ein echtes, schon gefiltertes Datenfeld.

### 4. Status-Filter (Transcoded / Needs transcoding) zusätzlich zum Type-Filter

`content.jsx` hat **zwei** Filtergruppen mit Counts: Type (All/Images/Videos) **und** Status
(Any/Transcoded/Needs transcoding), getrennt durch einen vertikalen Divider. Real existiert nur
der Type-Toggle (`filterType`) + Tag-Filter; `transcodingStatus` ist pro Item vorhanden, aber
nicht als Filter.

- **Option A — Status-Filter ergänzen (rein clientseitig):** `ContentFilterService.filterContents`
  um `status?: 'ready'|'needs'` erweitern (`ready` = `transcodingStatus==='completed'`, `needs` =
  `!== 'completed'`). Counts wie in der Referenz anzeigen. Kleiner, gut testbarer Service-Zusatz.
- **Option B — Nur Type + Tags wie bisher:** Keine neue Filterachse; näher am Ist, weiter vom
  Referenz-Design.

**Empfehlung:** **Option A** — billiger Service-Zusatz, bringt die Filterzeile sehr nah an die
Referenz und ist rein clientseitig (Daten liegen vor).

### 5. Filter-Chips als lokale Komponente vs. vorhandene Primitive

`content.jsx` nutzt eine inline `Chip`-Funktion (Pille mit aktiv/inaktiv, optionalem Icon +
mono-Count). In `app/ui/` gibt es **keinen** Chip/SegmentedControl. Real existiert eine custom
`.type-toggle` (Segmented) + `.tag-chip`.

- **Option A — Lokale `content-filter-chip`-Komponente** (presentational, `active`/`icon`/`count`)
  im content-Verzeichnis, genau wie `content.jsx › Chip`.
- **Option B — Inline im Container** mit Tailwind-Utilities (kein neues File).

**Empfehlung:** **Option A** (kleine lokale Komponente) — DRY über Type/Status/Tags hinweg,
gut testbar, kein zu generisches `app/ui/`-Teil ohne zweiten Konsumenten (YAGNI).

### 6. Detail-Ansicht: Vollseiten-View beibehalten vs. an Referenz angleichen

`content.jsx` hat **keine** eigene Vollseiten-Detailansicht — Details laufen über ein kompaktes
`DetailsModal` (Storage-Aufschlüsselung). Die reale App hat eine reichhaltige
`content-detail.ts`-Vollansicht (Preview, Metadaten-Edit, Re-upload, File-Info, Delete) — ein
**echtes Feature**, das die Referenz nicht abbildet.

- **Option A — Vollansicht behalten, nur reskinnen:** alte `--color-*`/`.btn` → neue Tokens +
  `mns-card`/`mns-card-head`/`mns-btn`/`mns-badge`/`mns-bar`/`SInput`/`SField`. Funktion 1:1.
- **Option B — Auf Referenz-`DetailsModal` reduzieren:** Metadaten-Edit/Re-upload verlieren → klarer
  Funktionsverlust. **Nicht empfohlen.**

**Empfehlung:** **Option A** — Vollansicht ist mehr Funktion als die Referenz; nur restylen.
Status-Badge → `mns-badge` (tone: `online`/`warning`/`offline` je Status), Progress →
`mns-bar`, Formfelder → `mns-sfield` + `mns-sinput` (Textarea bleibt custom, da kein Primitive).

### 7. Tag-Modal & Playlist-Modal: Wrapper-Tausch

Beide nutzen das **alte** `.modal-overlay`/`.modal`. Ziel: `mns-overlay` + `mns-modal`
(Footer-Slot, Gradient-Header-Icon) — analog Delete-Confirm im `content-library.ts`.

- **Option A — Auf `mns-overlay`/`mns-modal` umstellen** (wie Screen-Groups-Plan Phase D).
- **Option B — Nur Tokens tauschen, Wrapper lassen.** Inkonsistent zum Rest. **Nicht empfohlen.**

**Empfehlung:** **Option A.** Tag-Modal: `mns-modal title="Add/Remove Tags" icon="Tag"`,
Suggestions als Filter-Chips, Buttons in `[slot=footer]`. Playlist-Modal:
`mns-modal title="Add to Playlist" icon="Playlists"`, Radio-Liste, Footer-Buttons.
**Hinweis:** `content-tag-modal.spec.ts` testet auf `.modal-overlay` → Specs mit umstellen.

### 8. Storage-Bar (`content-storage-bar.ts`): `mns-bar` vs. custom 2-Segment-Bar

`mns-bar` rendert **eine** Fill-Spur. Die Storage-Bar braucht **zwei** Segmente (Original +
Transcoded nebeneinander) mit Legende.

- **Option A — Custom-Bar behalten, nur Hardcode `#8b5cf6` → `var(--accent-2)`** und in `mns-card`
  einbetten (CardHead „Storage"). Minimal, korrekt zweisegmentig.
- **Option B — Zwei gestackte `mns-bar`** — passt nicht sauber (nebeneinander, nicht gestapelt).

**Empfehlung:** **Option A** — custom Zwei-Segment-Bar beibehalten, `#8b5cf6` → `var(--accent-2)`
(zweite Akzentfarbe, exakt wie `content.jsx` „transcoded"), in `mns-card` mit `mns-card-head`
„Storage" verpacken. `ContentFormatService`-Math unverändert.

### 9. Card-Thumbnail: `mns-thumb` (Gradient) vs. echtes `<img>`

`mns-thumb` zeigt einen **Gradient**-Platzhalter (Mock-Design). Die reale Card zeigt echte
Bild-/Video-Previews.

- **Option A — Echtes `<img>`/Video behalten** (besser als Mock), nur Container/Badges/Overlay auf
  Tokens + `mns-badge` + `mns-icon`; `mns-thumb` **nicht** verwenden.
- **Option B — `mns-thumb`** — würde echte Previews durch Gradient ersetzen → schlechter.

**Empfehlung:** **Option A.** `mns-thumb` ist für die Mock-Welt gedacht; echte Previews behalten,
Badges (Type/Status) via `mns-badge`, Play-/Image-Icon via `mns-icon`.

---

## Soll/Ist-Vergleich

### Main-View — Grid + Filter (`content-library.ts`, `content-grid.ts`, `content-storage-bar.ts`)

| Aspekt | IST | SOLL (`content.jsx › ContentPage/ContentCard`) | Quelle |
| --- | --- | --- | --- |
| Page-Header | `mns-page-header title="Content Library" icon="Image"` ✅; Type-Toggle als `<slot>` | `PageHeader` `title="Content Library"`, `sub` = `{n} items · {orig} original · {trans} transcoded`, `actions`=Upload-Btn | jsx Z. 258–259 |
| Header-Action | kein Upload-Button im Header (Upload nur via Drop-Zone) | **`mns-btn primary icon="Upload"`** im Header | jsx Z. 259 |
| Filterzeile | custom `.type-toggle` (Segmented, neue Tokens) + separate `.tag-filter` | Zwei Chip-Gruppen mit mono-Counts: Type (All/Images/Videos) **+** Divider **+** Status (Any/Transcoded/Needs) | jsx Z. 247–280 |
| Filter-Chip | `.toggle-btn`/`.tag-chip` custom | Pille: aktiv `border-accent bg-accent-soft text-accent`, inaktiv `border-border bg-surface text-muted`, optional Icon + `<span class="mono opacity-70">{count}</span>` | jsx Z. 249–254 |
| Storage-Bar | `content-storage-bar.ts` (neue Tokens, custom 2-Segment, `#8b5cf6` hardcoded) | im Original keine separate Bar (Totals stehen im Header-`sub`); real behalten + reskinnen | jsx Z. 258 vs. Ist |
| Grid | `repeat(auto-fill, minmax(14rem,1fr))`, `gap 1rem` | `repeat(auto-fill, minmax(244px,1fr))`, `gap: var(--gap)` | jsx Z. 287 |
| Card-Container | `.content-card` (neue Tokens, `--shadow`, hover→`--accent`) | `mns-card pad=false` (border/rounded-lg/shadow), `overflow:visible` für Menu | jsx Z. 160 |
| Card-Thumb | echtes `<img loading=lazy>` / Video-Placeholder (HTML-Entity ▶) / `📷` | Gradient-`Thumb` (Mock); real = echte Preview behalten | jsx Z. 162 / Entsch. 9 |
| Type-Badge | — | `mns-badge neutral icon="Video"/"Image"` auf Thumb (top-left) | jsx Z. 163 |
| „Needs transcoding"-Badge | Transcoding-**Overlay** (`rgba`-Dim + `#fbbf24`-Text/Bar) | `mns-badge warning icon="Alert"` top-right + (real) Overlay-Progress behalten | jsx Z. 164–168 |
| Card-Titel/Meta | `.card-title` + `.card-meta` („type · size") | Titel 14/700 + mono Dauer/„still image" | jsx Z. 172–175 |
| Card-Aktionen | Auswahl-Checkbox + globale Bulk-Toolbar | **3-Punkt-CardMenu** (Details/Re-transcode/Clear/Delete) | jsx Z. 17–53 / Entsch. 1,2 |
| Storage pro Card | — | **2 Mini-Bars** Original (`text-faint`) + Transcoded (`accent`/„cleared") | jsx Z. 181–196 / Entsch. 1 |
| Usage/Tags | — (Tags nur als Filter) | Usage-Badges (Playlists/Screens/„Not in use"); real → **Tags** als `mns-badge` | jsx Z. 199–203 / Entsch. 3 |
| Empty (leer) | `mns-empty icon="Image"` ✅ | `Empty icon=Content` in `Card`, Action=Upload-Btn | jsx Z. 211–218 |
| Empty (kein Treffer) | (zeigt generisches `mns-empty`) | `Empty icon=Filter title="No matching media"` | jsx Z. 282–285 |
| Loading/Error | `<p class="loading-text">` / `<p class="error">` | token-konforme States (`text-muted`) | Ist |
| Overlay-Hardcodes | `#1a1a2e`, `#fbbf24`, `#ef4444`, `rgba(0,0,0,.6)`, `rgba(255,255,255,.2)` | Tokens: `--warn`, `--offline`, `--surface-3`; Texte via `mns-badge` | content-grid.ts Z. 130–165 |
| Storage-Bar-Hardcode | `#8b5cf6` (transcoded) | `var(--accent-2)` | content-storage-bar.ts Z. 92,121 |

### Upload / Detail (`content-upload-zone.ts`, `content-detail.ts`)

| Aspekt | IST | SOLL | Quelle |
| --- | --- | --- | --- |
| Upload-Zone Tokens | **alte** `var(--color-border/-accent/-text-secondary/-text-muted/-bg-tertiary/-bg-secondary)` | neue Tokens: `--border-strong` (dashed), `--accent`, `--text-muted/-faint`, `--surface-2/-3` | upload-zone Z. 65–145 |
| Upload-Zone drag-over | `rgba(59,130,246,0.05)` + `--color-accent` | `bg-accent-soft` + `border-accent` | upload-zone Z. 76–79 |
| Upload-Button | `.btn .btn-primary` | `mns-btn variant="primary" icon="Upload"` (innerhalb `<label>`) | — |
| Upload-Progress | `.progress-bar`+`.progress-fill` (`--color-accent`, `#22c55e`, `#ef4444`) | `mns-bar` (`--accent` / `--online` done / `--offline` error) | upload-zone Z. 127–145 |
| Detail-Card | `.detail-card` (alte `--color-bg-secondary/-border/-shadow`) | `mns-card` (`bg-surface border-border rounded-lg shadow`) | detail Z. 141–168 |
| Detail-Header | `<h2>` + `.btn .btn-secondary/-danger` | `mns-card-head title="{name}"` + `mns-btn` (Re-upload/Delete/Close) | detail Z. 154–168 |
| Detail-Buttons | `.btn`-Klassen | `mns-btn` (`outline` Re-upload/Close, `danger` Delete) | detail Z. 28–38 |
| Status-Badge | `.status-badge[data-status]` (Hardcodes `#22c55e`/`#f59e0b`/`#ef4444`) | `mns-badge` tone `online`/`warning`/`offline`/`neutral` | detail Z. 198–213 |
| Transcoding-Bar | `.progress-bar`/`.progress-fill.processing` (`--color-bg-tertiary`, `#f59e0b`) | `mns-bar color="var(--warn)"` | detail Z. 215–232 |
| Metadaten-Form | `.form-group input/textarea` (alte Tokens) | `mns-sfield` + `mns-sinput`; Textarea custom auf neuen Tokens (`--surface`, `--border-strong`, focus-ring `--accent-soft`) | detail Z. 75–104, 262–277 |
| Save-Button | `.btn .btn-primary` | `mns-btn variant="primary"` | detail Z. 94 |
| File-Info-Grid | `.detail-label` (alte `--color-text-secondary`, uppercase) | Overline-Label (`text-faint`, 10.5/700, uppercase) + Wert (mono für Größen/Datum) | detail Z. 241–260 |
| Success/Error | `.success` (`#22c55e`), `.error` | `text-online` / `text-offline`; idealerweise via globalem `ToastService` (Save nutzt ihn bereits) | detail Z. 279–283 |

### Modals (`content-tag-modal.ts`, `content-playlist-modal.ts`, Delete-Confirm in `content-library.ts`)

| Modal | IST | SOLL | Quelle |
| --- | --- | --- | --- |
| Delete-Confirm | bereits `mns-overlay`+`mns-modal title="Delete Content" icon="Trash"` ✅, Footer-Slot, `mns-btn` | bleibt — ggf. an `ConfirmModal`-Layout (Warn-Icon-Tile + „freed N") angleichen (optional) | content-library.ts Z. 159–175 / jsx Z. 98–153 |
| Tag-Modal | **alte** `.modal-overlay`/`.modal`, alte `--color-*`, `.btn`, `.tag-chip` | `mns-overlay`+`mns-modal title="Add/Remove Tags" icon="Tag"`; Suggestions als Filter-Chip; Footer `[slot=footer]` mit `mns-btn outline`+`primary` | tag-modal Z. 14–89 |
| Playlist-Modal | **alte** `.modal-overlay`/`.modal`, alte `--color-*`, `.btn` | `mns-overlay`+`mns-modal title="Add to Playlist" icon="Playlists"`; Radio-Liste mit `hover:bg-hover`, `accent-color: var(--accent)`; Footer-Buttons | playlist-modal Z. 14–84 |
| Bulk-Confirm | `app-bulk-confirm-dialog` (shared, außerhalb content/) | unverändert (eigene shared-Komponente; nicht Teil dieses Reskins) | content-library.ts Z. 178–186 |

---

## Umsetzung (Phasen)

> Voraussetzung: Entscheidungen **1–4** getroffen. Plan unten geht von der **Empfehlung**
> aus: **1=C, 2=A (kein Clear/Re-transcode), 3=A (Tags statt Usage), 4=A (Status-Filter
> clientseitig)**. Backend bleibt damit **unangetastet**.

### Phase 0 — Vorbereitung / Inventar
- Tokens-/Theme-Switch (dark+light) lokal verifizieren (`data-theme`).
- Primitive sichten: `mns-overlay`, `mns-modal`, `mns-card`, `mns-card-head`, `mns-btn`,
  `mns-badge`, `mns-bar`, `mns-icon`, `mns-empty`, `mns-page-header`, `mns-sinput`, `mns-sfield`
  (alle in `apps/frontend/src/app/ui/`, Barrel `ui/index.ts`). Verfügbare `IconName`s prüfen
  (`ui/icon.component.ts`) — benötigt u. a. `Upload`, `Image`, `Video`, `Play`, `Alert`,
  `Trash`, `Tag`/`Tags`, `Playlists`, `Filter`, `Check`, `Layers`, `Storage`, `Dots`, `Refresh`.
  Fehlt ein Icon → in `icon.component.ts` ergänzen (SVG aus `reference/icons.jsx`).

### Phase 1 — Easy Wins: alte Tokens raus, `mns-btn`/`mns-bar` rein
1. **`content-upload-zone.ts`**: alle `var(--color-*)` → neue Tokens; `.btn .btn-primary` →
   `mns-btn primary icon="Upload"`; Progress → `mns-bar` (`--accent`/`--online`/`--offline`);
   drag-over → `bg-accent-soft`+`border-accent`. Logik (drag/drop/select) unverändert.
2. **`content-grid.ts`**: Hardcodes (`#1a1a2e`, `#fbbf24`, `#ef4444`, `rgba`-Overlay) → Tokens
   (`--surface-3`, `--warn`, `--offline`); HTML-Entity-Glyphen → `mns-icon` (`Play`/`Image`);
   Type-/Status-Badge → `mns-badge`; Grid auf `minmax(244px,1fr)`, `gap: var(--gap)`; Card-Wrapper
   ggf. auf `mns-card pad=false` (Auswahl-/Bulk-Logik + `SelectionService` unverändert).

### Phase 2 — Filterzeile + Header + Storage-Bar (Container)
1. **Lokale `content-filter-chip.ts`** (Entsch. 5A): presentational Pille, Inputs `active`,
   `icon?`, `count?`; Aktiv/Inaktiv-Klassen + mono-Count.
2. **`content-library.ts`**: Page-Header `sub` = `{n} items · {orig} · {trans}` (Totals aus
   `ContentFormatService`/`storage`); `actions`-Slot = Upload-Btn (triggert Datei-Dialog der
   Upload-Zone). Type-Toggle + neue Status-Gruppe als `content-filter-chip` mit Counts + Divider.
   Empty-Zustände trennen (leer vs. kein Treffer, jsx Z. 211/282). Smart-Container-Logik
   (Services, SSE-Subscribes, Bulk-Flows) **unverändert**.
3. **`content-storage-bar.ts`** (Entsch. 8A): `#8b5cf6` → `var(--accent-2)`; in `mns-card` +
   `mns-card-head title="Storage"` einbetten. `ContentFormatService`-Math unverändert.

### Phase 3 — Status-Filter (clientseitig, Entsch. 4A)
1. **`content-filter.service.ts`**: `filterContents(..., status?: 'ready'|'needs')` ergänzen
   (`ready` = `transcodingStatus==='completed'`). Counts-Helfer (all/image/video/ready/needs).
2. **`content-filter.service.spec.ts`**: Tests für die neue Statusachse (AAA).
3. **`content-library.ts`**: `filterStatus`-State + Verdrahtung an Chips.

### Phase 4 — Detail-View reskinnen (Entsch. 6A)
1. **`content-detail.ts`**: alle `var(--color-*)` → neue Tokens; `.detail-card` → `mns-card`;
   Header → `mns-card-head` + `mns-btn` (outline/danger); Status-Badge → `mns-badge`;
   Transcoding-Bar → `mns-bar color="var(--warn)"`; Form → `mns-sfield`+`mns-sinput` (Textarea
   custom auf neuen Tokens); File-Info-Labels als Overline (`text-faint`), Werte mono;
   Success/Error → `text-online`/`text-offline` bzw. weiter über `ToastService`.
   `input()`/`output()`/`ngModel`-Seed-Logik (ngOnInit-Kommentar beachten!) **unverändert**.
2. **`content-detail.spec.ts`** an neue Selektoren/`mns-*` anpassen.

### Phase 5 — Modals auf `mns-overlay`/`mns-modal` (Entsch. 7A)
1. **`content-tag-modal.ts`**: `.modal-overlay`/`.modal` → `mns-overlay`+`mns-modal`
   (`title`, `icon="Tag"`); Suggestions als `content-filter-chip`; Buttons `[slot=footer]`
   (`mns-btn outline`+`primary`). `model()`/`output()`-API unverändert.
2. **`content-playlist-modal.ts`**: analog, `icon="Playlists"`; Radio-Liste auf Tokens
   (`hover:bg-hover`, `accent-color: var(--accent)`); Footer-Buttons.
3. **`content-tag-modal.spec.ts`** (testet `.modal-overlay`) + ggf. `content-playlist-modal.spec.ts`
   auf neue Struktur (`mns-modal`, Footer-Buttons, Esc/Backdrop-Close) umstellen.
4. **Delete-Confirm** (`content-library.ts`): optional an `ConfirmModal`-Layout angleichen
   (Warn-/Trash-Icon-Tile, „freed N", Cancel+Delete-Footer) — sonst belassen.

### Phase 6 — Abschluss
- Dark+Light-Theme-Check; Breakpoints 1100/880/560 px; `prefers-reduced-motion`.
- `mns-overlay` schließt auf Esc/Backdrop; CardMenu (falls Entsch. 1=B) schließt auf Outside-Click.
- Entrance-Animationen lassen Inhalt nie auf `opacity:0` stranden.
- Gates: `npx nx affected -t lint typecheck test build`; `npm run format:check`;
  Frontend-Tests sind harter CI-Gate (kein `console.log`, kein `any`, OnPush/Signals, Standalone).

---

## Betroffene Dateien (reale Pfade)

Alle unter `apps/frontend/src/app/content/` sofern nicht anders angegeben.

**Umbauen (Restyling, Logik unverändert):**
- `content-library.ts` — Header-`sub`+Upload-Action, Filterzeile (Type+Status+Divider),
  Empty-Trennung, Status-Filter-State; Container-Logik bleibt.
- `content-grid.ts` — Hardcodes→Tokens, `mns-badge`/`mns-icon`, Grid-Maße; Selection/Bulk bleibt.
- `content-storage-bar.ts` — `#8b5cf6`→`var(--accent-2)`, in `mns-card`/`mns-card-head`.
- `content-upload-zone.ts` — alte `--color-*`→neu, `mns-btn`, `mns-bar`.
- `content-detail.ts` — alte `--color-*`→neu, `mns-card`/`mns-card-head`/`mns-btn`/`mns-badge`/
  `mns-bar`/`mns-sfield`/`mns-sinput`.
- `content-tag-modal.ts` — `mns-overlay`+`mns-modal`, neue Tokens.
- `content-playlist-modal.ts` — `mns-overlay`+`mns-modal`, neue Tokens.
- `content-filter.service.ts` — optionale Statusachse + Counts (Phase 3).

**Neu:**
- `content-filter-chip.ts` (+ `content-filter-chip.spec.ts`) — lokale presentational Chip-Pille.

**Specs aktualisieren:**
- `content-library.spec.ts`, `content-grid.spec.ts`, `content-detail.spec.ts`,
  `content-tag-modal.spec.ts` (testet `.modal-overlay` → ersetzen), `content-playlist-modal.spec.ts`,
  `content-filter.service.spec.ts`, `content-storage-bar.spec.ts`.

**Ggf. `apps/frontend/src/app/ui/`:**
- `icon.component.ts` — fehlende `IconName`s ergänzen (SVG aus `reference/icons.jsx`), Barrel bleibt.

**Unverändert / nicht Teil dieses Reskins:**
- `content.service.ts`, `content.model.ts`, `content-format.service.ts` (reine Logik).
- `apps/frontend/src/app/shared/selection/*` (Bulk-Toolbar, Checkboxen, Bulk-Confirm-Dialog).
- Backend (bei Empfehlung 2=A / 3=A).

**Entfernen:** keine (bei Empfehlung). Falls Entsch. 1=A „reines Restyling" gewählt wird, entfällt
`content-filter-chip.ts` und die Filterzeile bleibt strukturell wie heute.

---

## Risiken / Hinweise

- **Reference ≠ reale App (größtes Risiko):** `content.jsx` ist ein **Mock-Prototyp** (Gradient-
  Thumbs, fiktive Renditions/Usage, Clear/Re-transcode). Die reale App hat **mehr** Funktion
  (echte Previews, Metadaten-Edit, Re-upload, Bulk-Selection, SSE-Transcoding). 1:1-Nachbau der
  Referenz würde Funktion **verlieren** → Entscheidungen 1/2/3/6 bewusst treffen. Empfehlung
  „Option C/A/A/A" maximiert Optik ohne Funktions-/Backend-Bruch.
- **`mns-bar` ist einspurig:** Die zweisegmentige Storage-Bar bleibt custom (Entsch. 8A).
- **`mns-thumb` ist Gradient-Mock:** echte `<img>`/Video-Previews behalten (Entsch. 9A).
- **`content-detail.ts › ngOnInit`-Seeding:** Form-Felder werden **nur einmal** beim Öffnen
  geseedet (Kommentar Z. 305–317). Beim Reskin **nicht** auf `effect`/Re-Seed umbauen — sonst
  werden unsaved Edits bei SSE-Updates überschrieben.
- **OnPush-Falle (siehe Projekt-Memory):** Container nutzt heute **plain fields** + imperative
  RxJS-Subscribes (kein OnPush am Container). Bestehende Detection beibehalten; falls eine Kind-
  Komponente auf OnPush umgestellt wird, State als Signals führen, sonst „Loading…"-Hänger
  (vgl. audit-log-Regression).
- **`<mns-icon>` ist `display:contents`:** absolute/rotate-Klassen am Host werden ignoriert — in
  ein positioniertes `<span>` wrappen (Projekt-Memory „mns-icon display:contents positioning").
- **Spec-Bruch durch `.modal-overlay`:** `content-tag-modal.spec.ts` selektiert `.modal-overlay`
  → muss mit dem Modal-Umbau angepasst werden, sonst rote Tests (harter CI-Gate).
- **`var(--accent-2)`** existiert als Token (zweite Akzentfarbe) — für „transcoded"-Segment und
  Wall-Renditions exakt passend; **nicht** wieder `#8b5cf6` hardcoden.
- **Reihenfolge:** Phase 1 (Easy Wins) zuerst (geringes Risiko, sofort sichtbarer Fortschritt),
  dann 2→6. Status-Filter (Phase 3) hängt am Service und sollte vor der finalen Filterzeile-
  Verdrahtung stehen.
- **Toast statt Inline-Feedback:** Save nutzt bereits `ToastService` (Projekt-Memory „Global Toast
  Service") — Inline-`.success`/`.error` in Detail/Modals möglichst auf Toast vereinheitlichen,
  keine neuen lokalen Erfolgsbanner einführen.
