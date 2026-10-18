import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { CaptureLicenseSync } from './capture-license-sync';
import { PluginRequestError, type CaptureSnapshot } from './plugin-client';
import type { PluginLicenseText, PluginStatus } from './capture-plugin-protocol';
import { statusFixture } from './testing/plugin-fixtures';

const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

const LICENSE_TEXT = 'NDI SDK license';
const TERMS = 'Plugin terms';
const NDI_HASH = sha(LICENSE_TEXT);
const TERMS_HASH = sha(TERMS);
const HASH = sha(`${NDI_HASH}\n${TERMS_HASH}`);

const textFixture = (overrides: Partial<PluginLicenseText> = {}): PluginLicenseText => ({
  sdkVersion: '6.3.2.0',
  licenseSha256: HASH,
  ndiLicenseSha256: NDI_HASH,
  termsSha256: TERMS_HASH,
  licenseText: LICENSE_TEXT,
  pluginTerms: TERMS,
  ...overrides,
});

const status = (overrides: Partial<PluginStatus> = {}): PluginStatus =>
  statusFixture({
    state: 'license_required',
    acceptance: null,
    license: {
      sdkVersion: '6.3.2.0',
      licenseSha256: HASH,
      ndiLicenseSha256: NDI_HASH,
      termsSha256: TERMS_HASH,
    },
    ...overrides,
  });

const accepted = (via: 'api' | 'env', hash = HASH): PluginStatus['acceptance'] => ({
  sdkVersion: '6.3.2.0',
  licenseSha256: hash,
  via,
  acceptedAt: '2026-10-18T12:00:00.000Z',
});

class FakePlugin {
  current: CaptureSnapshot = {
    state: 'license_required',
    status: status(),
    streams: [],
    agentErrorCode: null,
  };
  private listener: (() => void) | null = null;
  snapshot = jest.fn(() => this.current);
  onPoll = jest.fn((listener: () => void) => {
    this.listener = listener;
  });
  poll = jest.fn(async () => undefined);
  putLicense = jest.fn(async () => undefined);
  deleteLicense = jest.fn(async () => undefined);
  getLicenseText = jest.fn<Promise<PluginLicenseText | null>, []>(async () => textFixture());

  setStatus(next: PluginStatus | null, state: CaptureSnapshot['state'] = 'license_required') {
    this.current = { state, status: next, streams: [], agentErrorCode: null };
  }

  firePoll(): void {
    this.listener?.();
  }
}

describe('CaptureLicenseSync', () => {
  let plugin: FakePlugin;
  let server: { putCaptureLicenseText: jest.Mock };
  let clock: number;
  let sync: CaptureLicenseSync;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    plugin = new FakePlugin();
    server = { putCaptureLicenseText: jest.fn().mockResolvedValue(undefined) };
    clock = 1_000_000;
    sync = new CaptureLicenseSync(plugin as never, server, () => clock);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('license text upload', () => {
    it('uploads the verified texts once per hash', async () => {
      await sync.sync();
      await sync.sync();

      expect(server.putCaptureLicenseText).toHaveBeenCalledTimes(1);
      expect(server.putCaptureLicenseText).toHaveBeenCalledWith({
        licenseSha256: HASH,
        ndiLicenseSha256: NDI_HASH,
        termsSha256: TERMS_HASH,
        ndiLicenseText: LICENSE_TEXT,
        termsText: TERMS,
      });
    });

    it('uploads again for a new hash', async () => {
      await sync.sync();
      const newNdi = sha('NDI v2');
      const newHash = sha(`${newNdi}\n${TERMS_HASH}`);
      plugin.setStatus(
        status({
          license: {
            sdkVersion: '6.4.0.0',
            licenseSha256: newHash,
            ndiLicenseSha256: newNdi,
            termsSha256: TERMS_HASH,
          },
        }),
      );
      plugin.getLicenseText.mockResolvedValue(
        textFixture({
          licenseSha256: newHash,
          ndiLicenseSha256: newNdi,
          licenseText: 'NDI v2',
        }),
      );

      await sync.sync();

      expect(server.putCaptureLicenseText).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['absent', null, 'absent'],
      ['unknown', null, 'unknown'],
      ['incompatible', status(), 'incompatible'],
    ] as const)('does nothing while the plugin is %s', async (_name, next, state) => {
      plugin.setStatus(next, state);

      await sync.sync();

      expect(plugin.getLicenseText).not.toHaveBeenCalled();
      expect(server.putCaptureLicenseText).not.toHaveBeenCalled();
    });

    it('does nothing when the plugin reports no license', async () => {
      plugin.setStatus(status({ license: null }), 'error');

      await sync.sync();

      expect(plugin.getLicenseText).not.toHaveBeenCalled();
    });

    it.each([
      ['an unusable body', null],
      ['a text that does not hash to the report', textFixture({ licenseText: 'tampered' })],
      ['terms that do not hash to the report', textFixture({ pluginTerms: 'tampered' })],
      ['a different license hash', textFixture({ licenseSha256: 'f'.repeat(64) })],
    ])('never uploads %s, and does not ask again', async (_name, answer) => {
      plugin.getLicenseText.mockResolvedValue(answer);

      await sync.sync();
      clock += 60 * 60_000;
      await sync.sync();

      expect(server.putCaptureLicenseText).not.toHaveBeenCalled();
      expect(plugin.getLicenseText).toHaveBeenCalledTimes(1);
      expect(error).toHaveBeenCalled();
    });

    it('backs off exponentially after a failed upload, then recovers', async () => {
      server.putCaptureLicenseText.mockRejectedValue(new Error('offline'));

      await sync.sync();
      await sync.sync(); // inside the first backoff: no call
      expect(server.putCaptureLicenseText).toHaveBeenCalledTimes(1);

      clock += 5_001;
      await sync.sync();
      expect(server.putCaptureLicenseText).toHaveBeenCalledTimes(2);
      clock += 5_001; // second backoff is 10 s
      await sync.sync();
      expect(server.putCaptureLicenseText).toHaveBeenCalledTimes(2);

      server.putCaptureLicenseText.mockResolvedValue(undefined);
      clock += 5_001;
      await sync.sync();
      expect(server.putCaptureLicenseText).toHaveBeenCalledTimes(3);
      await sync.sync();
      expect(server.putCaptureLicenseText).toHaveBeenCalledTimes(3);
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it('caps the backoff at five minutes', async () => {
      server.putCaptureLicenseText.mockRejectedValue(new Error('offline'));
      for (let i = 0; i < 12; i += 1) {
        clock += 10 * 60_000;
        await sync.sync();
      }
      const calls = server.putCaptureLicenseText.mock.calls.length;

      clock += 5 * 60_000 + 1;
      await sync.sync();

      expect(server.putCaptureLicenseText).toHaveBeenCalledTimes(calls + 1);
    });

    it('retries a plugin failure on reading the text', async () => {
      plugin.getLicenseText.mockRejectedValueOnce(new PluginRequestError(409, 'plugin_error'));

      await sync.sync();
      clock += 5_001;
      await sync.sync();

      expect(server.putCaptureLicenseText).toHaveBeenCalledTimes(1);
    });

    it('runs after every plugin poll', async () => {
      plugin.firePoll();
      await sync.sync();

      expect(server.putCaptureLicenseText).toHaveBeenCalledTimes(1);
    });
  });

  describe('acceptance', () => {
    it('does nothing without an instruction, so an older server never revokes', async () => {
      plugin.setStatus(status({ acceptance: accepted('api') }), 'ready');

      await sync.setWanted(undefined);

      expect(plugin.deleteLicense).not.toHaveBeenCalled();
      expect(plugin.putLicense).not.toHaveBeenCalled();
    });

    it('PUTs the acceptance when the plugin has none, and polls afterwards', async () => {
      await sync.setWanted({ licenseSha256: HASH });

      expect(plugin.putLicense).toHaveBeenCalledWith({
        sdkVersion: '6.3.2.0',
        licenseSha256: HASH,
      });
      expect(plugin.poll).toHaveBeenCalled();
    });

    it('does not PUT again once the plugin shows the acceptance', async () => {
      plugin.setStatus(status({ acceptance: accepted('api') }), 'ready');

      await sync.setWanted({ licenseSha256: HASH });

      expect(plugin.putLicense).not.toHaveBeenCalled();
    });

    it('does not PUT a hash the plugin does not ship', async () => {
      await sync.setWanted({ licenseSha256: 'f'.repeat(64) });

      expect(plugin.putLicense).not.toHaveBeenCalled();
    });

    it('does not repeat a PUT the plugin has not reflected yet', async () => {
      await sync.setWanted({ licenseSha256: HASH });
      plugin.firePoll();
      await sync.sync();

      expect(plugin.putLicense).toHaveBeenCalledTimes(1);
    });

    it('catches up when the plugin was absent at first', async () => {
      plugin.setStatus(null, 'absent');
      await sync.setWanted({ licenseSha256: HASH });
      expect(plugin.putLicense).not.toHaveBeenCalled();

      plugin.setStatus(status());
      plugin.firePoll();
      await sync.sync();

      expect(plugin.putLicense).toHaveBeenCalledTimes(1);
    });

    it('retries a refused PUT after a backoff', async () => {
      plugin.putLicense.mockRejectedValueOnce(new PluginRequestError(409, 'license_mismatch'));

      await sync.setWanted({ licenseSha256: HASH });
      await sync.sync();
      expect(plugin.putLicense).toHaveBeenCalledTimes(1);
      clock += 5_001;
      await sync.sync();

      expect(plugin.putLicense).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('DELETEs an API acceptance once the config says there is none', async () => {
      plugin.setStatus(status({ acceptance: accepted('api'), state: 'ready' }), 'ready');

      await sync.setWanted(null);

      expect(plugin.deleteLicense).toHaveBeenCalledTimes(1);
      expect(plugin.poll).toHaveBeenCalled();
    });

    it('never touches an acceptance made through the environment', async () => {
      plugin.setStatus(status({ acceptance: accepted('env'), state: 'ready' }), 'ready');

      await sync.setWanted(null);
      await sync.setWanted({ licenseSha256: HASH });

      expect(plugin.deleteLicense).not.toHaveBeenCalled();
      expect(plugin.putLicense).not.toHaveBeenCalled();
    });

    it('does nothing for a null acceptance when the plugin has none', async () => {
      await sync.setWanted(null);

      expect(plugin.deleteLicense).not.toHaveBeenCalled();
    });

    it('retries a failed DELETE after a backoff', async () => {
      plugin.setStatus(status({ acceptance: accepted('api'), state: 'ready' }), 'ready');
      plugin.deleteLicense.mockRejectedValueOnce(new Error('socket'));

      await sync.setWanted(null);
      await sync.sync();
      expect(plugin.deleteLicense).toHaveBeenCalledTimes(1);
      clock += 5_001;
      await sync.sync();

      expect(plugin.deleteLicense).toHaveBeenCalledTimes(2);
    });

    it('applies a new instruction at once, even inside a backoff', async () => {
      plugin.putLicense.mockRejectedValueOnce(new Error('socket'));
      await sync.setWanted({ licenseSha256: HASH });

      await sync.setWanted({ licenseSha256: HASH });

      expect(plugin.putLicense).toHaveBeenCalledTimes(2);
    });
  });
});
