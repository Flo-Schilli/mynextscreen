import { Injectable, Logger, OnApplicationBootstrap, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { contents } from '../db/schema';
import { TranscodingStatus } from './transcoding-status.enum';
import { THUMBNAIL_JOB, ThumbnailJobData } from './transcoding.processor';

/**
 * On startup, enqueues a lightweight `thumbnail` job for every already-completed
 * content item that has no thumbnail yet. Idempotent: once thumbnails exist the
 * query returns nothing, so subsequent boots are no-ops. Failures are swallowed
 * — the frontend falls back to the transcoded URL until a thumbnail lands.
 */
@Injectable()
export class ThumbnailBackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ThumbnailBackfillService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @InjectQueue('transcoding') private readonly transcodingQueue: Queue,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const rows = await this.db
        .select({ id: contents.id, organisationId: contents.organisationId })
        .from(contents)
        .where(
          and(
            eq(contents.transcodingStatus, TranscodingStatus.Completed),
            isNull(contents.thumbnailSizeBytes),
          ),
        );

      if (rows.length === 0) {
        return;
      }

      await this.transcodingQueue.addBulk(
        rows.map((row) => ({
          name: THUMBNAIL_JOB,
          data: {
            contentId: row.id,
            organisationId: row.organisationId,
          } satisfies ThumbnailJobData,
        })),
      );

      this.logger.log(`Enqueued ${rows.length} thumbnail backfill job(s)`);
    } catch (err: unknown) {
      this.logger.error(
        `Thumbnail backfill failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
