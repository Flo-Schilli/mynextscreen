import { Test, TestingModule } from '@nestjs/testing';
import { LiveStreamController } from './live-stream.controller';
import { LiveStreamService } from './live-stream.service';
import { FfmpegLiveService } from './ffmpeg-live.service';
import { StreamHealthService } from './stream-health.service';
import { LiveStream } from './live-stream.entity';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';
import { Organisation } from '../organisation/organisation.entity';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { BadGatewayException, ConflictException } from '@nestjs/common';

describe('LiveStreamController', () => {
  let controller: LiveStreamController;
  let service: Record<string, jest.Mock>;
  let streamHealthService: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '880e8400-e29b-41d4-a716-446655440000';
  const streamId = '660e8400-e29b-41d4-a716-446655440000';
  const mockReq = { user: { userId } } as unknown as AuthenticatedRequest;

  const mockStream: LiveStream = {
    id: streamId,
    organisationId: orgId,
    name: 'Studio Camera',
    sourceUrl: 'rtmp://example.com/live/stream1',
    protocol: LiveStreamProtocol.Rtmp,
    status: LiveStreamStatus.Idle,
    createdAt: new Date(),
    updatedAt: new Date(),
    organisation: {} as Organisation,
  };

  beforeEach(async () => {
    service = {
      createLiveStream: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateLiveStream: jest.fn(),
      removeLiveStream: jest.fn(),
      activateStream: jest.fn(),
      deactivateStream: jest.fn(),
    };

    streamHealthService = {
      getHealth: jest.fn(),
      getAllHealthStates: jest.fn().mockReturnValue(new Map()),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiveStreamController],
      providers: [
        { provide: LiveStreamService, useValue: service },
        {
          provide: FfmpegLiveService,
          useValue: { getHlsOutputDir: jest.fn() },
        },
        { provide: StreamHealthService, useValue: streamHealthService },
      ],
    }).compile();

    controller = module.get<LiveStreamController>(LiveStreamController);
  });

  describe('create', () => {
    it('should create a live stream', async () => {
      const dto = {
        name: 'Studio Camera',
        sourceUrl: 'rtmp://example.com/live/stream1',
        protocol: LiveStreamProtocol.Rtmp,
      };
      service.createLiveStream.mockResolvedValue(mockStream);

      const result = await controller.create(orgId, dto, mockReq);

      expect(service.createLiveStream).toHaveBeenCalledWith(orgId, dto, userId);
      expect(result).toEqual(mockStream);
    });
  });

  describe('findAll', () => {
    it('should return all streams for the organisation', async () => {
      service.findAll.mockResolvedValue([mockStream]);

      const result = await controller.findAll(orgId);

      expect(service.findAll).toHaveBeenCalledWith(orgId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(streamId);
    });

    it('should augment active streams with health data', async () => {
      const activeStream = { ...mockStream, status: LiveStreamStatus.Active };
      service.findAll.mockResolvedValue([activeStream]);

      const healthState = {
        streamId,
        status: LiveStreamStatus.Active,
        health: 'healthy' as const,
        checkedAt: '2026-03-30T12:00:00.000Z',
      };
      streamHealthService.getHealth.mockReturnValue(healthState);

      const result = await controller.findAll(orgId);

      expect(result[0].health).toEqual(healthState);
    });

    it('should not include health data for idle streams', async () => {
      service.findAll.mockResolvedValue([mockStream]);

      const result = await controller.findAll(orgId);

      expect(streamHealthService.getHealth).not.toHaveBeenCalled();
      expect(result[0].health).toBeUndefined();
    });
  });

  describe('getHealth', () => {
    it('should return health state for a stream', async () => {
      const activeStream = { ...mockStream, status: LiveStreamStatus.Active };
      service.findOne.mockResolvedValue(activeStream);

      const healthState = {
        streamId,
        status: LiveStreamStatus.Active,
        health: 'healthy' as const,
        checkedAt: '2026-03-30T12:00:00.000Z',
      };
      streamHealthService.getHealth.mockReturnValue(healthState);

      const result = await controller.getHealth(orgId, streamId);

      expect(result).toEqual(healthState);
    });

    it('should return default state when no health check has run', async () => {
      const activeStream = { ...mockStream, status: LiveStreamStatus.Active };
      service.findOne.mockResolvedValue(activeStream);
      streamHealthService.getHealth.mockReturnValue(undefined);

      const result = await controller.getHealth(orgId, streamId);

      expect(result.streamId).toBe(streamId);
      expect(result.health).toBe('healthy');
      expect(result.status).toBe(LiveStreamStatus.Active);
    });

    it('should return stopped default for idle stream with no health data', async () => {
      service.findOne.mockResolvedValue(mockStream);
      streamHealthService.getHealth.mockReturnValue(undefined);

      const result = await controller.getHealth(orgId, streamId);

      expect(result.health).toBe('stopped');
      expect(result.status).toBe(LiveStreamStatus.Idle);
    });
  });

  describe('findOne', () => {
    it('should return a single stream by id', async () => {
      service.findOne.mockResolvedValue(mockStream);

      const result = await controller.findOne(orgId, streamId);

      expect(service.findOne).toHaveBeenCalledWith(orgId, streamId);
      expect(result).toEqual(mockStream);
    });
  });

  describe('update', () => {
    it('should update a live stream', async () => {
      const dto = { name: 'Updated Camera' };
      const updated = { ...mockStream, name: 'Updated Camera' };
      service.updateLiveStream.mockResolvedValue(updated);

      const result = await controller.update(orgId, streamId, dto, mockReq);

      expect(service.updateLiveStream).toHaveBeenCalledWith(
        orgId,
        streamId,
        dto,
        userId,
      );
      expect(result).toEqual(updated);
    });

    it('should propagate ConflictException when stream is active', async () => {
      const dto = { name: 'Updated Camera' };
      service.updateLiveStream.mockRejectedValue(
        new ConflictException(
          'Cannot update a live stream that is currently active.',
        ),
      );

      await expect(
        controller.update(orgId, streamId, dto, mockReq),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a live stream', async () => {
      service.removeLiveStream.mockResolvedValue(undefined);

      await controller.remove(orgId, streamId, mockReq);

      expect(service.removeLiveStream).toHaveBeenCalledWith(
        orgId,
        streamId,
        userId,
      );
    });

    it('should propagate ConflictException when stream is active', async () => {
      service.removeLiveStream.mockRejectedValue(
        new ConflictException(
          'Cannot delete a live stream that is currently active.',
        ),
      );

      await expect(controller.remove(orgId, streamId, mockReq)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('activate', () => {
    it('should activate a live stream with target screen IDs', async () => {
      const dto = {
        targetScreenIds: ['770e8400-e29b-41d4-a716-446655440001'],
      };
      const activeStream = { ...mockStream, status: LiveStreamStatus.Active };
      service.activateStream.mockResolvedValue(activeStream);

      const result = await controller.activate(orgId, streamId, dto, mockReq);

      expect(service.activateStream).toHaveBeenCalledWith(
        orgId,
        streamId,
        dto,
        userId,
      );
      expect(result.status).toBe(LiveStreamStatus.Active);
    });

    it('should propagate BadGatewayException when FFmpeg fails', async () => {
      const dto = {
        targetScreenIds: ['770e8400-e29b-41d4-a716-446655440001'],
      };
      service.activateStream.mockRejectedValue(
        new BadGatewayException('Failed to start FFmpeg transcoding'),
      );

      await expect(
        controller.activate(orgId, streamId, dto, mockReq),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a live stream', async () => {
      const deactivated = { ...mockStream, status: LiveStreamStatus.Idle };
      service.deactivateStream.mockResolvedValue(deactivated);

      const result = await controller.deactivate(orgId, streamId, mockReq);

      expect(service.deactivateStream).toHaveBeenCalledWith(
        orgId,
        streamId,
        userId,
      );
      expect(result.status).toBe(LiveStreamStatus.Idle);
    });
  });
});
