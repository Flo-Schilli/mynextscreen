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
  // Lower than the backend's on purpose. What is left uncovered here is the
  // code that only a real television can exercise: the SSAP launch path end to
  // end, and the algorithm negotiation against a set running OpenSSH 6.1. The
  // fakes in `test/fakes/` cover everything short of that, and padding the
  // number with tests that assert the fakes' own behaviour would buy nothing.
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 75,
      functions: 83,
      lines: 85,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default config;
