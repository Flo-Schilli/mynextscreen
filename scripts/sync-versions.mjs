#!/usr/bin/env node
// Sync sub-app versions to the root package.json (single source of truth).
//
// Root `package.json` is the only place a version is bumped (`npm version`).
// This script propagates that version into backend/frontend/player package.json
// and their package-lock.json (top-level `version` + `packages[""].version`),
// so the per-app versions can never drift again.
//
// Usage:
//   node scripts/sync-versions.mjs           write changed files, print what changed
//   node scripts/sync-versions.mjs --check   write nothing; exit 1 + diff on mismatch (CI)
//
// Dependency-free, idempotent: only the `version` fields are touched. Files are
// re-serialised with 2-space indent + trailing newline (verified byte-identical
// to the existing format), so unchanged files stay unchanged.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = ['backend', 'frontend', 'player'];

const checkOnly = process.argv.includes('--check');

/** Read + parse a JSON file relative to the repo root. */
function readJson(relPath) {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, relPath), 'utf8'));
}

/** Serialise to JSON matching the repo convention (2-space indent + newline). */
function serialise(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

const rootVersion = readJson('package.json').version;
if (!rootVersion) {
  console.error('sync-versions: root package.json has no "version" field');
  process.exit(1);
}

/**
 * Build the list of (file, current, applyFn) entries to sync. Each entry knows
 * how to set the target version on its parsed object so we can both check and
 * write from the same source of truth.
 */
const entries = [];
for (const app of TARGETS) {
  const pkgPath = `${app}/package.json`;
  entries.push({
    path: pkgPath,
    current: readJson(pkgPath).version,
    apply: (obj) => {
      obj.version = rootVersion;
    },
  });

  const lockPath = `${app}/package-lock.json`;
  const lock = readJson(lockPath);
  // The lockfile mirrors the version in two places; keep both in sync.
  const lockCurrent = lock.version;
  entries.push({
    path: lockPath,
    current: lockCurrent,
    apply: (obj) => {
      obj.version = rootVersion;
      if (obj.packages && obj.packages['']) {
        obj.packages[''].version = rootVersion;
      }
    },
  });
}

const drifted = entries.filter((e) => e.current !== rootVersion);

if (checkOnly) {
  if (drifted.length === 0) {
    console.log(`sync-versions: all versions match root (${rootVersion}) ✓`);
    process.exit(0);
  }
  console.error(`sync-versions: version drift detected (root = ${rootVersion}):`);
  for (const e of drifted) {
    console.error(`  ${e.path}: ${e.current} → ${rootVersion}`);
  }
  console.error('\nRun `node scripts/sync-versions.mjs` (or `npm run version:*`) to fix.');
  process.exit(1);
}

if (drifted.length === 0) {
  console.log(`sync-versions: already in sync at ${rootVersion}, nothing to write.`);
  process.exit(0);
}

for (const e of drifted) {
  const obj = readJson(e.path);
  e.apply(obj);
  writeFileSync(resolve(REPO_ROOT, e.path), serialise(obj));
  console.log(`sync-versions: ${e.path} ${e.current} → ${rootVersion}`);
}
console.log(`sync-versions: synced ${drifted.length} file(s) to ${rootVersion}.`);
