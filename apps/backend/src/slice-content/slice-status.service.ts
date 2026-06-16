import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { sliceJobs, type SliceJob } from '../db/schema';
import { SliceStatus } from './slice-status.enum';
import {
  SLICE_COMPLETED,
  SLICE_FAILED,
  SLICE_PROGRESS,
  SliceCompletedEvent,
  SliceFailedEvent,
  SliceProgressEvent,
} from './slice-content.event';

/**
 * Owns the durable `slice_jobs` read-model (one row per group+playlist) and the
 * `slice.*` event emits. All enqueue sites and the processor go through here so
 * status transitions live in one place. Progress % is derived downstream from
 * `completedItems / totalItems`.
 */
@Injectable()
export class SliceStatusService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Upsert to `queued`, resetting progress. Called when a slice job is enqueued. */
  async markQueued(organisationId: string, groupId: string, playlistId: string): Promise<void> {
    await this.db
      .insert(sliceJobs)
      .values({
        organisationId,
        groupId,
        playlistId,
        status: SliceStatus.Queued,
        totalItems: 0,
        completedItems: 0,
        error: null,
      })
      .onConflictDoUpdate({
        target: [sliceJobs.groupId, sliceJobs.playlistId],
        set: {
          status: SliceStatus.Queued,
          completedItems: 0,
          error: null,
          updatedAt: sql`now()`,
        },
      });
  }

  /** Transition to `processing` and record the total work units (items × screens). */
  async markProcessing(
    organisationId: string,
    groupId: string,
    playlistId: string,
    totalItems: number,
  ): Promise<void> {
    await this.upsert(organisationId, groupId, playlistId, {
      status: SliceStatus.Processing,
      totalItems,
      completedItems: 0,
      error: null,
    });
    this.eventEmitter.emit(
      SLICE_PROGRESS,
      new SliceProgressEvent(organisationId, groupId, playlistId, totalItems, 0),
    );
  }

  /** Report incremental progress during slicing. */
  async updateProgress(
    organisationId: string,
    groupId: string,
    playlistId: string,
    totalItems: number,
    completedItems: number,
  ): Promise<void> {
    await this.upsert(organisationId, groupId, playlistId, { completedItems });
    this.eventEmitter.emit(
      SLICE_PROGRESS,
      new SliceProgressEvent(organisationId, groupId, playlistId, totalItems, completedItems),
    );
  }

  /** Transition to `completed`. */
  async markCompleted(
    organisationId: string,
    groupId: string,
    playlistId: string,
    totalItems: number,
  ): Promise<void> {
    await this.upsert(organisationId, groupId, playlistId, {
      status: SliceStatus.Completed,
      totalItems,
      completedItems: totalItems,
      error: null,
    });
    this.eventEmitter.emit(
      SLICE_COMPLETED,
      new SliceCompletedEvent(organisationId, groupId, playlistId, totalItems),
    );
  }

  /** Transition to `failed`, persisting the error message. */
  async markFailed(
    organisationId: string,
    groupId: string,
    playlistId: string,
    error: string,
  ): Promise<void> {
    await this.upsert(organisationId, groupId, playlistId, {
      status: SliceStatus.Failed,
      error,
    });
    this.eventEmitter.emit(
      SLICE_FAILED,
      new SliceFailedEvent(organisationId, groupId, playlistId, error),
    );
  }

  /** Latest slice status for a group's playlist, or null if never sliced. */
  async findForGroup(groupId: string, playlistId: string): Promise<SliceJob | null> {
    const [row] = await this.db
      .select()
      .from(sliceJobs)
      .where(and(eq(sliceJobs.groupId, groupId), eq(sliceJobs.playlistId, playlistId)))
      .limit(1);
    return row ?? null;
  }

  private async upsert(
    organisationId: string,
    groupId: string,
    playlistId: string,
    set: Partial<typeof sliceJobs.$inferInsert>,
  ): Promise<void> {
    await this.db
      .insert(sliceJobs)
      .values({
        organisationId,
        groupId,
        playlistId,
        ...set,
      })
      .onConflictDoUpdate({
        target: [sliceJobs.groupId, sliceJobs.playlistId],
        set: { ...set, updatedAt: sql`now()` },
      });
  }
}
