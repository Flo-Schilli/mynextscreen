import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { JobMetricsService } from '../observability/job-metrics.service';
import { PLAYLIST_RESOLVE_QUEUE, type PlaylistResolveJobData } from './playlist-resolve.constants';
import { PlaylistRuleService } from './playlist-rule.service';

/** Runs queued resolves; the work lives in {@link PlaylistRuleService.resolve}. */
@Processor(PLAYLIST_RESOLVE_QUEUE)
export class PlaylistResolveProcessor extends WorkerHost {
  private readonly logger = new Logger(PlaylistResolveProcessor.name);

  constructor(
    private readonly ruleService: PlaylistRuleService,
    private readonly jobMetrics: JobMetricsService,
  ) {
    super();
  }

  async process(job: Job<PlaylistResolveJobData>): Promise<void> {
    const { playlistId } = job.data;
    const outcome = await this.ruleService.resolve(playlistId);
    if (outcome?.changed) {
      this.logger.log(`Playlist ${playlistId} resolved to ${outcome.itemCount} items`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    this.jobMetrics.recordCompleted(PLAYLIST_RESOLVE_QUEUE, job);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined): void {
    this.jobMetrics.recordFailed(PLAYLIST_RESOLVE_QUEUE, job);
  }
}
