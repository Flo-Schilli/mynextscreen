import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LiveStreamService } from './live-stream.service';
import { LiveStream } from './live-stream.entity';
import { LiveStreamActivation } from './live-stream-activation.entity';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';
import { FfmpegLiveService, LiveStreamProcessExitedEvent } from './ffmpeg-live.service';
import { ScreenGroupService } from '../screen-group/screen-group.service';
import { Screen } from '../screen/screen.entity';
import { LIVE_STREAM_STOPPED } from '../screen/screen-state.event';
import {
  AUDIT_LIVE_STREAM_CREATED,
  AUDIT_LIVE_STREAM_UPDATED,
  AUDIT_LIVE_STREAM_DELETED,
  AUDIT_LIVE_STREAM_ACTIVATED,
  AUDIT_LIVE_STREAM_DEACTIVATED,
  AUDIT_LIVE_STREAM_FAILED,
} from '../audit-log/audit.events';

describe('LiveStreamService', () => {
  let service: LiveStreamService;
  let repository: Record<string, jest.Mock>;
  let activationRepository: Record<string, jest.Mock>;
  let ffmpegLiveService: Record<string, jest.Mock>;
  let eventEmitter: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '880e8400-e29b-41d4-a716-446655440000';
  const streamId = '660e8400-e29b-41d4-a716-446655440000';
  const screenId1 = '770e8400-e29b-41d4-a716-446655440001';
  const screenId2 = '770e8400-e29b-41d4-a716-446655440002';

  const mockStream: LiveStream = {
    id: streamId,
    organisationId: orgId,
    name: 'Studio Camera',
    sourceUrl: 'rtmp://example.com/live/stream1',
    protocol: LiveStreamProtocol.Rtmp,
    status: LiveStreamStatus.Idle,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as LiveStream;

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };

    activationRepository = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };

    ffmpegLiveService = {
      start: jest.fn(),
      stop: jest.fn(),
      isRunning: jest.fn(),
    };

    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveStreamService,
        { provide: getRepositoryToken(LiveStream), useValue: repository },
        {
          provide: getRepositoryToken(LiveStreamActivation),
          useValue: activationRepository,
        },
        {
          provide: getRepositoryToken(Screen),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: FfmpegLiveService,
          useValue: ffmpegLiveService,
        },
        { provide: ScreenGroupService, useValue: { findOne: jest.fn() } },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<LiveStreamService>(LiveStreamService);
  });

  describe('createLiveStream', () => {
    it('should create and return a new live stream', async () => {
      const dto = {
        name: 'Studio Camera',
        sourceUrl: 'rtmp://example.com/live/stream1',
        protocol: LiveStreamProtocol.Rtmp,
      };
      repository.create.mockReturnValue(mockStream);
      repository.save.mockResolvedValue(mockStream);

      const result = await service.createLiveStream(orgId, dto);

      expect(repository.create).toHaveBeenCalledWith({
        ...dto,
        organisationId: orgId,
      });
      expect(repository.save).toHaveBeenCalledWith(mockStream);
      expect(result).toEqual(mockStream);
    });

    it('should emit audit event on creation', async () => {
      const dto = {
        name: 'Studio Camera',
        sourceUrl: 'rtmp://example.com/live/stream1',
        protocol: LiveStreamProtocol.Rtmp,
      };
      repository.create.mockReturnValue(mockStream);
      repository.save.mockResolvedValue(mockStream);

      await service.createLiveStream(orgId, dto, userId);

      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_CREATED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1]).toMatchObject({
        streamId: mockStream.id,
        organisationId: orgId,
        userId,
        details: {
          streamId: mockStream.id,
          streamName: 'Studio Camera',
          sourceUrl: 'rtmp://example.com/live/stream1',
          protocol: LiveStreamProtocol.Rtmp,
        },
      });
    });
  });

  describe('updateLiveStream', () => {
    it('should update an idle stream', async () => {
      const dto = { name: 'Updated Camera' };
      const updated = { ...mockStream, name: 'Updated Camera' };
      repository.findOne.mockResolvedValue({ ...mockStream });
      repository.save.mockResolvedValue(updated);

      const result = await service.updateLiveStream(orgId, streamId, dto);

      expect(result).toEqual(updated);
    });

    it('should throw ConflictException when updating an active stream', async () => {
      const activeStream = { ...mockStream, status: LiveStreamStatus.Active };
      repository.findOne.mockResolvedValue(activeStream);

      await expect(service.updateLiveStream(orgId, streamId, { name: 'New Name' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when stream does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.updateLiveStream(orgId, streamId, { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should emit audit event on update', async () => {
      const dto = { name: 'Updated Camera' };
      const updated = { ...mockStream, name: 'Updated Camera' };
      repository.findOne.mockResolvedValue({ ...mockStream });
      repository.save.mockResolvedValue(updated);

      await service.updateLiveStream(orgId, streamId, dto, userId);

      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_UPDATED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1]).toMatchObject({
        streamId,
        organisationId: orgId,
        userId,
        details: {
          streamId,
          streamName: 'Updated Camera',
          sourceUrl: updated.sourceUrl,
          protocol: updated.protocol,
        },
      });
    });
  });

  describe('removeLiveStream', () => {
    it('should remove an idle stream', async () => {
      repository.findOne.mockResolvedValue({ ...mockStream });
      repository.remove.mockResolvedValue(undefined);

      await service.removeLiveStream(orgId, streamId);

      expect(repository.remove).toHaveBeenCalled();
    });

    it('should throw ConflictException when deleting an active stream', async () => {
      const activeStream = { ...mockStream, status: LiveStreamStatus.Active };
      repository.findOne.mockResolvedValue(activeStream);

      await expect(service.removeLiveStream(orgId, streamId)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when stream does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.removeLiveStream(orgId, streamId)).rejects.toThrow(NotFoundException);
    });

    it('should emit audit event on deletion', async () => {
      repository.findOne.mockResolvedValue({ ...mockStream });
      repository.remove.mockResolvedValue(undefined);

      await service.removeLiveStream(orgId, streamId, userId);

      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_DELETED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1]).toMatchObject({
        streamId,
        organisationId: orgId,
        userId,
        details: {
          streamId,
          streamName: 'Studio Camera',
          sourceUrl: 'rtmp://example.com/live/stream1',
          protocol: LiveStreamProtocol.Rtmp,
        },
      });
    });
  });

  describe('activateStream', () => {
    it('should emit audit event with protocol and targetScreenIds on activation', async () => {
      const dto = { targetScreenIds: [screenId1, screenId2] };
      repository.findOne.mockResolvedValue({ ...mockStream });
      repository.save.mockResolvedValue({
        ...mockStream,
        status: LiveStreamStatus.Active,
      });

      // Mock screen validation
      const module = await Test.createTestingModule({
        providers: [
          LiveStreamService,
          { provide: getRepositoryToken(LiveStream), useValue: repository },
          {
            provide: getRepositoryToken(LiveStreamActivation),
            useValue: activationRepository,
          },
          {
            provide: getRepositoryToken(Screen),
            useValue: {
              find: jest.fn().mockResolvedValue([
                { id: screenId1, organisationId: orgId },
                { id: screenId2, organisationId: orgId },
              ]),
            },
          },
          { provide: FfmpegLiveService, useValue: ffmpegLiveService },
          { provide: ScreenGroupService, useValue: { findOne: jest.fn() } },
          { provide: EventEmitter2, useValue: eventEmitter },
        ],
      }).compile();

      const svc = module.get<LiveStreamService>(LiveStreamService);
      await svc.activateStream(orgId, streamId, dto, userId);

      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_ACTIVATED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1].details).toMatchObject({
        streamId,
        streamName: 'Studio Camera',
        protocol: LiveStreamProtocol.Rtmp,
        targetScreenIds: [screenId1, screenId2],
      });
      expect(auditCalls[0][1].details.targetGroupId).toBeUndefined();
    });

    it('should include targetGroupId in audit event when activating via group', async () => {
      const groupId = '990e8400-e29b-41d4-a716-446655440000';
      const dto = { targetGroupId: groupId };
      repository.findOne.mockResolvedValue({ ...mockStream });
      repository.save.mockResolvedValue({
        ...mockStream,
        status: LiveStreamStatus.Active,
      });

      const mockGroupService = {
        findOne: jest.fn().mockResolvedValue({
          id: groupId,
          screens: [{ id: screenId1 }],
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          LiveStreamService,
          { provide: getRepositoryToken(LiveStream), useValue: repository },
          {
            provide: getRepositoryToken(LiveStreamActivation),
            useValue: activationRepository,
          },
          {
            provide: getRepositoryToken(Screen),
            useValue: {
              find: jest.fn().mockResolvedValue([{ id: screenId1, organisationId: orgId }]),
            },
          },
          { provide: FfmpegLiveService, useValue: ffmpegLiveService },
          { provide: ScreenGroupService, useValue: mockGroupService },
          { provide: EventEmitter2, useValue: eventEmitter },
        ],
      }).compile();

      const svc = module.get<LiveStreamService>(LiveStreamService);
      await svc.activateStream(orgId, streamId, dto, userId);

      const auditCalls = eventEmitter.emit.mock.calls.filter(
        (c: unknown[]) => c[0] === AUDIT_LIVE_STREAM_ACTIVATED,
      );
      expect(auditCalls).toHaveLength(1);
      expect(auditCalls[0][1].details).toMatchObject({
        streamId,
        streamName: 'Studio Camera',
        protocol: LiveStreamProtocol.Rtmp,
        targetScreenIds: [screenId1],
        targetGroupId: groupId,
      });
    });
  });

  describe('deactivateStream', () => {
    it('should deactivate an active stream and send stop events', async () => {
      const activeStream = {
        ...mockStream,
        status: LiveStreamStatus.Active,
      };
      repository.findOne.mockResolvedValue(activeStream);
      repository.save.mockResolvedValue({
        ...activeStream,
        status: LiveStreamStatus.Idle,
      });

      const activations = [
        { id: 'a1', streamId, screenId: screenId1, activatedAt: new Date() },
        { id: 'a2', streamId, screenId: screenId2, activatedAt: new Date() },
      ];
      activationRepository.find.mockResolvedValue(activations);
      activationRepository.remove.mockResolvedValue(undefined);

      const result = await service.deactivateStream(orgId, streamId);

      expect(ffmpegLiveService.stop).toHaveBeenCalledWith(streamId);
      expect(activationRepository.remove).toHaveBeenCalledWith(activations);
      expect(result.status).toBe(LiveStreamStatus.Idle);

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
      const activeStream = {
        ...mockStream,
        status: LiveStreamStatus.Active,
      };
      repository.findOne.mockResolvedValue(activeStream);
      repository.save.mockResolvedValue({
        ...activeStream,
        status: LiveStreamStatus.Idle,
      });

      // No activations — all screens were already overridden by another stream
      activationRepository.find.mockResolvedValue([]);

      const result = await service.deactivateStream(orgId, streamId);

      expect(ffmpegLiveService.stop).toHaveBeenCalledWith(streamId);
      expect(activationRepository.remove).not.toHaveBeenCalled();
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
      const activeStream = {
        ...mockStream,
        status: LiveStreamStatus.Active,
      };
      repository.findOne.mockResolvedValue(activeStream);
      repository.save.mockResolvedValue({
        ...activeStream,
        status: LiveStreamStatus.Error,
      });

      const activations = [{ id: 'a1', streamId, screenId: screenId1, activatedAt: new Date() }];
      activationRepository.find.mockResolvedValue(activations);
      activationRepository.remove.mockResolvedValue(undefined);

      const event = new LiveStreamProcessExitedEvent(streamId, 1);
      await service.handleUnplannedExit(event);

      expect(activationRepository.remove).toHaveBeenCalledWith(activations);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: LiveStreamStatus.Error }),
      );

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
      repository.findOne.mockResolvedValue(null);

      const event = new LiveStreamProcessExitedEvent(streamId, 1);
      await service.handleUnplannedExit(event);

      // Should not throw, should not emit any events
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
