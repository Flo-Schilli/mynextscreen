import { Test, TestingModule } from '@nestjs/testing';
import { LiveStreamController } from './live-stream.controller';
import { LiveStreamService } from './live-stream.service';
import { FfmpegLiveService } from './ffmpeg-live.service';
import { LiveStream } from './live-stream.entity';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';
import { Organisation } from '../organisation/organisation.entity';
import { ConflictException } from '@nestjs/common';

describe('LiveStreamController', () => {
  let controller: LiveStreamController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const streamId = '660e8400-e29b-41d4-a716-446655440000';

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
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiveStreamController],
      providers: [
        { provide: LiveStreamService, useValue: service },
        {
          provide: FfmpegLiveService,
          useValue: { getHlsOutputDir: jest.fn() },
        },
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

      const result = await controller.create(orgId, dto);

      expect(service.createLiveStream).toHaveBeenCalledWith(orgId, dto);
      expect(result).toEqual(mockStream);
    });
  });

  describe('findAll', () => {
    it('should return all streams for the organisation', async () => {
      service.findAll.mockResolvedValue([mockStream]);

      const result = await controller.findAll(orgId);

      expect(service.findAll).toHaveBeenCalledWith(orgId);
      expect(result).toEqual([mockStream]);
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

      const result = await controller.update(orgId, streamId, dto);

      expect(service.updateLiveStream).toHaveBeenCalledWith(
        orgId,
        streamId,
        dto,
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

      await expect(controller.update(orgId, streamId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a live stream', async () => {
      service.removeLiveStream.mockResolvedValue(undefined);

      await controller.remove(orgId, streamId);

      expect(service.removeLiveStream).toHaveBeenCalledWith(orgId, streamId);
    });

    it('should propagate ConflictException when stream is active', async () => {
      service.removeLiveStream.mockRejectedValue(
        new ConflictException(
          'Cannot delete a live stream that is currently active.',
        ),
      );

      await expect(controller.remove(orgId, streamId)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
