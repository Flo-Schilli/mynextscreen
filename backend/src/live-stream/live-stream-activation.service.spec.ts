import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  BadGatewayException,
  ForbiddenException,
} from '@nestjs/common';
import { LiveStreamService } from './live-stream.service';
import { LiveStream } from './live-stream.entity';
import { LiveStreamActivation } from './live-stream-activation.entity';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';
import { FfmpegLiveService } from './ffmpeg-live.service';
import { ScreenGroupService } from '../screen-group/screen-group.service';
import { Screen } from '../screen/screen.entity';
import { LIVE_STREAM_STARTED } from '../screen/screen-state.event';
import { AUDIT_LIVE_STREAM_ACTIVATED } from '../audit-log/audit.events';

describe('LiveStreamService – activateStream', () => {
  let service: LiveStreamService;
  let liveStreamRepo: Record<string, jest.Mock>;
  let activationRepo: Record<string, jest.Mock>;
  let screenRepo: Record<string, jest.Mock>;
  let ffmpegLiveService: Record<string, jest.Mock>;
  let screenGroupService: Record<string, jest.Mock>;
  let eventEmitter: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const streamId = '660e8400-e29b-41d4-a716-446655440000';
  const screenId1 = '770e8400-e29b-41d4-a716-446655440001';
  const screenId2 = '770e8400-e29b-41d4-a716-446655440002';
  const groupId = '880e8400-e29b-41d4-a716-446655440000';
  const otherStreamId = '990e8400-e29b-41d4-a716-446655440000';

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

  const mockScreens: Partial<Screen>[] = [
    { id: screenId1, organisationId: orgId, name: 'Screen 1' },
    { id: screenId2, organisationId: orgId, name: 'Screen 2' },
  ];

  beforeEach(async () => {
    liveStreamRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
    };

    activationRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
      remove: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(0),
    };

    screenRepo = {
      find: jest.fn().mockResolvedValue(mockScreens),
    };

    ffmpegLiveService = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      isRunning: jest.fn().mockReturnValue(false),
      getHlsOutputDir: jest.fn(),
    };

    screenGroupService = {
      findOne: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveStreamService,
        { provide: getRepositoryToken(LiveStream), useValue: liveStreamRepo },
        {
          provide: getRepositoryToken(LiveStreamActivation),
          useValue: activationRepo,
        },
        { provide: getRepositoryToken(Screen), useValue: screenRepo },
        { provide: FfmpegLiveService, useValue: ffmpegLiveService },
        { provide: ScreenGroupService, useValue: screenGroupService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<LiveStreamService>(LiveStreamService);
  });

  describe('validation', () => {
    it('should throw BadRequestException when neither targetScreenIds nor targetGroupId is provided', async () => {
      liveStreamRepo.findOne.mockResolvedValue({ ...mockStream });

      await expect(service.activateStream(orgId, streamId, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when both targetScreenIds and targetGroupId are provided', async () => {
      liveStreamRepo.findOne.mockResolvedValue({ ...mockStream });

      await expect(
        service.activateStream(orgId, streamId, {
          targetScreenIds: [screenId1],
          targetGroupId: groupId,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('screen resolution from group', () => {
    it('should resolve screen IDs from a target group', async () => {
      liveStreamRepo.findOne.mockResolvedValue({ ...mockStream });
      liveStreamRepo.save.mockResolvedValue({
        ...mockStream,
        status: LiveStreamStatus.Active,
      });

      screenGroupService.findOne.mockResolvedValue({
        id: groupId,
        organisationId: orgId,
        screens: mockScreens,
      });

      const result = await service.activateStream(orgId, streamId, {
        targetGroupId: groupId,
      });

      expect(screenGroupService.findOne).toHaveBeenCalledWith(orgId, groupId);
      expect(screenRepo.find).toHaveBeenCalledWith({
        where: {
          id: expect.anything(),
          organisationId: orgId,
        },
      });
      expect(result.stream.status).toBe(LiveStreamStatus.Active);
    });

    it('should throw BadRequestException when group has no screens', async () => {
      liveStreamRepo.findOne.mockResolvedValue({ ...mockStream });

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
      liveStreamRepo.findOne.mockResolvedValue({ ...mockStream });
      screenRepo.find.mockResolvedValue([]); // no screens found

      await expect(
        service.activateStream(orgId, streamId, {
          targetScreenIds: [foreignScreenId],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('FFmpeg start failure', () => {
    it('should throw BadGatewayException when FFmpeg start fails and not update stream status', async () => {
      liveStreamRepo.findOne.mockResolvedValue({ ...mockStream });
      screenRepo.find.mockResolvedValue([mockScreens[0]]);
      ffmpegLiveService.start.mockRejectedValue(
        new Error('FFmpeg binary not found'),
      );

      await expect(
        service.activateStream(orgId, streamId, {
          targetScreenIds: [screenId1],
        }),
      ).rejects.toThrow(BadGatewayException);

      // Stream status should NOT have been updated
      expect(liveStreamRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('duplicate override handling', () => {
    it('should deactivate previous stream when screen is already overridden', async () => {
      liveStreamRepo.findOne.mockResolvedValue({ ...mockStream });
      liveStreamRepo.save.mockResolvedValue({
        ...mockStream,
        status: LiveStreamStatus.Active,
      });
      screenRepo.find.mockResolvedValue([mockScreens[0]]);

      // Screen already has an activation from another stream
      const existingActivation = {
        id: 'existing-activation-id',
        streamId: otherStreamId,
        screenId: screenId1,
        activatedAt: new Date(),
      };
      activationRepo.find.mockResolvedValue([existingActivation]);
      activationRepo.count.mockResolvedValue(0); // other stream has no remaining screens

      await service.activateStream(orgId, streamId, {
        targetScreenIds: [screenId1],
      });

      // Should remove existing activations
      expect(activationRepo.remove).toHaveBeenCalledWith([existingActivation]);

      // Should stop the other stream since it has no remaining screens
      expect(ffmpegLiveService.stop).toHaveBeenCalledWith(otherStreamId);
      expect(liveStreamRepo.update).toHaveBeenCalledWith(otherStreamId, {
        status: LiveStreamStatus.Idle,
      });
    });

    it('should not stop other stream if it still has remaining screens', async () => {
      liveStreamRepo.findOne.mockResolvedValue({ ...mockStream });
      liveStreamRepo.save.mockResolvedValue({
        ...mockStream,
        status: LiveStreamStatus.Active,
      });
      screenRepo.find.mockResolvedValue([mockScreens[0]]);

      const existingActivation = {
        id: 'existing-activation-id',
        streamId: otherStreamId,
        screenId: screenId1,
        activatedAt: new Date(),
      };
      activationRepo.find.mockResolvedValue([existingActivation]);
      activationRepo.count.mockResolvedValue(2); // other stream still has 2 remaining screens

      await service.activateStream(orgId, streamId, {
        targetScreenIds: [screenId1],
      });

      expect(activationRepo.remove).toHaveBeenCalledWith([existingActivation]);
      expect(ffmpegLiveService.stop).not.toHaveBeenCalledWith(otherStreamId);
      expect(liveStreamRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('successful activation', () => {
    it('should activate stream with target screen IDs', async () => {
      liveStreamRepo.findOne.mockResolvedValue({ ...mockStream });
      const activeStream = { ...mockStream, status: LiveStreamStatus.Active };
      liveStreamRepo.save.mockResolvedValue(activeStream);

      const result = await service.activateStream(orgId, streamId, {
        targetScreenIds: [screenId1, screenId2],
      });

      expect(ffmpegLiveService.start).toHaveBeenCalledWith(
        expect.objectContaining({ id: streamId }),
      );
      expect(activationRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            streamId,
            screenId: screenId1,
          }),
          expect.objectContaining({
            streamId,
            screenId: screenId2,
          }),
        ]),
      );
      expect(result.stream.status).toBe(LiveStreamStatus.Active);
    });

    it('should emit SSE events to all target screens', async () => {
      liveStreamRepo.findOne.mockResolvedValue({ ...mockStream });
      liveStreamRepo.save.mockResolvedValue({
        ...mockStream,
        status: LiveStreamStatus.Active,
      });

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
      liveStreamRepo.findOne.mockResolvedValue({ ...mockStream });
      liveStreamRepo.save.mockResolvedValue({
        ...mockStream,
        status: LiveStreamStatus.Active,
      });
      screenRepo.find.mockResolvedValue([mockScreens[0]]);

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
});
