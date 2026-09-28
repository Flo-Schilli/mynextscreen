import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, BadGatewayException, ForbiddenException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { LiveStreamService } from './live-stream.service';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';
import { FfmpegLiveService } from './ffmpeg-live.service';
import { ScreenGroupService } from '../screen-group/screen-group.service';
import { LIVE_STREAM_STARTED } from '../screen/screen-state.event';
import { AUDIT_LIVE_STREAM_ACTIVATED } from '../audit-log/audit.events';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  screens,
  liveStreams,
  liveStreamActivations,
  type LiveStream,
  type NewLiveStream,
} from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import { OutboundGuard } from '../common/outbound-guard.service';

describe('LiveStreamService – activateStream', () => {
  let service: LiveStreamService;
  let db: DrizzleDB;
  let ffmpegLiveService: Record<string, jest.Mock>;
  let screenGroupService: { findOne: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  let orgId: string;
  let streamId: string;
  let screenId1: string;
  let screenId2: string;
  let otherStreamId: string;

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
        status: LiveStreamStatus.Idle,
        ...overrides,
      })
      .returning();
    return stream;
  }

  async function seedScreen(name: string): Promise<string> {
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: orgId,
        name,
        resolution: '1920x1080',
        location: 'Lobby',
        apiKeyHash: `hash-${name}`,
      })
      .returning();
    return screen.id;
  }

  let outbound: { assertUrl: jest.Mock };

  beforeEach(async () => {
    outbound = { assertUrl: jest.fn().mockResolvedValue(new URL('rtmp://example.com/live')) };
    await truncateAll();

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    screenId1 = await seedScreen('Screen 1');
    screenId2 = await seedScreen('Screen 2');

    const stream = await seedStream();
    streamId = stream.id;
    const other = await seedStream({ name: 'Other Camera', status: LiveStreamStatus.Active });
    otherStreamId = other.id;

    ffmpegLiveService = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      isRunning: jest.fn().mockReturnValue(false),
      getHlsOutputDir: jest.fn(),
    };

    screenGroupService = { findOne: jest.fn() };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveStreamService,
        { provide: DRIZZLE, useValue: db },
        { provide: FfmpegLiveService, useValue: ffmpegLiveService },
        { provide: ScreenGroupService, useValue: screenGroupService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: OutboundGuard, useValue: outbound },
      ],
    }).compile();

    service = module.get<LiveStreamService>(LiveStreamService);
  });

  describe('validation', () => {
    it('should throw BadRequestException when neither targetScreenIds nor targetGroupId is provided', async () => {
      await expect(service.activateStream(orgId, streamId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when both targetScreenIds and targetGroupId are provided', async () => {
      await expect(
        service.activateStream(orgId, streamId, {
          targetScreenIds: [screenId1],
          targetGroupId: '880e8400-e29b-41d4-a716-446655440000',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('screen resolution from group', () => {
    it('should resolve screen IDs from a target group', async () => {
      const groupId = '880e8400-e29b-41d4-a716-446655440000';
      screenGroupService.findOne.mockResolvedValue({
        id: groupId,
        organisationId: orgId,
        screens: [{ id: screenId1 }, { id: screenId2 }],
      });

      const result = await service.activateStream(orgId, streamId, {
        targetGroupId: groupId,
      });

      expect(screenGroupService.findOne).toHaveBeenCalledWith(orgId, groupId);
      expect(result.stream.status).toBe(LiveStreamStatus.Active);

      // Activation records created for the group's screens
      const activations = await db
        .select()
        .from(liveStreamActivations)
        .where(eq(liveStreamActivations.streamId, streamId));
      expect(activations.map((a) => a.screenId).sort()).toEqual([screenId1, screenId2].sort());
    });

    it('should throw BadRequestException when group has no screens', async () => {
      const groupId = '880e8400-e29b-41d4-a716-446655440000';
      screenGroupService.findOne.mockResolvedValue({
        id: groupId,
        organisationId: orgId,
        screens: [],
      });

      await expect(
        service.activateStream(orgId, streamId, { targetGroupId: groupId }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('screen validation', () => {
    it('should throw ForbiddenException when screen does not belong to org', async () => {
      const foreignScreenId = '770e8400-e29b-41d4-a716-446655440099';

      await expect(
        service.activateStream(orgId, streamId, {
          targetScreenIds: [foreignScreenId],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('FFmpeg start failure', () => {
    it('should throw BadGatewayException when FFmpeg start fails and not update stream status', async () => {
      ffmpegLiveService.start.mockRejectedValue(new Error('FFmpeg binary not found'));

      await expect(
        service.activateStream(orgId, streamId, {
          targetScreenIds: [screenId1],
        }),
      ).rejects.toThrow(BadGatewayException);

      // Stream status should NOT have been updated
      const [row] = await db.select().from(liveStreams).where(eq(liveStreams.id, streamId));
      expect(row.status).toBe(LiveStreamStatus.Idle);
    });
  });

  describe('duplicate override handling', () => {
    it('should deactivate previous stream when screen is already overridden', async () => {
      // Screen already has an activation from another stream (its only screen)
      await db
        .insert(liveStreamActivations)
        .values([{ streamId: otherStreamId, screenId: screenId1 }]);

      await service.activateStream(orgId, streamId, {
        targetScreenIds: [screenId1],
      });

      // The new stream now owns the screen
      const newActivations = await db
        .select()
        .from(liveStreamActivations)
        .where(eq(liveStreamActivations.streamId, streamId));
      expect(newActivations).toHaveLength(1);
      expect(newActivations[0].screenId).toBe(screenId1);

      // The other stream lost all its screens — stopped and set idle
      expect(ffmpegLiveService.stop).toHaveBeenCalledWith(otherStreamId);
      const [other] = await db.select().from(liveStreams).where(eq(liveStreams.id, otherStreamId));
      expect(other.status).toBe(LiveStreamStatus.Idle);
    });

    it('should not stop other stream if it still has remaining screens', async () => {
      // Other stream owns screenId1 (overridden) AND screenId2 (remaining)
      await db.insert(liveStreamActivations).values([
        { streamId: otherStreamId, screenId: screenId1 },
        { streamId: otherStreamId, screenId: screenId2 },
      ]);

      await service.activateStream(orgId, streamId, {
        targetScreenIds: [screenId1],
      });

      // Other stream still has screenId2 → not stopped, stays active
      expect(ffmpegLiveService.stop).not.toHaveBeenCalledWith(otherStreamId);
      const [other] = await db.select().from(liveStreams).where(eq(liveStreams.id, otherStreamId));
      expect(other.status).toBe(LiveStreamStatus.Active);
    });
  });

  describe('successful activation', () => {
    it('should activate stream with target screen IDs', async () => {
      const result = await service.activateStream(orgId, streamId, {
        targetScreenIds: [screenId1, screenId2],
      });

      expect(ffmpegLiveService.start).toHaveBeenCalledWith(
        expect.objectContaining({ id: streamId }),
      );

      const activations = await db
        .select()
        .from(liveStreamActivations)
        .where(eq(liveStreamActivations.streamId, streamId));
      expect(activations.map((a) => a.screenId).sort()).toEqual([screenId1, screenId2].sort());
      expect(result.stream.status).toBe(LiveStreamStatus.Active);
    });

    it('should emit SSE events to all target screens', async () => {
      await service.activateStream(orgId, streamId, {
        targetScreenIds: [screenId1, screenId2],
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        LIVE_STREAM_STARTED,
        expect.objectContaining({ screenId: screenId1, organisationId: orgId }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        LIVE_STREAM_STARTED,
        expect.objectContaining({ screenId: screenId2, organisationId: orgId }),
      );
    });

    it('should emit audit event with stream details', async () => {
      await service.activateStream(
        orgId,
        streamId,
        {
          targetScreenIds: [screenId1],
        },
        'user-123',
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_LIVE_STREAM_ACTIVATED,
        expect.objectContaining({
          streamId,
          organisationId: orgId,
          userId: 'user-123',
          details: expect.objectContaining({
            streamId,
            streamName: 'Studio Camera',
            targetScreenIds: [screenId1],
          }),
        }),
      );
    });
  });

  describe('source address check', () => {
    it('refuses to start a stream whose source resolves internally', async () => {
      const stream = await seedStream();
      outbound.assertUrl.mockRejectedValue(new Error('Host resolves to a private address'));

      await expect(
        service.activateStream(orgId, stream.id, { targetScreenIds: [screenId1] }),
      ).rejects.toThrow(BadRequestException);

      expect(ffmpegLiveService.start).not.toHaveBeenCalled();
    });
  });
});
