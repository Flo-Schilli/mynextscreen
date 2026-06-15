# Live-Streams Reskin — Umsetzungsplan

> Teil von **Phase 3** des Frontend-Redesigns (myNextScreen). Re-Skin der
> Feature-View `apps/frontend/src/app/live-streams/` nach der Design-Referenz
> `docs/design/design_handoff_mynextscreen/reference/streams.jsx`.
> **Funktion bleibt, Präsentation wird ersetzt** — gebunden an die bestehenden
> echten Services (`LiveStreamService`, `ScreenService`, `ScreenGroupService`,
> `MemberService`, `ToastService`), keine Mock-Daten.
>
> Etablierter Vorbild-Pattern für diesen Reskin: **`screens/`** (Card-Grid +
> `screen-tile.ts`, OnPush/Signals/`mns-icon`) und **`screen-groups/`**
> (geroutetes Detail `screen-group-detail.ts` unter `screen-groups/:id`). Beide
> direkt nebenan; bei jeder Designentscheidung dort spicken statt neu erfinden.
>
> **Wichtig (Verifizierung gegen aktuellen Code):** Der vorige Entwurf nannte
> Komponenten-Selektoren wie `app-live-stream-monitor`/`<Btn>`/`<Card>`. Die
> realen geteilten Primitives in `apps/frontend/src/app/ui/` heißen
> **`mns-*`** (`mns-overlay`, `mns-modal`, `mns-card`, `mns-card-head`,
> `mns-btn`, `mns-badge`, `mns-status-dot`, `mns-icon`, `mns-empty`,
> `mns-page-header`, `mns-select`, `mns-switch`/`mns-toggle-row`) plus
> `SInputComponent`/`SFieldComponent`. Eigene Feature-Komponenten behalten das
> repo-übliche `app-…`-Präfix (z. B. `app-screen-tile`). Alle Tokens sind in
> `tailwind-theme.css` definiert und über Tailwind-Utilities **und** als
> `var(--token)` verfügbar (`--surface/-2/-3`, `--border/-strong`,
> `--accent/-soft/-2`, `--text/-muted/-faint`, `--online/-dim`, `--warn/-dim`,
> `--offline/-dim`, `--gap`, `--shadow-lg`, `--r-xl`).

---

## Offene Entscheidungen

> Jede Entscheidung ist **vor** der Implementierung zu treffen bzw. die
> Empfehlung zu bestätigen. Sie betreffen v. a. die Lücke zwischen dem
> simulierten Mock und dem echten Backend.

### 1. Telemetrie: Live-Graph / fps / latency / dropped
Der Mock (`streams.jsx` Z. 182–251, `useBitrateSeries`, `BitrateGraph`,
`Metric`) zeigt animierten Bitrate-Graph, fps, Latenz, Dropped-Frames,
Uptime-Ticker. Das Backend liefert **keine** dieser Live-Werte —
`LiveStream` hat nur `status` (`idle|active|error`), `transcodingPreset`,
`audioEnabled`, `updatedAt`, und `GET /:id/health` liefert
`StreamHealthState { health: string, checkedAt }` (Werte `healthy|degraded|stopped`).
- **Option A — „Cinematic look, honest data“ (empfohlen):** Monitor-Chrome
  (Blobs/Scanlines/LIVE-Pill/NO-SIGNAL) wird rein **dekorativ** nachgebaut.
  Health-Panel zeigt nur echte Felder: Health-Status (SignalBars + Text aus
  `/health`), Preset-Label, Protokoll, Audio, „Live since“ aus `updatedAt`.
  Soll-Werte (fps/bitrate nominal pro Preset) **nur** klar als „target/preset“
  beschriftet, niemals als Live-Messwert. Kein Bitrate-Graph, kein Sekunden-Ticker.
- **Option B — voll wie Mock:** erfundene Live-Zahlen + animierter Graph.
  Verstößt gegen „keine Mock-Daten“ und führt Operator in die Irre.
- **Option C — echtes Telemetry-Backend:** Metrics-Endpoint (ffmpeg-Progress →
  bitrate/fps/dropped, SSE-Push) neu bauen, dann Graph echt befüllen. Großer,
  separater Backend-Task; sprengt diesen Reskin.
- **Empfehlung: A** jetzt; **C** als nachgelagerter Backend-Task notieren.

### 2. Status-Mapping `idle|active|error` ⇄ `live|connecting|offline`
Mock kennt 3 Stati inkl. animiertem „connecting“ (Auto-Promote nach ~2,6 s,
`streams.jsx` Z. 698–706). Backend hat kein „connecting“; `activate` ist
synchron (Response = Stream oder 4xx).
- **Option A (empfohlen):** `active`→**Live** (pulsierender Dot),
  `idle`→**Offline**, `error`→Offline-Chrome **+** Fehler-/Alert-Hinweis. Kein
  künstlicher Connecting-Zustand; während des `activate`-HTTP-Calls genügt der
  Button-Loading-State.
- **Option B:** transienter Client-„connecting“-State zwischen Klick und
  Response. Mehr Code, kaum Mehrwert (Call ist schnell), Risiko Fake-Eindruck.
- **Empfehlung: A.**

### 3. Targeting-Modi: „All screens“ und Multi-Group
Mock-Segmented-Control hat 3 Modi: `all` / `groups` (Multi-Select) / `screens`
(`streams.jsx` Z. 56, 507–583). Backend-`ActivateLiveStreamRequest` kennt **nur**
`targetScreenIds?: string[]` **oder** ein einzelnes `targetGroupId?: string`
(`live-stream.model.ts` Z. 47–50) — kein „all“, keine Multi-Group.
- **Option A (empfohlen):** 2-Modus-Segmented-Control **„Specific screens“ /
  „Screen group“**, exakt auf das DTO gemappt (Checkbox-Liste vs. Single-Group-
  Picker). Visuell wie Mock, aber ohne „Globe/All“ und ohne Multi-Group.
- **Option B:** „All screens“ Frontend-seitig als „alle aktuell sichtbaren
  Screen-IDs“ auflösen → `targetScreenIds`. Semantisch falsch (deckt später
  hinzugefügte Screens nicht ab), führt in die Irre. Verworfen.
- **Option C:** Backend um „all“ + Multi-Group erweitern. Separater Backend-Task.
- **Empfehlung: A** (deckt sich mit bestehendem `live-stream-activate-modal.ts`).

### 4. Edit/Activate inline ins Detail falten vs. Modals behalten
Mock faltet Rename, Target-Picker, Transport (Go-live/Stop/Restart/Mute) **inline
in die Detail-Konsole** (`StreamDetail`). Heute sind das 4 separate Modals.
- **Option A (empfohlen):** Inline in der Detail-Konsole (Inline-Rename auf Blur/
  Enter via `update`; Target-Picker via `update` der Default-Targets bzw. via
  `activate`-DTO; Transport-Buttons). Nur **zwei** Overlays bleiben:
  **New-Stream-Modal** + **Delete-Confirm**. Maximal nah am Design.
- **Option B:** Bestehende Edit-/Activate-Modals optisch reskinnen, Card-Grid
  ohne Detail-Route. Weniger Design-Treue, „Broadcast to / Source / Health“ aus
  dem Mock entfällt.
- **Empfehlung: A.**
  - **Folge-Subentscheidung 4a — Target-Persistenz bei idle:** Das Backend
    speichert das Ziel erst beim `activate`. Ein idle-Stream hat kein
    persistiertes Ziel. Empfehlung: Target-Auswahl im Detail als **lokaler
    Signal-State** halten; bei „Go live“ als `activate`-DTO senden. Bei aktivem
    Stream Ziel **read-only** anzeigen (Änderung erfordert Stop→Start). Klar
    kommunizieren („Stop to change targets“).

### 5. Audio-Umschalter (Mute) bei aktivem Stream
Mock toggelt Audio jederzeit (`patch({ audio })`). Real ist `audioEnabled` Teil
von `update(...)`; eine Änderung erfordert ffmpeg-Neustart, ist also bei aktivem
Stream nicht sofort wirksam.
- **Option A (empfohlen):** Audio-Toggle nur bei **idle** editierbar (via
  `update`); bei aktivem Stream **disabled** mit Tooltip „Stop the stream to
  change audio“.
- **Option B:** bei aktivem Stream Audio toggeln → automatisch deactivate→update→
  activate (Neustart) anstoßen. Disruptiv, überraschend; verworfen.
- **Empfehlung: A.**

### 6. „Restart“-Transport-Button
Mock hat Restart (→ connecting). Backend hat kein Restart-Endpoint.
- **Option A (empfohlen):** Restart = `deactivate` → danach `activate` (mit
  gemerktem Target) sequentiell verketten (RxJS `concatMap`/`switchMap`),
  Toast bei Erfolg/Fehler. Nur sichtbar/aktiv wenn Stream live ist.
- **Option B:** Restart weglassen. Funktional ärmer als Design.
- **Empfehlung: A.**

### 7. „Duplicate“ in der Card-Aktionen
Mock-Card-Menü hat „Duplicate“ (`streams.jsx` Z. 354, 713). Backend hat **kein**
Duplicate-Endpoint.
- **Option A (empfohlen):** Duplicate **weglassen** (Card-Menü: Open console /
  Go-live bzw. Stop / Delete). Kein erfundener Client-Klon.
- **Option B:** Client-seitig vorausgefülltes New-Stream-Modal öffnen
  („Create like this“). Optional, später.
- **Empfehlung: A** jetzt, **B** als optionale Erweiterung notieren.

### 8. Monitor-Thumbnail / Farbverlauf pro Stream
Mock weist jedem Stream ein zufälliges `thumb`-Gradient zu (`THUMBS`,
`streams.jsx` Z. 28–29, 618). Backend liefert kein Thumbnail/keine Farbe.
- **Option A (empfohlen):** Deterministisches Gradient aus `stream.id` ableiten
  (Hash → Index in feste `THUMBS`-Palette), damit dieselbe Karte stabil dieselbe
  Farbe zeigt. Rein dekorativ.
- **Option B:** ein einziger statischer Monitor-Hintergrund für alle.
- **Empfehlung: A** (visuell näher am Mock, kein Datenbedarf).

### 9. „Override schedule“-Hinweis (Live takes priority)
Mock zeigt bei live + Ziel>0 einen Warn-Hinweis „Live takes priority …“
(`streams.jsx` Z. 586–593). Das entspricht echtem Backend-Verhalten (Live
überschreibt Schedule, Fallback bei Stop — siehe `CLAUDE.md`).
- **Empfehlung:** Hinweis **übernehmen** (echtes Verhalten), mit `--warn`/
  `--warn-dim`. Ziel-Anzahl aus dem real bekannten Ziel ableiten.

---

## Soll/Ist-Vergleich

### A) Main / Listen-Ansicht (`live-streams.ts`)

| Aspekt | Ist (heute) | Soll (Design `streams.jsx`) | Umsetzung |
|---|---|---|---|
| Layout | HTML-`<table>` via `app-live-stream-table` | **Card-Grid** `repeat(auto-fill, minmax(340px, 1fr))`, `gap: var(--gap)` (Z. 744) | Tabelle raus, Grid wie `screens.ts` |
| Page-Header | `mns-page-header` vorhanden (Z. 47) | `PageHeader` + Subtitle „X live · Y streams“ (Z. 741–743) | bleibt; Subtitle-Getter `streamSubtitle` ist schon da, Format anpassen |
| Card | — | Monitor-Band + Name/Source + Status/Protocol/Target-Badges + Footer (Bitrate/Status + Go-live/Stop) + Actions-Menü (Z. 323–375) | neue `app-live-stream-card` |
| „New Stream“ | öffnet Inline-Create-Modal | Button öffnet `NewStreamModal` (Z. 743) | bleibt, Modal reskinnt |
| Empty-State | `mns-empty` „No live streams yet“ (Z. 88–100) | `Empty` „No live streams“ + CTA (Z. 718–730) | bleibt (`mns-empty`), Texte/CTA an Design angleichen |
| Karte öffnen | n/a (Tabelle) | Klick → Detail (`setSelId`) | `router.navigate(['/live-streams', id])` |
| Passthrough-Warnings | Banner `.warning-banner` (Z. 107–125) | nur Override-Hinweis im Detail | Banner bleibt vorerst (echtes `ActivateStreamResponse.warnings`), ggf. ins Detail verlagern |

### B) Detail / Monitor-Konsole (neu: `live-streams/:id`)

| Aspekt | Ist (heute) | Soll (Design `StreamDetail`) | Umsetzung |
|---|---|---|---|
| Navigation | keine (alles Modals) | eigener Screen mit „All streams“-Back (Z. 410–413) | **geroutet** `live-streams/:id` (Vorbild `screen-group-detail.ts`) |
| Header | — | Icon-Tile (live = roter Gradient) + **Inline-Rename**-Input + Status/Protocol/Target-Badges + Delete (Z. 416–432) | `mns-card` + Inline-Input (Blur/Enter→`update`, Esc→reset) + `mns-badge` + `mns-btn variant=danger` |
| Monitor (big) | — | 16:9 cinematic Band, Status-Overlays (LIVE/NO-SIGNAL/MUTED/Preset·fps) (Z. 93–177, 437–440) | `app-live-stream-monitor [big]`, nur echte Overlays |
| Transport | — | Go-live / Stop / Restart / Audio-Toggle + SignalBars+Healthtext (Z. 442–457) | Buttons → `activate`/`deactivate`/Restart-Sequenz/`update`; siehe Entsch. 5–6 |
| Stream-health | Health-Badge in Tabelle | Metrik-Tiles (Bitrate/fps/Latency/Dropped) + Bitrate-Graph (Z. 461–477) | **nur echte Felder**: Health-Status + Preset-Soll + „Live since“; **kein** Graph/Live-Zahlen (Entsch. 1) |
| Source-Card | URL-Spalte in Tabelle | Source-URL + Copy-Button + Protocol/Quality/FPS/Audio-Tiles (Z. 482–501) | `mns-card-head` „Source“ + Copy-to-Clipboard (`navigator.clipboard`, Toast) + read-only Tiles |
| Broadcast-to | Activate-Modal (Screens/Group) | Segmented-Control + Picker/Group-Liste + Override-Hinweis (Z. 503–595) | 2-Modus (Entsch. 3); Liste/Picker im Stil `screen-group`-Picker; Hinweis (Entsch. 9) |

### C) Modals / Overlays

| Overlay | Ist | Soll | Umsetzung |
|---|---|---|---|
| Create | `live-stream-create-modal.ts`, eigenes `.modal-overlay` + ngModel (Z. 23–251) | `NewStreamModal`: Icon-Tile-Header, Name, Protocol-Segmented, Source-URL (mono), **Quality-Preset-Segmented**, Audio-`ToggleRow`, Cancel/Create (Z. 605–682) | auf `mns-overlay`+`mns-modal` + `SInput`/`SField` + Segmented + `mns-switch`/`mns-toggle-row` + `mns-btn` umstellen |
| Delete | `live-stream-delete-modal.ts`, eigenes `.modal-overlay` | (Mock nutzt nur Inline-Delete) | auf `mns-overlay`+`mns-modal` + `mns-btn` umstellen — **als Sicherheits-Confirm behalten** |
| Edit | `live-stream-edit-modal.ts` | inline ins Detail gefaltet | **entfernen** (Entsch. 4) |
| Activate | `live-stream-activate-modal.ts` | inline „Broadcast to“ + „Go live“ | **entfernen** (Logik in Detail) |

> Hinweis: Protokoll-Segmented im Create-Modal nur **2** echte Werte (`RTMP`/
> `RTP`), nicht 4 wie im Mock (`RTMP/HLS/SRT/WebRTC`). Quality-Preset = die 5
> echten `TranscodingPreset` (`TRANSCODING_PRESET_LABELS`), nicht `source/1080p/720p/480p`.

---

## Umsetzung (Phasen)

> Inkrementell lauffähig; jede Phase endet grün (`lint typecheck test build`).
> Alle neuen Komponenten: standalone, `ChangeDetectionStrategy.OnPush`, Signals
> (`input()`/`output()`/`model()`/`signal`/`computed`), neue Control-Flow,
> kein `any`, kein NgModule, keine Business-Logik in Components.

### Phase 0 — Bausteine
- `live-stream-monitor.ts` (`app-live-stream-monitor`, presentational): 16:9-Band
  mit `big`-Input, dekorative Blobs/Scanlines/Vignette, echte Overlays
  (LIVE-Pill mit `pulseDot`, NO-SIGNAL bei idle/error, MUTED, „Preset · fps“ als
  Soll). Status aus `LiveStreamStatus`. Deterministisches Gradient aus `id`
  (Entsch. 8). Tokens: `--surface-3`, `--border-strong`, `--offline`, `--warn`,
  `--text-faint`, `--shadow-lg`. **Animationen** (`pulseDot`, `streamBlobA/B`,
  `streamSweep`, `streamScan`) als Component-Styles; `@media (prefers-reduced-motion: reduce)`
  → alle auf `none`.
- Status-Pill: **`mns-status-dot` + `mns-badge` wiederverwenden** statt eigener
  `live-stream-status-pill.ts` — der vorige Entwurf wollte eine neue Pill, aber
  `mns-status-dot` (pulsierender Dot) + `mns-badge` decken das ab. Falls eine
  Live-spezifische Pill (roter Dot + „LIVE“) nötig ist, klein inline im Monitor/Card.

### Phase 1 — Card-Grid + Navigation
- `live-stream-card.ts` (`app-live-stream-card`, presentational, Vorbild
  `screens/screen-tile.ts`): `mns-card`-Look, Monitor-Band oben, Name + Source
  (mono, truncate), Badges (Status via `mns-badge`/Pill, Protocol `mns-badge`
  neutral, Target `mns-badge` accent/neutral), Footer (Status-Text + Go-live/Stop
  `mns-btn`), Actions-Menü (Open console / Go-live·Stop / Delete). Outputs:
  `open`, `toggle`, `delete`.
- `live-streams.ts` umbauen: `app-live-stream-table` raus → `@for`-Grid mit
  `app-live-stream-card`; `streamSubtitle` auf „X live · Y streams“; Card-`open`
  → `inject(Router).navigate(['/live-streams', id])`; Empty-State + Create-Modal
  bleiben. Container `<div class="page">` + Grid-Wrapper
  (`grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: var(--gap)`).

### Phase 2 — Detail-Konsole + Route
- `app.routes.ts`: nach `live-streams` (Z. 108–110) Route
  `{ path: 'live-streams/:id', loadComponent: () => import('./live-streams/live-stream-detail').then(m => m.LiveStreamDetail) }`
  (Vorbild `screen-groups/:id`, Z. 91–94).
- `live-stream-detail.ts` (`app-live-stream-detail`, smart, Vorbild
  `screen-group-detail.ts`): liest `id` aus `ActivatedRoute`, lädt via
  `MemberService` (orgId) → `forkJoin({ stream: getOne, screens: getAll, groups: getAll })`.
  Besteht aus: Back-Button (`mns-btn ghost`/`ChevronLeft`), Header-Card mit
  Inline-Rename (`update({ name })` auf Blur/Enter, Esc reset, Toast), Monitor
  (`big`), Transport-Controls, Stream-health-Card (echte Felder), Source-Card
  (Copy-URL), Broadcast-to-Card (Segmented + Picker/Group, Override-Hinweis).
  Owns HTTP: `update`, `activate`, `deactivate`, `delete`, optional `getHealth`.
  Target als lokaler Signal-State (Entsch. 4a). Bei `delete` → Toast + zurück zur Liste.

### Phase 3 — Create- & Delete-Modal reskin
- `live-stream-create-modal.ts`: Template/Styles auf `mns-overlay`+`mns-modal`
  (Icon `Stream`, roter Gradient-Tile), Felder via `SInput`/`SField`,
  Protocol-Segmented (RTMP/RTP), Source-URL (mono `SInput`),
  Quality-Preset-Segmented (5 echte Presets), Audio `mns-toggle-row`/`mns-switch`,
  Footer `mns-btn outline`/`primary`. Lokale Validierung + `creating`/`error`-Inputs bleiben.
- `live-stream-delete-modal.ts`: auf `mns-overlay`+`mns-modal` (Icon `Trash`) +
  `mns-btn danger` umstellen; behalten.

### Phase 4 — Alt-Code entfernen
- `live-stream-table.ts` (+ `.spec`), `live-stream-edit-modal.ts` (+ `.spec`),
  `live-stream-activate-modal.ts` (+ `.spec`) löschen; Imports/Referenzen in
  `live-streams.ts` entfernen.

### Phase 5 — Tests + Polish
- Specs löschen: `live-stream-table.spec.ts`, `live-stream-edit-modal.spec.ts`,
  `live-stream-activate-modal.spec.ts`.
- Neu/anpassen: `live-streams.spec.ts` (Grid statt Tabelle, Navigation bei
  `open`), `live-stream-card.spec.ts`, `live-stream-detail.spec.ts`
  (load/rename/activate/deactivate/restart/delete + Target-Modi + read-only bei
  live), `live-stream-monitor.spec.ts` (Status-States/Overlays),
  Create-/Delete-Modal-Specs an neue Templates. `live-stream.service.spec.ts` bleibt.
- Polish: `prefers-reduced-motion` (alle Stream-Animationen `none`), Esc/Backdrop
  schließt Overlays, Entrance-Animationen stranden nie bei `opacity:0`, OnPush/
  Signals, dark + light + Accent-Wechsel, keine Konsolenfehler.

**Definition of Done:** `npx nx run-many -t lint typecheck test build -p frontend`
grün + `format:check`; strict TS / kein `any`; visuell `npm run dev` (:4200)
gegen `streams.jsx` in dark & light bei Accent-Wechsel; alle Interaktions-States
(hover/active/focus/loading/empty/error) vorhanden.

---

## Betroffene Dateien

Alle Pfade relativ zu `apps/frontend/src/app/live-streams/` (Ausnahme: Route).

### Neu
- `live-stream-monitor.ts` — `app-live-stream-monitor` (presentational, `big`-Input).
- `live-stream-monitor.spec.ts`.
- `live-stream-card.ts` — `app-live-stream-card` (presentational, Vorbild `screen-tile.ts`).
- `live-stream-card.spec.ts`.
- `live-stream-detail.ts` — `app-live-stream-detail` (smart, geroutet, Vorbild `screen-group-detail.ts`).
- `live-stream-detail.spec.ts`.

### Umbauen
- `live-streams.ts` — Tabelle → Card-Grid; Card-`open` → Router-Navigation;
  `streamSubtitle`-Format; Imports anpassen (Table/Edit/Activate raus, Card rein).
- `live-streams.spec.ts` — Grid statt Tabelle, Navigation-Erwartung.
- `live-stream-create-modal.ts` — auf `mns-overlay`/`mns-modal` + Primitives.
- `live-stream-create-modal.spec.ts` — an neues Template.
- `live-stream-delete-modal.ts` — auf `mns-overlay`/`mns-modal` + `mns-btn`.
- `live-stream-delete-modal.spec.ts` — an neues Template.
- `../app.routes.ts` — Route `live-streams/:id` ergänzen.
- Unverändert (Datenbasis): `live-stream.model.ts`, `live-stream.service.ts`,
  `live-stream.service.spec.ts`.

### Entfernen
- `live-stream-table.ts` + `live-stream-table.spec.ts`.
- `live-stream-edit-modal.ts` + `live-stream-edit-modal.spec.ts`.
- `live-stream-activate-modal.ts` + `live-stream-activate-modal.spec.ts`.

---

## Risiken / Hinweise

- **Telemetrie-Lücke ist der größte Treiber** (Entsch. 1): striktes „nur echte
  Daten“ einhalten, sonst täuscht die UI Live-Metriken vor, die das Backend nicht
  hat. Monitor-Chrome rein dekorativ; jede Zahl als Soll/Preset beschriften.
- **`mns-icon`-Host ist `display:contents`** (Auto-Memory `mns-icon-display-contents-positioning`):
  absolute/rotate-Klassen direkt auf `<mns-icon>` werden ignoriert — für
  Overlay-Pills/rotierte Icons in ein positioniertes `<span>` wrappen.
- **OnPush + Signals strikt** (Auto-Memory `onpush-imperative-subscribe-regression`):
  Detail-Komponente State als Signals/`computed` halten, **nicht** plain Felder
  mit imperativem `subscribe`, sonst „Loading…“-Hänger. `screen-group-detail.ts`
  nutzt teils plain Felder — hier bewusst auf Signals setzen.
- **Target-Persistenz** (Entsch. 4a): idle-Streams haben kein gespeichertes Ziel;
  Auswahl lokal halten, beim `activate` senden, bei live read-only.
- **Restart** (Entsch. 6) ist eine **zweistufige** Sequenz (deactivate→activate)
  — sauber verketten (`concatMap`) + Fehlerbehandlung, sonst bleibt der Stream
  im Aus-Zustand hängen.
- **`prefers-reduced-motion`**: Monitor-Animationen (`streamBlobA/B`, `streamSweep`,
  `streamScan`, `pulseDot`, `vuBar`) per Media-Query deaktivieren; Entrance-
  Animationen dürfen Inhalt nie unsichtbar lassen.
- **Specs mit Klassen-Selektoren**: bestehende Specs prüfen auf
  `.warning-banner`/`.empty-state` etc.; beim Umbau Hooks bewahren oder Specs
  mitziehen (frühere Reskins hielten Wrapper-Klassen bewusst stabil).
- **`pool: 'forks'`** (frontend/vitest.config.ts) ist Pflicht für TestBed-Isolation
  — nicht anfassen.
- **Toast statt lokaler Banner** (Auto-Memory `global-toast-service`): Erfolgs-/
  Fehlerfeedback über `ToastService`, keine neuen Inline-Feedback-Banner
  (Ausnahme: bestehendes Passthrough-Warnings-Banner aus echtem
  `ActivateStreamResponse.warnings`).
- **Backend-Folgetask (separat):** echtes Live-Telemetry (Metrics-Endpoint:
  bitrate/fps/dropped, via ffmpeg-Progress + SSE) würde Health-Graph/Metrik-Tiles
  des Mocks real befüllen — bewusst NICHT Teil dieses Reskins.
