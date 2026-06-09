/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // Test-only: the Angular unit-test builder bundles specs as esbuild entry
      // points, so vi.mock module-hoisting never runs and ESM export namespaces
      // are non-configurable (vi.spyOn throws). Aliasing to a test double is the
      // supported way to replace a node-module dependency that app code
      // instantiates directly (`new Hanko(...)`). This alias is only consumed by
      // the Vitest runner, never by `ng build`.
      '@teamhanko/hanko-elements': fileURLToPath(
        new URL('./src/testing/hanko-elements.mock.ts', import.meta.url),
      ),
    },
  },
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
