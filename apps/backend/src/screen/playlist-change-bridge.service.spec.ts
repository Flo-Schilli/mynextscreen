import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { PlaylistChangeBridgeService } from './playlist-change-bridge.service';
import { ScreenStateService } from './screen-state.service';
import { PlaylistUpdatedEvent } from '../playlist/playlist.event';
import { PLAYLIST_CHANGED, ScreenStateChangeEvent } from './screen-state.event';
import { DRIZZLE } from '../db/database.constants';
import { organisations, screens, screenGroups, playlists, scheduleEntries } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('PlaylistChangeBridgeService', () => {
  let service: PlaylistChangeBridgeService;
  let db: DrizzleDB;
  let screenStateService: { getConnectedScreenIds: jest.Mock };
  let emit: jest.Mock;

  let orgId: string;
  let playlistId: string;
  let groupId: string;
  let screenId1: string;
  let screenId2: string;

  const now = new Date();

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

    const [playlist] = await db
      .insert(playlists)
      .values({ organisationId: orgId, name: 'PL' })
      .returning();
    playlistId = playlist.id;

    const [group] = await db
      .insert(screenGroups)
      .values({ organisationId: orgId, name: 'Group' })
      .returning();
    groupId = group.id;

    const [s1] = await db
      .insert(screens)
      .values({
        organisationId: orgId,
        name: 'Screen 1',
        resolution: '1920x1080',
        location: 'L1',
        apiKeyHash: '$2b$10$hash',
      })
      .returning();
    screenId1 = s1.id;

    const [s2] = await db
      .insert(screens)
      .values({
        organisationId: orgId,
        name: 'Screen 2',
        resolution: '1920x1080',
        location: 'L2',
        apiKeyHash: '$2b$10$hash',
      })
      .returning();
    screenId2 = s2.id;

    screenStateService = {
      getConnectedScreenIds: jest.fn().mockReturnValue([]),
    };
    emit = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaylistChangeBridgeService,
        { provide: ScreenStateService, useValue: screenStateService },
        { provide: DRIZZLE, useValue: db },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();
    service = module.get<PlaylistChangeBridgeService>(PlaylistChangeBridgeService);
  });

  async function seedActiveEntry(
    overrides: { screenId?: string | null; groupId?: string | null } = {},
  ): Promise<void> {
    await db.insert(scheduleEntries).values({
      organisationId: orgId,
      playlistId,
      screenId: overrides.screenId ?? null,
      groupId: overrides.groupId ?? null,
      startTime: new Date(now.getTime() - 60_000),
      endTime: new Date(now.getTime() + 60_000),
      rrule: null,
      colour: '#fff',
    });
  }

  async function seedInactiveEntry(
    overrides: { screenId?: string | null; groupId?: string | null } = {},
  ): Promise<void> {
    await db.insert(scheduleEntries).values({
      organisationId: orgId,
      playlistId,
      screenId: overrides.screenId ?? null,
      groupId: overrides.groupId ?? null,
      startTime: new Date(now.getTime() - 120_000),
      endTime: new Date(now.getTime() - 60_000),
      rrule: null,
      colour: '#fff',
    });
  }

  function playlistChangedCalls(): unknown[][] {
    return emit.mock.calls.filter((c: unknown[]) => c[0] === PLAYLIST_CHANGED);
  }

  it('should skip all DB work when no screens are connected', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([]);
    await seedActiveEntry({ screenId: screenId1 });

    await service.handlePlaylistUpdated(new PlaylistUpdatedEvent(playlistId, orgId));

    expect(emit).not.toHaveBeenCalled();
  });

  it('should emit PLAYLIST_CHANGED for a screen with an active direct schedule entry', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    await seedActiveEntry({ screenId: screenId1 });

    await service.handlePlaylistUpdated(new PlaylistUpdatedEvent(playlistId, orgId));

    expect(emit).toHaveBeenCalledWith(PLAYLIST_CHANGED, expect.any(ScreenStateChangeEvent));
    const event = playlistChangedCalls()[0][1] as ScreenStateChangeEvent;
    expect(event.screenId).toBe(screenId1);
    expect(event.organisationId).toBe(orgId);
  });

  it('should not emit for a screen with an inactive schedule entry', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    await seedInactiveEntry({ screenId: screenId1 });

    await service.handlePlaylistUpdated(new PlaylistUpdatedEvent(playlistId, orgId));

    expect(emit).not.toHaveBeenCalled();
  });

  it('should detect screens via group schedule entries', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1, screenId2]);
    await db.update(screens).set({ groupId }).where(eq(screens.id, screenId1));
    await db.update(screens).set({ groupId }).where(eq(screens.id, screenId2));
    await seedActiveEntry({ groupId });

    await service.handlePlaylistUpdated(new PlaylistUpdatedEvent(playlistId, orgId));

    const calls = playlistChangedCalls();
    expect(calls).toHaveLength(2);
    const screenIds = calls.map((c) => (c[1] as ScreenStateChangeEvent).screenId);
    expect(screenIds).toContain(screenId1);
    expect(screenIds).toContain(screenId2);
  });

  it('should not notify disconnected screens in a group', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    await db.update(screens).set({ groupId }).where(eq(screens.id, screenId1));
    await db.update(screens).set({ groupId }).where(eq(screens.id, screenId2));
    await seedActiveEntry({ groupId });

    await service.handlePlaylistUpdated(new PlaylistUpdatedEvent(playlistId, orgId));

    const calls = playlistChangedCalls();
    expect(calls).toHaveLength(1);
    expect((calls[0][1] as ScreenStateChangeEvent).screenId).toBe(screenId1);
  });

  it('should detect screens using the org default playlist', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    await db
      .update(organisations)
      .set({ defaultPlaylistId: playlistId })
      .where(eq(organisations.id, orgId));

    await service.handlePlaylistUpdated(new PlaylistUpdatedEvent(playlistId, orgId));

    expect(emit).toHaveBeenCalledWith(
      PLAYLIST_CHANGED,
      expect.objectContaining({ screenId: screenId1, organisationId: orgId }),
    );
  });

  it('should not notify for a different org default playlist', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    const [other] = await db
      .insert(playlists)
      .values({ organisationId: orgId, name: 'Other' })
      .returning();
    await db
      .update(organisations)
      .set({ defaultPlaylistId: other.id })
      .where(eq(organisations.id, orgId));

    await service.handlePlaylistUpdated(new PlaylistUpdatedEvent(playlistId, orgId));

    expect(emit).not.toHaveBeenCalled();
  });

  it('should deduplicate screens found via both schedule and default', async () => {
    screenStateService.getConnectedScreenIds.mockReturnValue([screenId1]);
    await seedActiveEntry({ screenId: screenId1 });
    await db
      .update(organisations)
      .set({ defaultPlaylistId: playlistId })
      .where(eq(organisations.id, orgId));

    await service.handlePlaylistUpdated(new PlaylistUpdatedEvent(playlistId, orgId));

    expect(playlistChangedCalls()).toHaveLength(1);
  });
});
