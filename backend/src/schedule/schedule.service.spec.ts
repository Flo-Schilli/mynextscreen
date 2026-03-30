import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleEntry } from './schedule-entry.entity';
import { Organisation } from '../organisation/organisation.entity';
import { Screen } from '../screen/screen.entity';
import { Playlist } from '../playlist/playlist.entity';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { SCHEDULE_ENTRY_CHANGED, GROUP_SCHEDULE_CHANGED } from './schedule.event';
import { SLICE_CONTENT_QUEUE } from '../slice-content';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let scheduleRepo: Record<string, jest.Mock>;
  let organisationRepo: Record<string, jest.Mock>;
  let screenRepo: Record<string, jest.Mock>;
  let playlistRepo: Record<string, jest.Mock>;
  let screenGroupRepo: Record<string, jest.Mock>;
  let sliceContentQueue: Record<string, jest.Mock>;
  let eventEmitter: Record<string, jest.Mock>;

  beforeEach(async () => {
    scheduleRepo = {
      create: jest.fn((data) => ({ id: 'entry-1', ...data })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    organisationRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    screenRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'screen-1',
        organisationId: 'org-1',
      }),
    };

    playlistRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'playlist-1',
        organisationId: 'org-1',
        name: 'Test Playlist',
      }),
    };

    screenGroupRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    sliceContentQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        {
          provide: getRepositoryToken(ScheduleEntry),
          useValue: scheduleRepo,
        },
        {
          provide: getRepositoryToken(Organisation),
          useValue: organisationRepo,
        },
        { provide: getRepositoryToken(Screen), useValue: screenRepo },
        { provide: getRepositoryToken(Playlist), useValue: playlistRepo },
        { provide: getRepositoryToken(ScreenGroup), useValue: screenGroupRepo },
        { provide: getQueueToken(SLICE_CONTENT_QUEUE), useValue: sliceContentQueue },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
  });

  describe('create', () => {
    it('should create a schedule entry and emit event', async () => {
      const dto = {
        screenId: 'screen-1',
        playlistId: 'playlist-1',
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T12:00:00Z',
        colour: '#FF5733',
      };

      const result = await service.create('org-1', dto);

      expect(scheduleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organisationId: 'org-1',
          screenId: 'screen-1',
          playlistId: 'playlist-1',
          colour: '#FF5733',
        }),
      );
      expect(scheduleRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SCHEDULE_ENTRY_CHANGED,
        expect.objectContaining({
          screenId: 'screen-1',
          organisationId: 'org-1',
        }),
      );
      expect(result.organisationId).toBe('org-1');
    });

    it('should throw NotFoundException when screen not found', async () => {
      screenRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('org-1', {
          screenId: 'bad-screen',
          playlistId: 'playlist-1',
          startTime: '2026-04-01T10:00:00Z',
          endTime: '2026-04-01T12:00:00Z',
          colour: '#FF5733',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      playlistRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('org-1', {
          screenId: 'screen-1',
          playlistId: 'bad-playlist',
          startTime: '2026-04-01T10:00:00Z',
          endTime: '2026-04-01T12:00:00Z',
          colour: '#FF5733',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('overlap detection — single entries', () => {
    it('should throw ConflictException when entries overlap', async () => {
      const existingEntry = {
        id: 'existing-1',
        screenId: 'screen-1',
        organisationId: 'org-1',
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: null,
      };
      scheduleRepo.find.mockResolvedValue([existingEntry]);

      await expect(
        service.create('org-1', {
          screenId: 'screen-1',
          playlistId: 'playlist-1',
          startTime: '2026-04-01T11:00:00Z',
          endTime: '2026-04-01T13:00:00Z',
          colour: '#FF5733',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow non-overlapping entries', async () => {
      const existingEntry = {
        id: 'existing-1',
        screenId: 'screen-1',
        organisationId: 'org-1',
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: null,
      };
      scheduleRepo.find.mockResolvedValue([existingEntry]);

      const result = await service.create('org-1', {
        screenId: 'screen-1',
        playlistId: 'playlist-1',
        startTime: '2026-04-01T12:00:00Z',
        endTime: '2026-04-01T14:00:00Z',
        colour: '#FF5733',
      });

      expect(result).toBeDefined();
      expect(scheduleRepo.save).toHaveBeenCalled();
    });
  });

  describe('overlap detection — recurring entries', () => {
    it('should detect overlap between recurring and single entry', async () => {
      // Existing: daily recurring 10:00-12:00
      const existingEntry = {
        id: 'existing-1',
        screenId: 'screen-1',
        organisationId: 'org-1',
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: 'FREQ=DAILY;COUNT=10',
      };
      scheduleRepo.find.mockResolvedValue([existingEntry]);

      // New entry on April 3rd 11:00-13:00 should overlap with the recurring entry
      await expect(
        service.create('org-1', {
          screenId: 'screen-1',
          playlistId: 'playlist-1',
          startTime: '2026-04-03T11:00:00Z',
          endTime: '2026-04-03T13:00:00Z',
          colour: '#FF5733',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow non-overlapping with recurring entry', async () => {
      // Existing: daily recurring 10:00-12:00
      const existingEntry = {
        id: 'existing-1',
        screenId: 'screen-1',
        organisationId: 'org-1',
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: 'FREQ=DAILY;COUNT=10',
      };
      scheduleRepo.find.mockResolvedValue([existingEntry]);

      // New entry on April 3rd 13:00-15:00 should not overlap
      const result = await service.create('org-1', {
        screenId: 'screen-1',
        playlistId: 'playlist-1',
        startTime: '2026-04-03T13:00:00Z',
        endTime: '2026-04-03T15:00:00Z',
        colour: '#FF5733',
      });

      expect(result).toBeDefined();
    });
  });

  describe('update (move/resize)', () => {
    it('should update start and end times (move)', async () => {
      const existingEntry = {
        id: 'entry-1',
        screenId: 'screen-1',
        organisationId: 'org-1',
        playlistId: 'playlist-1',
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: null,
        colour: '#FF5733',
        playlist: { id: 'playlist-1', name: 'Test' },
      };
      scheduleRepo.findOne.mockResolvedValue(existingEntry);
      scheduleRepo.find.mockResolvedValue([existingEntry]);

      await service.update('entry-1', 'org-1', {
        startTime: '2026-04-01T14:00:00Z',
        endTime: '2026-04-01T16:00:00Z',
      });

      expect(scheduleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: new Date('2026-04-01T14:00:00Z'),
          endTime: new Date('2026-04-01T16:00:00Z'),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SCHEDULE_ENTRY_CHANGED,
        expect.objectContaining({ screenId: 'screen-1' }),
      );
    });

    it('should update only end time (resize)', async () => {
      const existingEntry = {
        id: 'entry-1',
        screenId: 'screen-1',
        organisationId: 'org-1',
        playlistId: 'playlist-1',
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: null,
        colour: '#FF5733',
        playlist: { id: 'playlist-1', name: 'Test' },
      };
      scheduleRepo.findOne.mockResolvedValue(existingEntry);
      scheduleRepo.find.mockResolvedValue([existingEntry]);

      await service.update('entry-1', 'org-1', {
        endTime: '2026-04-01T14:00:00Z',
      });

      expect(scheduleRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: new Date('2026-04-01T10:00:00Z'),
          endTime: new Date('2026-04-01T14:00:00Z'),
        }),
      );
    });

    it('should throw NotFoundException when entry not found', async () => {
      scheduleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing', 'org-1', {
          startTime: '2026-04-01T14:00:00Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject update that causes overlap', async () => {
      const entry1 = {
        id: 'entry-1',
        screenId: 'screen-1',
        organisationId: 'org-1',
        playlistId: 'playlist-1',
        startTime: new Date('2026-04-01T10:00:00Z'),
        endTime: new Date('2026-04-01T12:00:00Z'),
        rrule: null,
        colour: '#FF5733',
        playlist: { id: 'playlist-1', name: 'Test' },
      };
      const entry2 = {
        id: 'entry-2',
        screenId: 'screen-1',
        organisationId: 'org-1',
        playlistId: 'playlist-1',
        startTime: new Date('2026-04-01T14:00:00Z'),
        endTime: new Date('2026-04-01T16:00:00Z'),
        rrule: null,
      };
      scheduleRepo.findOne.mockResolvedValue(entry1);
      scheduleRepo.find.mockResolvedValue([entry1, entry2]);

      await expect(
        service.update('entry-1', 'org-1', {
          startTime: '2026-04-01T13:00:00Z',
          endTime: '2026-04-01T15:00:00Z',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete entry and emit event', async () => {
      const entry = {
        id: 'entry-1',
        screenId: 'screen-1',
        organisationId: 'org-1',
        playlist: { id: 'playlist-1' },
      };
      scheduleRepo.findOne.mockResolvedValue(entry);

      await service.delete('entry-1', 'org-1');

      expect(scheduleRepo.remove).toHaveBeenCalledWith(entry);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SCHEDULE_ENTRY_CHANGED,
        expect.objectContaining({ screenId: 'screen-1' }),
      );
    });

    it('should throw NotFoundException when entry not found', async () => {
      scheduleRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('missing', 'org-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCurrentPlaylist', () => {
    it('should return the active playlist when a schedule entry is active', async () => {
      const now = new Date();
      const entry = {
        id: 'entry-1',
        screenId: 'screen-1',
        organisationId: 'org-1',
        startTime: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
        endTime: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
        rrule: null,
        playlist: { id: 'playlist-1', name: 'Active Playlist' },
      };
      scheduleRepo.find.mockResolvedValue([entry]);

      const result = await service.getCurrentPlaylist('screen-1');

      expect(result.playlist).toEqual(
        expect.objectContaining({ name: 'Active Playlist' }),
      );
      expect(result.isDefault).toBe(false);
    });

    it('should return the fallback playlist when no entry is active', async () => {
      const now = new Date();
      const entry = {
        id: 'entry-1',
        screenId: 'screen-1',
        organisationId: 'org-1',
        startTime: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
        endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        rrule: null,
        playlist: { id: 'playlist-1', name: 'Future Playlist' },
      };
      scheduleRepo.find.mockResolvedValue([entry]);

      organisationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        defaultPlaylistId: 'default-playlist-1',
      });
      // Override playlistRepo for fallback lookup
      playlistRepo.findOne.mockResolvedValue({
        id: 'default-playlist-1',
        name: 'Default Playlist',
      });

      const result = await service.getCurrentPlaylist('screen-1');

      expect(result.isDefault).toBe(true);
      expect(result.playlist).toEqual(
        expect.objectContaining({ name: 'Default Playlist' }),
      );
    });

    it('should return null playlist when no entries and no default', async () => {
      scheduleRepo.find.mockResolvedValue([]);
      screenRepo.findOne.mockResolvedValue({
        id: 'screen-1',
        organisationId: 'org-1',
      });
      organisationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        defaultPlaylistId: null,
      });

      const result = await service.getCurrentPlaylist('screen-1');

      expect(result.playlist).toBeNull();
      expect(result.isDefault).toBe(true);
    });

    it('should resolve group schedule when no direct screen schedule is active', async () => {
      const now = new Date();
      // No direct screen entries
      scheduleRepo.find
        .mockResolvedValueOnce([]) // direct screen entries
        .mockResolvedValueOnce([  // group entries
          {
            id: 'group-entry-1',
            groupId: 'group-1',
            organisationId: 'org-1',
            startTime: new Date(now.getTime() - 60 * 60 * 1000),
            endTime: new Date(now.getTime() + 60 * 60 * 1000),
            rrule: null,
            playlist: { id: 'group-playlist-1', name: 'Group Playlist' },
          },
        ]);

      screenRepo.findOne.mockResolvedValue({
        id: 'screen-1',
        organisationId: 'org-1',
        groupId: 'group-1',
      });

      const result = await service.getCurrentPlaylist('screen-1');

      expect(result.playlist).toEqual(
        expect.objectContaining({ name: 'Group Playlist' }),
      );
      expect(result.isDefault).toBe(false);
    });

    it('should prefer direct screen schedule over group schedule', async () => {
      const now = new Date();
      // Direct screen entry is active
      scheduleRepo.find.mockResolvedValueOnce([
        {
          id: 'screen-entry-1',
          screenId: 'screen-1',
          organisationId: 'org-1',
          startTime: new Date(now.getTime() - 60 * 60 * 1000),
          endTime: new Date(now.getTime() + 60 * 60 * 1000),
          rrule: null,
          playlist: { id: 'screen-playlist-1', name: 'Screen Playlist' },
        },
      ]);

      const result = await service.getCurrentPlaylist('screen-1');

      expect(result.playlist).toEqual(
        expect.objectContaining({ name: 'Screen Playlist' }),
      );
      expect(result.isDefault).toBe(false);
      // Should not have queried group entries
      expect(scheduleRepo.find).toHaveBeenCalledTimes(1);
    });

    it('should fall back to default when screen has group but no active group schedule', async () => {
      const now = new Date();
      // No active direct entries
      scheduleRepo.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([ // group entries — but not active
          {
            id: 'group-entry-1',
            groupId: 'group-1',
            organisationId: 'org-1',
            startTime: new Date(now.getTime() + 60 * 60 * 1000), // future
            endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
            rrule: null,
            playlist: { id: 'group-playlist-1', name: 'Group Playlist' },
          },
        ]);

      screenRepo.findOne.mockResolvedValue({
        id: 'screen-1',
        organisationId: 'org-1',
        groupId: 'group-1',
      });

      organisationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        defaultPlaylistId: null,
      });

      const result = await service.getCurrentPlaylist('screen-1');

      expect(result.isDefault).toBe(true);
    });

    it('should skip group lookup when screen has no groupId', async () => {
      scheduleRepo.find.mockResolvedValue([]);
      screenRepo.findOne.mockResolvedValue({
        id: 'screen-1',
        organisationId: 'org-1',
        groupId: null,
      });

      organisationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        defaultPlaylistId: null,
      });

      const result = await service.getCurrentPlaylist('screen-1');

      expect(result.isDefault).toBe(true);
      // Should only have been called once (direct screen entries)
      expect(scheduleRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('group schedule events', () => {
    it('should emit GROUP_SCHEDULE_CHANGED when creating entry with groupId', async () => {
      const dto = {
        screenId: 'screen-1',
        playlistId: 'playlist-1',
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T12:00:00Z',
        colour: '#FF5733',
      };

      // Make the saved entry have a groupId
      scheduleRepo.create.mockReturnValue({
        id: 'entry-1',
        ...dto,
        groupId: 'group-1',
        organisationId: 'org-1',
      });
      scheduleRepo.save.mockResolvedValue({
        id: 'entry-1',
        ...dto,
        groupId: 'group-1',
        organisationId: 'org-1',
      });

      await service.create('org-1', dto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        GROUP_SCHEDULE_CHANGED,
        expect.objectContaining({
          groupId: 'group-1',
          organisationId: 'org-1',
        }),
      );
    });

    it('should not emit GROUP_SCHEDULE_CHANGED when entry has no groupId', async () => {
      const dto = {
        screenId: 'screen-1',
        playlistId: 'playlist-1',
        startTime: '2026-04-01T10:00:00Z',
        endTime: '2026-04-01T12:00:00Z',
        colour: '#FF5733',
      };

      await service.create('org-1', dto);

      const groupCalls = eventEmitter.emit.mock.calls.filter(
        (c: any) => c[0] === GROUP_SCHEDULE_CHANGED,
      );
      expect(groupCalls).toHaveLength(0);
    });
  });

  describe('findByScreen', () => {
    it('should return entries for a screen', async () => {
      const entries = [
        {
          id: 'e1',
          screenId: 'screen-1',
          organisationId: 'org-1',
          startTime: new Date('2026-04-01T10:00:00Z'),
          endTime: new Date('2026-04-01T12:00:00Z'),
        },
      ];
      scheduleRepo.find.mockResolvedValue(entries);

      const result = await service.findByScreen(
        'screen-1',
        'org-1',
        new Date('2026-04-01'),
        new Date('2026-04-02'),
      );

      expect(result).toEqual(entries);
      expect(scheduleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { screenId: 'screen-1', organisationId: 'org-1' },
        }),
      );
    });
  });

  describe('findByOrganisation', () => {
    it('should return entries for an organisation', async () => {
      const entries = [
        {
          id: 'e1',
          screenId: 'screen-1',
          organisationId: 'org-1',
        },
        {
          id: 'e2',
          screenId: 'screen-2',
          organisationId: 'org-1',
        },
      ];
      scheduleRepo.find.mockResolvedValue(entries);

      const result = await service.findByOrganisation(
        'org-1',
        new Date('2026-04-01'),
        new Date('2026-04-30'),
      );

      expect(result).toEqual(entries);
    });
  });
});
