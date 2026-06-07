import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!jose)'],
  collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts', '!**/index.ts'],
  coverageDirectory: '../coverage',
  // Backend is the well-tested surface; gate it (~80%, set below current
  // measured values to leave headroom). Frontend/player have no gate yet.
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 78,
      functions: 70,
      lines: 80,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default config;
