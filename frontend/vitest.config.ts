/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
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
