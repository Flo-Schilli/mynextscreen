import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEmitter } from 'events';
import { FfmpegLiveService, LIVE_STREAM_PROCESS_EXITED, PRESET_MAP } from './ffmpeg-live.service';
import type { LiveStream } from '../db/schema';
import { ServiceUnavailableException } from '@nestjs/common';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';
import { TranscodingPreset } from './transcoding-preset.enum';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  execFile: jest.fn(),
}));

// Mock util.promisify to return our mock directly
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: (fn: unknown) => {
    // Return a wrapper that calls through to the mock and returns a promise
    return (...args: unknown[]) => {
      return new Promise((resolve, reject) => {
        (fn as (...fnArgs: unknown[]) => unknown)(
          ...args,
          (err: Error | null, stdout: string, stderr: string) => {
            if (err) reject(err);
            else resolve({ stdout, stderr });
          },
        );
      });
    };
  },
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

import { spawn, execFile } from 'child_process';

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockExecFile = execFile as unknown as jest.MockedFunction<
  (
    cmd: string,
    args: string[],
    opts: unknown,
    cb: (err: Error | null, stdout: string, stderr: string) => void,
  ) => void
>;

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
  // A real FFmpeg exits on SIGTERM; mirroring that keeps stop() from waiting
  // out its escalation timer in every test.
  proc.kill = jest.fn(() => {
    setImmediate(() => proc.emit('exit', 0, 'SIGTERM'));
    return true;
  });
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
    transcodingPreset: TranscodingPreset.High1080p,
    audioEnabled: true,
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
          '-c:a',
          'aac',
          '-f',
          'hls',
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
      // `file` is deliberately absent — an SDP/RTP source has no use for it.
      expect(args[1]).toBe('rtp,udp');
      expect(args.slice(2, 4)).toEqual(['-rw_timeout', '30000000']);
      expect(args[4]).toBe('-i');
      expect(args[5]).toBe('rtp://239.0.0.1:5004');
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
    const outputPath = '/tmp/out/index.m3u8';

    it('should build correct args for high_1080p preset (default)', () => {
      const stream = createStream();
      const args = service.buildArgs(stream, outputPath);

      expect(args).toEqual([
        '-protocol_whitelist',
        'rtmp,tcp',
        '-rw_timeout',
        '30000000',
        '-i',
        'rtmp://example.com/live/stream1',
        '-vf',
        'scale=1920:-2,format=yuv420p',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-tune',
        'zerolatency',
        '-b:v',
        '2500k',
        '-maxrate',
        '3000k',
        '-bufsize',
        '6000k',
        '-g',
        '60',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-f',
        'hls',
        '-hls_time',
        '2',
        '-hls_list_size',
        '5',
        '-hls_flags',
        'delete_segments+append_list',
        outputPath,
      ]);
    });

    it('should build correct RTP args with protocol whitelist', () => {
      const stream = createStream({
        sourceUrl: 'rtp://239.0.0.1:5004',
        protocol: LiveStreamProtocol.Rtp,
      });
      const args = service.buildArgs(stream, outputPath);

      expect(args[0]).toBe('-protocol_whitelist');
      // `file` is deliberately absent — an SDP/RTP source has no use for it.
      expect(args[1]).toBe('rtp,udp');
      expect(args.slice(2, 4)).toEqual(['-rw_timeout', '30000000']);
      expect(args[4]).toBe('-i');
      expect(args[5]).toBe('rtp://239.0.0.1:5004');
      expect(args).toContain('-f');
      expect(args).toContain('hls');
    });

    it('should build correct args for low_480p preset', () => {
      const stream = createStream({
        transcodingPreset: TranscodingPreset.Low480p,
      });
      const args = service.buildArgs(stream, outputPath);

      expect(args).toContain('-vf');
      expect(args[args.indexOf('-vf') + 1]).toBe('scale=854:-2,format=yuv420p');
      expect(args[args.indexOf('-b:v') + 1]).toBe('1000k');
      expect(args[args.indexOf('-maxrate') + 1]).toBe('1200k');
      expect(args[args.indexOf('-bufsize') + 1]).toBe('2400k');
      expect(args).toContain('-preset');
      expect(args[args.indexOf('-preset') + 1]).toBe('ultrafast');
      expect(args).toContain('-tune');
      expect(args[args.indexOf('-tune') + 1]).toBe('zerolatency');
      expect(args).toContain('-g');
      expect(args[args.indexOf('-g') + 1]).toBe('60');
    });

    it('should build correct args for medium_720p preset', () => {
      const stream = createStream({
        transcodingPreset: TranscodingPreset.Medium720p,
      });
      const args = service.buildArgs(stream, outputPath);

      expect(args[args.indexOf('-vf') + 1]).toBe('scale=1280:-2,format=yuv420p');
      expect(args[args.indexOf('-b:v') + 1]).toBe('2000k');
      expect(args[args.indexOf('-maxrate') + 1]).toBe('2400k');
      expect(args[args.indexOf('-bufsize') + 1]).toBe('4800k');
    });

    it('should build correct args for full_hd_plus_1440p preset', () => {
      const stream = createStream({
        transcodingPreset: TranscodingPreset.FullHdPlus1440p,
      });
      const args = service.buildArgs(stream, outputPath);

      expect(args[args.indexOf('-vf') + 1]).toBe('scale=2560:-2,format=yuv420p');
      expect(args[args.indexOf('-b:v') + 1]).toBe('5000k');
      expect(args[args.indexOf('-maxrate') + 1]).toBe('6000k');
      expect(args[args.indexOf('-bufsize') + 1]).toBe('12000k');
    });

    it('should build correct args for passthrough preset', () => {
      const stream = createStream({
        transcodingPreset: TranscodingPreset.Passthrough,
      });
      const args = service.buildArgs(stream, outputPath);

      expect(args).toContain('-c:v');
      expect(args[args.indexOf('-c:v') + 1]).toBe('copy');
      expect(args).not.toContain('-vf');
      expect(args).not.toContain('libx264');
      expect(args).not.toContain('-preset');
      expect(args).not.toContain('-tune');
      expect(args).not.toContain('-g');
      // Still wraps in HLS
      expect(args).toContain('-f');
      expect(args[args.indexOf('-f') + 1]).toBe('hls');
      expect(args).toContain('-hls_time');
      expect(args).toContain('-hls_list_size');
      expect(args).toContain('-hls_flags');
    });

    it('should include -an when audioEnabled is false', () => {
      const stream = createStream({ audioEnabled: false });
      const args = service.buildArgs(stream, outputPath);

      expect(args).toContain('-an');
      expect(args).not.toContain('-c:a');
      expect(args).not.toContain('aac');
    });

    it('should include AAC audio args when audioEnabled is true', () => {
      const stream = createStream({ audioEnabled: true });
      const args = service.buildArgs(stream, outputPath);

      expect(args).toContain('-c:a');
      expect(args[args.indexOf('-c:a') + 1]).toBe('aac');
      expect(args).toContain('-b:a');
      expect(args[args.indexOf('-b:a') + 1]).toBe('128k');
      expect(args).not.toContain('-an');
    });

    it('should include -an for passthrough with audio disabled', () => {
      const stream = createStream({
        transcodingPreset: TranscodingPreset.Passthrough,
        audioEnabled: false,
      });
      const args = service.buildArgs(stream, outputPath);

      expect(args).toContain('-c:v');
      expect(args[args.indexOf('-c:v') + 1]).toBe('copy');
      expect(args).toContain('-an');
      expect(args).not.toContain('-c:a');
    });

    it('should include AAC audio for passthrough with audio enabled', () => {
      const stream = createStream({
        transcodingPreset: TranscodingPreset.Passthrough,
        audioEnabled: true,
      });
      const args = service.buildArgs(stream, outputPath);

      expect(args).toContain('-c:v');
      expect(args[args.indexOf('-c:v') + 1]).toBe('copy');
      expect(args).toContain('-c:a');
      expect(args[args.indexOf('-c:a') + 1]).toBe('aac');
    });

    it('should include format=yuv420p in video filter for all non-passthrough presets', () => {
      const nonPassthroughPresets = [
        TranscodingPreset.Low480p,
        TranscodingPreset.Medium720p,
        TranscodingPreset.High1080p,
        TranscodingPreset.FullHdPlus1440p,
      ];

      for (const preset of nonPassthroughPresets) {
        const stream = createStream({ transcodingPreset: preset });
        const args = service.buildArgs(stream, outputPath);
        const vfValue = args[args.indexOf('-vf') + 1];
        expect(vfValue).toContain('format=yuv420p');
      }
    });

    it('should include -preset ultrafast -tune zerolatency -g 60 for all non-passthrough presets', () => {
      const nonPassthroughPresets = [
        TranscodingPreset.Low480p,
        TranscodingPreset.Medium720p,
        TranscodingPreset.High1080p,
        TranscodingPreset.FullHdPlus1440p,
      ];

      for (const preset of nonPassthroughPresets) {
        const stream = createStream({ transcodingPreset: preset });
        const args = service.buildArgs(stream, outputPath);
        expect(args[args.indexOf('-preset') + 1]).toBe('ultrafast');
        expect(args[args.indexOf('-tune') + 1]).toBe('zerolatency');
        expect(args[args.indexOf('-g') + 1]).toBe('60');
      }
    });

    it('should match PRESET_MAP values for each non-passthrough preset', () => {
      const presets = [
        TranscodingPreset.Low480p,
        TranscodingPreset.Medium720p,
        TranscodingPreset.High1080p,
        TranscodingPreset.FullHdPlus1440p,
      ] as const;

      for (const preset of presets) {
        const config = PRESET_MAP[preset];
        const stream = createStream({ transcodingPreset: preset });
        const args = service.buildArgs(stream, outputPath);

        expect(args[args.indexOf('-vf') + 1]).toBe(`scale=${config.scale},format=yuv420p`);
        expect(args[args.indexOf('-b:v') + 1]).toBe(config.videoBitrate);
        expect(args[args.indexOf('-maxrate') + 1]).toBe(config.maxrate);
        expect(args[args.indexOf('-bufsize') + 1]).toBe(config.bufsize);
      }
    });
  });

  describe('getHlsOutputDir', () => {
    it('should return the correct output directory path', () => {
      const dir = service.getHlsOutputDir('stream-123');
      expect(dir).toBe('/tmp/mynextscreen-hls/stream-123');
    });
  });

  describe('probeSourceStream', () => {
    beforeEach(() => {
      mockExecFile.mockReset();
    });

    function setupExecFile(stdout: string): void {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          cb(null, stdout, '');
          return undefined as never;
        },
      );
    }

    it('should parse ffprobe JSON output with video and audio streams', async () => {
      const ffprobeOutput = JSON.stringify({
        streams: [
          { codec_type: 'video', codec_name: 'h264', pix_fmt: 'yuv420p' },
          { codec_type: 'audio', codec_name: 'aac' },
        ],
      });
      setupExecFile(ffprobeOutput);

      const result = await service.probeSourceStream(
        'rtmp://example.com/live/test',
        LiveStreamProtocol.Rtmp,
      );

      expect(result).toEqual({
        videoCodec: 'h264',
        pixelFormat: 'yuv420p',
        audioCodec: 'aac',
      });
    });

    it('should return "unknown"/"none" for missing streams', async () => {
      const ffprobeOutput = JSON.stringify({ streams: [] });
      setupExecFile(ffprobeOutput);

      const result = await service.probeSourceStream(
        'rtmp://example.com/live/test',
        LiveStreamProtocol.Rtmp,
      );

      expect(result).toEqual({
        videoCodec: 'unknown',
        pixelFormat: 'unknown',
        audioCodec: 'none',
      });
    });

    it('should include protocol_whitelist for RTP sources', async () => {
      const ffprobeOutput = JSON.stringify({
        streams: [{ codec_type: 'video', codec_name: 'hevc', pix_fmt: 'yuv420p10le' }],
      });
      setupExecFile(ffprobeOutput);

      await service.probeSourceStream('rtp://239.0.0.1:5004', LiveStreamProtocol.Rtp);

      const callArgs = mockExecFile.mock.calls[0][1] as string[];
      expect(callArgs[0]).toBe('-protocol_whitelist');
      expect(callArgs[1]).toBe('rtp,udp');
    });

    it('should propagate errors from ffprobe', async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          cb: (err: Error | null, stdout: string, stderr: string) => void,
        ) => {
          cb(new Error('ffprobe not found'), '', '');
          return undefined as never;
        },
      );

      await expect(
        service.probeSourceStream('rtmp://example.com/live/test', LiveStreamProtocol.Rtmp),
      ).rejects.toThrow('ffprobe not found');
    });
  });

  describe('checkPassthroughCompatibility', () => {
    it('should return compatible for h264 + yuv420p + aac', () => {
      const result = service.checkPassthroughCompatibility({
        videoCodec: 'h264',
        pixelFormat: 'yuv420p',
        audioCodec: 'aac',
      });

      expect(result).toEqual({ compatible: true, warnings: [] });
    });

    it('should warn when video codec is not h264', () => {
      const result = service.checkPassthroughCompatibility({
        videoCodec: 'hevc',
        pixelFormat: 'yuv420p',
        audioCodec: 'aac',
      });

      expect(result.compatible).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('hevc');
      expect(result.warnings[0]).toContain('not H.264');
    });

    it('should warn when pixel format is 10-bit (10le)', () => {
      const result = service.checkPassthroughCompatibility({
        videoCodec: 'h264',
        pixelFormat: 'yuv420p10le',
        audioCodec: 'aac',
      });

      expect(result.compatible).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('10-bit');
    });

    it('should warn when pixel format is 10-bit (10be)', () => {
      const result = service.checkPassthroughCompatibility({
        videoCodec: 'h264',
        pixelFormat: 'yuv422p10be',
        audioCodec: 'aac',
      });

      expect(result.compatible).toBe(false);
      expect(result.warnings[0]).toContain('10-bit');
    });

    it('should warn when audio codec is not aac', () => {
      const result = service.checkPassthroughCompatibility({
        videoCodec: 'h264',
        pixelFormat: 'yuv420p',
        audioCodec: 'opus',
      });

      expect(result.compatible).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('opus');
      expect(result.warnings[0]).toContain('not AAC');
    });

    it('should not warn for audio codec "none" (no audio track)', () => {
      const result = service.checkPassthroughCompatibility({
        videoCodec: 'h264',
        pixelFormat: 'yuv420p',
        audioCodec: 'none',
      });

      expect(result).toEqual({ compatible: true, warnings: [] });
    });

    it('should return multiple warnings for multiple incompatibilities', () => {
      const result = service.checkPassthroughCompatibility({
        videoCodec: 'vp9',
        pixelFormat: 'yuv420p10le',
        audioCodec: 'opus',
      });

      expect(result.compatible).toBe(false);
      expect(result.warnings).toHaveLength(3);
    });
  });

  describe('process lifecycle', () => {
    it('terminates every running process on shutdown', async () => {
      const first = createMockProcess();
      const second = createMockProcess();
      mockSpawn.mockReturnValueOnce(first as never).mockReturnValueOnce(second as never);

      await service.start(createStream({ id: 'stream-a' }));
      await service.start(createStream({ id: 'stream-b' }));

      await service.onModuleDestroy();

      expect(first.kill).toHaveBeenCalledWith('SIGTERM');
      expect(second.kill).toHaveBeenCalledWith('SIGTERM');
      expect(service.isRunning('stream-a')).toBe(false);
      expect(service.isRunning('stream-b')).toBe(false);
    });

    it('escalates to SIGKILL when the process ignores SIGTERM', async () => {
      jest.useFakeTimers();
      const stubborn = createMockProcess();
      stubborn.kill = jest.fn(); // never exits
      mockSpawn.mockReturnValue(stubborn as never);
      await service.start(createStream({ id: 'stream-hung' }));

      const stopped = service.stop('stream-hung');
      await jest.advanceTimersByTimeAsync(5_000);
      expect(stubborn.kill).toHaveBeenCalledWith('SIGKILL');

      await jest.advanceTimersByTimeAsync(2_000);
      await stopped;
      jest.useRealTimers();

      expect(service.isRunning('stream-hung')).toBe(false);
    });

    it('refuses to start more streams than the configured cap', async () => {
      mockSpawn.mockImplementation(() => createMockProcess() as never);

      for (let index = 0; index < 4; index += 1) {
        await service.start(createStream({ id: `stream-${index}` }));
      }

      await expect(service.start(createStream({ id: 'stream-over' }))).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
