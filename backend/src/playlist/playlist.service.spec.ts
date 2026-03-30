import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { Playlist } from './playlist.entity';
import { PlaylistItem } from './playlist-item.entity';
import { Organisation } from '../organisation/organisation.entity';
import { Content } from '../content/content.entity';
import { ContentType } from '../content/content-type.enum';
import { PLAYLIST_UPDATED } from './playlist.event';

describe('PlaylistService', () => {
  let service: PlaylistService;
  let playlistRepo: Record<string, jest.Mock>;
  let playlistItemRepo: Record<string, jest.Mock>;
  let organisationRepo: Record<string, jest.Mock>;
  let contentRepo: Record<string, jest.Mock>;
  let eventEmitter: Record<string, jest.Mock>;

  beforeEach(async () => {
    playlistRepo = {
      create: jest.fn((data) => ({ id: 'playlist-1', items: [], ...data })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    playlistItemRepo = {
      create: jest.fn((data) => ({ id: 'item-1', ...data })),
      save: jest.fn((entity) => {
        if (Array.isArray(entity)) {
          return Promise.resolve(entity.map((e) => ({ ...e })));
        }
        return Promise.resolve({ ...entity });
      }),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    organisationRepo = {
      findOneBy: jest.fn().mockResolvedValue(null),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
    };

    contentRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaylistService,
        { provide: getRepositoryToken(Playlist), useValue: playlistRepo },
        {
          provide: getRepositoryToken(PlaylistItem),
          useValue: playlistItemRepo,
        },
        {
          provide: getRepositoryToken(Organisation),
          useValue: organisationRepo,
        },
        { provide: getRepositoryToken(Content), useValue: contentRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<PlaylistService>(PlaylistService);
  });

  describe('create', () => {
    it('should create a playlist and emit event', async () => {
      const result = await service.create('org-1', { name: 'My Playlist' });

      expect(playlistRepo.create).toHaveBeenCalledWith({
        organisationId: 'org-1',
        name: 'My Playlist',
      });
      expect(playlistRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({
          playlistId: 'playlist-1',
          organisationId: 'org-1',
        }),
      );
      expect(result.name).toBe('My Playlist');
    });
  });

  describe('findAll', () => {
    it('should return playlists for an organisation', async () => {
      const mockPlaylists = [
        { id: 'p1', organisationId: 'org-1', name: 'A', items: [] },
        { id: 'p2', organisationId: 'org-1', name: 'B', items: [] },
      ];
      playlistRepo.find.mockResolvedValue(mockPlaylists);

      const result = await service.findAll('org-1');

      expect(result).toEqual(mockPlaylists);
      expect(playlistRepo.find).toHaveBeenCalledWith({
        where: { organisationId: 'org-1' },
        relations: ['items'],
        order: { createdAt: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a playlist with items', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);

      const result = await service.findOne('p1', 'org-1');
      expect(result).toEqual(mockPlaylist);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', 'org-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update playlist name and emit event', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Old Name',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);

      await service.update('p1', 'org-1', { name: 'New Name' });

      expect(playlistRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: 'p1' }),
      );
    });
  });

  describe('addItem', () => {
    it('should add an item to the playlist', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);
      contentRepo.findOne.mockResolvedValue({
        id: 'content-1',
        organisationId: 'org-1',
      });

      // Mock createQueryBuilder for max position
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      playlistItemRepo.createQueryBuilder.mockReturnValue(qb);

      await service.addItem('p1', 'org-1', {
        contentId: 'content-1',
        durationSeconds: 10,
      });

      expect(playlistItemRepo.create).toHaveBeenCalledWith({
        playlistId: 'p1',
        contentId: 'content-1',
        durationSeconds: 10,
        position: 0,
      });
      expect(playlistItemRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: 'p1' }),
      );
    });

    it('should append after existing items when no position given', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);
      contentRepo.findOne.mockResolvedValue({
        id: 'content-1',
        organisationId: 'org-1',
      });

      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ position: 5 }),
      };
      playlistItemRepo.createQueryBuilder.mockReturnValue(qb);

      await service.addItem('p1', 'org-1', {
        contentId: 'content-1',
        durationSeconds: 15,
      });

      expect(playlistItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 6 }),
      );
    });

    it('should use explicit position when provided', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);
      contentRepo.findOne.mockResolvedValue({
        id: 'content-1',
        organisationId: 'org-1',
      });

      await service.addItem('p1', 'org-1', {
        contentId: 'content-1',
        durationSeconds: 10,
        position: 3,
      });

      expect(playlistItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ position: 3 }),
      );
    });

    it('should throw when content not found in org', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);
      contentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addItem('p1', 'org-1', {
          contentId: 'bad-content',
          durationSeconds: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from the playlist', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);

      const mockItem = { id: 'item-1', playlistId: 'p1' };
      playlistItemRepo.findOne.mockResolvedValue(mockItem);

      await service.removeItem('p1', 'item-1', 'org-1');

      expect(playlistItemRepo.remove).toHaveBeenCalledWith(mockItem);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: 'p1' }),
      );
    });

    it('should throw when item not found', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);
      playlistItemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeItem('p1', 'missing', 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderItems', () => {
    it('should update positions based on provided order', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);

      const items = [
        { id: 'a', playlistId: 'p1', position: 0 },
        { id: 'b', playlistId: 'p1', position: 1 },
        { id: 'c', playlistId: 'p1', position: 2 },
      ];
      playlistItemRepo.find.mockResolvedValue(items);

      await service.reorderItems('p1', 'org-1', ['c', 'a', 'b']);

      expect(playlistItemRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'c', position: 0 }),
          expect.objectContaining({ id: 'a', position: 1 }),
          expect.objectContaining({ id: 'b', position: 2 }),
        ]),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: 'p1' }),
      );
    });

    it('should throw when item ID does not belong to playlist', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);

      const items = [{ id: 'a', playlistId: 'p1', position: 0 }];
      playlistItemRepo.find.mockResolvedValue(items);

      await expect(
        service.reorderItems('p1', 'org-1', ['a', 'unknown']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when item count does not match', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);

      const items = [
        { id: 'a', playlistId: 'p1', position: 0 },
        { id: 'b', playlistId: 'p1', position: 1 },
      ];
      playlistItemRepo.find.mockResolvedValue(items);

      await expect(service.reorderItems('p1', 'org-1', ['a'])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a playlist and emit event', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);
      organisationRepo.findOneBy.mockResolvedValue({
        id: 'org-1',
        defaultPlaylistId: null,
      });

      await service.delete('p1', 'org-1');

      expect(playlistRepo.remove).toHaveBeenCalledWith(mockPlaylist);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: 'p1' }),
      );
    });

    it('should clear defaultPlaylistId when deleting the default playlist', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Default',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);

      const org = { id: 'org-1', defaultPlaylistId: 'p1' };
      organisationRepo.findOneBy.mockResolvedValue(org);

      await service.delete('p1', 'org-1');

      expect(organisationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ defaultPlaylistId: null }),
      );
      expect(playlistRepo.remove).toHaveBeenCalled();
    });

    it('should not modify org when deleting a non-default playlist', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Other',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);
      organisationRepo.findOneBy.mockResolvedValue({
        id: 'org-1',
        defaultPlaylistId: 'p2',
      });

      await service.delete('p1', 'org-1');

      expect(organisationRepo.save).not.toHaveBeenCalled();
      expect(playlistRepo.remove).toHaveBeenCalled();
    });
  });

  describe('getTotalDuration', () => {
    it('should sum durations of all items', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Test',
        items: [
          {
            id: 'i1',
            durationSeconds: 10,
            content: { type: ContentType.Image },
          },
          {
            id: 'i2',
            durationSeconds: 30,
            content: { type: ContentType.Video },
          },
          {
            id: 'i3',
            durationSeconds: 15,
            content: { type: ContentType.Image },
          },
        ],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);

      const total = await service.getTotalDuration('p1', 'org-1');
      expect(total).toBe(55);
    });

    it('should return 0 for empty playlist', async () => {
      const mockPlaylist = {
        id: 'p1',
        organisationId: 'org-1',
        name: 'Empty',
        items: [],
      };
      playlistRepo.findOne.mockResolvedValue(mockPlaylist);

      const total = await service.getTotalDuration('p1', 'org-1');
      expect(total).toBe(0);
    });
  });
});
