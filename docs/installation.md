# Installation

## Development

Docker and Compose are the only requirements. The compose file carries working
defaults for everything, including a development JWT secret, so no `.env` is
needed to get started.

```bash
npm run dev          # docker compose up --build
```

| Service    | URL                   | Notes                          |
| ---------- | --------------------- | ------------------------------ |
| Dashboard  | http://localhost:4200 | Angular dev server, hot reload |
| Player     | http://localhost:4300 | the app a display opens        |
| API        | http://localhost:3000 | NestJS, hot reload             |
| Mailpit    | http://localhost:8025 | catches every outgoing mail    |
| PostgreSQL | `127.0.0.1:5432`      | loopback only                  |
| Redis      | `127.0.0.1:6379`      | loopback only                  |

Migrations run at boot, so the schema is there by the time the API answers.

### First run

The dashboard has no seeded account. On a fresh database it shows a one-time
setup screen that creates the initial super-admin; that route stops working the
moment a user exists.

After that:

1. Create an organisation.
2. Open the player at http://localhost:4300 — it shows a six-digit code.
3. In the dashboard, **Screens → Add a screen**, and enter that code.

Emails (verification, invitations, password resets) never leave the machine:
they land in Mailpit at http://localhost:8025.

### Starting over

```bash
docker compose down -v      # also drops the database volume
rm -rf test-data/media/*    # and the uploaded media
```

## Without Docker

You need PostgreSQL 16+, Redis 7+ and FFmpeg on `PATH`, plus Node.js 26.

```bash
npm ci                                   # root only — one lockfile for the monorepo
cp .env.example .env                     # then set JWT_ACCESS_SECRET
npx nx run backend:db-migrate            # create the schema

npx nx serve backend                     # :3000
npx nx serve frontend                    # :4200
npx nx serve player                      # :4300
```

> The lockfile is written by npm 11. npm 10, which ships with Node 22, cannot
> install it — run `npm i -g npm@11.6.2` first.

## Production

Images are built by CI and published to GHCR:

```
ghcr.io/flo-schilli/mynextscreen/backend
ghcr.io/flo-schilli/mynextscreen/frontend
ghcr.io/flo-schilli/mynextscreen/player
```

The shipped deployment is Ansible driving rootless Podman quadlets behind Caddy.
It builds nothing on the host — it pulls the images above.

```bash
cd ansible
cp hosts.ini.example hosts.ini     # fill in your host and domain
ansible-playbook deploy.yml --ask-vault-pass
```

What the playbook sets up:

- a `mynextscreen` system user running rootless Podman
- quadlet units for backend, frontend, player, PostgreSQL and Redis on their own
  container network
- Caddy as the only public listener, with automatic TLS, SSE pass-through and a
  fail2ban jail
- all application ports bound to loopback, reachable only through Caddy

Required before the first run:

- `vault_mynextscreen_postgres_password` in your vault — the playbook refuses to
  run without it rather than falling back to a default
- `JWT_ACCESS_SECRET` of at least 32 characters (`openssl rand -base64 48`)
- `PUBLIC_BASE_URL`, and `PLAYER_BASE_URL` if the player has its own hostname

Pin a version with `signage_image_tag=0.10.1`; the default is `latest`.

### Backup and restore

```bash
ansible-playbook download_db.yml     # dump to your machine
ansible-playbook upload_db.yml       # restore a dump into the instance
```

Media lives on the host under the service user's `app/media` and is not part of
the database dump — back it up separately.

## Database migrations

The Drizzle schema in `apps/backend/src/db/` is the source of truth. Change it,
then generate a migration; never edit the database by hand.

```bash
npx nx run backend:db-generate    # diff the schema into a new SQL migration
npx nx run backend:db-migrate     # apply pending migrations
npx nx run backend:db-studio      # browse the data
```

Migrations are applied automatically when the backend starts, so a deployment
does not need a separate step.
