import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screenGroups } from '../db/schema';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';
import { SLICE_CONTENT_QUEUE } from './slice-content.constants';
import { SliceContentJobData } from './slice-content.processor';
import { SliceStatusService } from './slice-status.service';

/**
 * Single entry point for enqueuing split-group slicing jobs. Used by both
 * {@link ScheduleService} (on schedule create/update) and the playlist→slice
 * bridge (on playlist content changes) so the "split-mode check + mark queued +
 * enqueue" sequence is not duplicated.
 */
@Injectable()
export class SliceEnqueueService {
  constructor(
    @InjectQueue(SLICE_CONTENT_QUEUE)
    private readonly sliceContentQueue: Queue<SliceContentJobData>,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly sliceStatus: SliceStatusService,
  ) {}

  /**
   * Enqueue a slice job for the group iff it exists and is in split mode.
   * Marks the durable status `queued` first so the UI reflects the pending run
   * immediately. Returns true if a job was enqueued.
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
    await this.sliceContentQueue.add('slice', {
      groupId,
      scheduleId,
      playlistId,
      organisationId,
    });
    return true;
  }
}
