import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  playlists,
  screenGroups,
  sliceJobs,
  type Organisation,
  type Playlist,
  type ScreenGroup,
} from '../db/schema';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import { SliceStatusService } from './slice-status.service';
import { SliceStatus } from './slice-status.enum';
import { SLICE_COMPLETED, SLICE_FAILED, SLICE_PROGRESS } from './slice-content.event';

describe('SliceStatusService', () => {
  let db: DrizzleDB;
  let service: SliceStatusService;
  let emit: jest.Mock;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    emit = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SliceStatusService,
        { provide: DRIZZLE, useValue: db },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();
    service = module.get(SliceStatusService);
  });

  async function seedOrg(): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC' })
      .returning();
    return org;
  }

  async function seedGroup(organisationId: string): Promise<ScreenGroup> {
    const [group] = await db
      .insert(screenGroups)
      .values({
        organisationId,
        name: 'Group',
        mode: ScreenGroupMode.Split,
        gridColumns: 2,
        gridRows: 1,
      })
      .returning();
    return group;
  }

  async function seedPlaylist(organisationId: string): Promise<Playlist> {
    const [playlist] = await db
      .insert(playlists)
      .values({ organisationId, name: 'PL' })
      .returning();
    return playlist;
  }

  async function setup(): Promise<{ orgId: string; groupId: string; playlistId: string }> {
    const org = await seedOrg();
    const group = await seedGroup(org.id);
    const playlist = await seedPlaylist(org.id);
    return { orgId: org.id, groupId: group.id, playlistId: playlist.id };
  }

  function readRow(groupId: string, playlistId: string) {
    return db
      .select()
      .from(sliceJobs)
      .where(and(eq(sliceJobs.groupId, groupId), eq(sliceJobs.playlistId, playlistId)))
      .limit(1)
      .then((rows) => rows[0]);
  }

  it('markQueued upserts a queued row', async () => {
    const { orgId, groupId, playlistId } = await setup();
    await service.markQueued(orgId, groupId, playlistId);
    const row = await readRow(groupId, playlistId);
    expect(row.status).toBe(SliceStatus.Queued);
    expect(row.completedItems).toBe(0);
  });

  it('markQueued is idempotent and resets progress on a second call', async () => {
    const { orgId, groupId, playlistId } = await setup();
    await service.markProcessing(orgId, groupId, playlistId, 4);
    await service.updateProgress(orgId, groupId, playlistId, 4, 3);
    await service.markQueued(orgId, groupId, playlistId);
    const row = await readRow(groupId, playlistId);
    expect(row.status).toBe(SliceStatus.Queued);
    expect(row.completedItems).toBe(0);
    const all = await db.select().from(sliceJobs).where(eq(sliceJobs.groupId, groupId));
    expect(all).toHaveLength(1);
  });

  it('markProcessing records total work and emits progress', async () => {
    const { orgId, groupId, playlistId } = await setup();
    await service.markProcessing(orgId, groupId, playlistId, 6);
    const row = await readRow(groupId, playlistId);
    expect(row.status).toBe(SliceStatus.Processing);
    expect(row.totalItems).toBe(6);
    expect(emit).toHaveBeenCalledWith(
      SLICE_PROGRESS,
      expect.objectContaining({ groupId, playlistId, totalItems: 6, completedItems: 0 }),
    );
  });

  it('updateProgress persists completed count and emits', async () => {
    const { orgId, groupId, playlistId } = await setup();
    await service.markProcessing(orgId, groupId, playlistId, 6);
    emit.mockClear();
    await service.updateProgress(orgId, groupId, playlistId, 6, 2);
    const row = await readRow(groupId, playlistId);
    expect(row.completedItems).toBe(2);
    expect(emit).toHaveBeenCalledWith(
      SLICE_PROGRESS,
      expect.objectContaining({ completedItems: 2, totalItems: 6 }),
    );
  });

  it('markCompleted sets status completed with full progress and emits', async () => {
    const { orgId, groupId, playlistId } = await setup();
    await service.markCompleted(orgId, groupId, playlistId, 4);
    const row = await readRow(groupId, playlistId);
    expect(row.status).toBe(SliceStatus.Completed);
    expect(row.completedItems).toBe(4);
    expect(row.totalItems).toBe(4);
    expect(emit).toHaveBeenCalledWith(
      SLICE_COMPLETED,
      expect.objectContaining({ groupId, playlistId, totalItems: 4 }),
    );
  });

  it('markFailed persists the error and emits', async () => {
    const { orgId, groupId, playlistId } = await setup();
    await service.markFailed(orgId, groupId, playlistId, 'ffmpeg boom');
    const row = await readRow(groupId, playlistId);
    expect(row.status).toBe(SliceStatus.Failed);
    expect(row.error).toBe('ffmpeg boom');
    expect(emit).toHaveBeenCalledWith(
      SLICE_FAILED,
      expect.objectContaining({ groupId, playlistId, error: 'ffmpeg boom' }),
    );
  });

  it('findForGroup returns the row, or null when none exists', async () => {
    const { orgId, groupId, playlistId } = await setup();
    expect(await service.findForGroup(groupId, playlistId)).toBeNull();
    await service.markQueued(orgId, groupId, playlistId);
    const found = await service.findForGroup(groupId, playlistId);
    expect(found?.groupId).toBe(groupId);
  });
});
