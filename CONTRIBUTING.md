# Contributing

Thanks for looking at this. Bug reports, ideas and pull requests are welcome.

## Before you open a pull request

This project is licensed under **AGPL-3.0-or-later** and requires a
**Contributor License Agreement** (see [CLA.md](CLA.md)). In short: you keep the
copyright on what you write, and you grant the maintainer the right to use and
relicense it. This exists so the project can also be offered under a commercial
licence to people who cannot comply with the AGPL. Without it, that option
disappears for every line ever contributed.

You accept the CLA by adding a `Signed-off-by` line to your commits:

```bash
git commit -s -m "fix: ..."
```

and stating in the pull request that you have read and accept `CLA.md`.

## Working on the code

```bash
npm ci                 # requires npm 11.6.2 — see package.json engines
npm run dev            # docker compose: backend :3000 · admin :4200 · player :4300
npx nx run-many -t typecheck lint format:check test build
```

`CLAUDE.md` describes the architecture, the conventions and the things that look
odd but are deliberate. `ARCHITECTURE.md` and `VISION.md` go deeper. Where the
documentation and the code disagree, the code is right.

What the review will look for:

- **Tests that would fail without the change.** A test that passes either way
  documents nothing.
- **Multi-tenancy enforced server-side.** Every route declares its access model;
  the guard denies by default. Hiding something in the UI is not a control.
- **No secrets in URLs, logs or the DOM**, and no credentials committed.
- **Comments that explain why**, not what. The repository is deliberately written
  that way.

The backend coverage gate is enforced in CI and must not fall.

## Reporting a vulnerability

Please do not open a public issue — see [SECURITY.md](SECURITY.md).
