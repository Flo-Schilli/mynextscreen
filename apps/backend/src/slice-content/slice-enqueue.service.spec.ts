import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  playlists,
  screenGroups,
  sliceJobs,
  type Organisation,
  type Playlist,
} from '../db/schema';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import { SliceEnqueueService } from './slice-enqueue.service';
import { SliceStatusService } from './slice-status.service';
import { SLICE_CONTENT_QUEUE } from './slice-content.constants';
import { SliceStatus } from './slice-status.enum';

describe('SliceEnqueueService', () => {
  let db: DrizzleDB;
  let service: SliceEnqueueService;
  let queueAdd: jest.Mock;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    queueAdd = jest.fn().mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SliceEnqueueService,
        SliceStatusService,
        { provide: DRIZZLE, useValue: db },
        { provide: getQueueToken(SLICE_CONTENT_QUEUE), useValue: { add: queueAdd } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get(SliceEnqueueService);
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

  async function seedGroup(organisationId: string, mode: ScreenGroupMode) {
    const [group] = await db
      .insert(screenGroups)
      .values({
        organisationId,
        name: 'Group',
        mode,
        ...(mode === ScreenGroupMode.Split ? { gridColumns: 2, gridRows: 1 } : {}),
      })
      .returning();
    return group;
  }

  it('enqueues and marks queued for a split group', async () => {
    const org = await seedOrg();
    const group = await seedGroup(org.id, ScreenGroupMode.Split);
    const playlist = await seedPlaylist(org.id);

    const result = await service.enqueueForGroup(org.id, group.id, playlist.id, 'sched-1');

    expect(result).toBe(true);
    expect(queueAdd).toHaveBeenCalledWith(
      'slice',
      expect.objectContaining({
        groupId: group.id,
        playlistId: playlist.id,
        organisationId: org.id,
      }),
    );
    const [row] = await db.select().from(sliceJobs).where(eq(sliceJobs.groupId, group.id));
    expect(row.status).toBe(SliceStatus.Queued);
  });

  it('does nothing for a mirror group', async () => {
    const org = await seedOrg();
    const group = await seedGroup(org.id, ScreenGroupMode.Mirror);
    const playlist = await seedPlaylist(org.id);

    const result = await service.enqueueForGroup(org.id, group.id, playlist.id, 'sched-1');

    expect(result).toBe(false);
    expect(queueAdd).not.toHaveBeenCalled();
    const rows = await db.select().from(sliceJobs).where(eq(sliceJobs.groupId, group.id));
    expect(rows).toHaveLength(0);
  });

  it('does nothing for a missing group', async () => {
    const org = await seedOrg();
    const playlist = await seedPlaylist(org.id);

    const result = await service.enqueueForGroup(
      org.id,
      '00000000-0000-0000-0000-000000000000',
      playlist.id,
      'sched-1',
    );

    expect(result).toBe(false);
    expect(queueAdd).not.toHaveBeenCalled();
  });
});
