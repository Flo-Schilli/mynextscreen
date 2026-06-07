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
    // The @analogjs/vite-plugin-angular plugin defaults the pool to 'vmThreads',
    // which externalizes @angular/core/testing and shares its module-level
    // TestBed singleton across VM contexts running on the same thread. On
    // low-core CI runners where spec files share a worker, that singleton leaks
    // and the next file's TestBed.configureTestingModule throws "test module has
    // already been instantiated". The 'forks' pool gives each spec file a fresh,
    // process-isolated module registry, so the TestBed is clean per file
    // regardless of how many cores the runner has.
    pool: 'forks',
  },
});
