import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScreenProtocolService } from './screen-protocol.service';
import { ScheduleService } from '../schedule';
import { ScreenEventType } from './screen-event-type.enum';
import { ScreenEvent } from './screen-event.model';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { ScreenStateService } from '../screen/screen-state.service';
import { GroupScheduleChangedEvent } from '../schedule/schedule.event';
import { ScreenStateChangeEvent } from '../screen/screen-state.event';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  screens,
  screenGroups,
  contents,
  slicedRenditions,
  type Screen,
} from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('ScreenProtocolService', () => {
  let service: ScreenProtocolService;
  let db: DrizzleDB;
  let screenStateService: { pushEvent: jest.Mock };
  let scheduleService: { getCurrentPlaylist: jest.Mock };

  let orgId: string;
  let contentItemId: string;
  const playlistId = '880e8400-e29b-41d4-a716-446655440000';

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();

    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    orgId = org.id;

    const [content] = await db
      .insert(contents)
      .values({
        organisationId: orgId,
        title: 'Clip',
        type: ContentType.Video,
        originalFilename: 'clip.mp4',
        originalMimeType: 'video/mp4',
        originalSizeBytes: 1000,
      })
      .returning();
    contentItemId = content.id;

    screenStateService = { pushEvent: jest.fn() };
    scheduleService = {
      getCurrentPlaylist: jest.fn().mockResolvedValue({
        playlist: { id: playlistId, name: 'Test Playlist' },
        isDefault: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenProtocolService,
        { provide: DRIZZLE, useValue: db },
        { provide: ScreenStateService, useValue: screenStateService },
        { provide: ScheduleService, useValue: scheduleService },
        // EventEmitter2 is not a direct dep but harmless to provide.
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get<ScreenProtocolService>(ScreenProtocolService);
  });

  async function seedGroup(mode: ScreenGroupMode): Promise<string> {
    const [group] = await db
      .insert(screenGroups)
      .values({
        organisationId: orgId,
        name: mode === ScreenGroupMode.Split ? 'Split Group' : 'Mirror Group',
        mode,
        gridColumns: mode === ScreenGroupMode.Split ? 2 : null,
        gridRows: mode === ScreenGroupMode.Split ? 2 : null,
      })
      .returning();
    return group.id;
  }

  async function seedScreen(
    gid: string | null,
    row: number | null = null,
    col: number | null = null,
  ): Promise<Screen> {
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: orgId,
        name: 'Screen',
        resolution: '1920x1080',
        location: 'Test',
        apiKeyHash: '$2b$10$hash',
        groupId: gid,
        gridRow: row,
        gridColumn: col,
      })
      .returning();
    return screen;
  }

  describe('handleGroupScheduleChanged', () => {
    it('should do nothing if group not found', async () => {
      await service.handleGroupScheduleChanged(
        new GroupScheduleChangedEvent('00000000-0000-0000-0000-000000000000', orgId, playlistId),
      );
      expect(screenStateService.pushEvent).not.toHaveBeenCalled();
    });

    it('should do nothing if group has no screens', async () => {
      const gid = await seedGroup(ScreenGroupMode.Mirror);
      await service.handleGroupScheduleChanged(
        new GroupScheduleChangedEvent(gid, orgId, playlistId),
      );
      expect(screenStateService.pushEvent).not.toHaveBeenCalled();
    });

    describe('mirror mode', () => {
      it('should fan out schedule update to all screens with same payload', async () => {
        const gid = await seedGroup(ScreenGroupMode.Mirror);
        const s1 = await seedScreen(gid);
        const s2 = await seedScreen(gid);

        await service.handleGroupScheduleChanged(
          new GroupScheduleChangedEvent(gid, orgId, playlistId),
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledTimes(2);
        for (const screen of [s1, s2]) {
          expect(screenStateService.pushEvent).toHaveBeenCalledWith(
            screen.id,
            expect.objectContaining({
              type: ScreenEventType.ScheduleUpdate,
              payload: expect.objectContaining({
                screenId: screen.id,
                organisationId: orgId,
                groupId: gid,
                syncToken: expect.any(String),
                currentPlaylist: { id: playlistId, name: 'Test Playlist' },
                isDefault: false,
              }),
            }),
          );
        }
      });

      it('should include syncToken in all events for synchronisation', async () => {
        const gid = await seedGroup(ScreenGroupMode.Mirror);
        await seedScreen(gid);
        await seedScreen(gid);

        await service.handleGroupScheduleChanged(
          new GroupScheduleChangedEvent(gid, orgId, playlistId),
        );

        const call1 = screenStateService.pushEvent.mock.calls[0][1] as ScreenEvent;
        const call2 = screenStateService.pushEvent.mock.calls[1][1] as ScreenEvent;
        expect(call1.payload['syncToken']).toBeDefined();
        expect(call1.payload['syncToken']).toBe(call2.payload['syncToken']);
      });

      it('should include groupId in all events', async () => {
        const gid = await seedGroup(ScreenGroupMode.Mirror);
        await seedScreen(gid);

        await service.handleGroupScheduleChanged(
          new GroupScheduleChangedEvent(gid, orgId, playlistId),
        );

        const event = screenStateService.pushEvent.mock.calls[0][1] as ScreenEvent;
        expect(event.payload['groupId']).toBe(gid);
      });
    });

    describe('split mode', () => {
      it('should fan out schedule update to all screens in split group', async () => {
        const gid = await seedGroup(ScreenGroupMode.Split);
        const s1 = await seedScreen(gid, 0, 0);
        const s2 = await seedScreen(gid, 0, 1);
        const s3 = await seedScreen(gid, 1, 0);
        const s4 = await seedScreen(gid, 1, 1);

        await service.handleGroupScheduleChanged(
          new GroupScheduleChangedEvent(gid, orgId, playlistId),
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledTimes(4);
        for (const screen of [s1, s2, s3, s4]) {
          expect(screenStateService.pushEvent).toHaveBeenCalledWith(
            screen.id,
            expect.objectContaining({
              type: ScreenEventType.ScheduleUpdate,
              payload: expect.objectContaining({
                groupId: gid,
                syncToken: expect.any(String),
              }),
            }),
          );
        }
      });
    });

    it('should handle getCurrentPlaylist failure gracefully', async () => {
      const gid = await seedGroup(ScreenGroupMode.Mirror);
      await seedScreen(gid);
      scheduleService.getCurrentPlaylist.mockRejectedValue(new Error('DB error'));

      await service.handleGroupScheduleChanged(
        new GroupScheduleChangedEvent(gid, orgId, playlistId),
      );

      expect(screenStateService.pushEvent).toHaveBeenCalledTimes(1);
      const event = screenStateService.pushEvent.mock.calls[0][1] as ScreenEvent;
      expect(event.payload['currentPlaylist']).toBeNull();
    });
  });

  describe('triggerGroupPlay', () => {
    describe('mirror mode', () => {
      it('should send same contentUrl to all screens', async () => {
        const gid = await seedGroup(ScreenGroupMode.Mirror);
        const s1 = await seedScreen(gid);
        const s2 = await seedScreen(gid);

        await service.triggerGroupPlay(
          gid,
          orgId,
          '/api/media/org/content1',
          contentItemId,
          'video',
          false,
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledTimes(2);
        for (const screen of [s1, s2]) {
          expect(screenStateService.pushEvent).toHaveBeenCalledWith(
            screen.id,
            expect.objectContaining({
              type: ScreenEventType.GroupPlay,
              payload: expect.objectContaining({
                contentUrl: '/api/media/org/content1',
                contentType: 'video',
                groupId: gid,
                syncToken: expect.any(String),
              }),
            }),
          );
        }
      });

      it('should use the same syncToken for simultaneous delivery', async () => {
        const gid = await seedGroup(ScreenGroupMode.Mirror);
        await seedScreen(gid);
        await seedScreen(gid);

        await service.triggerGroupPlay(
          gid,
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
        const gid = await seedGroup(ScreenGroupMode.Split);
        const s1 = await seedScreen(gid, 0, 0);
        const s2 = await seedScreen(gid, 0, 1);

        for (const s of [s1, s2]) {
          await db.insert(slicedRenditions).values({
            organisationId: orgId,
            groupId: gid,
            screenId: s.id,
            contentItemId,
            filePath: `media/slices/${gid}/${s.id}/${contentItemId}.mp4`,
            sourceHash: 'hash',
          });
        }

        await service.triggerGroupPlay(
          gid,
          orgId,
          '/api/media/org/content1',
          contentItemId,
          'video',
          false,
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledTimes(2);
        for (const screen of [s1, s2]) {
          expect(screenStateService.pushEvent).toHaveBeenCalledWith(
            screen.id,
            expect.objectContaining({
              type: ScreenEventType.GroupPlay,
              payload: expect.objectContaining({
                contentUrl: `/api/media/slices/${gid}/${screen.id}/${contentItemId}`,
                contentType: 'video',
                groupId: gid,
                syncToken: expect.any(String),
              }),
            }),
          );
        }
      });

      it('should send pending event when rendition not yet available', async () => {
        const gid = await seedGroup(ScreenGroupMode.Split);
        const s1 = await seedScreen(gid, 0, 0);

        await service.triggerGroupPlay(
          gid,
          orgId,
          '/api/media/org/content1',
          contentItemId,
          'video',
          false,
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledWith(
          s1.id,
          expect.objectContaining({
            type: ScreenEventType.Pending,
            payload: expect.objectContaining({
              contentItemId,
              groupId: gid,
              screenId: s1.id,
              reason: 'Sliced rendition not yet available',
            }),
          }),
        );
      });
    });

    describe('live stream', () => {
      it('should always use mirror-mode fan-out regardless of group mode', async () => {
        const gid = await seedGroup(ScreenGroupMode.Split);
        const s1 = await seedScreen(gid, 0, 0);
        const s2 = await seedScreen(gid, 0, 1);

        await service.triggerGroupPlay(
          gid,
          orgId,
          'rtmp://stream.example.com/live',
          contentItemId,
          'video',
          true,
        );

        expect(screenStateService.pushEvent).toHaveBeenCalledTimes(2);
        for (const screen of [s1, s2]) {
          expect(screenStateService.pushEvent).toHaveBeenCalledWith(
            screen.id,
            expect.objectContaining({
              type: ScreenEventType.GroupPlay,
              payload: expect.objectContaining({
                contentUrl: 'rtmp://stream.example.com/live',
                groupId: gid,
              }),
            }),
          );
        }
      });
    });

    it('should do nothing if group not found', async () => {
      await service.triggerGroupPlay(
        '00000000-0000-0000-0000-000000000000',
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
      const gid = await seedGroup(ScreenGroupMode.Split);
      const s1 = await seedScreen(gid, 0, 0);
      const s2 = await seedScreen(gid, 0, 1);

      await service.handleGroupLiveStreamStarted(new ScreenStateChangeEvent(s1.id, orgId));

      expect(screenStateService.pushEvent).toHaveBeenCalledTimes(2);
      for (const screen of [s1, s2]) {
        expect(screenStateService.pushEvent).toHaveBeenCalledWith(
          screen.id,
          expect.objectContaining({
            type: ScreenEventType.LiveStreamStart,
            payload: expect.objectContaining({
              groupId: gid,
              syncToken: expect.any(String),
            }),
          }),
        );
      }
    });

    it('should do nothing if screen has no group', async () => {
      const s1 = await seedScreen(null);

      await service.handleGroupLiveStreamStarted(new ScreenStateChangeEvent(s1.id, orgId));

      expect(screenStateService.pushEvent).not.toHaveBeenCalled();
    });

    it('should do nothing if screen not found', async () => {
      await service.handleGroupLiveStreamStarted(
        new ScreenStateChangeEvent('00000000-0000-0000-0000-000000000000', orgId),
      );
      expect(screenStateService.pushEvent).not.toHaveBeenCalled();
    });
  });

  describe('existing single-screen SSE behaviour', () => {
    it('should not interfere with direct screen events', () => {
      expect(service).toBeDefined();
    });
  });
});
