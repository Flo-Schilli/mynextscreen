import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlaylistChangeBridgeService } from './playlist-change-bridge.service';
import { ScreenStateService } from './screen-state.service';
import { PlaylistUpdatedEvent } from '../playlist/playlist.event';
import { PLAYLIST_CHANGED, ScreenStateChangeEvent } from './screen-state.event';
import { ScheduleEntry } from '../schedule';
import { Organisation } from '../organisation/organisation.entity';
import { Screen } from './screen.entity';

describe('PlaylistChangeBridgeService', () => {
  let service: PlaylistChangeBridgeService;
  let screenStateService: { getConnectedScreenIds: jest.Mock };
  let entryRepository: { find: jest.Mock };
  let organisationRepository: { findOne: jest.Mock };
  let screenRepository: { find: jest.Mock };
  let eventEmitter: { emit: jest.Mock };

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const playlistId = '880e8400-e29b-41d4-a716-446655440000';
  const screenId1 = '770e8400-e29b-41d4-a716-446655440001';
  const screenId2 = '770e8400-e29b-41d4-a716-446655440002';
  const groupId = '660e8400-e29b-41d4-a716-446655440000';

  const now = new Date();

  function activeEntry(overrides: Record<string, unknown> = {}) {
    return {
      playlistId,
      organisationId: orgId,
      screenId: null,
      groupId: null,
      startTime: new Date(now.getTime() - 60_000),
      endTime: new Date(now.getTime() + 60_000),
      rrule: null,
      ...overrides,
    };
  }

  function inactiveEntry(overrides: Record<string, unknown> = {}) {
    return {
      playlistId,
      organisationId: orgId,
      screenId: null,
      groupId: null,
      startTime: new Date(now.getTime() - 120_000),
      endTime: new Date(now.getTime() - 60_000),
      rrule: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    screenStateService = {
      getConnectedScreenIds: jest.fn().mockReturnValue([]),
    };
    entryRepository = { find: jest.fn().mockResolvedValue([]) };
    organisationRepository = { findOne: jest.fn().mockResolvedValue(null) };
    screenRepository = { find: jest.fn().mockResolvedValue([]) };
    eventEmitter = { emit: jest.fn() };

    service = new PlaylistChangeBridgeService(
      screenStateService as unknown as ScreenStateService,
      entryRepository as unknown as Repository<ScheduleEntry>,
      organisationRepository as unknown as Repository<Organisation>,
      screenRepository as unknown as Repository<Screen>,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  it('should skip all DB queries when no screens are connected', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([]);

    await service.handlePlaylistUpdated(
      new PlaylistUpdatedEvent(playlistId, orgId),
    );

    expect(entryRepository.find).not.toHaveBeenCalled();
    expect(organisationRepository.findOne).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should emit PLAYLIST_CHANGED for a screen with an active direct schedule entry', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    entryRepository.find.mockResolvedValue([
      activeEntry({ screenId: screenId1 }),
    ]);
    organisationRepository.findOne.mockResolvedValue({
      id: orgId,
      defaultPlaylistId: null,
    });

    await service.handlePlaylistUpdated(
      new PlaylistUpdatedEvent(playlistId, orgId),
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      PLAYLIST_CHANGED,
      expect.any(ScreenStateChangeEvent),
    );
    const emittedEvent = eventEmitter.emit.mock.calls.find(
      (c: unknown[]) => c[0] === PLAYLIST_CHANGED,
    )![1] as ScreenStateChangeEvent;
    expect(emittedEvent.screenId).toBe(screenId1);
    expect(emittedEvent.organisationId).toBe(orgId);
  });

  it('should not emit for a screen with an inactive schedule entry', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    entryRepository.find.mockResolvedValue([
      inactiveEntry({ screenId: screenId1 }),
    ]);
    organisationRepository.findOne.mockResolvedValue({
      id: orgId,
      defaultPlaylistId: null,
    });

    await service.handlePlaylistUpdated(
      new PlaylistUpdatedEvent(playlistId, orgId),
    );

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should detect screens via group schedule entries', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([
      screenId1,
      screenId2,
    ]);
    entryRepository.find.mockResolvedValue([activeEntry({ groupId })]);
    screenRepository.find.mockImplementation(
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.groupId === groupId) {
          return Promise.resolve([
            { id: screenId1, organisationId: orgId },
            { id: screenId2, organisationId: orgId },
          ]);
        }
        return Promise.resolve([]);
      },
    );
    organisationRepository.findOne.mockResolvedValue({
      id: orgId,
      defaultPlaylistId: null,
    });

    await service.handlePlaylistUpdated(
      new PlaylistUpdatedEvent(playlistId, orgId),
    );

    const playlistChangedCalls = eventEmitter.emit.mock.calls.filter(
      (c: unknown[]) => c[0] === PLAYLIST_CHANGED,
    );
    expect(playlistChangedCalls).toHaveLength(2);
    const screenIds = playlistChangedCalls.map(
      (c: unknown[]) => (c[1] as ScreenStateChangeEvent).screenId,
    );
    expect(screenIds).toContain(screenId1);
    expect(screenIds).toContain(screenId2);
  });

  it('should not notify disconnected screens in a group', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    entryRepository.find.mockResolvedValue([activeEntry({ groupId })]);
    screenRepository.find.mockImplementation(
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.groupId === groupId) {
          return Promise.resolve([
            { id: screenId1, organisationId: orgId },
            { id: screenId2, organisationId: orgId },
          ]);
        }
        return Promise.resolve([]);
      },
    );
    organisationRepository.findOne.mockResolvedValue({
      id: orgId,
      defaultPlaylistId: null,
    });

    await service.handlePlaylistUpdated(
      new PlaylistUpdatedEvent(playlistId, orgId),
    );

    const playlistChangedCalls = eventEmitter.emit.mock.calls.filter(
      (c: unknown[]) => c[0] === PLAYLIST_CHANGED,
    );
    expect(playlistChangedCalls).toHaveLength(1);
    expect(
      (playlistChangedCalls[0][1] as ScreenStateChangeEvent).screenId,
    ).toBe(screenId1);
  });

  it('should detect screens using the org default playlist', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    entryRepository.find.mockResolvedValue([]);
    organisationRepository.findOne.mockResolvedValue({
      id: orgId,
      defaultPlaylistId: playlistId,
    });
    screenRepository.find.mockResolvedValue([
      { id: screenId1, organisationId: orgId },
    ]);

    await service.handlePlaylistUpdated(
      new PlaylistUpdatedEvent(playlistId, orgId),
    );

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      PLAYLIST_CHANGED,
      expect.objectContaining({ screenId: screenId1, organisationId: orgId }),
    );
  });

  it('should not notify for a different org default playlist', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    entryRepository.find.mockResolvedValue([]);
    organisationRepository.findOne.mockResolvedValue({
      id: orgId,
      defaultPlaylistId: 'other-playlist-id',
    });

    await service.handlePlaylistUpdated(
      new PlaylistUpdatedEvent(playlistId, orgId),
    );

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should deduplicate screens found via both schedule and default', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    entryRepository.find.mockResolvedValue([
      activeEntry({ screenId: screenId1 }),
    ]);
    organisationRepository.findOne.mockResolvedValue({
      id: orgId,
      defaultPlaylistId: playlistId,
    });
    screenRepository.find.mockResolvedValue([
      { id: screenId1, organisationId: orgId },
    ]);

    await service.handlePlaylistUpdated(
      new PlaylistUpdatedEvent(playlistId, orgId),
    );

    const playlistChangedCalls = eventEmitter.emit.mock.calls.filter(
      (c: unknown[]) => c[0] === PLAYLIST_CHANGED,
    );
    expect(playlistChangedCalls).toHaveLength(1);
  });

  it('should handle errors gracefully without emitting events', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    entryRepository.find.mockRejectedValue(new Error('DB error'));

    await service.handlePlaylistUpdated(
      new PlaylistUpdatedEvent(playlistId, orgId),
    );

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
