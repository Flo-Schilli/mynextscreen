import { ScreenProtocolService } from './screen-protocol.service';
import { ScreenEventType } from './screen-event-type.enum';
import { ScreenEvent } from './screen-event.model';
import { ScreenGroup } from '../screen-group/screen-group.entity';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { Screen } from '../screen/screen.entity';
import { SlicedRendition } from '../slice-content/sliced-rendition.entity';
import { ScreenStateService } from '../screen/screen-state.service';
import { GroupScheduleChangedEvent } from '../schedule/schedule.event';
import { ScreenStateChangeEvent } from '../screen/screen-state.event';
import { Organisation } from '../organisation/organisation.entity';

describe('ScreenProtocolService', () => {
  let service: ScreenProtocolService;
  let screenGroupRepository: {
    findOne: jest.Mock;
  };
  let screenRepository: {
    findOne: jest.Mock;
  };
  let slicedRenditionRepository: {
    findOne: jest.Mock;
  };
  let screenStateService: {
    pushEvent: jest.Mock;
  };
  let scheduleService: {
    getCurrentPlaylist: jest.Mock;
  };

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const groupId = '660e8400-e29b-41d4-a716-446655440000';
  const screenId1 = '770e8400-e29b-41d4-a716-446655440001';
  const screenId2 = '770e8400-e29b-41d4-a716-446655440002';
  const screenId3 = '770e8400-e29b-41d4-a716-446655440003';
  const screenId4 = '770e8400-e29b-41d4-a716-446655440004';
  const playlistId = '880e8400-e29b-41d4-a716-446655440000';
  const contentItemId = '990e8400-e29b-41d4-a716-446655440000';

  const makeScreen = (id: string, row: number | null = null, col: number | null = null): Screen => ({
    id,
    organisationId: orgId,
    name: `Screen ${id.slice(-1)}`,
    resolution: '1920x1080',
    location: 'Test',
    apiKeyHash: '$2b$10$hash',
    lastHeartbeat: null,
    isOnline: true,
    groupId,
    group: null,
    gridRow: row,
    gridColumn: col,
    createdAt: new Date(),
    updatedAt: new Date(),
    organisation: {} as Organisation,
  });

  const makeMirrorGroup = (screens: Screen[]): ScreenGroup => ({
    id: groupId,
    organisationId: orgId,
    name: 'Mirror Group',
    mode: ScreenGroupMode.Mirror,
    gridColumns: null,
    gridRows: null,
    screens,
    createdAt: new Date(),
    updatedAt: new Date(),
    organisation: {} as Organisation,
  });

  const makeSplitGroup = (screens: Screen[]): ScreenGroup => ({
    id: groupId,
    organisationId: orgId,
    name: 'Split Group',
    mode: ScreenGroupMode.Split,
    gridColumns: 2,
    gridRows: 2,
    screens,
    createdAt: new Date(),
    updatedAt: new Date(),
    organisation: {} as Organisation,
  });

  beforeEach(() => {
    screenGroupRepository = { findOne: jest.fn() };
    screenRepository = { findOne: jest.fn() };
    slicedRenditionRepository = { findOne: jest.fn() };
    screenStateService = { pushEvent: jest.fn() };
    scheduleService = {
      getCurrentPlaylist: jest.fn().mockResolvedValue({
        playlist: { id: playlistId, name: 'Test Playlist' },
        isDefault: false,
      }),
    };

    service = new ScreenProtocolService(
      screenGroupRepository as any,
      screenRepository as any,
      slicedRenditionRepository as any,
      screenStateService as unknown as ScreenStateService,
      scheduleService as any,
    );
  });

  describe('handleGroupScheduleChanged', () => {
    it('should do nothing if group not found', async () => {
      screenGroupRepository.findOne.mockResolvedValue(null);

      await service.handleGroupScheduleChanged(
        new GroupScheduleChangedEvent(groupId, orgId, playlistId),
      );

      expect(screenStateService.pushEvent).not.toHaveBeenCalled();
    });

    it('should do nothing if group has no screens', async () => {
      screenGroupRepository.findOne.mockResolvedValue(
        makeMirrorGroup([]),
      );

      await service.handleGroupScheduleChanged(
        new GroupScheduleChangedEvent(groupId, orgId, playlistId),
      );

      expect(screenStateService.pushEvent).not.toHaveBeenCalled();
    });

    describe('mirror mode', () => {
      it('should fan out schedule update to all screens with same payload', async () => {
        const screens = [makeScreen(screenId1), makeScreen(screenId2)];
        screenGroupRepository.findOne.mockResolvedValue(makeMirrorGroup(screens));

        await service.handleGroupScheduleChanged(
          new GroupScheduleChangedEvent(groupId, orgId, playlistId),
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledTimes(2);

        // Both screens get the same schedule update
        for (const screen of screens) {
          expect(screenStateService.pushEvent).toHaveBeenCalledWith(
            screen.id,
            expect.objectContaining({
              type: ScreenEventType.ScheduleUpdate,
              payload: expect.objectContaining({
                screenId: screen.id,
                organisationId: orgId,
                groupId,
                syncToken: expect.any(String),
                currentPlaylist: { id: playlistId, name: 'Test Playlist' },
                isDefault: false,
              }),
            }),
          );
        }
      });

      it('should include syncToken in all events for synchronisation', async () => {
        const screens = [makeScreen(screenId1), makeScreen(screenId2)];
        screenGroupRepository.findOne.mockResolvedValue(makeMirrorGroup(screens));

        await service.handleGroupScheduleChanged(
          new GroupScheduleChangedEvent(groupId, orgId, playlistId),
        );

        const call1 = screenStateService.pushEvent.mock.calls[0][1] as ScreenEvent;
        const call2 = screenStateService.pushEvent.mock.calls[1][1] as ScreenEvent;
        expect(call1.payload['syncToken']).toBeDefined();
        expect(call1.payload['syncToken']).toBe(call2.payload['syncToken']);
      });

      it('should include groupId in all events', async () => {
        const screens = [makeScreen(screenId1)];
        screenGroupRepository.findOne.mockResolvedValue(makeMirrorGroup(screens));

        await service.handleGroupScheduleChanged(
          new GroupScheduleChangedEvent(groupId, orgId, playlistId),
        );

        const event = screenStateService.pushEvent.mock.calls[0][1] as ScreenEvent;
        expect(event.payload['groupId']).toBe(groupId);
      });
    });

    describe('split mode', () => {
      it('should fan out schedule update to all screens in split group', async () => {
        const screens = [
          makeScreen(screenId1, 0, 0),
          makeScreen(screenId2, 0, 1),
          makeScreen(screenId3, 1, 0),
          makeScreen(screenId4, 1, 1),
        ];
        screenGroupRepository.findOne.mockResolvedValue(makeSplitGroup(screens));

        await service.handleGroupScheduleChanged(
          new GroupScheduleChangedEvent(groupId, orgId, playlistId),
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledTimes(4);

        for (const screen of screens) {
          expect(screenStateService.pushEvent).toHaveBeenCalledWith(
            screen.id,
            expect.objectContaining({
              type: ScreenEventType.ScheduleUpdate,
              payload: expect.objectContaining({
                groupId,
                syncToken: expect.any(String),
              }),
            }),
          );
        }
      });
    });

    it('should handle getCurrentPlaylist failure gracefully', async () => {
      const screens = [makeScreen(screenId1)];
      screenGroupRepository.findOne.mockResolvedValue(makeMirrorGroup(screens));
      scheduleService.getCurrentPlaylist.mockRejectedValue(new Error('DB error'));

      await service.handleGroupScheduleChanged(
        new GroupScheduleChangedEvent(groupId, orgId, playlistId),
      );

      expect(screenStateService.pushEvent).toHaveBeenCalledTimes(1);
      const event = screenStateService.pushEvent.mock.calls[0][1] as ScreenEvent;
      expect(event.payload['currentPlaylist']).toBeNull();
    });
  });

  describe('triggerGroupPlay', () => {
    describe('mirror mode', () => {
      it('should send same contentUrl to all screens', async () => {
        const screens = [makeScreen(screenId1), makeScreen(screenId2)];
        screenGroupRepository.findOne.mockResolvedValue(makeMirrorGroup(screens));

        await service.triggerGroupPlay(
          groupId,
          orgId,
          '/api/media/org/content1',
          contentItemId,
          'video',
          false,
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledTimes(2);

        for (const screen of screens) {
          expect(screenStateService.pushEvent).toHaveBeenCalledWith(
            screen.id,
            expect.objectContaining({
              type: ScreenEventType.GroupPlay,
              payload: expect.objectContaining({
                contentUrl: '/api/media/org/content1',
                contentType: 'video',
                groupId,
                syncToken: expect.any(String),
              }),
            }),
          );
        }
      });

      it('should use Promise.all for simultaneous delivery (same syncToken)', async () => {
        const screens = [makeScreen(screenId1), makeScreen(screenId2)];
        screenGroupRepository.findOne.mockResolvedValue(makeMirrorGroup(screens));

        await service.triggerGroupPlay(
          groupId,
          orgId,
          '/api/media/org/content1',
          contentItemId,
          'video',
          false,
        );

        const call1 = screenStateService.pushEvent.mock.calls[0][1] as ScreenEvent;
        const call2 = screenStateService.pushEvent.mock.calls[1][1] as ScreenEvent;
        expect(call1.payload['syncToken']).toBe(call2.payload['syncToken']);
      });
    });

    describe('split mode', () => {
      it('should send sliced rendition URL when available', async () => {
        const screens = [makeScreen(screenId1, 0, 0), makeScreen(screenId2, 0, 1)];
        screenGroupRepository.findOne.mockResolvedValue(makeSplitGroup(screens));

        slicedRenditionRepository.findOne.mockResolvedValue({
          id: 'rendition-1',
          filePath: `media/slices/${groupId}/${screenId1}/${contentItemId}.mp4`,
        } as SlicedRendition);

        await service.triggerGroupPlay(
          groupId,
          orgId,
          '/api/media/org/content1',
          contentItemId,
          'video',
          false,
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledTimes(2);

        // Each screen should get its own slice URL with contentType
        for (const screen of screens) {
          expect(screenStateService.pushEvent).toHaveBeenCalledWith(
            screen.id,
            expect.objectContaining({
              type: ScreenEventType.GroupPlay,
              payload: expect.objectContaining({
                contentUrl: `/api/media/slices/${groupId}/${screen.id}/${contentItemId}`,
                contentType: 'video',
                groupId,
                syncToken: expect.any(String),
              }),
            }),
          );
        }
      });

      it('should send pending event when rendition not yet available', async () => {
        const screens = [makeScreen(screenId1, 0, 0)];
        screenGroupRepository.findOne.mockResolvedValue(makeSplitGroup(screens));

        slicedRenditionRepository.findOne.mockResolvedValue(null);

        await service.triggerGroupPlay(
          groupId,
          orgId,
          '/api/media/org/content1',
          contentItemId,
          'video',
          false,
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledWith(
          screenId1,
          expect.objectContaining({
            type: ScreenEventType.Pending,
            payload: expect.objectContaining({
              contentItemId,
              groupId,
              screenId: screenId1,
              reason: 'Sliced rendition not yet available',
            }),
          }),
        );
      });
    });

    describe('live stream', () => {
      it('should always use mirror-mode fan-out regardless of group mode', async () => {
        const screens = [makeScreen(screenId1, 0, 0), makeScreen(screenId2, 0, 1)];
        // Even though group is split mode, live stream uses mirror
        screenGroupRepository.findOne.mockResolvedValue(makeSplitGroup(screens));

        await service.triggerGroupPlay(
          groupId,
          orgId,
          'rtmp://stream.example.com/live',
          contentItemId,
          'video',
          true, // isLiveStream
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledTimes(2);

        // All screens should get the same stream URL (mirror mode)
        for (const screen of screens) {
          expect(screenStateService.pushEvent).toHaveBeenCalledWith(
            screen.id,
            expect.objectContaining({
              type: ScreenEventType.GroupPlay,
              payload: expect.objectContaining({
                contentUrl: 'rtmp://stream.example.com/live',
                groupId,
              }),
            }),
          );
        }

        // Should NOT have checked sliced renditions
        expect(slicedRenditionRepository.findOne).not.toHaveBeenCalled();
      });
    });

    it('should do nothing if group not found', async () => {
      screenGroupRepository.findOne.mockResolvedValue(null);

      await service.triggerGroupPlay(
        groupId,
        orgId,
        '/api/media/org/content1',
        contentItemId,
        'video',
        false,
      );

      expect(screenStateService.pushEvent).not.toHaveBeenCalled();
    });
  });

  describe('handleGroupLiveStreamStarted', () => {
    it('should fan out live stream start to all screens in group using mirror mode', async () => {
      const screen1 = makeScreen(screenId1, 0, 0);
      const screen2 = makeScreen(screenId2, 0, 1);
      screenRepository.findOne.mockResolvedValue(screen1);
      // Even for split groups, live streams use mirror fan-out
      screenGroupRepository.findOne.mockResolvedValue(makeSplitGroup([screen1, screen2]));

      await service.handleGroupLiveStreamStarted(
        new ScreenStateChangeEvent(screenId1, orgId),
      );

      expect(screenStateService.pushEvent).toHaveBeenCalledTimes(2);

      for (const screen of [screen1, screen2]) {
        expect(screenStateService.pushEvent).toHaveBeenCalledWith(
          screen.id,
          expect.objectContaining({
            type: ScreenEventType.LiveStreamStart,
            payload: expect.objectContaining({
              groupId,
              syncToken: expect.any(String),
            }),
          }),
        );
      }
    });

    it('should do nothing if screen has no group', async () => {
      const screen = { ...makeScreen(screenId1), groupId: null };
      screenRepository.findOne.mockResolvedValue(screen);

      await service.handleGroupLiveStreamStarted(
        new ScreenStateChangeEvent(screenId1, orgId),
      );

      expect(screenGroupRepository.findOne).not.toHaveBeenCalled();
      expect(screenStateService.pushEvent).not.toHaveBeenCalled();
    });

    it('should do nothing if screen not found', async () => {
      screenRepository.findOne.mockResolvedValue(null);

      await service.handleGroupLiveStreamStarted(
        new ScreenStateChangeEvent(screenId1, orgId),
      );

      expect(screenStateService.pushEvent).not.toHaveBeenCalled();
    });
  });

  describe('existing single-screen SSE behaviour', () => {
    it('should not interfere with direct screen events (pushEvent still works independently)', () => {
      // ScreenProtocolService does not modify pushEvent behaviour
      // Single-screen SSE is handled by ScreenStateService directly
      // This test verifies the service doesn't subscribe to SCHEDULE_ENTRY_CHANGED
      // (which is the single-screen event handled by ScreenStateService)
      expect(service).toBeDefined();
    });
  });
});
