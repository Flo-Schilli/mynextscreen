# Plan: Frontend-Testabdeckung hochziehen + CI-Coverage-Gate

> Status: geplant · Voraussetzung: alle "Phase 3"-Splits (inkl. `live-streams`,
> `dashboard`, `audit-log`) sind gemerged.

## Context
Das "Phase 3"-Refactoring (PRs #6–#12 + die abschließenden Splits von
`live-streams`, `dashboard`, `audit-log`) hat alle Frontend-Domains aus
Monolithen in Smart Container + Child Components zerlegt und **Business-Logik in
Services extrahiert**. Damit ist das Frontend durchgängig testbar — aber die
Abdeckung ist dünn (~17 Specs) und es gibt **kein Coverage-Gate** fürs Frontend
(nur Backend ist via `test:cov` bei ~85 % abgesichert; CI-Frontend läuft bloß
`npm test`).

Ohne Tests verpufft ein Großteil des Refactoring-Nutzens und künftige Changes
können ungesehen regredieren. Ziel: die testbar gemachte Logik flächendeckend
absichern und das per **Ratchet-Gate** in CI festnageln (Floor knapp unter
Ist-Stand, danach schrittweise anheben) — keine künstlichen Tests nur fürs Gate
(siehe CLAUDE.md).

## Ist-Stand
- Pool-Fix vorhanden: `pool: 'forks'` in `frontend/vitest.config.ts`.
- Spec-Pattern etabliert (TestBed + `provideZonelessChangeDetection()`), Referenz:
  `frontend/src/app/schedules/schedule-recurrence.service.spec.ts`.
- **Kein** Coverage-Provider installiert (`@vitest/coverage-v8` fehlt), keine
  `coverage`-Section in der vitest-Config.
- CI-Matrix `.github/workflows/ci.yml`: frontend nutzt `npm test`, backend
  `npm run test:cov`.

### Bereits getestet (nicht anfassen)
content-filter, content-format, playlist-format, schedule-calendar,
schedule-recurrence, screen-wall-preview, notification.service,
notification-preferences.service, selection.service, content-detail,
screen-create-form, screen-edit-form, settings/user, shared/selection/*.

## Test-Targets (Priorität)
Da alle Splits fertig sind, wird **flächendeckend** getestet — auch die aus
`live-streams`, `dashboard`, `audit-log` neu extrahierten Child-Components/-Services.

1. **Pure-Logic / Stateful Services** (höchster Wert, kein HTTP-Mock nötig):
   - `shell/theme.service.ts` (Signal + localStorage)
   - `shell/organisation-state.service.ts` (State-Selection)
   - `auth/auth.service.ts` (Token/Session-Logik)
   - sowie alle bei den Splits neu extrahierten Logik-Services (z. B.
     Dashboard-Aggregation, Live-Stream-State, Audit-Log-Formatierung).
2. **HTTP-Data-Access-Services** (einheitliches Pattern via `HttpTestingController`,
   viele schnelle Specs): `content.service`, `playlist.service`, `schedule.service`,
   `screen.service`, `screen-group.service`, `live-stream.service`,
   `audit-log.service`, `search.service`, `member.service`,
   `organisation.service`, `org-notification-config.service`,
   `dashboard-sse.service` (SSE-Parsing/Reconnect).
3. **Komponenten mit Logik** (Formvalidierung/Editor-State): z. B.
   `playlists/playlist-editor.ts`, `schedules/schedule-form-modal.ts`,
   `content/content-grid.ts`, `screen-groups/screen-group-grid-editor.ts`, sowie
   die neuen Child-Components aus den drei zuletzt gesplitteten Domains.

## Approach: Ratchet-Gate statt Big-Bang
Erst Provider + Baseline, dann Specs in Prioritätsreihenfolge, dann Gate auf den
gemessenen Ist-Floor setzen. So wird sofort abgesichert und kann iterativ steigen.

### Schritt 1 — Tooling
- `@vitest/coverage-v8` als devDependency hinzufügen (Version passend zur
  vorhandenen vitest-Version in `frontend/package.json`).
- In `frontend/vitest.config.ts` `test.coverage` ergänzen: `provider: 'v8'`,
  `reporter: ['text','lcov']`, `include: ['src/app/**/*.ts']`,
  `exclude: ['**/*.spec.ts','**/*.model.ts','**/main.ts','**/*.routes.ts','**/*.config.ts']`.
  Thresholds zunächst **weglassen**.
- `package.json`-Script ergänzen: `"test:cov": "vitest run --coverage"`.

### Schritt 2 — Baseline messen
- `cd frontend && npm run test:cov` ausführen, Ist-Coverage (lines/funcs/branches)
  notieren. Dieser Wert bestimmt den Gate-Floor in Schritt 4.

### Schritt 3 — Specs ergänzen (Prio 1 → 2 → 3)
- Pattern aus `schedule-recurrence.service.spec.ts` übernehmen (TestBed,
  `provideZonelessChangeDetection()`, AAA-Struktur, beschreibende Testnamen).
- HTTP-Services: `provideHttpClient()` + `provideHttpClientTesting()` /
  `HttpTestingController` — URL, Methode, Body und org-Scoping pro Endpoint
  verifizieren.
- Stateful Services: localStorage/Signal-Verhalten direkt asserten.
- Ziel-Abdeckung realistisch wählen (z. B. ~55–65 % lines), nicht erschöpfend.

### Schritt 4 — CI-Gate aktivieren
- `coverage.thresholds` in `vitest.config.ts` auf den erreichten Floor setzen
  (leicht darunter, z. B. abgerundet).
- CI-Matrix `.github/workflows/ci.yml`: frontend-Eintrag `test: 'npm test'` →
  `test: 'npm run test:cov'` (spiegelt backend).

## Kritische Dateien
- `frontend/package.json` — devDep + `test:cov`-Script
- `frontend/vitest.config.ts` — `coverage`-Section + `thresholds`
- `.github/workflows/ci.yml` — frontend-Matrix auf `test:cov`
- Neue `*.spec.ts` neben den jeweiligen Services/Komponenten (Prio-Liste oben)

## Verification
- `cd frontend && npm run test:cov` → grün, Coverage-Report zeigt gestiegenen Wert.
- `cd frontend && npm run typecheck && npm run lint && npm run format:check` → grün.
- Gate greift: Threshold testweise 1–2 % über Ist setzen → Lauf schlägt fehl;
  wieder auf Floor zurück → grün.
- Vor PR: `@typescript-reviewer` über die neuen Specs (CLAUDE.md-Konvention).
