import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ContentSourceService } from './content-source.service';

export const CONTENT_SOURCE_TICK_MS = 60_000;
/**
 * How often an instance adds the day's cleanup again. A finished job absorbs
 * the add; a failed one was removed, so the add retries it.
 */
export const CLEANUP_REQUEUE_MS = 60 * 60_000;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Enqueues due work once a minute: syncs of due sources and, once per UTC day,
 * the slide cleanup. Deduplication rests on the BullMQ job ids, so several
 * backend instances may tick at once without running a sync or a cleanup twice.
 */
@Injectable()
export class ContentSourceScheduler {
  private readonly logger = new Logger(ContentSourceScheduler.name);
  /** Last cleanup this instance queued; saves a Redis call per tick. */
  private cleanupQueued: { day: string; at: number } | null = null;

  constructor(private readonly sourceService: ContentSourceService) {}

  @Interval(CONTENT_SOURCE_TICK_MS)
  async tick(): Promise<void> {
    const now = new Date();
    await this.enqueueDueSources(now);
    await this.enqueueDailyCleanup(now);
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
      this.logger.warn(`Enqueueing due content sources failed: ${errorMessage(error)}`);
      return 0;
    }
  }

  /** Returns true when this call asked the queue for the cleanup of the current UTC day. */
  async enqueueDailyCleanup(now: Date): Promise<boolean> {
    const day = now.toISOString().slice(0, 10);
    const queued = this.cleanupQueued;
    if (queued?.day === day && now.getTime() - queued.at < CLEANUP_REQUEUE_MS) return false;
    try {
      await this.sourceService.enqueueCleanup(day);
      this.cleanupQueued = { day, at: now.getTime() };
      return true;
    } catch (error) {
      this.logger.warn(`Enqueueing the content source cleanup failed: ${errorMessage(error)}`);
      return false;
    }
  }
}
