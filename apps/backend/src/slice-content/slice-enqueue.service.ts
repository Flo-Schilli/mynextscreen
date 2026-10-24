import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobType, Queue } from 'bullmq';
import { and, eq, lt } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { scheduleEntries, screenGroups, sliceJobs } from '../db/schema';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { SLICE_CONTENT_QUEUE } from './slice-content.constants';
import { SliceContentJobData } from './slice-content.processor';
import { SliceStatus } from './slice-status.enum';
import { SliceStatusService } from './slice-status.service';

/** How long a `queued` status may wait without a job in the queue before it is re-queued. */
export const SLICE_QUEUED_STALE_MS = 10 * 60_000;

/** Queue states in which a job will still run. */
const PENDING_JOB_STATES: JobType[] = [
  'waiting',
  'delayed',
  'active',
  'prioritized',
  'waiting-children',
];

const sliceKey = (groupId: string, playlistId: string): string => `${groupId}:${playlistId}`;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Single entry point for enqueuing split-group slicing jobs. Used by both
 * {@link ScheduleService} (on schedule create/update) and the playlist→slice
 * bridge (on playlist content changes) so the "split-mode check + mark queued +
 * enqueue" sequence is not duplicated.
 */
@Injectable()
export class SliceEnqueueService {
  private readonly logger = new Logger(SliceEnqueueService.name);

  constructor(
    @InjectQueue(SLICE_CONTENT_QUEUE)
    private readonly sliceContentQueue: Queue<SliceContentJobData>,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly sliceStatus: SliceStatusService,
  ) {}

  /**
   * Enqueue a slice job for the group iff it exists and is in split mode.
   * Marks the durable status `queued` first so the UI reflects the pending run
   * immediately. Returns true if a run is pending: when the queue is
   * unreachable, the status stays `queued` and {@link requeueStale} adds the
   * job later, so the caller's write does not fail over it.
   */
  async enqueueForGroup(
    organisationId: string,
    groupId: string,
    playlistId: string,
    scheduleId: string,
  ): Promise<boolean> {
    const [group] = await this.db
      .select()
      .from(screenGroups)
      .where(and(eq(screenGroups.id, groupId), eq(screenGroups.organisationId, organisationId)))
      .limit(1);

    if (!group || group.mode !== ScreenGroupMode.Split) return false;

    await this.sliceStatus.markQueued(organisationId, groupId, playlistId);
    try {
      await this.sliceContentQueue.add('slice', {
        groupId,
        scheduleId,
        playlistId,
        organisationId,
      });
    } catch (error) {
      this.logger.warn(
        `Queueing slice job for group ${groupId} / playlist ${playlistId} failed, ` +
          `retried later: ${errorMessage(error)}`,
      );
    }
    return true;
  }

  /**
   * Re-queues slice jobs whose status has been `queued` for longer than
   * {@link SLICE_QUEUED_STALE_MS} with no job left in the queue, e.g. because
   * Redis was down when the job was added. A status without a schedule entry
   * for its group and playlist needs no slicing any more and is left alone.
   * Returns how many jobs were added.
   */
  async requeueStale(now: Date): Promise<number> {
    const stale = await this.db
      .select()
      .from(sliceJobs)
      .where(
        and(
          eq(sliceJobs.status, SliceStatus.Queued),
          lt(sliceJobs.updatedAt, new Date(now.getTime() - SLICE_QUEUED_STALE_MS)),
        ),
      );
    if (stale.length === 0) return 0;

    const pendingJobs = await this.sliceContentQueue.getJobs(PENDING_JOB_STATES);
    const pending = new Set(
      pendingJobs.filter(Boolean).map((job) => sliceKey(job.data.groupId, job.data.playlistId)),
    );

    let requeued = 0;
    for (const row of stale) {
      if (pending.has(sliceKey(row.groupId, row.playlistId))) continue;
      const [entry] = await this.db
        .select({ id: scheduleEntries.id })
        .from(scheduleEntries)
        .where(
          and(
            eq(scheduleEntries.groupId, row.groupId),
            eq(scheduleEntries.playlistId, row.playlistId),
          ),
        )
        .limit(1);
      if (!entry) continue;

      await this.sliceContentQueue.add('slice', {
        groupId: row.groupId,
        scheduleId: entry.id,
        playlistId: row.playlistId,
        organisationId: row.organisationId,
      });
      // Restarts the stale clock, so a job still waiting is not added twice.
      await this.sliceStatus.markQueued(row.organisationId, row.groupId, row.playlistId);
      requeued += 1;
    }
    return requeued;
  }
}
