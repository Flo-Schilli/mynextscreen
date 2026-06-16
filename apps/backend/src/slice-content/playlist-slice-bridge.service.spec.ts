import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  playlists,
  scheduleEntries,
  screenGroups,
  type Organisation,
  type Playlist,
} from '../db/schema';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import { PlaylistSliceBridgeService } from './playlist-slice-bridge.service';
import { SliceEnqueueService } from './slice-enqueue.service';
import { PlaylistUpdatedEvent } from '../playlist/playlist.event';

describe('PlaylistSliceBridgeService', () => {
  let db: DrizzleDB;
  let service: PlaylistSliceBridgeService;
  let enqueueForGroup: jest.Mock;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    enqueueForGroup = jest.fn().mockResolvedValue(true);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaylistSliceBridgeService,
        { provide: DRIZZLE, useValue: db },
        { provide: SliceEnqueueService, useValue: { enqueueForGroup } },
      ],
    }).compile();
    service = module.get(PlaylistSliceBridgeService);
  });

  async function seedOrg(): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    return org;
  }

  async function seedPlaylist(organisationId: string): Promise<Playlist> {
    const [playlist] = await db
      .insert(playlists)
      .values({ organisationId, name: 'PL' })
      .returning();
    return playlist;
  }

  async function seedGroup(organisationId: string) {
    const [group] = await db
      .insert(screenGroups)
      .values({
        organisationId,
        name: 'G',
        mode: ScreenGroupMode.Split,
        gridColumns: 2,
        gridRows: 1,
      })
      .returning();
    return group;
  }

  async function seedGroupEntry(organisationId: string, groupId: string, playlistId: string) {
    await db.insert(scheduleEntries).values({
      organisationId,
      groupId,
      playlistId,
      startTime: new Date('2026-04-01T10:00:00Z'),
      endTime: new Date('2026-04-01T12:00:00Z'),
      colour: '#fff',
    });
  }

  it('enqueues a re-slice for each distinct group scheduled with the playlist', async () => {
    const org = await seedOrg();
    const playlist = await seedPlaylist(org.id);
    const groupA = await seedGroup(org.id);
    const groupB = await seedGroup(org.id);
    await seedGroupEntry(org.id, groupA.id, playlist.id);
    await seedGroupEntry(org.id, groupB.id, playlist.id);
    // A second entry on group A must not double-enqueue.
    await seedGroupEntry(org.id, groupA.id, playlist.id);

    await service.handlePlaylistUpdated(new PlaylistUpdatedEvent(playlist.id, org.id));

    expect(enqueueForGroup).toHaveBeenCalledTimes(2);
    const groupIds = enqueueForGroup.mock.calls.map((c) => c[1]).sort();
    expect(groupIds).toEqual([groupA.id, groupB.id].sort());
  });

  it('does nothing when the playlist has no group schedule entries', async () => {
    const org = await seedOrg();
    const playlist = await seedPlaylist(org.id);

    await service.handlePlaylistUpdated(new PlaylistUpdatedEvent(playlist.id, org.id));

    expect(enqueueForGroup).not.toHaveBeenCalled();
  });

  it('continues past an enqueue failure for other groups', async () => {
    const org = await seedOrg();
    const playlist = await seedPlaylist(org.id);
    const groupA = await seedGroup(org.id);
    const groupB = await seedGroup(org.id);
    await seedGroupEntry(org.id, groupA.id, playlist.id);
    await seedGroupEntry(org.id, groupB.id, playlist.id);
    enqueueForGroup.mockRejectedValueOnce(new Error('boom'));

    await expect(
      service.handlePlaylistUpdated(new PlaylistUpdatedEvent(playlist.id, org.id)),
    ).resolves.toBeUndefined();
    expect(enqueueForGroup).toHaveBeenCalledTimes(2);
  });
});
