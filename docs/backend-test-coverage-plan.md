# Backend Test Coverage Plan — Quality Gates + CI

## Context

Das Backend ist die testintensivste App (83 Suites / 905 Tests), aber die Coverage-Gates
in `backend/jest.config.ts` sind nur **lokal** wirksam und bewusst unter dem Ist-Wert
gesetzt (Headroom). In der CI läuft zwar `npm run test:cov`, der erzeugte Report wird
aber **nirgends sichtbar gemacht** (kein Artifact, kein PR-Kommentar) und es gibt **keinen
Schutz für neuen Code** — eine ungetestete neue Datei senkt die Gesamt-Coverage nur
marginal und rutscht durch die globale Schwelle.

Ziel: (1) Coverage gezielt in den schwachen Modulen real erhöhen, (2) ein nachhaltiges
Gate-System (Patch-Coverage für neuen Code + schrittweise hochgezogene globale Schwellen),
(3) Coverage in jedem PR sichtbar machen — komplett GitHub-nativ, ohne externe Dienste.

### Ist-Stand (gemessener Baseline, `npx jest --coverage`)

| Scope | % Stmts | % Branch | % Funcs | % Lines |
|---|---|---|---|---|
| **All files** | **84.94** | **83.11** | **75.53** | **85.32** |
| playlist | 69.14 | 63.23 | **47.50** | 69.56 |
| search | 80.70 | 75.00 | 100 | 80.85 |
| organisation | 81.08 | 88.46 | 82.35 | 81.87 |
| notification | 85.99 | 80.31 | 82.05 | 87.31 |
| live-stream | 87.02 | 82.67 | 81.35 | 87.06 |
| content | 89.56 | 72.07 | 82.08 | 89.84 |
| migrations | **0** | 100 | **0** | **0** |

Konkrete Hotspots: `playlist.controller.ts`/`playlist.module.ts` ungetestet (drückt
Funcs auf 47.5%), `search/dto/search-results.dto.ts` 0%, `organisation/storage.controller`,
`content.controller`, diverse reine `*.module.ts`-Wiring-Dateien 0%, und `src/migrations`
0% (verzerren Funcs/Stmts).

## Entscheidungen
- **CI-Reporting:** GitHub-nativer PR-Kommentar (kein Codecov/externe Secrets).
- **Gate-Philosophie:** Patch-Coverage (neuer Code ≥ Ziel) **+** Ratchet globaler Schwellen.
- **Umfang:** Beides — neue Tests schreiben *und* Gates/CI aufsetzen.

---

## Phase 1 — Coverage-Config bereinigen

**Datei:** `backend/jest.config.ts`

`collectCoverageFrom` schärfen, damit das Gate echte Logik misst statt Bootstrap/Wiring:

```ts
collectCoverageFrom: [
  '**/*.ts',
  '!**/*.spec.ts',
  '!**/index.ts',
  '!main.ts',                 // Bootstrap, kein Logik-Code
  '!data-source.ts',          // nur für migration CLI
  '!**/*.module.ts',          // reine DI-Verdrahtung (z.B. screen.module 0% trotz getestetem Modul)
  '!migrations/**',           // TypeORM-Migrationen (aktuell 0%, nicht sinnvoll unit-testbar)
],
```

> Tradeoff bewusst: `*.module.ts` und Migrationen werden aus der Messung genommen — das
> sind Verdrahtungs-/Schema-Artefakte ohne testbare Branch-Logik. Dadurch steigt v.a.
> `Funcs%` sofort und spiegelt die reale Logik-Abdeckung wider. Controller/Services/Utils
> bleiben vollständig in der Messung.

Nach dieser Bereinigung neuen Baseline messen (Erwartung: Funcs deutlich > 75%) und in
Phase 3 als Ratchet-Ausgangswert verwenden.

## Phase 2 — Coverage in schwachen Modulen real erhöhen

Bestehendes Test-Muster wiederverwenden (NestJS `Test.createTestingModule` + manuelle
`jest.fn()`-Repository-Mocks; Referenz: `backend/src/playlist/playlist.service.spec.ts`,
`backend/src/screen/screen-state.service.spec.ts`). **Kein neues Test-Framework, keine
zentralen Factories** — Mocks pro Spec wie im Repo üblich.

Priorisierte neue Specs (größter Hebel zuerst):

1. **`backend/src/playlist/playlist.controller.spec.ts`** *(größter Einzelhebel — hebt
   playlist Funcs von 47.5%)*. CRUD-Endpoints, Org-Scoping/Guard-Verhalten, Item-Ordering.
   Muster: bestehende Controller-Specs (z.B. `screen-group.controller` ist 100%).
2. **`backend/src/search/dto/search-results.dto.ts`** (0%) — Mapping/Konstruktion der
   Result-DTO abdecken; dazu `search.service` Branch bei Zeile 128.
3. **`backend/src/organisation/storage.controller.spec.ts`** — Storage-Limit-Endpoints
   (hebt organisation von 81%).
4. **`backend/src/content/content.controller.spec.ts`** + Content-Branches (72% → höher):
   Upload-Validierung, Fehlerpfade.
5. **`backend/src/live-stream`**: ungetestete Fehler-/Lifecycle-Branches ergänzen.
6. **`backend/src/schedule`**: Funcs 69.44% → Controller/uncovered Service-Funcs ergänzen.

Vorgehen je Modul: `npx jest --coverage --collectCoverageFrom='src/<modul>/**/*.ts'` lokal,
die „Uncovered Line #s" aus dem Text-Report gezielt mit AAA-Tests (Arrange-Act-Assert)
schließen. **Keine Pseudo-Tests nur fürs Gate** (CLAUDE.md). Realistisches Ziel global:
**~88–90% Stmts/Lines, ≥80% Funcs** nach Phase 1+2.

## Phase 3 — Quality Gates: Patch-Coverage + Ratchet

**Globaler Ratchet** — `backend/jest.config.ts` `coverageThreshold.global` nach Phase 2
auf knapp unter den neuen Ist-Wert anheben (z.B. Stmts/Lines 88, Branch 82, Funcs 80).
Bleibt das lokale + CI Hard-Gate gegen Gesamt-Regression. Kommentar im File aktualisieren.

**Patch-Coverage (neuer Code)** — GitHub-nativ über die in Phase 4 eingebundene Action:
geänderte/neue Dateien eines PRs müssen ein Coverage-Ziel erreichen (Start **80%**,
später hochziehbar). Das verhindert, dass neuer ungetesteter Code unter dem trägen
globalen Mittelwert durchrutscht. Konfiguriert als eigener, **fehlschlagender** Check auf
`pull_request`.

## Phase 4 — CI-Integration (GitHub-nativ)

**Datei:** `.github/workflows/ci.yml`, Job `lint-test-build`, nur Matrix-Eintrag `backend`.

Nach dem `Test`-Schritt (der bereits `npm run test:cov` läuft und `clover.xml`/`lcov.info`/
`coverage-final.json` unter `backend/coverage/` erzeugt) ergänzen:

1. **Coverage-Artifact** — `actions/upload-artifact@v4` lädt `backend/coverage/` hoch
   (lcov + HTML-Report), nur für `app == 'backend'` (Matrix-Bedingung via `if:`).

2. **PR-Kommentar + Patch-Gate** — `ArtiomTr/jest-coverage-report-action` auf
   `pull_request`-Events:
   - postet/aktualisiert eine Coverage-Tabelle inkl. **„Changed files"**-Sektion im PR,
   - `threshold` als Gesamt-Gate, plus Changed-files-Gate für Patch-Coverage,
   - `package-manager: npm`, `test-script: npm run test:cov`, `working-directory: backend`,
     `annotations: failed-tests`,
   - benötigt nur das automatische `GITHUB_TOKEN` (kein neues Secret).

   > Da die Matrix `format:check · lint · typecheck · test · build` für drei Apps fährt,
   > die Coverage-Schritte mit `if: matrix.app == 'backend'` gaten, damit sie nur einmal
   > laufen. Alternativ in einen separaten kleinen `backend-coverage`-Job auslagern
   > (sauberer, falls die `if`-Bedingungen den Matrix-Eintrag zu sehr aufblähen) — beim
   > Umsetzen entscheiden, bevorzugt die `if:`-Variante (weniger Duplikation von Setup).

   Permissions des Jobs ergänzen: `pull-requests: write`, `contents: read`.

Frontend/Player bleiben unverändert (kein Gate dort, wie in CLAUDE.md festgehalten).

## Zu ändernde / neue Dateien (Übersicht)
- `backend/jest.config.ts` — `collectCoverageFrom` schärfen, `coverageThreshold` ratchen.
- `backend/src/playlist/playlist.controller.spec.ts` *(neu)* + weitere Specs lt. Phase 2.
- `.github/workflows/ci.yml` — Artifact-Upload + PR-Coverage-Action (backend-gated).
- *(kein* neues npm-Package nötig im Backend; die CI-Action ist eine GitHub Action.)

## Verifikation
1. **Lokal:** `cd backend && npm run test:cov` — alle Suites grün, neue globale Schwellen
   werden erfüllt (kein `Jest: coverage threshold not met`). Vorher/Nachher den
   `All files`-Wert vergleichen (Baseline oben: 84.94/83.11/75.53/85.32).
2. **Modulweise:** `npx jest --coverage` Text-Report prüfen — `playlist` Funcs deutlich
   > 47.5%, `search-results.dto` nicht mehr 0%.
3. **CI (Test-PR):** Branch mit absichtlich ungetesteter neuer Funktion pushen →
   Patch-Coverage-Check muss **rot** werden und der PR-Kommentar die Changed-files-Coverage
   zeigen. Danach Test ergänzen → Check **grün**. Artifact `coverage` im Workflow-Run
   herunterladbar.
4. **Regression-Schutz:** Globaler Threshold im `jest.config.ts` greift in CI (Schritt
   `Test`) und blockt einen Coverage-Drop projektweit.
