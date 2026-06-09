# Plan: Self-contained Frontend — nginx proxies `/api` → backend (mynexttrip parity)

> Status: geplant · Voraussetzung: keine (Frontend nutzt bereits relative `/api`-Pfade).

## Context
Die Deployment-Infra (Ansible + rootless Podman Quadlets + Caddy + GHCR) ist bereits
vollständig und ausgereifter als die `mynexttrip`-Referenz — „Infra bauen" ist also nicht
der nächste Schritt. Gewünscht ist stattdessen das **mynexttrip-Frontend-Pattern**: das
nginx des Frontends proxyt `/api` selbst zum Backend. Damit wird das Frontend-Image
**self-contained** (same-origin auf einem Port hinter *jedem* Reverse-Proxy oder standalone
in compose), statt sich auf Caddys `/api`-Edge-Split zu verlassen.

Ist-Stand (verifiziert):
- Die Angular-App ruft in jedem HTTP-Service **relativ `/api/...`** auf, ebenso der
  SSE-Code (`fetch('/api/dashboard/events')`). Kein Base-URL-Token zu ändern.
- **Dev** funktioniert bereits via `frontend/proxy.conf.json` (`/api` → `localhost:3000`) /
  `proxy.conf.docker.json` (`backend:3000`). Keine Dev-Änderung nötig.
- **Prod** `frontend/nginx.prod.conf` liefert nur die statische SPA — proxyt `/api`
  **nicht**. Caddys `app`-vhost macht `handle /api/*` → Backend (`:50002`).
- Backend lauscht auf `:3000`; im `signage`-podman-Netz ist es `signage-backend:3000`.
  Das Frontend-Quadlet hat bereits `Network=signage.network` + `After=signage-backend.service`.
- Runtime-Config nutzt bereits `envsubst` in `docker-entrypoint.sh` (für `HANKO_API_URL`).

Ergebnis: Frontend-nginx besitzt `/api`; Caddys `app`-vhost wird ein simples Forward zum
Frontend-Container. Der `api.<domain>`-vhost bleibt unverändert (der **Player** hängt via
CSP daran). Same-origin `connect-src 'self'` im app-CSP deckt `/api` + SSE bereits ab.

## Changes

### 1. `frontend/nginx.prod.conf` → `/api`-Proxy (templated upstream)
`/api/`-Location **vor** den SPA/Static-Regeln, mit `^~` (gewinnt gegen die Static-Asset-Regex).
SSE-sicher **und** Upload-sicher (Upload-Endpoint erlaubt bis `MAX_FILE_SIZE_BYTES`,
default 500 MB — nginx-Default 1 MB würde 413 liefern):

```nginx
location ^~ /api/ {
    proxy_pass http://${BACKEND_UPSTREAM};   # ohne URI-Teil → originaler /api/...-Pfad bleibt
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";          # keep-alive zum Upstream
    # SSE (dashboard events) + allgemeines API: streamen, nie buffern
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;                    # langlebiges SSE
    # Große Uploads (/api/content/upload)
    client_max_body_size 0;                   # oder MAX_FILE_SIZE_BYTES matchen
    proxy_request_buffering off;
}
```
`Authorization` / `X-Organisation-Id` werden default durchgereicht (nicht strippen).
Datei zu Template umbenennen, damit der Entrypoint den Upstream substituieren kann:
`frontend/nginx.prod.conf` → `frontend/nginx.prod.conf.template` (Placeholder
`${BACKEND_UPSTREAM}`; alle echten nginx-`$host`/`$remote_addr`/…-Variablen bleiben literal,
weil `envsubst` eine explizite Allow-List bekommt).

### 2. `frontend/docker-entrypoint.sh` → Upstream in nginx-Conf substituieren
Bestehende `HANKO_API_URL`-JS-Substitution behalten; vor `exec nginx` ergänzen:
```sh
: "${BACKEND_UPSTREAM:=signage-backend:3000}"; export BACKEND_UPSTREAM
envsubst '${BACKEND_UPSTREAM}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf
```
Default `signage-backend:3000` → Prod braucht keine Extra-Config; das Ergebnis ist ein
**literaler** Hostname, also löst nginx beim Start auf (kein `resolver` nötig).

### 3. `frontend/Dockerfile.prod` → Template ausliefern
`COPY nginx.prod.conf /etc/nginx/conf.d/default.conf` ersetzen durch
`COPY nginx.prod.conf.template /etc/nginx/templates/default.conf.template`
(conf.d/default.conf wird nun zur Laufzeit vom Entrypoint geschrieben). Rest
(Healthcheck, version.json, OCI-Labels) unverändert.

### 4. `ansible/templates/Caddyfile.j2` → `app`-vhost vereinfachen
`handle /api/*`-Block und `handle {}`-Wrapper entfernen, sodass alle Requests zum
Frontend-Container gehen, der `/api` jetzt selbst proxyt:
```caddy
app.{{ domain_name }} {
    reverse_proxy localhost:50001 {
        header_up X-Real-IP {remote_host}
    }
    header { … unverändert … }
    log { … unverändert … }
}
```
`player.<domain>` und `api.<domain>` **unangetastet** lassen (Player-CSP + direkte
API-Clients nutzen weiter `api.<domain>`). Caddy flusht `text/event-stream` automatisch,
also überlebt Dashboard-SSE den Caddy→nginx→backend-Hop (nginx hat `proxy_buffering off`).

### 5. `ansible/templates/signage-frontend.container.j2` → Upstream pinnen (explizit)
`Environment=BACKEND_UPSTREAM=signage-backend:3000` ergänzen (entspricht dem
Entrypoint-Default; explizit ist klarer für Ops). `After=signage-backend.service` ordnet
den Start; mit `Restart=always` heilt ein transienter DNS-Race beim ersten Boot selbst.

## Kritische Dateien
- `frontend/nginx.prod.conf` → umbenennen zu `frontend/nginx.prod.conf.template` (+ `/api`-Block)
- `frontend/docker-entrypoint.sh` (nginx-Template via envsubst)
- `frontend/Dockerfile.prod` (COPY-Template-Pfad)
- `ansible/templates/Caddyfile.j2` (`app`-vhost vereinfachen)
- `ansible/templates/signage-frontend.container.j2` (`BACKEND_UPSTREAM`-Env)

Keine TypeScript/Angular-Änderungen (Pfade sind bereits relativ). Keine dev/proxy.conf-Änderungen.

## Verification
1. **Config-Lint:** Frontend-Prod-Image bauen (`scripts/build-images.sh` bzw.
   `npm run images:build`); Entrypoint + `nginx -t` müssen durchlaufen (substituierte
   `default.conf` ist valide).
2. **End-to-end auf lokalem podman-Netz** (spiegelt Prod):
   - `podman network create signage` (wegwerfbar), `signage-redis`, `signage-backend`
     (Test-DB + `HANKO_API_URL`) und `signage-frontend` darauf starten, Frontend auf
     `127.0.0.1:8080:80` published.
   - `curl -i http://127.0.0.1:8080/api/health` → 200 (zum Backend geproxyt).
   - `curl -i http://127.0.0.1:8080/` → liefert `index.html` (SPA).
   - SSE: `curl -N -H 'Accept: text/event-stream' …/api/dashboard/events` (mit gültigem
     Bearer + `X-Organisation-Id`) streamt ohne Buffering.
   - Upload: POST einer >1 MB Datei an `/api/content/upload` → kein `413` (bestätigt
     `client_max_body_size`).
3. **Static-Checks:** `cd frontend && npm run typecheck && npm run lint && npm run format:check`
   (erwartet unverändert — keine Source-Änderungen).
4. **Deploy:** `ansible-playbook ansible/deploy.yml` (ggf. erst `--check`) → prüfen:
   `https://app.<domain>/api/health`, Live-Dashboard-Updates (SSE über Caddy→nginx) und
   ein großer Content-Upload über `app.<domain>`. Bestätigen, dass `player.<domain>` und
   `api.<domain>` weiter funktionieren (Player unbeeinflusst).
