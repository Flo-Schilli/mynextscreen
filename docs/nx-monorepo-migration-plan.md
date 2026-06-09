# Migration: digital-signage → Nx Integrated Monorepo

## Context

Heute sind `backend` (NestJS 11 / Jest), `frontend` (Angular 21.2 / Vitest) und
`player` (Angular 21.2 / Vitest) **drei völlig getrennte npm-Projekte**: je eigenes
`package.json`, eigenes `package-lock.json`, eigenes `node_modules`. Das Root-
`package.json` orchestriert nur über `npm run … --prefix <app>`. Es gibt **keinen
gemeinsamen Code** (Backend↔Frontend reden ausschließlich über HTTP), keine npm
workspaces, keine Build-Caches. CI ist eine Per-App-Matrix; jede App wird bei jedem
Push komplett neu gelintet/getestet/gebaut. Geteilte Typen/DTOs werden faktisch
dupliziert.

**Ziel (vom Nutzer bestätigt):** Voll-integriertes Nx mit (a) Computation-Cache +
`nx affected`, (b) shared lib für gemeinsame Typen/DTOs, (c) Single-Install /
einheitliche Tool-Orchestrierung. **Test-Runner bleiben gemischt:** Jest fürs
Backend, Vitest für Frontend/Player (kein Umbau der 900+ Backend-Tests).

**Feasibility bestätigt:** Nx 22.3+ unterstützt Angular 21; aktuelles `@nx/angular`
~22.7 unterstützt Angular 21.1. Angular 21 unter Nx nutzt ohnehin esbuild
(`@angular/build:application` ist schon im Einsatz) und empfiehlt Vitest — beides
passt bereits. NestJS 11 wird von `@nx/nest` abgedeckt.

**Charakter der Migration:** Das ist ein **atomarer, großer Umbau** (Single
Lockfile, geänderte Build-Outputs, neu geschriebene Dockerfiles/CI). Kein
inkrementelles Teil-Rollout — ein dedizierter Branch von `main`, ein großer PR, am
Ende muss alles grün sein und die Prod-Images müssen booten.

> Hinweis: Aktueller Branch `test/frontend-coverage-gate` hat uncommittete
> `.maggus/`-Löschungen. Migration auf **frischem Branch von `main`** starten, nicht
> hier draufsetzen.

---

## Ziel-Layout

```
nx.json                      # Nx-Config: plugins, target defaults, cache, named inputs
package.json                 # EIN Root-package.json (alle deps gemerged), version = single source
package-lock.json            # EIN Lockfile
tsconfig.base.json           # paths: @signage/shared, @signage/api-types …
apps/
  backend/                   # ehem. backend/ + project.json
  frontend/                  # ehem. frontend/ + project.json
  player/                    # ehem. player/ + project.json
libs/
  shared-types/              # NEU: gemeinsame DTO-/API-Typen (Backend ↔ Frontend/Player)
player-applications/lg-tvos/ # UNVERÄNDERT (plain HTML/JS, kein npm, nicht Teil von Nx)
ansible/                     # UNVERÄNDERT (zieht fertige GHCR-Images, Build-Modell egal)
```

---

## Phase 0 — Vorbereitung & Toolchain-Reconciliation (höchstes Korrektheitsrisiko)

Im Nx-integrated-Monorepo gibt es **ein** Root-`package.json` (Apps haben nur
`project.json`, kein eigenes `package.json`). Alle Dependencies werden gehoistet →
**Versionskonflikte müssen vorher aufgelöst werden**:

- **TypeScript:** Backend `5.7` vs Frontend/Player `5.9.2` → auf eine Version
  einigen (die von Angular 21 / `@nx/angular` geforderte Range gewinnt).
- **ESLint:** Backend `9.x` vs Frontend/Player `10.x` → eine Major-Version.
- **Prettier / RxJS / zone.js / @types/** etc. → je eine Version.
- Backend `module: commonjs` vs Angular `module: preserve` bleiben **per-App** im
  jeweiligen `tsconfig.app.json` (nicht in der Base erzwingen).

Konflikte dokumentieren und einzeln testen. Dies ist der wahrscheinlichste Bruch –
nicht überspringen.

## Phase 1 — Nx initialisieren & Apps verschieben

1. `npx nx@latest init` im Repo-Root (fügt `nx.json` + Root-Tooling hinzu).
2. Apps nach `apps/<name>/` verschieben (git-history via `git mv` erhalten).
3. Pro App ein `project.json` mit Targets `build / serve / lint / test / typecheck`.
4. Drei `package.json` zu einem Root-`package.json` mergen (Scripts → Nx-Targets:
   `nx run-many -t lint`, `nx affected -t test` usw.). **`version` bleibt im Root —
   Single Source of Truth, CI/`images:build` lesen sie weiter unverändert.**
5. Plugins: `@nx/angular` (frontend, player), `@nx/nest` oder `@nx/js`+nest-build
   (backend), `@nx/vite` (Vitest-Targets), `@nx/jest` (Backend-Jest-Target).
6. `tsconfig.base.json` als gemeinsame Basis; per-App `tsconfig.app.json` extended sie.

## Phase 2 — Build-Tooling pro App in Nx abbilden

- **frontend / player:** `@nx/angular:application`-Executor (kapselt den schon
  genutzten esbuild-`@angular/build`). Budgets, `fileReplacements`
  (`environment.production.ts`), `outputHashing` aus `angular.json` 1:1 nach
  `project.json` übertragen. `angular.json` entfällt. Serve-Ports 4200/4300 +
  `proxy.conf*.json` erhalten.
- **backend:** `nest build` als Nx-Target abbilden. **Kritisch erhalten:** Pfad-Alias
  `@/*` → `src/*` (in `tsconfig` + Jest `moduleNameMapper`) und die TypeORM-CLI-
  Scripts (`migration:generate/run/revert` via `data-source.ts`) müssen weiter
  funktionieren — diese als `run-commands`-Targets übernehmen.
- **Output-Pfade ändern sich** (Kernpunkt für Docker, Phase 4):
  - Backend: `dist/main` → **`dist/apps/backend/main.js`**
  - Frontend: `dist/frontend/browser` → **`dist/apps/frontend/browser`**
  - Player: `dist/player/browser` → **`dist/apps/player/browser`**

## Phase 3 — Tests & shared lib

- **Backend (Jest):** `jest.config.ts` übernehmen, **Coverage-Gate
  (80/78/70/80) bleibt hart erzwungen**. `@/`-`moduleNameMapper` mitnehmen.
- **Frontend/Player (Vitest):** `vitest.config.ts` übernehmen — **`pool: 'forks'`
  zwingend behalten** (TestBed-Singleton-Leak-Fix, siehe CLAUDE.md). `@nx/vite`
  darf den Pool nicht überschreiben. Coverage v8 wie gehabt.
- **`libs/shared-types`** neu anlegen: zunächst leer/minimal. Erst echte Duplikate
  (API-Response-Envelope, DTO-Shapes) schrittweise dorthin ziehen und über
  `@signage/shared-types` importieren. **Kein** Big-Bang-Type-Sharing in dieser
  Migration — Struktur schaffen, Inhalt später. (Erfüllt Ziel „shared code" ohne
  Migrationsrisiko aufzublähen.)

## Phase 4 — Docker neu schreiben (größtes operatives Risiko)

Heute baut jedes `Dockerfile.prod` mit Context `./<app>` und kopiert das eigene
`package.json`/`package-lock.json`. Mit **einem** Root-Lockfile + libs **bricht das
Modell** — Build-Context muss der **Repo-Root** werden.

Pro App `apps/<app>/Dockerfile.prod` neu (Muster, repräsentativ):

```dockerfile
# Stage build: Context = Repo-Root
COPY package.json package-lock.json nx.json tsconfig.base.json ./
RUN npm ci
COPY apps/<app> apps/<app>
COPY libs libs
RUN npx nx build <app> --configuration=production
# Stage runtime: copy aus dist/apps/<app>/...
```

- **Backend-Runtime:** `npm ci --omit=dev`, `COPY --from=builder dist/apps/backend`,
  `CMD ["node","dist/apps/backend/main.js"]`. ffmpeg + tini + HEALTHCHECK + OCI-Labels
  + `APP_VERSION/GIT_COMMIT/BUILD_DATE`-ARGs **unverändert übernehmen**.
- **frontend/player-Runtime:** nginx-Stage, `COPY --from=builder
  dist/apps/<app>/browser /usr/share/nginx/html`, `version.json`-Generierung +
  `nginx.prod.conf`/`docker-entrypoint.sh` + Labels **erhalten**.
- **`docker-compose.yml` (dev):** alle drei `build.context` auf `.` (Root) +
  `dockerfile: apps/<app>/Dockerfile`. Dev-Dockerfiles auf `nx serve <app>`
  umstellen. Volume-Mounts `./<app>/src` → `./apps/<app>/src` anpassen.
- **`scripts/build-images.sh`:** Loop auf `-f apps/${svc}/Dockerfile.prod .`
  (Context Root). REGISTRY/Tags/Build-Args unverändert.

## Phase 5 — CI auf `nx affected` umbauen

`.github/workflows/ci.yml`:

- **Job `lint-test-build`:** Per-App-Matrix ersetzen durch einen Job: `npm ci` am
  Root (ein Cache), dann `npx nx affected -t lint test typecheck build`
  (`--base=origin/main`). Optional `nrwl/nx-set-shas` für korrekte affected-Base.
  Caching via lokalem Nx-Cache (oder Nx Cloud, falls gewünscht — separat zu
  entscheiden).
- **Job `docker`:** Matrix `[backend,frontend,player]` bleibt, aber `context: .`
  und `file: ./apps/${{ matrix.app }}/Dockerfile.prod`. Optional nur Images für
  `affected` Apps bauen. **Meta-Step (liest Root-`package.json`-Version) bleibt
  unverändert** — Versionsfluss intakt.

## Phase 6 — Aufräumen & Doku

- Alte `angular.json`, per-App `package.json`/`package-lock.json`, redundante
  per-App-Tool-Configs entfernen.
- `CLAUDE.md` Commands-Block + „Project Structure" auf Nx aktualisieren
  (`nx run-many`, `nx affected`, neue Pfade). `ARCHITECTURE.md` nachziehen.
- **`ansible/` bleibt unverändert** — zieht fertige GHCR-Images, Build-Modell ist ihm
  egal. Im Plan verifizieren, nicht anfassen.

---

## Betroffene Dateien (repräsentativ, nicht vollständig)

| Datei | Änderung |
| --- | --- |
| `package.json` (Root) | Merge aller 3, Scripts → Nx, version bleibt |
| `nx.json`, `tsconfig.base.json` | **neu** |
| `backend|frontend|player/` → `apps/*` | `git mv` + je `project.json` |
| `libs/shared-types/` | **neu** (Struktur, minimal befüllt) |
| `frontend/angular.json`, `player/angular.json` | gelöscht, Optionen → `project.json` |
| `apps/*/Dockerfile.prod`, `apps/*/Dockerfile` | neu geschrieben (Root-Context) |
| `docker-compose.yml` | Contexts → Root, Pfade/Mounts angepasst |
| `scripts/build-images.sh` | Context Root, `-f apps/<svc>/...` |
| `.github/workflows/ci.yml` | `nx affected` + Docker-Context Root |
| `backend/jest.config.ts`, `*/vitest.config.ts` | übernommen, Gate/`pool:'forks'` erhalten |

## Hauptrisiken

1. **Dependency-Reconciliation** (TS 5.7↔5.9.2, ESLint 9↔10) — Phase 0, höchstes Risiko.
2. **Dockerfile/CI-Rewrite + geänderte Output-Pfade** — Images müssen booten.
3. **TestBed `pool:'forks'`** darf von `@nx/vite` nicht überschrieben werden.
4. **Backend `@/`-Alias + TypeORM-CLI** müssen weiter auflösen.
5. **Coverage-Gate** muss enforced bleiben.

---

## Verifikation (End-to-End)

1. **Install:** Frisches `npm ci` am Root — ein Lockfile, keine Konflikte.
2. **Graph:** `npx nx graph` zeigt 3 Apps + `shared-types`, keine Zyklen.
3. **Targets:** `npx nx run-many -t lint test typecheck build` → alles grün;
   Backend-Coverage-Gate greift weiterhin.
4. **Affected:** Triviale Änderung in `apps/player` → `nx affected -t build` baut
   **nur** player (Cache/affected beweisbar).
5. **Test-Isolation:** `nx test frontend` grün, auch mit `--no-file-parallelism`
   (forks-Fix intakt).
6. **Backend-Spezifika:** `nx run backend:migration:generate` (oder run-commands-
   Äquivalent) funktioniert; `@/`-Imports kompilieren.
7. **Prod-Images:** `npm run images:build` baut alle 3; `docker run` Backend →
   `/api/health` 200, Frontend/Player → `/version.json` korrekt befüllt.
8. **Dev:** `npm run dev` (docker compose) startet alle drei + redis, Ports
   3000/4200/4300 erreichbar, HMR funktioniert.
9. **CI:** PR-Run grün; `affected`-Logik nachvollziehbar; Images bauen (push nur
   auf main/Tags wie bisher).
10. **Version-Surfaces:** `/api/version` + beide `/version.json` zeigen korrekte
    Version aus Root-`package.json`.
```
