# Observability (Prometheus)

The backend exposes runtime metrics for Prometheus at **`GET /api/metrics`** in
the standard text exposition format. Site agents have no scrape endpoint of their
own — they push their metrics to the backend over the session they already hold,
and the backend surfaces those series under the same `/api/metrics`. One scrape
target covers the backend and every agent, and no agent has to be reachable from
outside its venue.

This is separate from the dashboard's history charts (the `metrics` module). That
feature is for operators inside the app; this one is for a Prometheus server.

## Securing the endpoint

`/api/metrics` is protected by a static bearer token, `METRICS_SCRAPE_TOKEN`
(see [Configuration](configuration.md)).

- **Unset → the endpoint is disabled** and returns `404`. It is never served
  unauthenticated: the output discloses route templates, queue depths and pool
  state.
- A missing or wrong token also answers `404`, so an unauthenticated caller
  cannot even confirm the endpoint exists. The comparison is constant-time.

Generate a token with `openssl rand -base64 32` and set it in the backend's
environment.

### Not routed publicly

The production Caddy config answers `/api/metrics` with `404` on both public
hosts: `api.{domain}`, and `app.{domain}`, whose nginx otherwise proxies every
`/api/*` request to the backend. The token keeps the output private either way;
blocking the path as well means nobody outside can probe tokens against it.
Prometheus scrapes the backend directly on the host, where the Quadlet publishes
it on `127.0.0.1:50002`.

With Ansible, set `metrics_scrape_token` (ideally from Ansible Vault, see
`ansible/hosts.ini.example`). It is written to the backend's environment as
`METRICS_SCRAPE_TOKEN`; left unset, the endpoint stays disabled.

## What is exported

Process defaults (CPU, heap, event-loop lag, GC, open FDs) via `prom-client`,
plus:

| Series                               | Type      | Labels                    | Source                           |
| ------------------------------------ | --------- | ------------------------- | -------------------------------- |
| `http_requests_total`                | counter   | `method`, `route`, `status` | global HTTP middleware         |
| `http_request_duration_seconds`      | histogram | `method`, `route`, `status` | global HTTP middleware         |
| `bullmq_queue_jobs`                  | gauge     | `queue`, `state`          | transcoding + slicing queues     |
| `bullmq_job_duration_seconds`        | histogram | `queue`, `status`         | worker completed/failed events   |
| `sse_active_connections`             | gauge     | `channel`                 | dashboard + agent SSE services   |
| `screens_total`                      | gauge     | `status`                  | screens table (online/offline)   |
| `live_streams_active`                | gauge     | —                         | running FFmpeg live processes    |
| `pg_pool_connections`                | gauge     | `state`                   | the `pg` pool                    |
| `agent_up` / `agent_*`               | gauge     | `agent`                   | pushed by each site agent        |
| `agent_screen_*`                     | gauge     | `agent`, `screen`         | pushed by each site agent        |

The HTTP series are recorded when the response finishes, so they carry the status
that actually went out — including `401`/`403` from guards and `500`s from
exception filters. They use the **route template** (`/api/screens/:id`), not the concrete
URL, so UUIDs do not explode cardinality. There is deliberately **no
`organisationId` label** on any series — per-tenant breakdown belongs in the
dashboard, not in Prometheus, for both cardinality and privacy reasons.

## Example `prometheus.yml`

```yaml
scrape_configs:
  - job_name: mynextscreen-backend
    metrics_path: /api/metrics
    # On the host: the Quadlet publishes the backend on 127.0.0.1:50002.
    # /api/metrics is blocked on the public Caddy hosts.
    static_configs:
      - targets: ['localhost:50002']
    authorization:
      type: Bearer
      # Match METRICS_SCRAPE_TOKEN. Prefer credentials_file over an inline value.
      credentials_file: /etc/prometheus/mynextscreen-scrape-token
```

Agent series arrive through the backend, so they appear on this one target — no
separate scrape job per venue.

## Local testing

The dev compose stack passes `METRICS_SCRAPE_TOKEN` through to the backend. Set it
in a `.env` next to `docker-compose.yml` (or export it) and recreate the backend:

```bash
echo 'METRICS_SCRAPE_TOKEN=dev-metrics-token' >> .env
podman compose up -d backend    # or: docker compose up -d backend

curl -i localhost:3000/api/metrics                       # 404: no token
curl -s -H 'Authorization: Bearer dev-metrics-token' \
  localhost:3000/api/metrics | grep -E '^(http_|sse_|screens_|agent_)'
```

Agent series appear after a running site agent's first heartbeat. To try the
scrape config itself, run Prometheus on the host network and point it at
`localhost:3000`:

```bash
podman run --rm --network host \
  -v ./prometheus.yml:/etc/prometheus/prometheus.yml:Z docker.io/prom/prometheus
```

Then open `http://localhost:9090` → *Status → Targets*.
