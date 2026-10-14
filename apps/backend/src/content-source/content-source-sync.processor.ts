import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { JobMetricsService } from '../observability/job-metrics.service';
import {
  CONTENT_SOURCE_CLEANUP_JOB,
  CONTENT_SOURCE_SYNC_QUEUE,
  type ContentSourceJobData,
  type ContentSourceSyncJobData,
} from './content-source.constants';
import { ContentSourceSyncService } from './content-source-sync.service';
import { ContentSourceCleanupService } from './content-source-cleanup.service';

const isSyncJob = (job: Job<ContentSourceJobData>): job is Job<ContentSourceSyncJobData> =>
  job.name !== CONTENT_SOURCE_CLEANUP_JOB;

/**
 * Runs the jobs of the content-source queue: syncs, plus the daily cleanup.
 * The work and its bookkeeping live in the two services.
 */
@Processor(CONTENT_SOURCE_SYNC_QUEUE)
export class ContentSourceSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(ContentSourceSyncProcessor.name);

  constructor(
    private readonly syncService: ContentSourceSyncService,
    private readonly cleanupService: ContentSourceCleanupService,
    private readonly jobMetrics: JobMetricsService,
  ) {
    super();
  }

  async process(job: Job<ContentSourceJobData>): Promise<void> {
    if (!isSyncJob(job)) {
      this.logger.log(`Running content source cleanup (job ${job.id})`);
      await this.cleanupService.cleanup();
      return;
    }
    const { sourceId, triggeredBy } = job.data;
    this.logger.log(`Syncing content source ${sourceId} (job ${job.id})`);
    const summary = await this.syncService.sync(sourceId, triggeredBy);
    if (summary) {
      this.logger.log(
        `Content source ${sourceId}: ${summary.listed} listed, ${summary.created} new, ` +
          `${summary.updated} changed, ${summary.gone} gone, ${summary.rendered} rendered, ` +
          `${summary.failed} failed`,
      );
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.jobMetrics.recordCompleted(CONTENT_SOURCE_SYNC_QUEUE, job);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined): void {
    this.jobMetrics.recordFailed(CONTENT_SOURCE_SYNC_QUEUE, job);
  }
}
