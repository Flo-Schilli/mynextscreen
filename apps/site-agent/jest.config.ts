import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/'],
  testTimeout: 30000,
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/index.ts',
    '!main.ts', // Bootstrap — no testable logic
    '!**/*.module.ts', // pure DI wiring, no branch logic
    '!test/**', // fake TV harness
  ],
  coverageDirectory: '../coverage',
  // No gate yet: the TV-facing modules land before the fakes that exercise
  // them, and a threshold that has to be lowered once is a threshold nobody
  // believes afterwards. Raised to the backend's level in the same change that
  // adds the fake-TV harness.
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default config;
