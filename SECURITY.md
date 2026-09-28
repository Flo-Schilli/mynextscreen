# Security Policy

## Supported versions

Only the latest release receives fixes. The project is deployed from `main`
via GHCR images, so the newest tag is what is expected to be running.

| Version        | Supported |
| -------------- | --------- |
| latest release | yes       |
| anything older | no        |

## Reporting a vulnerability

**While this repository is private**, open an issue here: only collaborators
can see it, so the report stays private by construction.

**Once this repository is public**, use GitHub's private vulnerability
reporting instead — Security → "Report a vulnerability" — and do not open a
public issue. That route has to be switched on first (Settings → Security →
Private vulnerability reporting); it is unavailable on private repositories,
which is why it is not the primary channel here yet.

Either way, please do not include working exploit code in the first report — a
description of the affected route or component, the preconditions, and the
impact is enough to start.

What helps most:

- the affected component (backend route, player, admin SPA, deployment)
- what an attacker needs beforehand: no account, any account, an org role, a
  screen API key
- the effect: cross-tenant read or write, privilege escalation, code execution,
  denial of service
- the version or commit you tested

You can expect an acknowledgement within a week. Fixes for anything that lets a
tenant reach another tenant's data are prioritised above everything else.

## Scope

In scope: the backend API, the admin SPA, the player, the LG webOS shell, the
container images and the Ansible deployment in this repository.

Out of scope: findings against a third-party service the platform integrates
with (report those to that vendor), and reports produced by a scanner without a
description of the actual impact here.

## Notes for operators

Several defaults matter for the security of a deployment and are not enforced
by the software:

- `JWT_ACCESS_SECRET` must be a strong random value of at least 32 characters.
- `vault_signage_postgres_password` has no default — the deployment fails
  without it, on purpose.
- `SECRETS_ENCRYPTION_KEY` enables encryption of per-org SMTP passwords and
  ntfy tokens at rest. Without it those are stored in plaintext.
- `SIGNUP_ENABLED=false` closes self-registration if the instance is not meant
  to be open.
- Reaching the backend only through the reverse proxy is what applies TLS, the
  security headers, rate limiting and fail2ban; the published container ports
  bind to loopback for that reason.
