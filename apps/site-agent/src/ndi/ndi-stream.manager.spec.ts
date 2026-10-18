import type { HlsUploadService } from '../hls/hls-upload.service';
import type { AgentNdiStreamConfig } from '../protocol/server-protocol';
import { configChanged, NdiStreamManager, type NdiManagerOptions } from './ndi-stream.manager';
import type { NdiReceiverFactory } from './ndi-receiver';
import { fakeSpawner, type FakeSpawn } from './testing/fake-ffmpeg';

const stream = (
  id: string,
  overrides: Partial<AgentNdiStreamConfig> = {},
): AgentNdiStreamConfig => ({
  streamId: id,
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

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('configChanged', () => {
  const base = stream(A);

  it('is false for an identical copy', () => {
    expect(configChanged(base, { ...base })).toBe(false);
  });

  it.each<Partial<AgentNdiStreamConfig>>([
    { cameraHost: '10.0.0.1' },
    { ndiSourceName: 'X' },
    { bandwidth: 'lowest' },
    { width: 640 },
    { height: 360 },
    { fps: 25 },
    { bitrateKbps: 800 },
    { encoderPref: 'software' },
  ])('is true when %p differs', (override) => {
    expect(configChanged(base, { ...base, ...override })).toBe(true);
  });
});

describe('NdiStreamManager', () => {
  let spawn: FakeSpawn;
  let open: jest.Mock;
  let uploaderStart: jest.Mock;
  let directory: { prepare: jest.Mock; remove: jest.Mock };
  let manager: NdiStreamManager;

  function build(options: Partial<NdiManagerOptions> = {}): NdiStreamManager {
    return new NdiStreamManager(
      { open } as NdiReceiverFactory,
      { start: uploaderStart } as unknown as HlsUploadService,
      {
        enabled: true,
        ffmpegPath: 'ffmpeg',
        encoderOverride: null,
        arch: 'x64',
        baseDir: '/base',
        backoff: { initialMs: 5, maxMs: 10 },
        directory,
        spawner: spawn.spawner,
        probe: { exists: () => false, hasVideoDevices: () => false },
        ...options,
      },
    );
  }

  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 25));

  beforeEach(() => {
    spawn = fakeSpawner();
    open = jest.fn().mockImplementation(async () => ({
      sourceName: 'CAM',
      nextFrame: async () => {
        await new Promise((resolve) => setTimeout(resolve, 2));
        return { data: Buffer.from([1]), width: 1280, height: 720, fps: 30 };
      },
      close: jest.fn(),
    }));
    uploaderStart = jest.fn().mockReturnValue({
      stop: jest.fn().mockResolvedValue(undefined),
      uploadLagMs: () => null,
    });
    directory = {
      prepare: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    manager = build();
  });

  afterEach(async () => {
    await manager.onModuleDestroy();
  });

  it('starts a pipeline per new stream in its own directory', async () => {
    await manager.reconcile([stream(A), stream(B)]);
    await settle();

    expect(open).toHaveBeenCalledTimes(2);
    expect(directory.prepare).toHaveBeenCalledWith(`/base/${A}`);
    expect(directory.prepare).toHaveBeenCalledWith(`/base/${B}`);
    expect(manager.status().map((s) => s.streamId)).toEqual([A, B]);
  });

  it('tells listeners when a pipeline changes state', async () => {
    const listener = jest.fn();
    manager.onChange(listener);

    await manager.reconcile([stream(A)]);
    await settle();

    expect(listener).toHaveBeenCalled();
  });

  it('leaves an unchanged stream running', async () => {
    await manager.reconcile([stream(A)]);
    await settle();
    await manager.reconcile([stream(A)]);
    await settle();

    expect(open).toHaveBeenCalledTimes(1);
  });

  it('restarts a stream when any field changes', async () => {
    await manager.reconcile([stream(A)]);
    await settle();
    await manager.reconcile([stream(A, { bitrateKbps: 800 })]);
    await settle();

    expect(open).toHaveBeenCalledTimes(2);
    expect(spawn.calls).toHaveLength(2);
    expect(spawn.children[0].stdin.end).toHaveBeenCalled();
  });

  it('stops streams that disappear from the list', async () => {
    await manager.reconcile([stream(A), stream(B)]);
    await settle();
    await manager.reconcile([stream(B)]);

    expect(manager.status().map((s) => s.streamId)).toEqual([B]);
    expect(directory.remove).toHaveBeenCalledWith(`/base/${A}`);
  });

  it('ignores a stream whose id is not a UUID', async () => {
    await manager.reconcile([stream('../../etc'), stream(A)]);
    await settle();

    expect(manager.status().map((s) => s.streamId)).toEqual([A]);
    expect(directory.prepare).not.toHaveBeenCalledWith(expect.stringContaining('etc'));
  });

  it('runs nothing and warns once when NDI is disabled', async () => {
    manager = build({ enabled: false });

    await manager.reconcile([stream(A)]);
    await manager.reconcile([stream(A)]);

    expect(open).not.toHaveBeenCalled();
    expect(manager.status()).toEqual([]);
  });

  it('stops running streams when NDI gets disabled by an empty list', async () => {
    await manager.reconcile([stream(A)]);
    await settle();

    await manager.reconcile([]);

    expect(manager.status()).toEqual([]);
  });

  it('stops everything on destroy', async () => {
    await manager.reconcile([stream(A), stream(B)]);
    await settle();

    await manager.onModuleDestroy();

    expect(manager.status()).toEqual([]);
    expect(directory.remove).toHaveBeenCalledTimes(2);
  });

  it('serialises overlapping reconciles', async () => {
    const first = manager.reconcile([stream(A)]);
    const second = manager.reconcile([]);
    await Promise.all([first, second]);

    expect(manager.status()).toEqual([]);
  });

  it('does not let a failure break later reconciles', async () => {
    jest
      .spyOn(manager as unknown as { apply: () => Promise<void> }, 'apply')
      .mockRejectedValueOnce(new Error('boom'));

    await expect(manager.reconcile([stream(A)])).resolves.toBeUndefined();
    await manager.reconcile([stream(A)]);
    await settle();

    expect(manager.status()).toHaveLength(1);
  });

  it('applies the encoder override from the environment', async () => {
    manager = build({ encoderOverride: 'h264_v4l2m2m' });

    await manager.reconcile([stream(A)]);
    await settle();

    expect(manager.status()[0].encoder).toBe('h264_v4l2m2m');
  });
});
