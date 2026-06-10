import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';
import { eq } from 'drizzle-orm';
import { StreamHealthService } from './stream-health.service';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';
import { TranscodingPreset } from './transcoding-preset.enum';
import { FfmpegLiveService, LIVE_STREAM_PROCESS_EXITED } from './ffmpeg-live.service';
import { LIVE_STREAM_HEALTH_CHANGED } from './stream-health.event';
import { DRIZZLE } from '../db/database.constants';
import { organisations, liveStreams, type LiveStream, type NewLiveStream } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('StreamHealthService', () => {
  let service: StreamHealthService;
  let db: DrizzleDB;
  let ffmpegLiveService: Record<string, jest.Mock>;
  let eventEmitter: { emit: jest.Mock };

  let existsSyncSpy: jest.SpyInstance;
  let readdirSyncSpy: jest.SpyInstance;
  let statSyncSpy: jest.SpyInstance;

  let orgId: string;
  let streamId: string;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  async function seedStream(overrides: Partial<NewLiveStream> = {}): Promise<LiveStream> {
    const [stream] = await db
      .insert(liveStreams)
      .values({
        organisationId: orgId,
        name: 'Studio Camera',
        sourceUrl: 'rtmp://example.com/live/stream1',
        protocol: LiveStreamProtocol.Rtmp,
        status: LiveStreamStatus.Active,
        transcodingPreset: TranscodingPreset.High1080p,
        audioEnabled: true,
        ...overrides,
      })
      .returning();
    return stream;
  }

  beforeEach(async () => {
    await truncateAll();

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;

    ffmpegLiveService = {
      isRunning: jest.fn(),
      getHlsOutputDir: jest.fn().mockReturnValue('/tmp/signage-hls/stream'),
    };

    eventEmitter = { emit: jest.fn() };

    existsSyncSpy = jest.spyOn(fs, 'existsSync');
    readdirSyncSpy = jest.spyOn(fs, 'readdirSync');
    statSyncSpy = jest.spyOn(fs, 'statSync');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamHealthService,
        { provide: DRIZZLE, useValue: db },
        { provide: FfmpegLiveService, useValue: ffmpegLiveService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<StreamHealthService>(StreamHealthService);

    const stream = await seedStream();
    streamId = stream.id;
  });

  afterEach(() => {
    service.onModuleDestroy();
    existsSyncSpy.mockRestore();
    readdirSyncSpy.mockRestore();
    statSyncSpy.mockRestore();
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
      ffmpegLiveService.isRunning.mockReturnValue(true);
      existsSyncSpy.mockReturnValue(true);
      readdirSyncSpy.mockReturnValue(['index.m3u8']);

      await service.runHealthChecks();

      const health = service.getHealth(streamId);
      expect(health!.health).toBe('degraded');
    });

    it('should detect degraded when HLS directory does not exist', async () => {
      ffmpegLiveService.isRunning.mockReturnValue(true);
      existsSyncSpy.mockReturnValue(false);

      await service.runHealthChecks();

      const health = service.getHealth(streamId);
      expect(health!.health).toBe('degraded');
    });
  });

  describe('stopped detection', () => {
    it('should detect stopped health when process is not running', async () => {
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
      ffmpegLiveService.isRunning.mockReturnValue(false);

      // First check: detects stopped
      await service.runHealthChecks();
      eventEmitter.emit.mockClear();

      // Second check: still stopped — should not trigger fallback again
      await service.runHealthChecks();

      const processExitedCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === LIVE_STREAM_PROCESS_EXITED,
      );
      expect(processExitedCalls).toHaveLength(0);
    });
  });

  describe('dashboard event emission', () => {
    it('should emit dashboard event on degraded detection', async () => {
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
      ffmpegLiveService.isRunning.mockReturnValue(true);
      setupFreshSegments();

      await service.runHealthChecks();

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove health states for streams that are no longer active', async () => {
      // First check: stream is active
      ffmpegLiveService.isRunning.mockReturnValue(true);
      setupFreshSegments();

      await service.runHealthChecks();
      expect(service.getHealth(streamId)).toBeDefined();

      // Second check: stream no longer active (set idle in DB)
      await db
        .update(liveStreams)
        .set({ status: LiveStreamStatus.Idle })
        .where(eq(liveStreams.id, streamId));
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
      await seedStream({ name: 'Camera 2' });
      ffmpegLiveService.isRunning.mockReturnValue(true);
      ffmpegLiveService.getHlsOutputDir.mockReturnValue('/tmp/signage-hls/test');
      setupFreshSegments();

      await service.runHealthChecks();

      const states = service.getAllHealthStates();
      expect(states.size).toBe(2);
    });
  });
});
