import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  playlists,
  scheduleEntries,
  screenGroups,
  sliceJobs,
  type Organisation,
  type Playlist,
} from '../db/schema';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';
import { SLICE_QUEUED_STALE_MS, SliceEnqueueService } from './slice-enqueue.service';
import { SliceStatusService } from './slice-status.service';
import { SLICE_CONTENT_QUEUE } from './slice-content.constants';
import { SliceStatus } from './slice-status.enum';

describe('SliceEnqueueService', () => {
  let db: DrizzleDB;
  let service: SliceEnqueueService;
  let queueAdd: jest.Mock;
  let queueGetJobs: jest.Mock;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    queueAdd = jest.fn().mockResolvedValue(undefined);
    queueGetJobs = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SliceEnqueueService,
        SliceStatusService,
        { provide: DRIZZLE, useValue: db },
        {
          provide: getQueueToken(SLICE_CONTENT_QUEUE),
          useValue: { add: queueAdd, getJobs: queueGetJobs },
        },
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

  it('keeps the status queued and does not throw when the queue is unreachable', async () => {
    // Arrange
    const org = await seedOrg();
    const group = await seedGroup(org.id, ScreenGroupMode.Split);
    const playlist = await seedPlaylist(org.id);
    queueAdd.mockRejectedValueOnce(new Error('Connection is closed.'));

    // Act
    const result = await service.enqueueForGroup(org.id, group.id, playlist.id, 'sched-1');

    // Assert
    expect(result).toBe(true);
    const [row] = await db.select().from(sliceJobs).where(eq(sliceJobs.groupId, group.id));
    expect(row.status).toBe(SliceStatus.Queued);
  });

  describe('requeueStale', () => {
    const now = new Date();
    const longAgo = new Date(now.getTime() - SLICE_QUEUED_STALE_MS - 60_000);

    async function seedStuckJob(options: { withEntry: boolean; updatedAt?: Date }) {
      const org = await seedOrg();
      const group = await seedGroup(org.id, ScreenGroupMode.Split);
      const playlist = await seedPlaylist(org.id);
      await db.insert(sliceJobs).values({
        organisationId: org.id,
        groupId: group.id,
        playlistId: playlist.id,
        status: SliceStatus.Queued,
        updatedAt: options.updatedAt ?? longAgo,
      });
      let entryId: string | null = null;
      if (options.withEntry) {
        const [entry] = await db
          .insert(scheduleEntries)
          .values({
            organisationId: org.id,
            groupId: group.id,
            playlistId: playlist.id,
            startTime: new Date('2026-10-25T18:00:00Z'),
            endTime: new Date('2026-10-25T22:00:00Z'),
            colour: '#FF5733',
          })
          .returning();
        entryId = entry.id;
      }
      return { org, group, playlist, entryId };
    }

    it('re-queues a status stuck in queued with no job in the queue', async () => {
      // Arrange
      const { org, group, playlist, entryId } = await seedStuckJob({ withEntry: true });

      // Act
      const requeued = await service.requeueStale(now);

      // Assert
      expect(requeued).toBe(1);
      expect(queueAdd).toHaveBeenCalledWith('slice', {
        groupId: group.id,
        scheduleId: entryId,
        playlistId: playlist.id,
        organisationId: org.id,
      });
      const [row] = await db.select().from(sliceJobs).where(eq(sliceJobs.groupId, group.id));
      expect(row.updatedAt.getTime()).toBeGreaterThan(longAgo.getTime());
    });

    it('leaves a job alone that is still waiting in the queue', async () => {
      // Arrange
      const { group, playlist } = await seedStuckJob({ withEntry: true });
      queueGetJobs.mockResolvedValue([{ data: { groupId: group.id, playlistId: playlist.id } }]);

      // Act
      const requeued = await service.requeueStale(now);

      // Assert
      expect(requeued).toBe(0);
      expect(queueAdd).not.toHaveBeenCalled();
    });

    it('waits until the status has been queued for the stale period', async () => {
      // Arrange
      await seedStuckJob({ withEntry: true, updatedAt: new Date(now.getTime() - 60_000) });

      // Act
      const requeued = await service.requeueStale(now);

      // Assert
      expect(requeued).toBe(0);
      expect(queueGetJobs).not.toHaveBeenCalled();
    });

    it('skips a status whose group no longer schedules the playlist', async () => {
      // Arrange
      await seedStuckJob({ withEntry: false });

      // Act
      const requeued = await service.requeueStale(now);

      // Assert
      expect(requeued).toBe(0);
      expect(queueAdd).not.toHaveBeenCalled();
    });
  });
});
