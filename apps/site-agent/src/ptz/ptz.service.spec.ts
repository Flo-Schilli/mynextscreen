import type { AgentNdiStreamConfig } from '../protocol/server-protocol';
import { DEAD_MAN_MS, PtzService } from './ptz.service';

const ID = '11111111-1111-4111-8111-111111111111';
const stream = (overrides: Partial<AgentNdiStreamConfig> = {}): AgentNdiStreamConfig => ({
  streamId: ID,
  cameraHost: '192.168.1.60',
  ndiSourceName: null,
  bandwidth: 'highest',
  width: 1280,
  height: 720,
  fps: 30,
  bitrateKbps: 3000,
  encoderPref: 'auto',
  ptz: { protocol: 'visca_udp', port: 52381 },
  ...overrides,
});

describe('PtzService', () => {
  let current: jest.Mock;
  let send: jest.Mock;
  let service: PtzService;

  beforeEach(() => {
    jest.useFakeTimers();
    current = jest.fn().mockReturnValue({ ndiStreams: [stream()] });
    send = jest.fn().mockResolvedValue(undefined);
    service = new PtzService({ current } as never, { send } as never);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('sends the bytes to the configured camera, not to anything in the command', async () => {
    await service.handle(ID, { action: 'home' });

    expect(send).toHaveBeenCalledWith(
      { host: '192.168.1.60', port: 52381, protocol: 'visca_udp' },
      [Buffer.from('81010604ff', 'hex')],
    );
  });

  it.each([
    ['an unknown stream', { ndiStreams: [stream({ streamId: 'other' })] }],
    ['a stream with ptz off', { ndiStreams: [stream({ ptz: null })] }],
    ['no streams', { ndiStreams: undefined }],
    ['no config', null],
  ])('ignores %s', async (_name, config) => {
    current.mockReturnValue(config);

    await service.handle(ID, { action: 'home' });
    jest.advanceTimersByTime(DEAD_MAN_MS * 2);

    expect(send).not.toHaveBeenCalled();
  });

  it('ignores an invalid command without arming the dead-man', async () => {
    await service.handle(ID, { action: 'preset_recall', preset: 99 });
    jest.advanceTimersByTime(DEAD_MAN_MS * 2);

    expect(send).not.toHaveBeenCalled();
  });

  it('ignores an unknown action', async () => {
    await service.handle(ID, { action: 'nope' } as never);

    expect(send).not.toHaveBeenCalled();
  });

  describe('dead-man', () => {
    it.each([
      ['move', { action: 'move', direction: 'left', speed: 5 }],
      ['zoom', { action: 'zoom', direction: 'in', speed: 3 }],
    ] as const)('stops after %s with no follow-up', async (_name, command) => {
      await service.handle(ID, command);
      jest.advanceTimersByTime(DEAD_MAN_MS - 1);
      expect(send).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1);

      expect(send).toHaveBeenCalledTimes(2);
      expect(send.mock.calls[1][1].map((b: Buffer) => b.toString('hex'))).toEqual([
        '8101060101010303ff',
        '8101040700ff',
      ]);
    });

    it('is pushed back by each further command', async () => {
      await service.handle(ID, { action: 'move', direction: 'left', speed: 5 });
      jest.advanceTimersByTime(1000);
      await service.handle(ID, { action: 'move', direction: 'left', speed: 5 });
      jest.advanceTimersByTime(1000);

      expect(send).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(500);
      expect(send).toHaveBeenCalledTimes(3);
    });

    it.each([
      { action: 'stop' },
      { action: 'home' },
      { action: 'preset_recall', preset: 1 },
    ] as const)('is cancelled by %p', async (command) => {
      await service.handle(ID, { action: 'move', direction: 'up', speed: 5 });
      await service.handle(ID, command);
      send.mockClear();

      jest.advanceTimersByTime(DEAD_MAN_MS * 2);

      expect(send).not.toHaveBeenCalled();
    });

    it('still reaches the camera when ptz was removed from the config meanwhile', async () => {
      await service.handle(ID, { action: 'move', direction: 'up', speed: 5 });
      current.mockReturnValue({ ndiStreams: [stream({ ptz: null })] });

      jest.advanceTimersByTime(DEAD_MAN_MS);

      expect(send).toHaveBeenCalledTimes(2);
      expect(send.mock.calls[1][0]).toEqual({
        host: '192.168.1.60',
        port: 52381,
        protocol: 'visca_udp',
      });
    });

    it('is cleared on module destroy', async () => {
      await service.handle(ID, { action: 'move', direction: 'up', speed: 5 });
      service.onModuleDestroy();

      jest.advanceTimersByTime(DEAD_MAN_MS * 2);

      expect(send).toHaveBeenCalledTimes(1);
    });
  });

  describe('syncTargets', () => {
    it('keeps only the cameras referenced by the current config', () => {
      const retainOnly = jest.fn();
      const synced = new PtzService({ current } as never, { send, retainOnly } as never);
      current.mockReturnValue({
        ndiStreams: [
          stream(),
          stream({ streamId: 'b', cameraHost: '192.168.1.61', ptz: null }),
          stream({
            streamId: 'c',
            cameraHost: '192.168.1.62',
            ptz: { protocol: 'visca_tcp', port: 5678 },
          }),
        ],
      });

      synced.syncTargets();

      expect(retainOnly).toHaveBeenCalledWith([
        { host: '192.168.1.60', port: 52381, protocol: 'visca_udp' },
        { host: '192.168.1.62', port: 5678, protocol: 'visca_tcp' },
      ]);
    });

    it('closes everything when there is no config', () => {
      const retainOnly = jest.fn();
      current.mockReturnValue(null);

      new PtzService({ current } as never, { send, retainOnly } as never).syncTargets();

      expect(retainOnly).toHaveBeenCalledWith([]);
    });
  });
});
