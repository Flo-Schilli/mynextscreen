import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ContentSourceService } from './content-source.service';

export const CONTENT_SOURCE_TICK_MS = 60_000;

/**
 * Enqueues due work once a minute. Deduplication rests on the BullMQ job id, so
 * several backend instances may tick at once without running a sync twice.
 */
@Injectable()
export class ContentSourceScheduler {
  private readonly logger = new Logger(ContentSourceScheduler.name);

  constructor(private readonly sourceService: ContentSourceService) {}

  @Interval(CONTENT_SOURCE_TICK_MS)
  async tick(): Promise<void> {
    await this.enqueueDueSources(new Date());
  }

  async enqueueDueSources(now: Date): Promise<number> {
    try {
      const due = await this.sourceService.findDueSourceIds(now);
      for (const sourceId of due) {
        await this.sourceService.enqueueSync(sourceId, null);
      }
      return due.length;
    } catch (error) {
      // A Redis or database blip must not kill the interval; the next tick retries.
      this.logger.warn(
        `Enqueueing due content sources failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    }
  }
}
