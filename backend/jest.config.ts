import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!jose)'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/index.ts',
    '!main.ts', // Bootstrap — no testable logic
    '!data-source.ts', // migration CLI only
    '!**/*.module.ts', // pure DI wiring, no branch logic
    '!migrations/**', // TypeORM migrations — not unit-testable
  ],
  coverageDirectory: '../coverage',
  // Backend is the well-tested surface; gate it (set just below measured
  // post-cleanup values to leave headroom). Frontend/player have no gate.
  // Baseline before Phase 1+2: 84.94/83.11/75.53/85.32 (all files, raw)
  // After collectCoverageFrom cleanup + new specs: 93.2/83.91/84.49/93.54
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
