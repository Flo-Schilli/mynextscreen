import type { CaptureSnapshot } from '../capture/plugin-client';
import type { PluginStatus, PluginStreamStatus } from '../capture/capture-plugin-protocol';
import type { HlsUploadHandle, HlsUploadService } from '../hls/hls-upload.service';
import type { AgentNdiStreamConfig } from '../protocol/server-protocol';
import { NdiStreamManager, configChanged, type CapturePluginPort } from './ndi-stream.manager';

const ID_A = '6f1c2a52-7d3e-4c1a-9f0e-2b8d5a1c9e11';
const ID_B = '7f1c2a52-7d3e-4c1a-9f0e-2b8d5a1c9e12';
const HLS_DIR = '/shared/hls';

const stream = (overrides: Partial<AgentNdiStreamConfig> = {}): AgentNdiStreamConfig => ({
  streamId: ID_A,
  cameraHost: '192.168.1.60',
  ndiSourceName: null,
  bandwidth: 'highest',
  width: 1280,
  height: 720,
  fps: 30,
  bitrateKbps: 3000,
  encoderPref: 'auto',
  ptz: null,
  ...overrides,
});

const pluginStatus = (overrides: Partial<PluginStatus> = {}): PluginStatus => ({
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
  acceptance: null,
  arch: 'x64',
  encoders: ['libx264'],
  ...overrides,
});

const running = (
  streamId: string,
  overrides: Partial<PluginStreamStatus> = {},
): PluginStreamStatus => ({
  streamId,
  state: 'streaming',
  sourceName: 'CAM',
  encoder: 'libx264',
  fps: 30,
  framesDropped: 2,
  error: null,
  ...overrides,
});

class FakePlugin implements CapturePluginPort {
  current: CaptureSnapshot = {
    state: 'ready',
    status: pluginStatus(),
    streams: [],
    agentErrorCode: null,
  };
  private listener: () => void = () => undefined;
  readonly putStream = jest.fn(async (streamId: string, config: AgentNdiStreamConfig) => {
    void config;
    this.current = {
      ...this.current,
      streams: [...this.current.streams.filter((s) => s.streamId !== streamId), running(streamId)],
    };
  });
  readonly deleteStream = jest.fn(async (streamId: string) => {
    this.current = {
      ...this.current,
      streams: this.current.streams.filter((s) => s.streamId !== streamId),
    };
  });
  readonly poll = jest.fn(async () => this.listener());

  snapshot(): CaptureSnapshot {
    return this.current;
  }
  onPoll(listener: () => void): void {
    this.listener = listener;
  }
  /** A scheduled poll that found the given state. */
  async pollResult(next: Partial<CaptureSnapshot>): Promise<void> {
    this.current = { ...this.current, ...next };
    this.listener();
    await settle();
  }
}

const settle = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

describe('configChanged', () => {
  it.each([
    ['cameraHost', { cameraHost: '10.0.0.9' }],
    ['ndiSourceName', { ndiSourceName: 'CAM' }],
    ['bandwidth', { bandwidth: 'lowest' as const }],
    ['width', { width: 1920 }],
    ['height', { height: 1080 }],
    ['fps', { fps: 25 }],
    ['bitrateKbps', { bitrateKbps: 5000 }],
    ['encoderPref', { encoderPref: 'software' as const }],
  ])('sees a change in %s', (_field, change) => {
    expect(configChanged(stream(), stream(change))).toBe(true);
  });

  it('ignores ptz', () => {
    expect(configChanged(stream(), stream({ ptz: { protocol: 'visca_udp', port: 52381 } }))).toBe(
      false,
    );
  });
});

describe('NdiStreamManager', () => {
  let plugin: FakePlugin;
  let uploads: { streamId: string; dir: string; handle: HlsUploadHandle & { stop: jest.Mock } }[];
  let manager: NdiStreamManager;

  const build = (enabled = true): NdiStreamManager => {
    const uploader = {
      start: jest.fn((streamId: string, dir: string) => {
        const handle = { uploadLagMs: jest.fn(() => 120), stop: jest.fn(async () => undefined) };
        uploads.push({ streamId, dir, handle });
        return handle;
      }),
    } as unknown as HlsUploadService;
    return new NdiStreamManager(plugin, uploader, { enabled, hlsDir: HLS_DIR });
  };

  beforeEach(() => {
    plugin = new FakePlugin();
    uploads = [];
    manager = build();
  });

  describe('reconcile', () => {
    it('starts a stream through the plugin and uploads from the shared HLS directory', async () => {
      await manager.reconcile([stream()]);

      expect(plugin.putStream).toHaveBeenCalledWith(ID_A, stream());
      expect(uploads).toHaveLength(1);
      expect(uploads[0].dir).toBe(`${HLS_DIR}/${ID_A}`);
    });

    it('leaves a running stream alone when nothing changed', async () => {
      await manager.reconcile([stream()]);
      await manager.reconcile([stream()]);

      expect(plugin.putStream).toHaveBeenCalledTimes(1);
      expect(plugin.deleteStream).not.toHaveBeenCalled();
      expect(uploads).toHaveLength(1);
    });

    it('does not call the plugin for a ptz-only change', async () => {
      await manager.reconcile([stream()]);
      await manager.reconcile([stream({ ptz: { protocol: 'visca_udp', port: 52381 } })]);

      expect(plugin.putStream).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['cameraHost', { cameraHost: '10.0.0.9' }],
      ['bitrateKbps', { bitrateKbps: 5000 }],
      ['fps', { fps: 25 }],
    ])('replaces the stream when %s changed, with a fresh uploader', async (_field, change) => {
      await manager.reconcile([stream()]);
      await manager.reconcile([stream(change)]);

      expect(plugin.putStream).toHaveBeenCalledTimes(2);
      expect(plugin.putStream).toHaveBeenLastCalledWith(ID_A, stream(change));
      expect(uploads).toHaveLength(2);
      expect(uploads[0].handle.stop).toHaveBeenCalledTimes(1);
    });

    it('stops a stream that left the list, and its uploader', async () => {
      await manager.reconcile([stream(), stream({ streamId: ID_B })]);

      await manager.reconcile([stream({ streamId: ID_B })]);

      expect(plugin.deleteStream).toHaveBeenCalledWith(ID_A);
      expect(plugin.deleteStream).not.toHaveBeenCalledWith(ID_B);
      expect(uploads[0].handle.stop).toHaveBeenCalledTimes(1);
      expect(uploads[1].handle.stop).not.toHaveBeenCalled();
    });

    it('stops a stream the plugin runs that the server does not know', async () => {
      plugin.current = { ...plugin.current, streams: [running(ID_B)] };

      await manager.reconcile([]);

      expect(plugin.deleteStream).toHaveBeenCalledWith(ID_B);
    });

    it('ignores streams with an invalid id', async () => {
      await manager.reconcile([stream({ streamId: '../etc' })]);

      expect(plugin.putStream).not.toHaveBeenCalled();
      expect(manager.status()).toEqual([]);
    });

    it('ignores everything while disabled, and warns once', async () => {
      manager = build(false);

      await manager.reconcile([stream()]);
      await manager.reconcile([stream()]);

      expect(plugin.putStream).not.toHaveBeenCalled();
      expect(manager.status()).toEqual([]);
      expect(manager.capturePlugin()).toBeNull();
    });

    it('does nothing before the first poll', async () => {
      plugin.current = { ...plugin.current, state: 'unknown', status: null };

      await manager.reconcile([stream()]);

      expect(plugin.putStream).not.toHaveBeenCalled();
    });

    it('retries after a failed start, logging it only once', async () => {
      plugin.putStream
        .mockRejectedValueOnce(new Error('409'))
        .mockRejectedValueOnce(new Error('409'));

      await manager.reconcile([stream()]);
      await plugin.pollResult({});
      await plugin.pollResult({});

      expect(plugin.putStream).toHaveBeenCalledTimes(3);
      expect(uploads).toHaveLength(1);
    });

    it('keeps going when stopping fails', async () => {
      await manager.reconcile([stream()]);
      plugin.deleteStream.mockRejectedValueOnce(new Error('500'));

      await manager.reconcile([]);
      await plugin.pollResult({});

      expect(plugin.deleteStream).toHaveBeenCalledTimes(2);
    });

    it('survives a failing poll hook', async () => {
      plugin.poll.mockRejectedValueOnce(new Error('boom'));

      await expect(manager.reconcile([stream()])).resolves.toBeUndefined();
    });
  });

  describe('following the plugin', () => {
    it('starts the wanted streams once the plugin becomes ready', async () => {
      plugin.current = { ...plugin.current, state: 'license_required', streams: [] };
      await manager.reconcile([stream()]);
      expect(plugin.putStream).not.toHaveBeenCalled();

      await plugin.pollResult({ state: 'ready' });

      expect(plugin.putStream).toHaveBeenCalledTimes(1);
    });

    it('starts the stream again after the plugin restarted without it', async () => {
      await manager.reconcile([stream()]);

      await plugin.pollResult({ streams: [] });

      expect(plugin.putStream).toHaveBeenCalledTimes(2);
      expect(uploads).toHaveLength(1);
    });

    it('stops uploading while the plugin is gone and starts again when it returns', async () => {
      await manager.reconcile([stream()]);

      await plugin.pollResult({ state: 'absent', status: null, streams: [] });
      expect(uploads[0].handle.stop).toHaveBeenCalledTimes(1);
      expect(plugin.deleteStream).not.toHaveBeenCalled();

      await plugin.pollResult({ state: 'ready', status: pluginStatus() });
      expect(plugin.putStream).toHaveBeenCalledTimes(2);
      expect(uploads).toHaveLength(2);
    });
  });

  describe('status', () => {
    it('maps the plugin status and adds the upload lag', async () => {
      await manager.reconcile([stream()]);

      expect(manager.status()).toEqual([
        {
          streamId: ID_A,
          state: 'streaming',
          sourceName: 'CAM',
          encoder: 'libx264',
          fps: 30,
          framesDropped: 2,
          uploadLagMs: 120,
          error: null,
        },
      ]);
    });

    it('passes the plugin error code through and truncates long names', async () => {
      await manager.reconcile([stream()]);
      plugin.current = {
        ...plugin.current,
        streams: [
          running(ID_A, {
            state: 'error',
            error: 'source_not_found',
            sourceName: 's'.repeat(300),
            encoder: 'e'.repeat(300),
          }),
        ],
      };

      const [entry] = manager.status();

      expect(entry.state).toBe('error');
      expect(entry.error).toBe('source_not_found');
      expect(entry.sourceName).toHaveLength(200);
      expect(entry.encoder).toHaveLength(100);
    });

    it('reports a wanted stream the plugin does not list yet as connecting', async () => {
      plugin.current = { ...plugin.current, streams: [] };
      plugin.putStream.mockResolvedValue(undefined);
      await manager.reconcile([stream()]);

      expect(manager.status()[0]).toMatchObject({ state: 'connecting', error: null, fps: null });
    });

    it.each(['absent', 'license_required', 'incompatible', 'error'] as const)(
      'reports a wanted stream as an internal error while the plugin is %s',
      async (state) => {
        await manager.reconcile([stream()]);
        plugin.current = { ...plugin.current, state, streams: [] };

        expect(manager.status()[0]).toMatchObject({ state: 'error', error: 'internal_error' });
      },
    );
  });

  describe('capturePlugin', () => {
    it('is null while unknown or absent', () => {
      plugin.current = { ...plugin.current, state: 'unknown', status: null };
      expect(manager.capturePlugin()).toBeNull();
      plugin.current = { ...plugin.current, state: 'absent' };
      expect(manager.capturePlugin()).toBeNull();
    });

    it('carries state, versions and the license hashes', () => {
      expect(manager.capturePlugin()).toEqual({
        state: 'ready',
        pluginVersion: '0.1.0',
        apiVersion: '1',
        sdkVersion: '6.3.2.0',
        license: {
          licenseSha256: 'a'.repeat(64),
          ndiLicenseSha256: 'b'.repeat(64),
          termsSha256: 'c'.repeat(64),
        },
      });
    });

    it('leaves out what the plugin does not know and adds the error code', () => {
      plugin.current = {
        ...plugin.current,
        state: 'error',
        status: pluginStatus({
          state: 'error',
          errorCode: 'runtime_missing',
          sdkVersion: null,
          license: null,
        }),
      };

      expect(manager.capturePlugin()).toEqual({
        state: 'error',
        pluginVersion: '0.1.0',
        apiVersion: '1',
        errorCode: 'runtime_missing',
      });
    });

    it('reports the agent-side reason for an incompatible plugin', () => {
      plugin.current = {
        state: 'incompatible',
        status: pluginStatus({ apiVersion: '2' }),
        streams: [],
        agentErrorCode: 'unsupported_api_version',
      };

      expect(manager.capturePlugin()).toMatchObject({
        state: 'incompatible',
        apiVersion: '2',
        errorCode: 'unsupported_api_version',
      });
    });

    it('works without a status body', () => {
      plugin.current = {
        state: 'incompatible',
        status: null,
        streams: [],
        agentErrorCode: 'unsupported_api_version',
      };

      expect(manager.capturePlugin()).toEqual({
        state: 'incompatible',
        errorCode: 'unsupported_api_version',
      });
    });
  });

  describe('onChange', () => {
    it('fires when a stream changes state, not for fps or counters', async () => {
      const listener = jest.fn();
      manager.onChange(listener);
      await manager.reconcile([stream()]);
      listener.mockClear();

      await plugin.pollResult({ streams: [running(ID_A, { fps: 29.9, framesDropped: 9 })] });
      expect(listener).not.toHaveBeenCalled();

      await plugin.pollResult({ streams: [running(ID_A, { state: 'error', error: 'no_frames' })] });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('fires when the plugin state changes', async () => {
      const listener = jest.fn();
      manager.onChange(listener);
      await manager.reconcile([]);
      listener.mockClear();

      await plugin.pollResult({ state: 'license_required' });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('shutdown', () => {
    it('stops the uploaders but leaves the plugin streams running', async () => {
      await manager.reconcile([stream()]);

      await manager.onModuleDestroy();

      expect(uploads[0].handle.stop).toHaveBeenCalledTimes(1);
      expect(plugin.deleteStream).not.toHaveBeenCalled();
    });
  });
});
