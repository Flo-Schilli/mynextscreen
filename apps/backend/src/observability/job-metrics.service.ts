import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import type { Job } from 'bullmq';
import { BULLMQ_JOB_DURATION_SECONDS } from './observability.constants';

const MS_PER_SECOND = 1000;

/**
 * Records BullMQ job processing duration into a histogram, labelled by queue and
 * outcome. A thin seam so processors depend on this instead of prom-client
 * directly, keeping the metric wiring mockable and out of the transcode/slice
 * logic.
 *
 * Duration is `finishedOn - processedOn` (actual work time), not wall time since
 * enqueue, so queue backlog does not inflate the processing histogram.
 */
@Injectable()
export class JobMetricsService {
  constructor(
    @InjectMetric(BULLMQ_JOB_DURATION_SECONDS)
    private readonly jobDuration: Histogram<string>,
  ) {}

  recordCompleted(queue: string, job: Job): void {
    this.observe(queue, 'completed', job);
  }

  recordFailed(queue: string, job: Job | undefined): void {
    if (!job) {
      return;
    }
    this.observe(queue, 'failed', job);
  }

  private observe(queue: string, status: 'completed' | 'failed', job: Job): void {
    const processedOn = job.processedOn;
    const finishedOn = job.finishedOn;
    if (!processedOn || !finishedOn || finishedOn < processedOn) {
      return;
    }
    this.jobDuration.observe({ queue, status }, (finishedOn - processedOn) / MS_PER_SECOND);
  }
}
