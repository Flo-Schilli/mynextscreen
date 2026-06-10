import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { LiveStreamService } from './live-stream.service';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';
import { FfmpegLiveService, LiveStreamProcessExitedEvent } from './ffmpeg-live.service';
import { ScreenGroupService } from '../screen-group/screen-group.service';
import { LIVE_STREAM_STOPPED } from '../screen/screen-state.event';
import {
  AUDIT_LIVE_STREAM_CREATED,
  AUDIT_LIVE_STREAM_UPDATED,
  AUDIT_LIVE_STREAM_DELETED,
  AUDIT_LIVE_STREAM_ACTIVATED,
  AUDIT_LIVE_STREAM_DEACTIVATED,
  AUDIT_LIVE_STREAM_FAILED,
} from '../audit-log/audit.events';
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

describe('LiveStreamService', () => {
  let service: LiveStreamService;
  let db: DrizzleDB;
  let ffmpegLiveService: Record<string, jest.Mock>;
  let screenGroupService: { findOne: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const userId = '880e8400-e29b-41d4-a716-446655440000';

  let orgId: string;
  let screenId1: string;
  let screenId2: string;

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

  beforeEach(async () => {
    await truncateAll();

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    screenId1 = await seedScreen('Screen 1');
    screenId2 = await seedScreen('Screen 2');

    ffmpegLiveService = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      isRunning: jest.fn().mockReturnValue(false),
      probeSourceStream: jest.fn(),
      checkPassthroughCompatibility: jest.fn(),
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
      ],
    }).compile();

    service = module.get<LiveStreamService>(LiveStreamService);
  });

  describe('createLiveStream', () => {
    it('should create and persist a new live stream', async () => {
      const dto = {
        name: 'Studio Camera',
        sourceUrl: 'rtmp://example.com/live/stream1',
        protocol: LiveStreamProtocol.Rtmp,
      };

      const result = await service.createLiveStream(orgId, dto);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Studio Camera');
      expect(result.organisationId).toBe(orgId);

      const rows = await db.select().from(liveStreams).where(eq(liveStreams.id, result.id));
      expect(rows).toHaveLength(1);
      expect(rows[0].sourceUrl).toBe('rtmp://example.com/live/stream1');
    });

    it('should emit audit event on creation', async () => {
      const dto = {
        name: 'Studio Camera',
        sourceUrl: 'rtmp://example.com/live/stream1',
        protocol: LiveStreamProtocol.Rtmp,
      };

      const created = await service.createLiveStream(orgId, dto, userId);

      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_CREATED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1]).toMatchObject({
        streamId: created.id,
        organisationId: orgId,
        userId,
        details: {
          streamId: created.id,
          streamName: 'Studio Camera',
          sourceUrl: 'rtmp://example.com/live/stream1',
          protocol: LiveStreamProtocol.Rtmp,
        },
      });
    });
  });

  describe('updateLiveStream', () => {
    it('should update an idle stream', async () => {
      const stream = await seedStream();

      const result = await service.updateLiveStream(orgId, stream.id, { name: 'Updated Camera' });

      expect(result.name).toBe('Updated Camera');
      const [row] = await db.select().from(liveStreams).where(eq(liveStreams.id, stream.id));
      expect(row.name).toBe('Updated Camera');
    });

    it('should throw ConflictException when updating an active stream', async () => {
      const stream = await seedStream({ status: LiveStreamStatus.Active });

      await expect(
        service.updateLiveStream(orgId, stream.id, { name: 'New Name' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when stream does not exist', async () => {
      await expect(
        service.updateLiveStream(orgId, '00000000-0000-0000-0000-000000000000', {
          name: 'New Name',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should emit audit event on update', async () => {
      const stream = await seedStream();

      await service.updateLiveStream(orgId, stream.id, { name: 'Updated Camera' }, userId);

      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_UPDATED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1]).toMatchObject({
        streamId: stream.id,
        organisationId: orgId,
        userId,
        details: {
          streamId: stream.id,
          streamName: 'Updated Camera',
          sourceUrl: stream.sourceUrl,
          protocol: stream.protocol,
        },
      });
    });
  });

  describe('removeLiveStream', () => {
    it('should remove an idle stream', async () => {
      const stream = await seedStream();

      await service.removeLiveStream(orgId, stream.id);

      const rows = await db.select().from(liveStreams).where(eq(liveStreams.id, stream.id));
      expect(rows).toHaveLength(0);
    });

    it('should throw ConflictException when deleting an active stream', async () => {
      const stream = await seedStream({ status: LiveStreamStatus.Active });

      await expect(service.removeLiveStream(orgId, stream.id)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when stream does not exist', async () => {
      await expect(
        service.removeLiveStream(orgId, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should emit audit event on deletion', async () => {
      const stream = await seedStream();

      await service.removeLiveStream(orgId, stream.id, userId);

      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_DELETED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1]).toMatchObject({
        streamId: stream.id,
        organisationId: orgId,
        userId,
        details: {
          streamId: stream.id,
          streamName: 'Studio Camera',
          sourceUrl: 'rtmp://example.com/live/stream1',
          protocol: LiveStreamProtocol.Rtmp,
        },
      });
    });
  });

  describe('activateStream', () => {
    it('should emit audit event with protocol and targetScreenIds on activation', async () => {
      const stream = await seedStream();
      const dto = { targetScreenIds: [screenId1, screenId2] };

      await service.activateStream(orgId, stream.id, dto, userId);

      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_ACTIVATED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1].details).toMatchObject({
        streamId: stream.id,
        streamName: 'Studio Camera',
        protocol: LiveStreamProtocol.Rtmp,
        targetScreenIds: [screenId1, screenId2],
      });
      expect(auditCalls[0][1].details.targetGroupId).toBeUndefined();
    });

    it('should include targetGroupId in audit event when activating via group', async () => {
      const stream = await seedStream();
      const groupId = '990e8400-e29b-41d4-a716-446655440000';
      const dto = { targetGroupId: groupId };

      screenGroupService.findOne.mockResolvedValue({
        id: groupId,
        organisationId: orgId,
        screens: [{ id: screenId1 }],
      });

      await service.activateStream(orgId, stream.id, dto, userId);

      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_ACTIVATED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1].details).toMatchObject({
        streamId: stream.id,
        streamName: 'Studio Camera',
        protocol: LiveStreamProtocol.Rtmp,
        targetScreenIds: [screenId1],
        targetGroupId: groupId,
      });
    });
  });

  describe('deactivateStream', () => {
    it('should deactivate an active stream and send stop events', async () => {
      const stream = await seedStream({ status: LiveStreamStatus.Active });
      await db.insert(liveStreamActivations).values([
        { streamId: stream.id, screenId: screenId1 },
        { streamId: stream.id, screenId: screenId2 },
      ]);

      const result = await service.deactivateStream(orgId, stream.id);

      expect(ffmpegLiveService.stop).toHaveBeenCalledWith(stream.id);
      expect(result.status).toBe(LiveStreamStatus.Idle);

      const remaining = await db
        .select()
        .from(liveStreamActivations)
        .where(eq(liveStreamActivations.streamId, stream.id));
      expect(remaining).toHaveLength(0);

      // Should emit LIVE_STREAM_STOPPED for each screen
      const stopCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === LIVE_STREAM_STOPPED,
      );
      expect(stopCalls).toHaveLength(2);

      // Should emit audit event
      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_DEACTIVATED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1].details.reason).toBe('manual');
    });

    it('should deactivate with no active targets (no-targets edge case)', async () => {
      const stream = await seedStream({ status: LiveStreamStatus.Active });

      const result = await service.deactivateStream(orgId, stream.id);

      expect(ffmpegLiveService.stop).toHaveBeenCalledWith(stream.id);
      expect(result.status).toBe(LiveStreamStatus.Idle);

      // No stop events emitted since there are no targets
      const stopCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === LIVE_STREAM_STOPPED,
      );
      expect(stopCalls).toHaveLength(0);

      // Audit event should still be emitted
      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_DEACTIVATED,
      );
      expect(auditCalls).toHaveLength(1);
    });
  });

  describe('handleUnplannedExit', () => {
    it('should set status to error and send stop events on unplanned exit', async () => {
      const stream = await seedStream({ status: LiveStreamStatus.Active });
      await db.insert(liveStreamActivations).values([{ streamId: stream.id, screenId: screenId1 }]);

      const event = new LiveStreamProcessExitedEvent(stream.id, 1);
      await service.handleUnplannedExit(event);

      const [row] = await db.select().from(liveStreams).where(eq(liveStreams.id, stream.id));
      expect(row.status).toBe(LiveStreamStatus.Error);

      const remaining = await db
        .select()
        .from(liveStreamActivations)
        .where(eq(liveStreamActivations.streamId, stream.id));
      expect(remaining).toHaveLength(0);

      // Should emit LIVE_STREAM_STOPPED for each screen
      const stopCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === LIVE_STREAM_STOPPED,
      );
      expect(stopCalls).toHaveLength(1);

      // Should emit audit failed event
      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_FAILED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1].details.reason).toBe('source_disconnected');
      expect(auditCalls[0][1].details.exitCode).toBe(1);
    });

    it('should gracefully handle a deleted stream on unplanned exit', async () => {
      const event = new LiveStreamProcessExitedEvent('00000000-0000-0000-0000-000000000000', 1);
      await service.handleUnplannedExit(event);

      // Should not throw, should not emit any events
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
