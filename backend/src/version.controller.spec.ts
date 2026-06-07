import { VersionController } from './version.controller';

describe('VersionController', () => {
  const controller = new VersionController();
  const original = {
    APP_VERSION: process.env.APP_VERSION,
    GIT_COMMIT: process.env.GIT_COMMIT,
    BUILD_DATE: process.env.BUILD_DATE,
  };

  afterEach(() => {
    process.env.APP_VERSION = original.APP_VERSION;
    process.env.GIT_COMMIT = original.GIT_COMMIT;
    process.env.BUILD_DATE = original.BUILD_DATE;
  });

  it('returns build metadata from environment', () => {
    process.env.APP_VERSION = '1.2.3';
    process.env.GIT_COMMIT = 'abc1234';
    process.env.BUILD_DATE = '2026-06-07T00:00:00Z';

    expect(controller.version()).toEqual({
      version: '1.2.3',
      commit: 'abc1234',
      builtAt: '2026-06-07T00:00:00Z',
    });
  });

  it('falls back to defaults when env is unset', () => {
    delete process.env.APP_VERSION;
    delete process.env.GIT_COMMIT;
    delete process.env.BUILD_DATE;

    expect(controller.version()).toEqual({
      version: '0.0.0-dev',
      commit: 'unknown',
      builtAt: 'unknown',
    });
  });
});
