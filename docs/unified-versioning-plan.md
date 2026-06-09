# Einheitliche Versionierung — Plan

> **Ziel:** Root-`package.json` bleibt die einzige Versions-Quelle (Single Source of
> Truth). `backend/`, `frontend/` und `player/` tracken diese Version automatisch bei
> jedem Release — niemand editiert Sub-Versionen manuell, und die heutige Drift kann
> nicht zurückkehren.
>
> Status: **geplant**, noch nicht umgesetzt. Strategie: **Sub-Versionen an Root koppeln**.

## Ausgangslage (Ist-Zustand)

### Was bereits einheitlich funktioniert (Image-/Runtime-Ebene)

Alle drei Images bekommen dieselbe `APP_VERSION` über einen sauberen Build-Arg-Fluss:

| Surface | Quelle |
| --- | --- |
| `npm run version:patch\|minor\|major` (root) | `npm version` bumpt **nur** Root-`package.json` + erstellt Git-Tag `vX.Y.Z` + Commit `chore(release): vX.Y.Z` |
| CI `.github/workflows/ci.yml` (Job `docker`) | Tag-Push → `APP_VERSION=${GITHUB_REF_NAME#v}`; Branch-Push → `APP_VERSION=<root-pkg-version>+sha.<short-sha>` |
| `backend/Dockerfile.prod`, `frontend/Dockerfile.prod`, `player/Dockerfile.prod` | `APP_VERSION/GIT_COMMIT/BUILD_DATE` als `ARG` → OCI-Labels |
| Backend `GET /api/version` | `process.env.APP_VERSION` (Runtime-ENV, Fallback `0.0.0-dev`) |
| Frontend/Player `GET /version.json` | per `printf` zur Build-Zeit erzeugt |
| `npm run images:build` (lokal) | `scripts/build-images.sh` liest Root-`package.json` |

**Diese Ebene ist nicht im Scope dieses Plans** — sie ist bereits korrekt und einheitlich.

### Das eigentliche Problem: Drift der Repo-`package.json`-Versionen

```
root      0.0.1   ← Single Source of Truth (von `npm version` gebumpt)
backend   0.0.1
frontend  0.0.0   ← driftet
player    0.0.0   ← driftet
```

- `npm version patch` bumpt **ausschließlich** die Root-Datei. Die drei Sub-Apps
  (und deren `package-lock.json`-`version`-Felder) bleiben stehen.
- Die Sub-Versionen werden zur Laufzeit nie gelesen, sind aber irreführend und
  widersprechen dem CLAUDE.md-Prinzip „Root = Single Source, alles andere leitet sich ab".
- Es gibt **noch keinen Git-Tag** (`git tag -l` leer → Release-Prozess nie gelaufen).
- Es gibt **keine Absicherung**, die Drift verhindert.

## Plan

### 1. Sync-Script `scripts/sync-versions.mjs`

Ein einziges, abhängigkeitsfreies Node-Script (ESM, passend zu `images:build`-Stil):

- Liest `version` aus Root-`package.json`.
- Schreibt diese Version in `version` von:
  - `backend/package.json`, `frontend/package.json`, `player/package.json`
  - das **Top-Level-`version`-Feld** der jeweiligen `package-lock.json`
    (zusätzlich `packages[""].version`, das npm im Lockfile spiegelt) —
    **kein** `npm install`, nur gezieltes JSON-Rewrite.
- Bewahrt Formatierung so weit wie möglich (2-Space-Indent + trailing newline,
  konsistent mit Prettier), fasst keine anderen Felder an → idempotent.
- Modi:
  - Default (Write): synchronisiert und schreibt geänderte Dateien.
  - `--check`: schreibt nichts; exit `1` + Diff-Ausgabe, wenn eine Sub-Version
    (package.json oder lockfile) von Root abweicht. Für CI.

Pseudostruktur:

```js
// scripts/sync-versions.mjs
const root = readJson('package.json').version;
const targets = ['backend', 'frontend', 'player'];
const files = targets.flatMap(d => [`${d}/package.json`, `${d}/package-lock.json`]);
// --check  -> sammle Abweichungen, exit 1 wenn vorhanden
// default  -> setze version (+ packages[""].version im lockfile), schreibe nur bei Änderung
```

### 2. npm `version`-Lifecycle-Hook (Root-`package.json`)

Neuen Lifecycle-Hook ergänzen — die bestehenden `version:patch/minor/major`
bleiben unverändert:

```jsonc
"scripts": {
  "version": "node scripts/sync-versions.mjs && git add backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json player/package.json player/package-lock.json",
  "version:patch": "npm version patch -m \"chore(release): %s\"",
  "version:minor": "npm version minor -m \"chore(release): %s\"",
  "version:major": "npm version major -m \"chore(release): %s\""
}
```

Warum das greift: Bei `npm version <x>` läuft der `version`-Hook **nach** dem
Root-Bump und **vor** dem Release-Commit. Dateien, die der Hook staged, werden Teil
des `chore(release): vX.Y.Z`-Commits. Damit tracken alle Sub-Apps die Root-Version
automatisch und der bestehende Tag/Commit-Mechanismus bleibt erhalten.

### 3. CI-Drift-Guard

Im Job `lint-test-build` (`.github/workflows/ci.yml`) einen Schritt ergänzen, der
einmal (matrix-unabhängig, oder im Root-Setup) läuft:

```yaml
- name: Check version sync
  run: node scripts/sync-versions.mjs --check
```

→ Build bricht ab, sobald eine Sub-Version von Root abweicht. Verhindert, dass die
Drift je wieder hereinkommt (z. B. wenn jemand eine Sub-`package.json` manuell ändert).

### 4. Einmaliger Sync + Tag-Strategie

- `node scripts/sync-versions.mjs` einmal lokal ausführen → backend/frontend/player
  (+ Lockfiles) auf aktuelle Root-Version `0.0.1` ziehen.
- Commit: `chore: unify package versions to root single source`.
- Ersten echten Release-Tag setzen (Entscheidung beim Umsetzen):
  - entweder bewusst bei `0.0.1` bleiben und nur taggen, oder
  - `npm run version:patch` → erzeugt `v0.0.2`, synchronisiert dabei dank Hook
    direkt alle Sub-Apps in einem Rutsch.

### 5. Doku-Notiz (CLAUDE.md)

Im Abschnitt „Conventions" / „Versions-Single-source-of-truth" einen Satz ergänzen:

> Sub-`package.json`-Versionen (backend/frontend/player) werden vom `version`-npm-Hook
> aus der Root-Version gepflegt — nie manuell editieren. CI (`sync-versions --check`)
> erzwingt das.

## Bewusst nicht im Scope

- Laufzeit-Versionsfluss (Build-Args, OCI-Labels, `/api/version`, `version.json`) —
  bereits korrekt und einheitlich.
- Conventional-Commit-basiertes Auto-Bumping / `semantic-release` o. Ä. — wäre eine
  spätere, größere Änderung; dieser Plan hält am bestehenden manuellen
  `npm run version:*`-Release fest und macht es nur konsistent.

## Akzeptanzkriterien

- [ ] `scripts/sync-versions.mjs` existiert, idempotent, mit `--check`-Modus.
- [ ] Root-`package.json` hat einen `version`-Hook, der Sub-Apps synchronisiert und staged.
- [ ] `npm run version:patch` bumpt Root **und** alle drei Sub-Apps in einem
      Release-Commit auf dieselbe Version.
- [ ] CI schlägt fehl, wenn Versionen driften (`--check`).
- [ ] Alle vier `package.json` (+ drei Lockfiles) zeigen nach dem einmaligen Sync
      dieselbe Version.
- [ ] CLAUDE.md-Notiz ergänzt.
