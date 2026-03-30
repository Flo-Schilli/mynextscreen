import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEmitter } from 'events';
import {
  FfmpegLiveService,
  LIVE_STREAM_PROCESS_EXITED,
} from './ffmpeg-live.service';
import { LiveStream } from './live-stream.entity';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

import { spawn } from 'child_process';

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

function createMockProcess(): EventEmitter & {
  stderr: EventEmitter;
  kill: jest.Mock;
  pid: number;
} {
  const proc = new EventEmitter() as EventEmitter & {
    stderr: EventEmitter;
    kill: jest.Mock;
    pid: number;
  };
  proc.stderr = new EventEmitter();
  proc.kill = jest.fn();
  proc.pid = 12345;
  return proc;
}

function createStream(overrides?: Partial<LiveStream>): LiveStream {
  return {
    id: '660e8400-e29b-41d4-a716-446655440000',
    organisationId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Studio Camera',
    sourceUrl: 'rtmp://example.com/live/stream1',
    protocol: LiveStreamProtocol.Rtmp,
    status: LiveStreamStatus.Idle,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as LiveStream;
}

describe('FfmpegLiveService', () => {
  let service: FfmpegLiveService;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    eventEmitter = { emit: jest.fn() };
    mockSpawn.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FfmpegLiveService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: string) => defaultVal),
          },
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<FfmpegLiveService>(FfmpegLiveService);
  });

  describe('start', () => {
    it('should spawn an FFmpeg process for an RTMP stream', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const stream = createStream();
      await service.start(stream);

      expect(mockSpawn).toHaveBeenCalledWith(
        'ffmpeg',
        expect.arrayContaining([
          '-i',
          'rtmp://example.com/live/stream1',
          '-c:v',
          'libx264',
          '-preset',
          'ultrafast',
          '-tune',
          'zerolatency',
          '-c:a',
          'aac',
          '-f',
          'hls',
          '-hls_time',
          '2',
          '-hls_list_size',
          '5',
          '-hls_flags',
          'delete_segments+append_list',
        ]),
        { stdio: ['ignore', 'ignore', 'pipe'] },
      );
      expect(service.isRunning(stream.id)).toBe(true);
    });

    it('should spawn an FFmpeg process for an RTP stream with protocol whitelist', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const stream = createStream({
        sourceUrl: 'rtp://239.0.0.1:5004',
        protocol: LiveStreamProtocol.Rtp,
      });
      await service.start(stream);

      const args = mockSpawn.mock.calls[0][1] as string[];
      expect(args[0]).toBe('-protocol_whitelist');
      expect(args[1]).toBe('file,rtp,udp');
      expect(args[2]).toBe('-i');
      expect(args[3]).toBe('rtp://239.0.0.1:5004');
    });

    it('should be idempotent — does not spawn a second process for the same stream', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const stream = createStream();
      await service.start(stream);
      await service.start(stream);

      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });

    it('should emit process-exited event on unplanned exit', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const stream = createStream();
      await service.start(stream);

      // Simulate unplanned exit
      proc.emit('close', 1);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        LIVE_STREAM_PROCESS_EXITED,
        expect.objectContaining({ streamId: stream.id, exitCode: 1 }),
      );
      expect(service.isRunning(stream.id)).toBe(false);
    });

    it('should NOT emit process-exited event on explicit stop', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const stream = createStream();
      await service.start(stream);
      await service.stop(stream.id);

      // Simulate the close event that follows SIGTERM
      proc.emit('close', null);

      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        LIVE_STREAM_PROCESS_EXITED,
        expect.anything(),
      );
    });
  });

  describe('stop', () => {
    it('should kill the FFmpeg process and clean up', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const stream = createStream();
      await service.start(stream);
      await service.stop(stream.id);

      expect(proc.kill).toHaveBeenCalledWith('SIGTERM');
      expect(service.isRunning(stream.id)).toBe(false);
    });

    it('should not throw if stopping a non-running stream', async () => {
      await expect(service.stop('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('isRunning', () => {
    it('should return false for a stream that was never started', () => {
      expect(service.isRunning('unknown-id')).toBe(false);
    });

    it('should return true for a running stream', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const stream = createStream();
      await service.start(stream);

      expect(service.isRunning(stream.id)).toBe(true);
    });

    it('should return false after stopping', async () => {
      const proc = createMockProcess();
      mockSpawn.mockReturnValue(proc as never);

      const stream = createStream();
      await service.start(stream);
      await service.stop(stream.id);

      expect(service.isRunning(stream.id)).toBe(false);
    });
  });

  describe('buildArgs', () => {
    it('should build correct RTMP args', () => {
      const stream = createStream();
      const args = service.buildArgs(stream, '/tmp/out/index.m3u8');

      expect(args).toEqual([
        '-i',
        'rtmp://example.com/live/stream1',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-tune',
        'zerolatency',
        '-c:a',
        'aac',
        '-f',
        'hls',
        '-hls_time',
        '2',
        '-hls_list_size',
        '5',
        '-hls_flags',
        'delete_segments+append_list',
        '/tmp/out/index.m3u8',
      ]);
    });

    it('should build correct RTP args with protocol whitelist', () => {
      const stream = createStream({
        sourceUrl: 'rtp://239.0.0.1:5004',
        protocol: LiveStreamProtocol.Rtp,
      });
      const args = service.buildArgs(stream, '/tmp/out/index.m3u8');

      expect(args[0]).toBe('-protocol_whitelist');
      expect(args[1]).toBe('file,rtp,udp');
      expect(args[2]).toBe('-i');
      expect(args[3]).toBe('rtp://239.0.0.1:5004');
      // Rest should be the same HLS output flags
      expect(args).toContain('-f');
      expect(args).toContain('hls');
    });
  });

  describe('getHlsOutputDir', () => {
    it('should return the correct output directory path', () => {
      const dir = service.getHlsOutputDir('stream-123');
      expect(dir).toBe('/tmp/signage-hls/stream-123');
    });
  });
});
