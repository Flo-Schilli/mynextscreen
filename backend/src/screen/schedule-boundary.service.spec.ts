import { ScheduleBoundaryService } from './schedule-boundary.service';
import { ScheduleService, ScheduleEntryChangedEvent, GroupScheduleChangedEvent } from '../schedule';
import { SCHEDULE_CHANGED, ScreenStateChangeEvent } from './screen-state.event';
import { Screen } from './screen.entity';
import { ScheduleEntry } from '../schedule';
import { Organisation } from '../organisation/organisation.entity';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('ScheduleBoundaryService', () => {
  let service: ScheduleBoundaryService;
  let entryRepository: { find: jest.Mock };
  let screenRepository: { findOne: jest.Mock; find: jest.Mock };
  let scheduleService: { getCurrentPlaylist: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const screenId = '770e8400-e29b-41d4-a716-446655440000';
  const playlistId = '880e8400-e29b-41d4-a716-446655440000';
  const playlistId2 = '990e8400-e29b-41d4-a716-446655440000';
  const groupId = 'aa0e8400-e29b-41d4-a716-446655440000';

  const mockScreen: Screen = {
    id: screenId,
    organisationId: orgId,
    name: 'Main Stage',
    resolution: '1920x1080',
    location: 'Stage Left',
    apiKeyHash: '$2b$10$hashedvalue',
    lastHeartbeat: null,
    isOnline: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    organisation: {} as Organisation,
    groupId: null,
    group: null,
    gridRow: null,
    gridColumn: null,
  };

  beforeEach(() => {
    jest.useFakeTimers();

    entryRepository = { find: jest.fn().mockResolvedValue([]) };
    screenRepository = {
      findOne: jest.fn().mockResolvedValue(mockScreen),
      find: jest.fn().mockResolvedValue([]),
    };
    scheduleService = {
      getCurrentPlaylist: jest.fn().mockResolvedValue({
        playlist: { id: playlistId, name: 'Default Playlist' },
        isDefault: true,
      }),
    };
    eventEmitter = { emit: jest.fn() };

    service = new ScheduleBoundaryService(
      entryRepository as unknown as Repository<ScheduleEntry>,
      screenRepository as unknown as Repository<Screen>,
      scheduleService as unknown as ScheduleService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.useRealTimers();
  });

  describe('registerScreen', () => {
    it('should register a screen and store current playlist', async () => {
      await service.registerScreen(screenId);

      expect(screenRepository.findOne).toHaveBeenCalledWith({
        where: { id: screenId },
      });
      expect(scheduleService.getCurrentPlaylist).toHaveBeenCalledWith(screenId);
    });

    it('should not register if screen does not exist', async () => {
      screenRepository.findOne.mockResolvedValue(null);

      await service.registerScreen(screenId);

      expect(scheduleService.getCurrentPlaylist).not.toHaveBeenCalled();
    });

    it('should not register a screen twice', async () => {
      await service.registerScreen(screenId);
      const callsBefore = scheduleService.getCurrentPlaylist.mock.calls.length;

      await service.registerScreen(screenId);

      // getCurrentPlaylist should not be called again for duplicate registration
      expect(scheduleService.getCurrentPlaylist).toHaveBeenCalledTimes(callsBefore);
    });

    it('should set a fallback timer when no schedule entries exist', async () => {
      await service.registerScreen(screenId);

      expect(jest.getTimerCount()).toBe(1);
    });

    it('should set a timer based on the next schedule boundary', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 5000); // 5s from now
      const endTime = new Date(now.getTime() + 10000);

      entryRepository.find.mockResolvedValue([
        {
          screenId,
          startTime,
          endTime,
          rrule: null,
          playlistId,
        },
      ]);

      await service.registerScreen(screenId);

      expect(jest.getTimerCount()).toBe(1);
    });
  });

  describe('unregisterScreen', () => {
    it('should clear timers and remove tracking', async () => {
      await service.registerScreen(screenId);
      expect(jest.getTimerCount()).toBe(1);

      service.unregisterScreen(screenId);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('should be a no-op for untracked screens', () => {
      service.unregisterScreen('non-existent');
      // Should not throw
    });
  });

  describe('boundary timer fire', () => {
    it('should emit SCHEDULE_CHANGED when playlist changes', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() + 1000);
      const endTime = new Date(now.getTime() + 60000);

      entryRepository.find.mockResolvedValue([
        { screenId, startTime, endTime, rrule: null, playlistId: playlistId2 },
      ]);

      // Initial state: playlistId
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: playlistId, name: 'Playlist 1' },
        isDefault: true,
      });

      await service.registerScreen(screenId);
      eventEmitter.emit.mockClear();

      // After boundary: different playlist
      scheduleService.getCurrentPlaylist.mockResolvedValue({
        playlist: { id: playlistId2, name: 'Playlist 2' },
        isDefault: false,
      });

      jest.advanceTimersByTime(1500);
      await jest.advanceTimersToNextTimerAsync();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SCHEDULE_CHANGED,
        expect.any(ScreenStateChangeEvent),
      );
      const emittedEvent = eventEmitter.emit.mock.calls.find(
        (c: unknown[]) => c[0] === SCHEDULE_CHANGED,
      );
      expect(emittedEvent[1]).toEqual(
        expect.objectContaining({
          screenId,
          organisationId: orgId,
        }),
      );
    });

    it('should not emit when playlist has not changed', async () => {
      await service.registerScreen(screenId);
      eventEmitter.emit.mockClear();

      // Same playlist on timer fire
      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersToNextTimerAsync();

      expect(eventEmitter.emit).not.toHaveBeenCalledWith(SCHEDULE_CHANGED, expect.anything());
    });

    it('should handle getCurrentPlaylist errors gracefully', async () => {
      await service.registerScreen(screenId);
      eventEmitter.emit.mockClear();

      scheduleService.getCurrentPlaylist.mockRejectedValue(new Error('DB error'));

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersToNextTimerAsync();

      // Should not throw, no event emitted
      expect(eventEmitter.emit).not.toHaveBeenCalledWith(SCHEDULE_CHANGED, expect.anything());
    });

    it('should reschedule the next boundary after firing', async () => {
      await service.registerScreen(screenId);

      jest.advanceTimersByTime(60_000);
      await jest.advanceTimersToNextTimerAsync();

      // A new timer should be set
      expect(jest.getTimerCount()).toBe(1);
    });
  });

  describe('handleScheduleEntryChanged', () => {
    it('should recalculate timer for tracked screen', async () => {
      await service.registerScreen(screenId);

      const spy = jest.spyOn(entryRepository, 'find');
      spy.mockClear();

      await service.handleScheduleEntryChanged(new ScheduleEntryChangedEvent(screenId, orgId));

      // Should have queried entries again for recalculation
      expect(spy).toHaveBeenCalled();
    });

    it('should ignore events for untracked screens', async () => {
      const spy = jest.spyOn(entryRepository, 'find');

      await service.handleScheduleEntryChanged(
        new ScheduleEntryChangedEvent('untracked-screen', orgId),
      );

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('handleGroupScheduleChanged', () => {
    it('should recalculate for tracked screens in the group', async () => {
      const screenInGroup = { ...mockScreen, groupId };
      screenRepository.findOne.mockResolvedValue(screenInGroup);
      screenRepository.find.mockResolvedValue([screenInGroup]);

      await service.registerScreen(screenId);

      const spy = jest.spyOn(entryRepository, 'find');
      spy.mockClear();

      await service.handleGroupScheduleChanged(
        new GroupScheduleChangedEvent(groupId, orgId, playlistId),
      );

      expect(screenRepository.find).toHaveBeenCalledWith({
        where: { groupId },
      });
      expect(spy).toHaveBeenCalled();
    });

    it('should skip screens not tracked', async () => {
      screenRepository.find.mockResolvedValue([{ ...mockScreen, id: 'other-screen', groupId }]);

      const spy = jest.spyOn(entryRepository, 'find');

      await service.handleGroupScheduleChanged(
        new GroupScheduleChangedEvent(groupId, orgId, playlistId),
      );

      // No tracked screens in the group, so no entry queries for recalculation
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear all timers', async () => {
      await service.registerScreen(screenId);
      expect(jest.getTimerCount()).toBe(1);

      service.onModuleDestroy();
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('group schedule boundaries', () => {
    it('should collect boundaries from group entries', async () => {
      const screenInGroup = { ...mockScreen, groupId };
      screenRepository.findOne.mockResolvedValue(screenInGroup);

      const now = new Date();
      const groupEntry = {
        groupId,
        screenId: null,
        startTime: new Date(now.getTime() + 3000),
        endTime: new Date(now.getTime() + 60000),
        rrule: null,
        playlistId: playlistId2,
      };

      entryRepository.find.mockImplementation(({ where }: { where: Record<string, string> }) => {
        if (where.groupId === groupId) return Promise.resolve([groupEntry]);
        return Promise.resolve([]);
      });

      await service.registerScreen(screenId);

      expect(entryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { groupId } }),
      );
      expect(jest.getTimerCount()).toBe(1);
    });
  });
});
