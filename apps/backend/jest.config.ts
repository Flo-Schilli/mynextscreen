import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/'],
  // One Postgres container for the whole run; per-worker DBs (see test/db-harness.ts).
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  testTimeout: 30000,
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/index.ts',
    '!main.ts', // Bootstrap — no testable logic
    '!**/*.module.ts', // pure DI wiring, no branch logic
    '!db/schema.ts', // Drizzle table definitions — declarative, no logic
    '!db/migrations/**', // generated SQL — not unit-testable
    '!test/**', // test harness (Testcontainers setup)
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      statements: 92,
      branches: 83,
      functions: 84,
      lines: 92,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default config;
