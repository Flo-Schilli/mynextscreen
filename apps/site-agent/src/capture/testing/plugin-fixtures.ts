import type {
  PluginLicenseText,
  PluginStatus,
  PluginStreamConfig,
  PluginStreamList,
  PluginStreamStatus,
} from '../capture-plugin-protocol';

/** Realistic plugin answers; `capture-plugin-contract.spec.ts` checks them against openapi.json. */
export const STREAM_ID = '6f1c2a52-7d3e-4c1a-9f0e-2b8d5a1c9e11';

export const statusFixture = (overrides: Partial<PluginStatus> = {}): PluginStatus => ({
  apiVersion: '1',
  pluginVersion: '0.1.0',
  state: 'ready',
  errorCode: null,
  sdkVersion: '6.3.2.0',
  license: {
    sdkVersion: '6.3.2.0',
    licenseSha256: 'a'.repeat(64),
    ndiLicenseSha256: 'b'.repeat(64),
    termsSha256: 'c'.repeat(64),
  },
  acceptance: {
    sdkVersion: '6.3.2.0',
    licenseSha256: 'a'.repeat(64),
    via: 'api',
    acceptedAt: '2026-10-18T12:00:00.000Z',
  },
  arch: 'x64',
  encoders: ['libx264'],
  ...overrides,
});

export const streamStatusFixture = (
  overrides: Partial<PluginStreamStatus> = {},
): PluginStreamStatus => ({
  streamId: STREAM_ID,
  state: 'streaming',
  sourceName: 'CAMERA (Cam 1)',
  encoder: 'libx264',
  fps: 29.9,
  framesDropped: 0,
  error: null,
  ...overrides,
});

export const streamListFixture = (
  streams: PluginStreamStatus[] = [streamStatusFixture()],
): PluginStreamList => ({ streams });

export const streamConfigFixture = (
  overrides: Partial<PluginStreamConfig> = {},
): PluginStreamConfig => ({
  cameraHost: '192.168.1.60',
  ndiSourceName: null,
  bandwidth: 'highest',
  width: 1280,
  height: 720,
  fps: 30,
  bitrateKbps: 3000,
  encoderPref: 'auto',
  ...overrides,
});

/** The shipped texts and the hashes of them, as `GET /v1/license/text` answers. */
export const licenseTextFixture = (
  overrides: Partial<PluginLicenseText> = {},
): PluginLicenseText => ({
  sdkVersion: '6.3.2.0',
  licenseSha256: 'a'.repeat(64),
  ndiLicenseSha256: 'b'.repeat(64),
  termsSha256: 'c'.repeat(64),
  licenseText: 'NDI SDK license text',
  pluginTerms: 'Plugin terms',
  ...overrides,
});
