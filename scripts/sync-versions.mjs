#!/usr/bin/env node
// Sync sub-app versions to the root package.json (single source of truth).
//
// Nx monorepo layout (Phase 1+): there is now a SINGLE root package.json and a
// SINGLE root package-lock.json. `npm version` already bumps both the root
// `version` and the lockfile's top-level + `packages[""].version`, so there is
// nothing left for this script to propagate — the per-app package.json files
// (backend/frontend/player) were removed when the apps moved under `apps/`.
//
// This script is therefore a no-op verifier in the single-package layout: it
// confirms the lockfile is in sync with the root version and exits 0. It is kept
// (rather than deleted) so the `version` npm hook and the CI `--check` invocation
// keep working without errors. If a multi-package layout is ever reintroduced,
// restore the per-target sync loop here.
//
// Usage:
//   node scripts/sync-versions.mjs           verify/sync; print status
//   node scripts/sync-versions.mjs --check   verify only; exit 1 on lockfile drift

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Read + parse a JSON file relative to the repo root. */
function readJson(relPath) {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, relPath), 'utf8'));
}

const rootVersion = readJson('package.json').version;
if (!rootVersion) {
  console.error('sync-versions: root package.json has no "version" field');
  process.exit(1);
}

const lockPath = 'package-lock.json';
if (!existsSync(resolve(REPO_ROOT, lockPath))) {
  // No lockfile yet (e.g. before first `npm install`). Nothing to verify.
  console.log(`sync-versions: single-package layout, no lockfile to check (root = ${rootVersion}).`);
  process.exit(0);
}

const lock = readJson(lockPath);
const lockRootVersion = lock.packages?.['']?.version ?? lock.version;
const drifted = lock.version !== rootVersion || lockRootVersion !== rootVersion;

if (drifted) {
  // `npm version` rewrites the lockfile itself, so this branch should only be
  // hit if package-lock.json is stale. Surface it rather than silently passing.
  console.error(
    `sync-versions: package-lock.json version drift (lock = ${lock.version} / ${lockRootVersion}, root = ${rootVersion}).`,
  );
  console.error('Run `npm install` to regenerate the lockfile, then re-run `npm version`.');
  process.exit(1);
}

console.log(`sync-versions: single-package layout in sync at ${rootVersion} ✓`);
process.exit(0);
