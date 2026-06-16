# myNextScreen Reskin — Master-Plan (alle offenen Views)

Konsolidierte Übersicht über alle Reskin-Pläne, damit über Nacht autonom gearbeitet
werden kann. Pro View existiert ein eigenständiges `<VIEW>-RESKIN-PLAN.md` (Soll/Ist,
Phasen, betroffene Dateien, Risiken, offene Entscheidungen).

Branch: `feat/frontend-redesign-mynextscreen`. Policy (mit Nutzer abgestimmt, 2026-06-15):
**Design voll matchen, jede größere Entscheidung im Plan flaggen.** Bereits saubere Views
(login, register, setup, search, auth, audit-log) sind ausgenommen.

## View-Übersicht

| View | Plan-Datei | Aufwand | Offene Entsch. | Backend nötig? |
| --- | --- | --- | --- | --- |
| Screen-Groups | `SCREEN-GROUPS-RESKIN-PLAN.md` | groß | 0 (entschieden) | **Ja** — `color`+`icon` Spalten |
| Instance-Admin | `ADMIN-RESKIN-PLAN.md` | groß | 6 | optional (Org-Table-Daten, LoadGraph-Metrics) |
| Live-Streams | `LIVE-STREAMS-RESKIN-PLAN.md` | mittel-groß | 9 | nein (Detail-Route neu) |
| Content | `CONTENT-RESKIN-PLAN.md` | mittel | 9 | nein (empf.) |
| Playlists | `PLAYLISTS-RESKIN-PLAN.md` | mittel | 7 | nein (empf.) |
| Schedules | `SCHEDULES-RESKIN-PLAN.md` | mittel | 8 | nein (empf.) |
| Settings | `SETTINGS-RESKIN-PLAN.md` | mittel | 8 | nur Alert-Rules (#5, defer empf.) |
| Notifications | `NOTIFICATIONS-RESKIN-PLAN.md` | klein | 3 | nein |
| Player (Phase 5) | `PLAYER-RESKIN-PLAN.md` | klein | 5 | nein |
| Dashboard | `DASHBOARD-RESKIN-PLAN.md` | mini | 1 | nein |
| Screens | `SCREENS-RESKIN-PLAN.md` | mini | 0 | nein |
| Shared (Cleanup) | `SHARED-CLEANUP-RESKIN-PLAN.md` | mini | 3 | nein |

## Empfohlene Ausführungs-Reihenfolge (Nacht)

**Welle 1 — risikolos, autonom ohne Rückfrage** (reine Token/Primitive-Swaps, kein
Backend, keine Verhaltensänderung; alle Entscheidungen haben eindeutige Low-Risk-Empfehlung):
1. Screens (1 Token in `screen-form.ts:420`)
2. Dashboard (Token-Mapping `--color-*` → `--online/--info/--offline`, + Spec)
3. Shared-Cleanup (8 Tokens / 5 Dateien)
4. Notifications (Badge→Status-Dot, Dropdown-Shadow/Radius)
5. Player (Component-`styles`-Blöcke auf Tokens, Monospace-Font fixen)

**Welle 2 — mittel, überwiegend autonom** (Modal-Migration auf `mns-overlay`/`mns-modal`,
Restyle; nur „Detail-Call"-Entscheidungen, keine Backend-/Feature-Verluste):
6. Content (4 Alt-Token-Dateien + 2 Modals; reale Previews behalten)
7. Playlists (4 Alt-Token-Dateien + 2 Modals; CDK-Reorder behalten)
8. Settings (Tab-Shell extrahieren, Modals migrieren; Alert-Rules NICHT verdrahten)
9. Schedules (Modal + Toolbar + Kalender-Optik; Architektur unverändert)

**Welle 3 — groß / braucht Sign-off** (strukturelle Umbauten und/oder Backend):
10. Live-Streams (Detail-Route, Monitor-Restyle)
11. Screen-Groups (**Backend-Migration `color`+`icon`** + Popover-Wall + Inline-ModeToggle)
12. Instance-Admin (Sub-Komponenten/Modals/Tabellen; LoadGraph-Daten klären)

## Entscheidungen — Sign-off-Batch (BLOCKEND für Welle 3)

Diese betreffen Backend-Schema, Datenquellen oder spürbaren Feature-Verlust und sollten
**vor** Welle 3 beantwortet werden. Details + Optionen je im View-Plan unter
„Offene Entscheidungen".

- **Screen-Groups:** `color`+`icon` als DB-Spalten (entschieden: JA), Popover statt DnD
  (entschieden: JA). → bereit, sobald Backend-Migration ok.
- **Admin #2:** Org-Table-Spalten Plan/Status/Screens-online/Owner sind NICHT im Schema
  (`organisations`). → Mock weglassen, Backend-Endpoint, oder Spalten kürzen?
- **Admin #3:** LoadGraph `transcodeWindows` fehlt in `SystemLoad`. → leeres Array,
  Mock, oder Metrics-Feld ergänzen?
- **Admin #5:** Per-Org-Dashboard-Daten (Storage-Legende, Snapshot) Datenquelle.
- **Schedules #1:** Org-weite vs. target-gefilterte Kalender-Architektur (Empfehlung:
  Ist-Architektur behalten, nur Optik matchen).
- **Settings #5:** Alert-Rules-ToggleRows ohne Backend-Persistenz (Empfehlung: als
  Backlog deferren, keine Fake-Flags im Reskin-PR).
- **Playlists/Schedules colour:** per-Item-Farbe — clientseitig ableiten (empf.) vs.
  Backend-Spalte.

Alle übrigen Entscheidungen (~40) sind Detail-Calls mit eindeutiger Empfehlung im
jeweiligen Plan und werden in Welle 1/2 nach Empfehlung umgesetzt.

## Querschnitt-Risiken (gelten überall)

- **OnPush + Signals:** kein `ChangeDetectorRef`-/Plain-Field-Subscribe-Muster (bekannte
  Regression in audit-log/settings) — State auf Signals.
- **`mns-icon` ist `display:contents`** — Positionierungs-Klassen am Host wirken nicht;
  in positionierten `<span>` wrappen.
- **Globaler `ToastService`** für alles Feedback; keine lokalen Toast-Banner.
- **Frontend-Tests sind harter CI-Gate** (vitest `pool: 'forks'`); Specs mitziehen.
- **`mns-select` ist nur Signal-`model`-kompatibel**, nicht `ngModel`.
- **Gates vor jedem PR:** `npx nx affected -t lint typecheck test build` + `format:check`
  + Backend-Coverage (~85 %).

## Entschieden (2026-06-16, Nutzer-Sign-off)

Prozess:
- **Detail-Entscheidungen** (~40, mit Empfehlung): autonom nach Empfehlung umsetzen.
- **Backend-Änderungen**: autonom erlaubt, solange **additiv + abwärtskompatibel** (Defaults,
  keine Datenlöschung) und im View-Plan vorgesehen.
- **PR-Strategie**: ein PR pro Welle (Welle 3 ggf. pro großer View).
- **Start**: alles autonom starten (inkl. Welle 3).

View-/Backend-Entscheidungen:
- **Screen-Groups**: `color`+`icon` DB-Spalten JA; Popover-Wall statt DnD JA.
- **Admin Org-Tabelle**: nur Aggregierbares zeigen (Screens-online, Storage); Plan/Status
  (Mock) **weglassen**. Kein neues Schema-Feld.
- **Admin LoadGraph**: `transcodeWindows` vorerst **leeres Array** (CPU/RAM real, kein Shading).
- **Admin Org-Dashboard**: aus vorhandenen Org-Stats clientseitig aggregieren, kein neuer Endpoint.
- **Schedules**: nur Optik matchen, **target-gefilterte Architektur behalten**.
- **Settings Alert-Rules**: **Backend-Persistenz bauen** (Schema + Service), Toggles echt wirken lassen.
- **Playlist- & Schedule-Farbe**: **`color`-Backend-Feld wie bei screen-groups** (je eine Migration + Picker).
- **Live-Streams**: **neue Detail-Route `live-streams/:id`** mit Monitor-Ansicht (analog screen-groups/:id).

→ Backend-Migrationen gesamt: screen-groups (color+icon), playlists (color), schedules (color),
settings (alert-rules). Alle additiv mit Defaults.

## PR-Strategie

Ein PR pro Welle (Welle 3 pro großer View) statt Mega-PR — kleinere, reviewbare Diffs,
grüne Gates je Schritt. Reihenfolge wie oben.
