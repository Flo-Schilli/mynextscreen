/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test-setup.ts'],
    // Mirror the frontend: the @analogjs/vite-plugin-angular plugin defaults the
    // pool to 'vmThreads', which externalizes @angular/core/testing and shares
    // its module-level TestBed singleton across VM contexts on the same thread.
    // On low-core CI runners where spec files share a worker, that singleton
    // leaks. The 'forks' pool gives each spec file a fresh, process-isolated
    // module registry, so the TestBed is clean per file.
    pool: 'forks',
    poolOptions: {
      // Node 26 enables the Web Storage API by default, installing a native
      // global `localStorage` that shadows jsdom's and returns undefined
      // without --localstorage-file. Disable it in the worker so jsdom owns
      // localStorage again (no-op on Node 24, where the feature is opt-in).
      forks: { execArgv: ['--no-experimental-webstorage'] },
    },
  },
});
