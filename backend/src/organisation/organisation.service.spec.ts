import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrganisationService } from './organisation.service';
import { Organisation } from './organisation.entity';
import { Playlist } from '../playlist/playlist.entity';
import { User } from '../user/user.entity';
import { UserOrganisationMembership } from '../user/user-organisation-membership.entity';

describe('OrganisationService', () => {
  let service: OrganisationService;
  let repository: Record<string, jest.Mock>;
  let playlistRepository: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const playlistId = '660e8400-e29b-41d4-a716-446655440000';

  const mockOrganisation: Organisation = {
    id: orgId,
    name: 'Test Org',
    timeZone: 'Europe/Vienna',
    storageOriginalLimitBytes: 1073741824,
    storageTranscodedLimitBytes: 2147483648,
    storageOriginalUsedBytes: 0,
    storageTranscodedUsedBytes: 0,
    defaultPlaylistId: null,
    defaultPlaylist: null as unknown,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOneBy: jest.fn(),
    };

    playlistRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganisationService,
        {
          provide: getRepositoryToken(Organisation),
          useValue: repository,
        },
        {
          provide: getRepositoryToken(Playlist),
          useValue: playlistRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(UserOrganisationMembership),
          useValue: { create: jest.fn(), save: jest.fn() },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<OrganisationService>(OrganisationService);
  });

  describe('create', () => {
    it('should create and return an organisation', async () => {
      const dto = {
        name: 'Test Org',
        timeZone: 'Europe/Vienna',
        storageOriginalLimitBytes: 1073741824,
        storageTranscodedLimitBytes: 2147483648,
      };

      repository.create.mockReturnValue(mockOrganisation);
      repository.save.mockResolvedValue(mockOrganisation);

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalledWith(mockOrganisation);
      expect(result).toEqual(mockOrganisation);
    });
  });

  describe('findAll', () => {
    it('should return an array of organisations', async () => {
      repository.find.mockResolvedValue([mockOrganisation]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalled();
      expect(result).toEqual([mockOrganisation]);
    });
  });

  describe('findOne', () => {
    it('should return an organisation by id', async () => {
      repository.findOneBy.mockResolvedValue(mockOrganisation);

      const result = await service.findOne(mockOrganisation.id);

      expect(repository.findOneBy).toHaveBeenCalledWith({
        id: mockOrganisation.id,
      });
      expect(result).toEqual(mockOrganisation);
    });

    it('should throw NotFoundException if organisation not found', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return the organisation', async () => {
      const dto = { name: 'Updated Org' };
      const updatedOrg = { ...mockOrganisation, name: 'Updated Org' };

      repository.findOneBy.mockResolvedValue(mockOrganisation);
      repository.save.mockResolvedValue(updatedOrg);

      const result = await service.update(mockOrganisation.id, dto);

      expect(repository.findOneBy).toHaveBeenCalledWith({
        id: mockOrganisation.id,
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedOrg);
    });

    it('should throw NotFoundException if organisation not found', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setDefaultPlaylist', () => {
    it('should set the default playlist', async () => {
      const mockPlaylist = {
        id: playlistId,
        organisationId: orgId,
        name: 'My Playlist',
      };
      const updated = { ...mockOrganisation, defaultPlaylistId: playlistId };

      repository.findOneBy.mockResolvedValue({ ...mockOrganisation });
      playlistRepository.findOne.mockResolvedValue(mockPlaylist);
      repository.save.mockResolvedValue(updated);

      const result = await service.setDefaultPlaylist(orgId, playlistId);

      expect(playlistRepository.findOne).toHaveBeenCalledWith({
        where: { id: playlistId },
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('should clear the default playlist when playlistId is null', async () => {
      const org = { ...mockOrganisation, defaultPlaylistId: playlistId };
      const cleared = { ...mockOrganisation, defaultPlaylistId: null };

      repository.findOneBy.mockResolvedValue(org);
      repository.save.mockResolvedValue(cleared);

      const result = await service.setDefaultPlaylist(orgId, null);

      expect(playlistRepository.findOne).not.toHaveBeenCalled();
      expect(result.defaultPlaylistId).toBeNull();
    });

    it('should throw NotFoundException if playlist does not exist', async () => {
      repository.findOneBy.mockResolvedValue({ ...mockOrganisation });
      playlistRepository.findOne.mockResolvedValue(null);

      await expect(service.setDefaultPlaylist(orgId, playlistId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if playlist belongs to different org', async () => {
      const otherOrgPlaylist = {
        id: playlistId,
        organisationId: 'other-org-id',
        name: 'Other Playlist',
      };

      repository.findOneBy.mockResolvedValue({ ...mockOrganisation });
      playlistRepository.findOne.mockResolvedValue(otherOrgPlaylist);

      await expect(service.setDefaultPlaylist(orgId, playlistId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if organisation does not exist', async () => {
      repository.findOneBy.mockResolvedValue(null);

      await expect(service.setDefaultPlaylist('nonexistent-id', playlistId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
