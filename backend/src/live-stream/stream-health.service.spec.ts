import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';
import { StreamHealthService } from './stream-health.service';
import { LiveStream } from './live-stream.entity';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';
import { TranscodingPreset } from './transcoding-preset.enum';
import { FfmpegLiveService, LIVE_STREAM_PROCESS_EXITED } from './ffmpeg-live.service';
import { LIVE_STREAM_HEALTH_CHANGED } from './stream-health.event';
import { Organisation } from '../organisation/organisation.entity';

describe('StreamHealthService', () => {
  let service: StreamHealthService;
  let repository: Record<string, jest.Mock>;
  let ffmpegLiveService: Record<string, jest.Mock>;
  let eventEmitter: Record<string, jest.Mock>;

  let existsSyncSpy: jest.SpyInstance;
  let readdirSyncSpy: jest.SpyInstance;
  let statSyncSpy: jest.SpyInstance;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const streamId = '660e8400-e29b-41d4-a716-446655440000';
  const streamId2 = '660e8400-e29b-41d4-a716-446655440099';

  const mockStream: LiveStream = {
    id: streamId,
    organisationId: orgId,
    name: 'Studio Camera',
    sourceUrl: 'rtmp://example.com/live/stream1',
    protocol: LiveStreamProtocol.Rtmp,
    status: LiveStreamStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date(),
    transcodingPreset: TranscodingPreset.High1080p,
    audioEnabled: true,
    organisation: {} as Organisation,
  };

  beforeEach(async () => {
    jest.useFakeTimers();

    repository = {
      find: jest.fn().mockResolvedValue([]),
    };

    ffmpegLiveService = {
      isRunning: jest.fn(),
      getHlsOutputDir: jest.fn().mockReturnValue('/tmp/signage-hls/' + streamId),
    };

    eventEmitter = { emit: jest.fn() };

    existsSyncSpy = jest.spyOn(fs, 'existsSync');
    readdirSyncSpy = jest.spyOn(fs, 'readdirSync');
    statSyncSpy = jest.spyOn(fs, 'statSync');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamHealthService,
        { provide: getRepositoryToken(LiveStream), useValue: repository },
        { provide: FfmpegLiveService, useValue: ffmpegLiveService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<StreamHealthService>(StreamHealthService);
  });

  afterEach(() => {
    service.onModuleDestroy();
    existsSyncSpy.mockRestore();
    readdirSyncSpy.mockRestore();
    statSyncSpy.mockRestore();
    jest.useRealTimers();
  });

  function setupFreshSegments(): void {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(['segment0.ts', 'segment1.ts']);
    statSyncSpy.mockReturnValue({ mtimeMs: Date.now() - 5000 } as fs.Stats);
  }

  function setupStaleSegments(): void {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(['segment0.ts']);
    statSyncSpy.mockReturnValue({ mtimeMs: Date.now() - 30000 } as fs.Stats);
  }

  describe('healthy path', () => {
    it('should detect a healthy stream (process running + fresh segments)', async () => {
      repository.find.mockResolvedValue([mockStream]);
      ffmpegLiveService.isRunning.mockReturnValue(true);
      setupFreshSegments();

      await service.runHealthChecks();

      const health = service.getHealth(streamId);
      expect(health).toBeDefined();
      expect(health!.health).toBe('healthy');
      expect(health!.streamId).toBe(streamId);

      // Should NOT emit health event for healthy streams
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        LIVE_STREAM_HEALTH_CHANGED,
        expect.anything(),
      );
    });
  });

  describe('stale segment detection', () => {
    it('should detect degraded health when process running but segments are stale', async () => {
      repository.find.mockResolvedValue([mockStream]);
      ffmpegLiveService.isRunning.mockReturnValue(true);
      setupStaleSegments();

      await service.runHealthChecks();

      const health = service.getHealth(streamId);
      expect(health).toBeDefined();
      expect(health!.health).toBe('degraded');

      // Should emit health changed event for degraded
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        LIVE_STREAM_HEALTH_CHANGED,
        expect.objectContaining({
          streamId,
          streamName: 'Studio Camera',
          organisationId: orgId,
          health: 'degraded',
        }),
      );
    });

    it('should detect degraded when HLS directory has no .ts files', async () => {
      repository.find.mockResolvedValue([mockStream]);
      ffmpegLiveService.isRunning.mockReturnValue(true);
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue(['index.m3u8']);

      await service.runHealthChecks();

      const health = service.getHealth(streamId);
      expect(health!.health).toBe('degraded');
    });

    it('should detect degraded when HLS directory does not exist', async () => {
      repository.find.mockResolvedValue([mockStream]);
      ffmpegLiveService.isRunning.mockReturnValue(true);
      existsSyncSpy.mockReturnValue(false);

      await service.runHealthChecks();

      const health = service.getHealth(streamId);
      expect(health!.health).toBe('degraded');
    });
  });

  describe('stopped detection', () => {
    it('should detect stopped health when process is not running', async () => {
      repository.find.mockResolvedValue([mockStream]);
      ffmpegLiveService.isRunning.mockReturnValue(false);

      await service.runHealthChecks();

      const health = service.getHealth(streamId);
      expect(health).toBeDefined();
      expect(health!.health).toBe('stopped');

      // Should emit health changed event
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        LIVE_STREAM_HEALTH_CHANGED,
        expect.objectContaining({
          streamId,
          health: 'stopped',
        }),
      );

      // Should trigger unplanned exit fallback
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        LIVE_STREAM_PROCESS_EXITED,
        expect.objectContaining({
          streamId,
          exitCode: null,
        }),
      );
    });

    it('should not re-trigger fallback if already stopped on previous check', async () => {
      repository.find.mockResolvedValue([mockStream]);
      ffmpegLiveService.isRunning.mockReturnValue(false);

      // First check: detects stopped
      await service.runHealthChecks();
      eventEmitter.emit.mockClear();

      // Second check: still stopped — should not trigger fallback again
      repository.find.mockResolvedValue([mockStream]);
      await service.runHealthChecks();

      const processExitedCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === LIVE_STREAM_PROCESS_EXITED,
      );
      expect(processExitedCalls).toHaveLength(0);
    });
  });

  describe('dashboard event emission', () => {
    it('should emit dashboard event on degraded detection', async () => {
      repository.find.mockResolvedValue([mockStream]);
      ffmpegLiveService.isRunning.mockReturnValue(true);
      existsSyncSpy.mockReturnValue(false);

      await service.runHealthChecks();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        LIVE_STREAM_HEALTH_CHANGED,
        expect.objectContaining({
          streamId,
          streamName: 'Studio Camera',
          organisationId: orgId,
          health: 'degraded',
          checkedAt: expect.any(String),
        }),
      );
    });

    it('should emit dashboard event on stopped detection', async () => {
      repository.find.mockResolvedValue([mockStream]);
      ffmpegLiveService.isRunning.mockReturnValue(false);

      await service.runHealthChecks();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        LIVE_STREAM_HEALTH_CHANGED,
        expect.objectContaining({
          streamId,
          health: 'stopped',
        }),
      );
    });

    it('should not emit dashboard event when stream is healthy', async () => {
      repository.find.mockResolvedValue([mockStream]);
      ffmpegLiveService.isRunning.mockReturnValue(true);
      setupFreshSegments();

      await service.runHealthChecks();

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove health states for streams that are no longer active', async () => {
      // First check: stream is active
      repository.find.mockResolvedValue([mockStream]);
      ffmpegLiveService.isRunning.mockReturnValue(true);
      setupFreshSegments();

      await service.runHealthChecks();
      expect(service.getHealth(streamId)).toBeDefined();

      // Second check: stream no longer active
      repository.find.mockResolvedValue([]);
      await service.runHealthChecks();

      expect(service.getHealth(streamId)).toBeUndefined();
    });
  });

  describe('getHealth', () => {
    it('should return undefined for unknown stream', () => {
      expect(service.getHealth('unknown-id')).toBeUndefined();
    });
  });

  describe('getAllHealthStates', () => {
    it('should return all health states', async () => {
      const stream2 = { ...mockStream, id: streamId2, name: 'Camera 2' };
      repository.find.mockResolvedValue([mockStream, stream2]);
      ffmpegLiveService.isRunning.mockReturnValue(true);
      ffmpegLiveService.getHlsOutputDir.mockReturnValue('/tmp/signage-hls/test');
      setupFreshSegments();

      await service.runHealthChecks();

      const states = service.getAllHealthStates();
      expect(states.size).toBe(2);
    });
  });
});
