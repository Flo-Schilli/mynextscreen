import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNotNull, lt, notExists, or } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  contentSources,
  organisations,
  playlistItems,
  sourceEventSlides,
  sourceEvents,
} from '../db/schema';
import { ContentService } from '../content/content.service';
import { addDays, localDate } from '../common/zoned-time.util';

/** Slides of an event stay this many days after its local event day. */
export const SLIDE_RETENTION_DAYS = 14;

export interface ContentSourceCleanupResult {
  /** Slides deleted with their files; their storage quota is free again. */
  slidesDeleted: number;
  /** Slides whose deletion failed; the next run retries them. */
  slidesFailed: number;
  /** Gone events removed after their last slide went. */
  eventsDeleted: number;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Daily housekeeping of the event pools. Deletes the slides of events that
 * ended more than {@link SLIDE_RETENTION_DAYS} days ago (in the organisation's
 * time zone) or that the source no longer lists, unless a playlist still shows
 * them. Slides go through {@link ContentService.deleteManaged}, which removes the
 * files and frees the quota; the slide rows follow by FK cascade.
 *
 * Event rows are only removed once they are gone and slide-free. A past event
 * that the source still lists (the current month's listing starts on the 1st)
 * keeps its row: dropping it would make the next sync re-create it and fetch
 * its detail page again. It is removed once the listing no longer shows it.
 */
@Injectable()
export class ContentSourceCleanupService {
  private readonly logger = new Logger(ContentSourceCleanupService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly contentService: ContentService,
  ) {}

  async cleanup(now: Date = new Date()): Promise<ContentSourceCleanupResult> {
    const result: ContentSourceCleanupResult = {
      slidesDeleted: 0,
      slidesFailed: 0,
      eventsDeleted: 0,
    };
    for (const { organisationId, timeZone } of await this.organisationsWithSources()) {
      const cutoff = addDays(localDate(now, timeZone), -SLIDE_RETENTION_DAYS);
      await this.deleteSlides(organisationId, cutoff, result);
      result.eventsDeleted += await this.deleteGoneEvents(organisationId);
    }
    if (result.slidesDeleted + result.slidesFailed + result.eventsDeleted > 0) {
      this.logger.log(
        `Content source cleanup: ${result.slidesDeleted} slide(s) deleted, ` +
          `${result.slidesFailed} failed, ${result.eventsDeleted} gone event(s) removed`,
      );
    }
    return result;
  }

  private async organisationsWithSources(): Promise<
    { organisationId: string; timeZone: string }[]
  > {
    return this.db
      .selectDistinct({ organisationId: organisations.id, timeZone: organisations.timeZone })
      .from(organisations)
      .innerJoin(contentSources, eq(contentSources.organisationId, organisations.id));
  }

  /** Slides of expired or gone events of one organisation that no playlist references. */
  private async deleteSlides(
    organisationId: string,
    cutoff: string,
    result: ContentSourceCleanupResult,
  ): Promise<void> {
    const stale = await this.db
      .selectDistinct({ contentId: sourceEventSlides.contentId })
      .from(sourceEventSlides)
      .innerJoin(sourceEvents, eq(sourceEvents.id, sourceEventSlides.sourceEventId))
      .where(
        and(
          eq(sourceEvents.organisationId, organisationId),
          or(isNotNull(sourceEvents.goneAt), lt(sourceEvents.eventDate, cutoff)),
          notExists(
            this.db
              .select({ id: playlistItems.id })
              .from(playlistItems)
              .where(eq(playlistItems.contentId, sourceEventSlides.contentId)),
          ),
        ),
      );

    for (const { contentId } of stale) {
      try {
        await this.contentService.deleteManaged(organisationId, contentId);
        result.slidesDeleted += 1;
      } catch (error) {
        result.slidesFailed += 1;
        this.logger.warn(`Deleting slide ${contentId} failed: ${errorMessage(error)}`);
      }
    }
  }

  /** Gone events without slides; one statement, so a sync that revives one meanwhile wins. */
  private async deleteGoneEvents(organisationId: string): Promise<number> {
    const deleted = await this.db
      .delete(sourceEvents)
      .where(
        and(
          eq(sourceEvents.organisationId, organisationId),
          isNotNull(sourceEvents.goneAt),
          notExists(
            this.db
              .select({ id: sourceEventSlides.id })
              .from(sourceEventSlides)
              .where(eq(sourceEventSlides.sourceEventId, sourceEvents.id)),
          ),
        ),
      )
      .returning({ id: sourceEvents.id });
    return deleted.length;
  }
}
