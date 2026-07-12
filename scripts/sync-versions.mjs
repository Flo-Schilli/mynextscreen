#!/usr/bin/env node
// Sync sub-app versions to the root package.json (single source of truth).
//
// Nx monorepo layout (Phase 1+): there is now a SINGLE root package.json and a
// SINGLE root package-lock.json. `npm version` already bumps both the root
// `version` and the lockfile's top-level + `packages[""].version`, so there is
// nothing left for this script to propagate — the per-app package.json files
// (backend/frontend/player) were removed when the apps moved under `apps/`.
//
// In addition to the lockfile check, this script syncs the version field of any
// native player-application manifests (e.g. player-applications/lg-tvos/appinfo.json)
// so their IPK filename always matches the project release version.
//
// Usage:
//   node scripts/sync-versions.mjs           verify/sync; print status
//   node scripts/sync-versions.mjs --check   verify only; exit 1 on drift

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECK_ONLY = process.argv.includes('--check');
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Read + parse a JSON file relative to the repo root. */
function readJson(relPath) {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, relPath), 'utf8'));
}

/** Write a JSON file relative to the repo root (2-space indent, trailing newline). */
function writeJson(relPath, data) {
  writeFileSync(resolve(REPO_ROOT, relPath), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const rootVersion = readJson('package.json').version;
if (!rootVersion) {
  console.error('sync-versions: root package.json has no "version" field');
  process.exit(1);
}

// ── Lockfile check ───────────────────────────────────────────────────────────

const lockPath = 'package-lock.json';
if (!existsSync(resolve(REPO_ROOT, lockPath))) {
  console.log(`sync-versions: no lockfile to check (root = ${rootVersion}).`);
} else {
  const lock = readJson(lockPath);
  const lockRootVersion = lock.packages?.['']?.version ?? lock.version;
  const drifted = lock.version !== rootVersion || lockRootVersion !== rootVersion;

  if (drifted) {
    console.error(
      `sync-versions: package-lock.json version drift (lock = ${lock.version} / ${lockRootVersion}, root = ${rootVersion}).`,
    );
    console.error('Run `npm install` to regenerate the lockfile, then re-run `npm version`.');
    process.exit(1);
  }

  console.log(`sync-versions: package-lock.json in sync at ${rootVersion} ✓`);
}

// ── Native player-app manifests ──────────────────────────────────────────────

const MANIFESTS = [
  'player-applications/lg-tvos/appinfo.json',
];

let failed = false;

for (const relPath of MANIFESTS) {
  const absPath = resolve(REPO_ROOT, relPath);
  if (!existsSync(absPath)) {
    console.warn(`sync-versions: ${relPath} not found — skipping`);
    continue;
  }

  const manifest = readJson(relPath);
  if (manifest.version === rootVersion) {
    console.log(`sync-versions: ${relPath} in sync at ${rootVersion} ✓`);
    continue;
  }

  if (CHECK_ONLY) {
    console.error(
      `sync-versions: ${relPath} version drift (manifest = ${manifest.version}, root = ${rootVersion}).`,
    );
    failed = true;
  } else {
    manifest.version = rootVersion;
    writeJson(relPath, manifest);
    console.log(`sync-versions: ${relPath} updated ${manifest.version} → ${rootVersion}`);
  }
}

if (failed) process.exit(1);
process.exit(0);
