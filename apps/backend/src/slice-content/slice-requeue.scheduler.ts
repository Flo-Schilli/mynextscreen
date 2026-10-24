import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { SliceEnqueueService } from './slice-enqueue.service';

export const SLICE_REQUEUE_TICK_MS = 5 * 60_000;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Periodically re-queues slice jobs stuck in `queued` without a job in the queue. */
@Injectable()
export class SliceRequeueScheduler {
  private readonly logger = new Logger(SliceRequeueScheduler.name);

  constructor(private readonly sliceEnqueue: SliceEnqueueService) {}

  @Interval(SLICE_REQUEUE_TICK_MS)
  async tick(): Promise<void> {
    try {
      const requeued = await this.sliceEnqueue.requeueStale(new Date());
      if (requeued > 0) this.logger.log(`Re-queued ${requeued} stuck slice job(s)`);
    } catch (error) {
      // A Redis or database blip must not kill the interval; the next tick retries.
      this.logger.warn(`Re-queueing stuck slice jobs failed: ${errorMessage(error)}`);
    }
  }
}
