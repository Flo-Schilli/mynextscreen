import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LiveStreamService } from './live-stream.service';
import { LiveStream } from './live-stream.entity';
import { LiveStreamProtocol } from './live-stream-protocol.enum';
import { LiveStreamStatus } from './live-stream-status.enum';

describe('LiveStreamService', () => {
  let service: LiveStreamService;
  let repository: Record<string, jest.Mock>;

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
  } as LiveStream;

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveStreamService,
        { provide: getRepositoryToken(LiveStream), useValue: repository },
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

      await expect(
        service.updateLiveStream(orgId, streamId, { name: 'New Name' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when stream does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateLiveStream(orgId, streamId, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
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

      await expect(service.removeLiveStream(orgId, streamId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when stream does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.removeLiveStream(orgId, streamId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
