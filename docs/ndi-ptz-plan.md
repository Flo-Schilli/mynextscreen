# Plan: NDI PTZ-Kamera in myNextScreen

## Context

Eine NDI-PTZ-Kamera soll als Live-Stream-Quelle verfügbar werden. NDI ist für den
Stream zwingend (nicht der RTSP/RTP-Ausgang der Kamera). Das verändert die
Architektur grundlegend, weil NDI anders funktioniert als die heutigen Quellen:

- **NDI ist LAN-lokal + SDK-basiert.** Quellen werden per mDNS/Avahi im lokalen Netz
  entdeckt und über einen Quellnamen (`MASCHINE (Quelle 1)`) adressiert, nicht über
  eine `scheme://host:port`-URL. Das `sourceUrl` + `IsSafeOutboundUrl`-Modell passt
  darauf nicht.
- **NDI wurde aus FFmpeg mainline entfernt** (Lizenzstreit NewTek, 2019). Der heutige
  Pfad „Backend zieht `rtsp://` per FFmpeg" funktioniert für NDI nicht.
- **Konsequenz:** NDI muss im Venue-LAN empfangen werden. Das Backend ist zentral und
  sieht die mDNS-Quellen nicht. Der einzige LAN-lokale Ort ist der **Site-Agent**
  (`apps/site-agent/`). Er bekommt eine neue, schwergewichtige Media-Fähigkeit.

**Getroffene Entscheidungen:**
1. Empfang über npm `grandi` (tux-tn/grandi, v2.x, NDI 6 SDK). Liefert Discovery +
   dekodierte Video/Audio-Frames auf Linux x64/arm64/armv7l. **Kein PTZ** (verifiziert
   in `lib/grandi_receive.cc`).
2. Delivery: Agent transkodiert NDI→H.264→HLS lokal und **lädt die Segmente über
   seinen bestehenden authentifizierten Outbound-Kanal zum Backend hoch**. Player
   ziehen wie heute von `/api/live-streams/:id/hls/`. Kein neuer Inbound-Port.
3. PTZ über **VISCA-over-IP** (reines Node `dgram`/`net`, UDP 52381). Unabhängig von NDI.
4. Scope v1: **Video + PTZ zusammen**.
5. Agent-HW: **RPi (arm64, jetzt) + x86-64 (später, möglichst HW-Encode)**. Encoder
   muss plattformabhängig wählbar sein; Auflösung/FPS cappbar (1080p60-Software auf
   dem Pi ist nicht machbar).
6. **Kein Audio.** Nur Video-Frames werden empfangen und transkodiert; FFmpeg bekommt
   eine einzige stdin-Pipe, HLS ohne Audio-Track (`-an`).
7. **Qualität pro Stream umstellbar.** Preset im Dashboard: `preview` (grandi
   `bandwidth: lowest`, NDI-Preview-Stream ~640×360), `720p30` (**Default**), `1080p30`.
   Das Preset setzt `ndiBandwidth` + `targetResolution`/`targetFps`; Änderung am
   aktiven Stream startet nur den Transcoder neu (kein Receiver-Neuaufbau bei gleicher
   Bandbreite). Begründung: 1080p60 UYVY sind ~250 MB/s durch stdin, 720p30 ~55 MB/s.
8. **Latenz v1 = Short-HLS (Ziel 3–4 s), dann messen.** Reicht das real nicht, folgt
   LL-HLS (~1,5–2,5 s) oder WebRTC (<1 s) als eigener PR. Details siehe „Latenz".
9. **Auslieferung in 3 PRs:** (1) Hardware-Spike + glibc-Agent-Image, (2) NDI-Video
   end-to-end, (3) PTZ. Scope bleibt Video + PTZ.
10. **Kamera = Stream.** Keine eigene Kamera-Entität; `ndiCameras[]` entfällt.

**Verifizierte kritische Fakten (Code gewinnt):**
- `stream-health.service.ts:114-118`: `checkStreamHealth` gibt `stopped` zurück, sobald
  kein FFmpeg-Prozess läuft. Für NDI (kein Prozess) feuert das sofort
  `live-stream.process-exited` und reißt die Aktivierung ab. **Diese Branch MUSS
  gesplittet werden** — die Hauptkorrektheits-Falle.
- `stream-health.service.ts:130` `hasRecentSegments` liest beliebige `.ts`-Dateien per
  mtime, egal wer sie schrieb → für NDI unverändert wiederverwendbar.
- `ffmpeg-live.service.ts:294` `getHlsOutputDir(streamId)` ist die eine Autorität für
  das HLS-Verzeichnis → Upload und Serving teilen sich dieses Verzeichnis.
- `site-agent-sse.service.ts:90/100` `isConnected(agentId)` + `push(agentId, command)`
  existieren → PTZ- und ndi_start/stop-Kommandos laufen hierüber.
- Player (`apps/player/.../hls.service.ts:23`) + `json-protocol-adapter.ts:40` bauen die
  Stream-URL aus `streamId` → **URL-Bildung und Screen-Protokoll bleiben unverändert**.
  Einzige Player-Änderung: hls.js-Puffer (siehe „Latenz").
- `hls.service.ts:27-28` puffert fest `liveSyncDuration: 3` / `liveMaxLatencyDuration: 10`
  Sekunden; Backend-FFmpeg schneidet 2-s-Segmente (`ffmpeg-live.service.ts:384-403`).
  Daraus entstehen die heutigen ~8–12 s, nicht aus dem Upload-Hop.

---

## Teil A — Backend

### A1. Schema + Migration (`apps/backend/src/db/schema.ts`)
`liveStreams` (~Z. 480-497) um nullable NDI-Spalten erweitern (keine Sibling-Tabelle,
da Aktivierung, Screen-State-Resolver, Controller, Health alle die eine `LiveStream`-Row
lesen):
- `sourceType` (`'pull' | 'ndi'`, default `'pull'` → Altbestand bleibt gültig).
- `sourceUrl` nullable machen (Guard per `sourceType` in DTO/Service, nicht Spalte).
- `agentId uuid references siteAgents.id onDelete 'restrict'` (nullable; Agent mit
  gebundenem NDI-Stream darf nicht gelöscht werden).
- `ndiSourceName`, `ptzEnabled` (bool, default false), `ptzProtocol` (`'visca'`),
  `cameraIp`, `viscaPort`, `qualityPreset` (`'preview'|'720p30'|'1080p30'`, default
  `'720p30'`), `ndiBandwidth` (`'lowest'|'highest'`), `targetResolution`, `targetFps`,
  `targetBitrate`, `encoderPref` (`'auto'|'software'|'hardware'`). Preset → Werte als
  reine Funktion im Service (eine Quelle), Einzelfelder bleiben für Overrides.
- Index `IDX_live_streams_agent` auf `agentId`.
- Migration per `nx run backend:db-generate` erzeugen (nächste `00xx_*.sql`), dann SQL
  reviewen. Nie handschreiben. `source_type` mit Default + Backfill, `source_url`
  NOT-NULL droppen, FK + Index.

### A2. Enums / DTOs / Validierung (`apps/backend/src/live-stream/`)
- Neue Enums: `live-stream-source-type.enum.ts`, `ptz-protocol.enum.ts`, `ptz-action.enum.ts`.
- `dto/create-live-stream.dto.ts`: `sourceUrl`-Validatoren (`@IsSafeOutboundUrl`, Z. 15)
  in `@ValidateIf(o => o.sourceType !== 'ndi')` wrappen. Für NDI `@ValidateIf(o =>
  o.sourceType === 'ndi')`: `agentId` (`@IsUUID`), `ndiSourceName`, optional `ptzEnabled`,
  `ptzProtocol`, `cameraIp` (`@IsIP`), `viscaPort` (`@IsInt @Min(1) @Max(65535)`),
  target-Felder. `protocol` für NDI optional. `update`-DTO spiegeln.
- Cross-Entity-Checks im Service (DTO erreicht die DB nicht): `agentId` org-scoped per
  `SiteAgentService.findOne(orgId, agentId)`; `ndiSourceName` gegen zuletzt gemeldete
  Quellen (A4c) prüfen.

### A3. Agent-HLS-Upload (`apps/backend/src/site-agent/site-agent-device.controller.ts`)
`PUT /api/agents/me/live-streams/:streamId/hls/:filename`, `@AgentAuth()`:
- **Scoping (kritisch):** Stream laden, `stream.organisationId === req.organisationId`
  **und** `stream.agentId === req.agentId` **und** `sourceType === 'ndi'`. Sonst 403/404.
  Nur der gebundene Agent darf Segmente eines Streams schreiben.
- **Path-Traversal:** `filename` gegen strikte Allowlist `^(index\.m3u8|[A-Za-z0-9_-]+\.ts)$`,
  `path.basename` als Defense-in-Depth, resolved Path muss mit `getHlsOutputDir(streamId)`
  beginnen. Größen-Cap per ENV.
- Playlist atomar schreiben (temp + rename). Logik in neuem `NdiHlsStorageService`
  (live-stream-Modul besitzt das Disk-Layout).
- Serving: `index.m3u8` mit `Cache-Control: no-cache`, Segmente `max-age` kurz/immutable;
  Caddy darf die Playlist nicht puffern (sonst kippt der Latenzgewinn).
- **Serving bleibt** (`live-stream.controller.ts:144-194`). Nur Z. 161 (`isRunning`-Check
  für 503-vs-404) anpassen: bei `sourceType === 'ndi'` + Status `active` → 503 statt 404,
  solange die Playlist noch fehlt.

### A4. live-stream.service.ts / Kommandos
- **`site-agent-command.enum.ts`** um `ndi_start`, `ndi_stop`, `ptz` erweitern;
  `site-agent-command.types.ts` um optionale `ndi?`- und `ptz?`-Payloads (Source-Name,
  target-Params, Upload-URL-Basis bzw. Action/Direction/Speed/Preset).
- **`activateStream` (Z. 146):** für NDI den Probe-Block (Z. 166-185) und
  `assertSourceReachable` (Z. 220) überspringen; stattdessen `sse.isConnected(agentId)`
  prüfen → sonst `ConflictException('Site agent offline')` (fail fast, kein Halb-Zustand).
  `ffmpegLiveService.start` (Z. 224) durch `sse.push(agentId, ndi_start)` ersetzen. Private
  `stopIngest(stream)` einführen, die auf `sourceType` verzweigt (FFmpeg stop vs ndi_stop);
  auch im Override-Cleanup (Z. 231-265) nutzen.
- **`deactivateStream` (Z. 305):** `ffmpegLiveService.stop` (Z. 313) → `stopIngest` + HLS-Dir
  entfernen.
- **PTZ-Endpoint** auf `live-stream.controller.ts`, `@Roles(OrgAdmin, Editor)`:
  `POST /api/live-streams/:id/ptz`, `PtzCommandDto` (`action`, `direction`, `speed`,
  `presetId` per `@ValidateIf`). Service: `findOne(orgId,id)` org-scoped, ablehnen wenn
  `sourceType !== 'ndi'` oder `!ptzEnabled`; `sse.push(stream.agentId, ptz)` → bei false
  `ConflictException`. `202 Accepted`, `@Throttle`.
- **NDI-Quellen an Dashboard:** `AgentHeartbeatDto` um optional `ndiSources` erweitern,
  in neuem `NdiSourceRegistryService` (in-memory, keyed by agentId) ablegen. Dashboard:
  `GET /api/site-agents/:id/ndi-sources` (org-scoped).
- `SiteAgentSseService` + `SiteAgentService` in `live-stream.module.ts` injizieren
  (`SiteAgentModule` muss exportieren).

### A5. Health (`stream-health.service.ts`) — Pflicht, zusammen mit A4
`checkStreamHealth` (Z. 113) auf `sourceType` verzweigen: pull unverändert; NDI ohne
`isRunning`-Kurzschluss, rein per `hasRecentSegments(getHlsOutputDir(id))`. `sourceType`
in den Active-Streams-Select (Z. 61) aufnehmen.

### A6. Screen-State / Audit
- `screen-state.service.ts` + `json-protocol-adapter.ts`: **keine Änderung** (gleiche
  `streamUrl` aus `streamId`).
- Audit: CREATE-Details um `sourceType/agentId/ndiSourceName` ergänzen (null-safe);
  neues `AUDIT_LIVE_STREAM_PTZ`; High-Frequency-Pan-Ticks nicht einzeln loggen.

---

## Teil B — Site-Agent (`apps/site-agent/src/`)

### B1. Neue Module
- `ndi/ndi-discovery.service.ts` — grandi-Finder hinter Seam `NdiFinderHost` (analog
  `DiscoveryService`/`DiscoveryHost`, `discovery.service.ts:41`); gecachter Snapshot,
  vom Supervisor auf Heartbeat gelesen.
- `ndi/ndi-receiver.service.ts` — ein grandi-Receiver pro Stream (`bandwidth` aus
  `ndiBandwidth`, nur Video, Audio-Frames verwerfen), Frame-Loop
  `await receiver.video()`, **bounded Ring-Buffer (Tiefe 2-3), ältester Frame droppen**
  bei Überlauf (Backpressure, Pi-Schutz). Seam `NdiReceiverFactory`.
- `ndi/ndi-transcoder.service.ts` — ein FFmpeg-Child pro Stream, Frames via stdin
  (`-f rawvideo -pix_fmt ... -s WxH -r fps -i pipe:0`), `-vf scale,fps` CAP vor dem
  Encoder, `-an`, **Short-HLS**: `-g <fps> -keyint_min <fps> -sc_threshold 0`
  (Keyframe exakt jede Sekunde), `-hls_time 1 -hls_list_size 4
  -hls_flags delete_segments+independent_segments`. Argument-Bau als reine Funktion.
  **Encoder-Auswahl als reine, testbare Funktion** (Lookup-Table): override (ENV/Config)
  → arch-auto (`arm64`→`h264_v4l2m2m` `/dev/video*`, `x64`→`h264_vaapi` `/dev/dri`) →
  Fallback `libx264 -preset veryfast -tune zerolatency` mit hartem Software-Cap.
- `ndi/ndi-stream.manager.ts` — Koordinator (Map aktiver Streams), `reconcile(config)`,
  wired Receiver→Transcoder→Uploader. Analog `SupervisorService.runtimes`.
- `hls/hls-upload.service.ts` — watcht das Stream-Dir, PUT neue Segmente **dann** Playlist
  (Reihenfolge load-bearing), DELETE bei Rollover, best-effort + Retry, concurrency-limit 2.
  Segment sofort nach Fertigstellung hochladen (kein Polling-Intervall); Upload-Lag
  (Segment fertig → 2xx) pro Segment messen und im Heartbeat melden.
  Nutzt neue Binär-PUT-Methoden auf `ServerClient` (analog `fetchAppPackage`,
  `server-client.service.ts:150`).
- `ptz/visca.service.ts` — VISCA-over-IP per `dgram` (analog `wol.service.ts:31-65`).
  Byte-Sequenzen als getestete Konstanten: Pan/Tilt mit Speed+Richtung, Zoom tele/wide,
  Stop, Home, Preset recall/store. Transport `udp|tcp` konfigurierbar.

### B2. Verdrahtung
- `app.module.ts`: Provider mit `useFactory` (Seams) ergänzen; `CommandHandlerService` um
  `NdiStreamManager` + `ViscaService`; `SupervisorService` um `NdiDiscoveryService` +
  `NdiStreamManager`.
- `command-handler.service.ts` (`handle()`, Z. 55): neue Branches **vor** dem
  `if (!command.screenId) return;`-Guard (Z. 73), analog `reload_config`/`update_agent`.
- `supervisor.service.ts`: nach `refreshConfigIfDue` → `NdiStreamManager.reconcile(config)`;
  NDI-Quellen + Per-Stream-Status (connected, fps, dropped, upload-lag) in den Heartbeat
  (mit Older-Server-400-Fallback wie `network`, `server-client.service.ts:127-135`).
- `protocol/server-protocol.ts`: `AgentConfigMessage` um optionale `ndiStreams[]`;
  Command-Typen + Payloads. Hand-Sync-Note beibehalten, Backend-DTO
  whitelisten.
- `agent-env.ts`: `MNS_NDI_ENCODER`, `MNS_FFMPEG_PATH`, `MNS_NDI_MAX_SOFTWARE_HEIGHT/_FPS`,
  optional `MNS_NDI_ENABLED`.

### B3. Deployment (höchstes Risiko)
- **`Dockerfile.prod` (`node:26-alpine`/musl):** grandi-Addon + NDI-Runtime + avahi sind
  glibc-orientiert → Alpine wird sehr wahrscheinlich scheitern. **Runtime-Stage auf
  glibc-Base (`node:26-bookworm-slim`) umstellen** oder `gcompat` beweisen. Pflicht-Gate.
- Runtime-Deps: `avahi` + `libavahi-common/client`, `dbus`, NDI-Runtime (aus `@grandi/linux-*`),
  `ffmpeg` mit `h264_v4l2m2m` (Pi) / `h264_vaapi` (x86) / `libx264`. CI: `ffmpeg -encoders`
  + grandi-Load-Smoke je Arch vor Publish.
- **`ansible/templates/mynextscreen-agent.container.j2`:** `AddDevice=/dev/dri` bzw.
  `/dev/video*` (per Inventory-Var), `SupplementalGroups` für render/video unter rootless
  `keep-id`. avahi via Host-Avahi über Shared-Netns + gebundenem D-Bus-Socket nutzen
  (hält `DropCapability=ALL`); sonst minimal `AddCapability=CAP_NET_RAW`.
- Multi-Arch-Manifest: arm64 (jetzt) + amd64 (später), je passende `@grandi/linux-*` +
  ffmpeg-Build.

---

## Latenz

Ziel v1: **3–4 s** Kamera → Screen, per Short-HLS ohne Architekturwechsel.

| Stellschraube | Heute | NDI v1 |
|---|---|---|
| Segmentlänge | 2 s | 1 s (`-hls_time 1`, Keyframe jede Sekunde) |
| Playlist-Länge | 6 | 4 |
| Upload | — | sofort nach Segment-Ende, Segment vor Playlist |
| Player-Puffer | fest 3 s / max 10 s | `liveSyncDurationCount: 2`, `liveMaxLatencyDurationCount: 5` |
| Playlist-Caching | — | `no-cache`, kein Proxy-Buffering |

- **Player (`hls.service.ts:26-28`):** von Sekunden auf Segment-Anzahl umstellen. Für
  Pull-Streams (2-s-Segmente) ergibt das 4 s statt 3 s, also praktisch unverändert; NDI
  landet bei ~2 s Puffer. Kein Sonderpfad pro Quelltyp im Player.
- **Messung:** Testquelle blendet Uhrzeit ein (`timeoverlay`/`clockoverlay`), Screen
  daneben filmen bzw. Uhr im Player-Debug-Overlay vergleichen. Zusätzlich
  Upload-Lag aus dem Agent-Heartbeat.
- **Eskalationspfad (eigener PR, nur bei Bedarf):** LL-HLS (Teilsegmente 200–300 ms,
  blockierende Playlist-Reloads; FFmpeg kann das nicht → Packager wie MediaMTX auf dem
  Agent + LL-HLS-Serving im Backend) oder WebRTC/WHEP (<1 s; Medienserver, UDP/TURN in
  Prod, neuer Player-Pfad, webOS-Support je TV-Generation prüfen).

---

## Teil C — Frontend (`apps/frontend/src/app/live-streams/`)
- `live-stream.model.ts`: `LiveStreamSourceType`, `PtzProtocol`, `PtzAction`; NDI-Felder
  auf `LiveStream` + Create/Update-Requests; `sourceUrl?`/`protocol?` optional; `PtzCommandRequest`,
  `NdiSource`.
- `live-stream.service.ts`: `sendPtz(orgId,id,cmd)` → `POST .../ptz`;
  `getNdiSources(orgId,agentId)` → `GET /api/site-agents/{agentId}/ndi-sources`.
- `live-stream-create-modal.ts`: Source-Type-Segmented (rtmp/rtp/ndi), Protocol nur für
  pull. NDI-Branch: Agent-Picker → NDI-Source-Dropdown (`resource()`), PTZ-Toggle →
  Kamera-IP + VISCA-Port, Qualitäts-Preset (`preview`/`720p30`/`1080p30`), Encoder;
  Bitrate/Auflösung/FPS als „Erweitert"-Overrides. Konditionale Validatoren.
- Detail-Seite: Qualitäts-Preset auch bei aktivem Stream umstellbar.
  Signals, OnPush, `@if`-Blocks.
- `live-stream-detail.ts`: gebundenen Agent + NDI-Source anzeigen. **PTZ-Control-Panel**
  (nur bei `ptzEnabled` + aktivem Stream): Pan/Tilt-Pfeile, Zoom ±, Home, Stop, Preset-Buttons
  → `sendPtz`. Dumb `ptz-control-panel`-Component + Smart-Container. 409 (Agent offline)
  als Toast über `ToastService`.

---

## Risiken (priorisiert)
1. **grandi auf arm64 / musl** — glibc-Base nötig; Hardware-Spike auf echtem Pi **vor** dem
   Feature-Aufbau. Per-Arch-CI-Smoke (`require('grandi')`, `ffmpeg -encoders`).
2. **Transcode-CPU auf dem Pi** — Pflicht-Cap (`-vf scale,fps`), `h264_v4l2m2m` default auf
   arm, Software-Hard-Cap per ENV; dropped-frame-Rate im Heartbeat.
3. **Health-False-Positive** — A5-Branch ist Pflicht und muss mit A4 zusammen landen.
4. **Upload-Authz / Path-Traversal** — `agentId`-Bindung + strikte Filename-Allowlist +
   resolved-Path-Prefix (A3).
5. **Agent offline bei activate / PTZ** — fail fast 409, kein Halb-Zustand.
6. **SSE pro Prozess** — PTZ/ndi_start erreicht den Agent nur von der Instanz mit dessen
   SSE-Verbindung (bestehende Limitierung wie probe/update); in v1 nur dokumentieren.
7. **avahi/mDNS unter rootless Podman** — Host-Avahi + D-Bus-Socket bevorzugen.

## PR-Schnitt

1. **PR 1 — Spike + Agent-Image:** Agent-Runtime auf glibc-Base, grandi + ffmpeg im
   Image, CI-Smoke je Arch (`require('grandi')`, `ffmpeg -encoders`). Mini-Skript:
   `grandi.find()` gegen die Testquelle, 10 s empfangen → Short-HLS lokal schreiben.
   Ergebnis: Machbarkeit auf x86 + Pi, gemessene CPU-Last pro Preset.
2. **PR 2 — NDI-Video end-to-end:** Teil A ohne PTZ, Teil B ohne `ptz/`, Teil C ohne
   PTZ-Panel, Player-Puffer-Umstellung. A4 + A5 landen zusammen.
3. **PR 3 — PTZ:** `visca.service.ts`, `ptz`-Kommando, PTZ-Endpoint, PTZ-Panel, Audit.

## Testen ohne Kamera

Bis auf den finalen Hardware-Check läuft alles ohne Kamera.

- **NDI-Testquelle (Linux, Docker mit `--network host`):** GStreamer `ndisink` aus
  gst-plugins-rs:
  ```bash
  gst-launch-1.0 videotestsrc is-live=true pattern=smpte \
    ! clockoverlay time-format="%H:%M:%S" \
    ! video/x-raw,width=1280,height=720,framerate=30/1 \
    ! ndisinkcombiner name=c ! ndisink ndi-name="TEST-CAM"
  ```
  Alternativen: OBS + DistroAV-Plugin, NDI Tools „Test Patterns" (Windows/macOS), oder
  grandi selbst als Sender in einem Node-Skript.
- **mDNS:** Sender und Agent müssen im selben L2-Netz liegen (`--network host`), sonst
  findet `grandi.find()` nichts. Gleichzeitig der Test für Avahi unter rootless Podman.
- **VISCA-Mock (`tools/visca-mock/`, Node, UDP 52381):** loggt empfangene Bytes,
  antwortet ACK `90 41 FF` + Completion `90 51 FF`, validiert Kommandos gegen die
  Konstanten. Optional: verschiebt einen Crop-Ausschnitt einer Testquelle, damit
  Pan/Tilt/Zoom im Player sichtbar wird.
- **Agent ohne Pi:** auf x86 mit `libx264` (Software-Pfad). Pi nur für
  `h264_v4l2m2m` + arm64-grandi nötig, weiterhin ohne Kamera.
- **CI:** Testquelle + VISCA-Mock als optionaler Smoke-Job (nicht Gate in v1).

## Tests
- **Backend (Gate 92/83/84/92, Branch bindend):** `live-stream.service.spec` (NDI-activate/
  deactivate/sendPtz, offline-409, cross-org, unbekannte Source), DTO-`@ValidateIf`-Matrix,
  `ndi-hls-storage.service.spec` (Traversal, atomar), `site-agent-device.controller.spec`
  (Upload-Scoping), `stream-health.service.spec` (NDI per Recency), `live-stream.controller.spec`
  (PTZ + 503-vs-404).
- **Agent (Gate 85/75/83/85):** grandi/ffmpeg/dgram gemockt; reine Funktionen voll
  abgedeckt (Encoder-Auswahl, FFmpeg-Argumente inkl. Short-HLS/`-an`, Preset-Mapping,
  Backpressure, Upload-Ordering, VISCA-Bytes, reconcile);
  Native-Wrapper in `collectCoverageFrom`-Negationen (`jest.config.ts:13-20`).
- **Frontend:** create-modal (konditionale Felder), detail (PTZ-Panel/disabled), service
  (neue HTTP-Methoden).

## Verifikation end-to-end
1. `nx run backend:db-generate` → Migration reviewen → `db-migrate`.
2. `nx run-many -t lint typecheck test build` grün (betroffene Projekte).
3. Hardware-Spike: Agent-Image auf echtem Pi, `require('grandi')` + `grandi.find()` listet
   die Testquelle `TEST-CAM`; `ffmpeg -encoders | grep v4l2m2m`.
4. Dashboard mit Testquelle + VISCA-Mock: NDI-Stream anlegen (Agent + Source wählen, PTZ an),
   aktivieren → Agent startet Receiver/Transcoder, lädt HLS hoch; Player (Screen) spielt
   innerhalb des hls.js-Retry-Fensters (10×2s). PTZ-Panel → Mock loggt korrekte Bytes.
   Preset umstellen → Transcoder-Neustart, Bild kommt wieder. Deaktivieren → Agent stoppt,
   Fallback-Playlist greift.
5. Latenz messen (Uhr-Overlay vs. Screen): Ziel ≤ 4 s. Darüber → Eskalationspfad.
6. Einmalig mit echter Kamera: Discovery, Bild, PTZ-Bewegung.
