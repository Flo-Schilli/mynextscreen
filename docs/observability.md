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

### Do not route it publicly

`/api/metrics` must stay off any public reverse-proxy route. The production Caddy
config does not forward it; scrape it over the internal network only. The Caddy
and Ansible templates are intentionally left unchanged — this is a deployment
note, not a config edit.

## What is exported

Process defaults (CPU, heap, event-loop lag, GC, open FDs) via `prom-client`,
plus:

| Series                               | Type      | Labels                    | Source                           |
| ------------------------------------ | --------- | ------------------------- | -------------------------------- |
| `http_requests_total`                | counter   | `method`, `route`, `status` | global HTTP interceptor        |
| `http_request_duration_seconds`      | histogram | `method`, `route`, `status` | global HTTP interceptor        |
| `bullmq_queue_jobs`                  | gauge     | `queue`, `state`          | transcoding + slicing queues     |
| `bullmq_job_duration_seconds`        | histogram | `queue`, `status`         | worker completed/failed events   |
| `sse_active_connections`             | gauge     | `channel`                 | dashboard + agent SSE services   |
| `screens_total`                      | gauge     | `status`                  | screens table (online/offline)   |
| `live_streams_active`                | gauge     | —                         | running FFmpeg live processes    |
| `pg_pool_connections`                | gauge     | `state`                   | the `pg` pool                    |
| `agent_up` / `agent_*`               | gauge     | `agent`                   | pushed by each site agent        |
| `agent_screen_*`                     | gauge     | `agent`, `screen`         | pushed by each site agent        |

The HTTP series use the **route template** (`/api/screens/:id`), not the concrete
URL, so UUIDs do not explode cardinality. There is deliberately **no
`organisationId` label** on any series — per-tenant breakdown belongs in the
dashboard, not in Prometheus, for both cardinality and privacy reasons.

## Example `prometheus.yml`

```yaml
scrape_configs:
  - job_name: mynextscreen-backend
    metrics_path: /api/metrics
    scheme: https
    # Scrape over the internal network; /api/metrics is not public.
    static_configs:
      - targets: ['backend.internal:3000']
    authorization:
      type: Bearer
      # Match METRICS_SCRAPE_TOKEN. Prefer credentials_file over an inline value.
      credentials_file: /etc/prometheus/mynextscreen-scrape-token
```

Agent series arrive through the backend, so they appear on this one target — no
separate scrape job per venue.
