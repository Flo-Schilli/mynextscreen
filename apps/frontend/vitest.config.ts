/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The @angular/build:unit-test runner drives vitest with a plugin that defaults
    // the pool to 'vmThreads', which externalizes @angular/core/testing and shares
    // its module-level TestBed singleton across VM contexts on the same thread. On
    // low-core CI runners where spec files share a worker, that singleton leaks. The
    // 'forks' pool gives each spec file a fresh, process-isolated module registry, so
    // the TestBed is clean per file. Do not remove — this is a hard CI gate (CLAUDE.md).
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Ratchet floor set just below the measured baseline (stmts 85.9 / branch
      // 83.2 / funcs 71.4 / lines 89.8). Raise these as coverage climbs; never
      // lower them. coverageInclude/coverageExclude live in angular.json.
      thresholds: {
        statements: 84,
        branches: 80,
        functions: 70,
        lines: 88,
      },
    },
  },
});
