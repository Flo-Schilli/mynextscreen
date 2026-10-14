import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash } from 'crypto';
import { and, eq, gte, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  contentSources,
  organisations,
  sourceEventSlides,
  sourceEvents,
  type ContentSource,
  type SourceEvent,
  type SourceEventSlide,
} from '../db/schema';
import { ContentService } from '../content/content.service';
import {
  AUDIT_CONTENT_SOURCE_SYNC_FAILED,
  AUDIT_CONTENT_SOURCE_SYNCED,
  AuditContentSourceEvent,
} from '../audit-log/audit.events';
import { addDays, localDate, zonedTimeToUtc } from '../common/zoned-time.util';
import { ContentSourceAdapterRegistry } from './adapter.registry';
import type {
  AdapterContext,
  ContentSourceAdapter,
  EventDetails,
  ListedEvent,
} from './adapters/content-source-adapter.interface';
import { SourceHttpClient } from './source-http.client';
import { SlideRendererService } from './slide/slide-renderer.service';
import { buildSlideContent, computeRenderHash, formatDateLabel } from './slide/slide-content';
import { CONTENT_SOURCE_SYNCED, ContentSourceSyncedEvent } from './content-source.constants';
import type {
  ContentSourceSyncStatus,
  ContentSourceSyncSummary,
  SlideFormat,
} from './content-source.types';

const MS_PER_MINUTE = 60_000;
/** Keeps the stored summary small; the count in `failed` stays exact. */
export const MAX_SUMMARY_ERRORS = 20;
/** Yesterday's events still show during a playlist's grace period, so they stay rendered. */
const RENDER_LOOKBACK_DAYS = 1;
const SLUG_MAX_LENGTH = 60;
/**
 * A complete listing that shows fewer than this share of the current events is
 * distrusted: a layout change or a maintenance page served with HTTP 200 would
 * otherwise mark every event gone and empty the playlists.
 */
export const MIN_LISTING_SHARE = 0.5;

interface SyncRun {
  source: ContentSource;
  timeZone: string;
  adapter: ContentSourceAdapter;
  context: AdapterContext;
  summary: ContentSourceSyncSummary;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Hash of the listing data; a change means the detail page may have changed too. */
export function listingHash(event: ListedEvent): string {
  const fields = [
    event.externalId,
    event.title,
    event.eventDate,
    event.startTime,
    event.venue,
    event.city,
    event.statusLabels,
    event.cancelled,
    event.soldOut,
    event.notes,
    event.detailUrl,
  ];
  return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH);
  return slug || 'event';
}

/**
 * One sync of one content source: list events, upsert the pool, fetch details
 * of new or changed events, render slides whose content changed, then record
 * the outcome. A failing event or slide is counted and skipped; only a failure
 * of the run itself (unknown adapter, database) fails the sync.
 */
@Injectable()
export class ContentSourceSyncService {
  private readonly logger = new Logger(ContentSourceSyncService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly registry: ContentSourceAdapterRegistry,
    private readonly http: SourceHttpClient,
    private readonly renderer: SlideRendererService,
    private readonly contentService: ContentService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Returns null when the source no longer exists. */
  async sync(
    sourceId: string,
    triggeredBy: string | null,
    now: Date = new Date(),
  ): Promise<ContentSourceSyncSummary | null> {
    const loaded = await this.loadSource(sourceId);
    if (!loaded) {
      this.logger.warn(`Content source ${sourceId} vanished before its sync ran`);
      return null;
    }
    const { source, timeZone } = loaded;
    await this.db
      .update(contentSources)
      .set({ lastSyncStatus: 'running' })
      .where(eq(contentSources.id, source.id));

    try {
      const run = this.startRun(source, timeZone, now);
      const warnings = await this.syncEvents(run);
      await this.renderSlides(run);
      for (const warning of warnings) this.addError(run.summary, warning);
      const status: ContentSourceSyncStatus =
        run.summary.failed > 0 || warnings.length > 0 ? 'partial' : 'success';
      await this.finish(source, status, run.summary, run.summary.errors[0] ?? null);
      this.emitSynced(source, triggeredBy, status, run.summary);
      return run.summary;
    } catch (error) {
      const message = errorMessage(error);
      this.logger.error(`Sync of content source ${source.id} failed: ${message}`);
      await this.finish(source, 'failed', null, message);
      this.eventEmitter.emit(
        AUDIT_CONTENT_SOURCE_SYNC_FAILED,
        new AuditContentSourceEvent(source.id, source.organisationId, triggeredBy, {
          error: message,
        }),
      );
      throw error;
    }
  }

  private async loadSource(
    sourceId: string,
  ): Promise<{ source: ContentSource; timeZone: string } | null> {
    const [row] = await this.db
      .select({ source: contentSources, timeZone: organisations.timeZone })
      .from(contentSources)
      .innerJoin(organisations, eq(organisations.id, contentSources.organisationId))
      .where(eq(contentSources.id, sourceId))
      .limit(1);
    return row ?? null;
  }

  private startRun(source: ContentSource, timeZone: string, now: Date): SyncRun {
    const adapter = this.registry.get(source.adapterType);
    return {
      source,
      timeZone,
      adapter,
      context: {
        fetcher: this.http.forHosts(adapter.allowedHosts),
        today: localDate(now, timeZone),
      },
      summary: { listed: 0, created: 0, updated: 0, gone: 0, rendered: 0, failed: 0, errors: [] },
    };
  }

  /** Upserts the listed events and marks unlisted ones gone. Returns the adapter's warnings. */
  private async syncEvents(run: SyncRun): Promise<string[]> {
    const params = run.adapter.validateParams(run.source.params);
    const listing = await run.adapter.listEvents(params, run.context);
    run.summary.listed = listing.events.length;

    const existing = await this.db
      .select()
      .from(sourceEvents)
      .where(eq(sourceEvents.sourceId, run.source.id));
    const byExternalId = new Map(existing.map((event) => [event.externalId, event]));

    for (const listed of listing.events) {
      await this.upsertEvent(
        run,
        listed,
        byExternalId.get(listed.externalId),
        listing.genresComplete,
      );
    }

    const warnings = [...listing.warnings];
    // A failed listing page would make its events look removed; only mark gone on a full listing.
    if (listing.listingComplete) {
      const collapse = this.listingCollapse(run, listing.events, existing);
      if (collapse) {
        warnings.push(collapse);
      } else {
        run.summary.gone = await this.markGone(run.source.id, listing.events);
      }
    }
    return warnings;
  }

  /** A warning when the listing shows too few of the current (not yet past) events. */
  private listingCollapse(
    run: SyncRun,
    listed: ListedEvent[],
    existing: SourceEvent[],
  ): string | null {
    const { today } = run.context;
    const current = existing.filter((event) => !event.goneAt && event.eventDate >= today).length;
    const shown = listed.filter((event) => event.eventDate >= today).length;
    if (current === 0 || shown >= current * MIN_LISTING_SHARE) return null;
    return `Listing shows ${shown} of ${current} current events; nothing was marked gone`;
  }

  private async upsertEvent(
    run: SyncRun,
    listed: ListedEvent,
    previous: SourceEvent | undefined,
    genresComplete: boolean,
  ): Promise<void> {
    const dataHash = listingHash(listed);
    const changed = previous !== undefined && previous.dataHash !== dataHash;
    const { details, loaded } = await this.resolveDetails(run, listed, previous, dataHash);
    // With some genre pages missing, keep what earlier syncs knew instead of dropping genres.
    const genres =
      genresComplete || !previous
        ? listed.genres
        : [...new Set([...previous.genres, ...listed.genres])];
    const now = new Date();
    const values = {
      title: listed.title,
      eventDate: listed.eventDate,
      startTime: listed.startTime,
      startsAt: zonedTimeToUtc(listed.eventDate, listed.startTime, run.timeZone),
      venue: listed.venue,
      city: listed.city,
      genres,
      statusLabels: listed.statusLabels,
      cancelled: listed.cancelled,
      soldOut: listed.soldOut,
      notes: listed.notes,
      detailUrl: listed.detailUrl,
      ...details,
      // Without fresh details the old hash stays, so the next sync fetches them again.
      dataHash: loaded || !previous ? dataHash : previous.dataHash,
      lastSeenAt: now,
      goneAt: null,
    };

    await this.db
      .insert(sourceEvents)
      .values({
        organisationId: run.source.organisationId,
        sourceId: run.source.id,
        externalId: listed.externalId,
        firstSeenAt: now,
        ...values,
      })
      .onConflictDoUpdate({
        target: [sourceEvents.sourceId, sourceEvents.externalId],
        set: values,
      });

    if (!previous) run.summary.created += 1;
    if (changed) run.summary.updated += 1;
  }

  /**
   * Details are fetched for new or changed events and retried while the image
   * is missing. `loaded` is false when the stored details had to be kept.
   */
  private async resolveDetails(
    run: SyncRun,
    listed: ListedEvent,
    previous: SourceEvent | undefined,
    dataHash: string,
  ): Promise<{ details: EventDetails; loaded: boolean }> {
    const known: EventDetails | null = previous
      ? {
          imageUrl: previous.imageUrl,
          ticketUrl: previous.ticketUrl,
          priceCents: previous.priceCents,
          currency: previous.currency,
        }
      : null;
    if (known && previous?.dataHash === dataHash && known.imageUrl) {
      return { details: known, loaded: true };
    }
    try {
      return { details: await run.adapter.fetchDetails(listed, run.context), loaded: true };
    } catch (error) {
      run.summary.failed += 1;
      this.addError(run.summary, `Details of "${listed.title}": ${errorMessage(error)}`);
      return {
        details: known ?? { imageUrl: null, ticketUrl: null, priceCents: null, currency: null },
        loaded: false,
      };
    }
  }

  private async markGone(sourceId: string, listed: ListedEvent[]): Promise<number> {
    const listedIds = listed.map((event) => event.externalId);
    const conditions = [eq(sourceEvents.sourceId, sourceId), isNull(sourceEvents.goneAt)];
    if (listedIds.length > 0) conditions.push(notInArray(sourceEvents.externalId, listedIds));
    const gone = await this.db
      .update(sourceEvents)
      .set({ goneAt: new Date() })
      .where(and(...conditions))
      .returning({ id: sourceEvents.id });
    return gone.length;
  }

  /** Renders every current event in every configured format whose render hash changed. */
  private async renderSlides(run: SyncRun): Promise<void> {
    const events = await this.db
      .select()
      .from(sourceEvents)
      .where(
        and(
          eq(sourceEvents.sourceId, run.source.id),
          isNull(sourceEvents.goneAt),
          gte(sourceEvents.eventDate, addDays(run.context.today, -RENDER_LOOKBACK_DAYS)),
        ),
      );
    if (events.length === 0) return;

    const slides = await this.db
      .select()
      .from(sourceEventSlides)
      .where(
        inArray(
          sourceEventSlides.sourceEventId,
          events.map((event) => event.id),
        ),
      );
    for (const event of events) {
      const existing = slides.filter((slide) => slide.sourceEventId === event.id);
      await this.renderEvent(run, event, existing);
    }
  }

  private async renderEvent(
    run: SyncRun,
    event: SourceEvent,
    existing: SourceEventSlide[],
  ): Promise<void> {
    const content = buildSlideContent(event);
    const due = run.source.formats
      .map((format) => ({
        format,
        renderHash: computeRenderHash(content, event.imageUrl, format, run.source.style),
        slide: existing.find((slide) => slide.format === format),
      }))
      .filter(({ renderHash, slide }) => slide?.renderHash !== renderHash);
    if (due.length === 0) return;

    let image: Buffer | null = null;
    if (event.imageUrl) {
      try {
        image = await run.context.fetcher.getBuffer(event.imageUrl);
      } catch (error) {
        // Keep the previous slides rather than replacing them with an imageless one.
        run.summary.failed += 1;
        this.addError(run.summary, `Image of "${event.title}": ${errorMessage(error)}`);
        return;
      }
    }

    for (const { format, renderHash, slide } of due) {
      try {
        const buffer = await this.renderer.render(image, content, format, run.source.style);
        await this.storeSlide(run, event, format, renderHash, buffer, slide);
        run.summary.rendered += 1;
      } catch (error) {
        run.summary.failed += 1;
        this.addError(run.summary, `Slide ${format} of "${event.title}": ${errorMessage(error)}`);
      }
    }
  }

  private async storeSlide(
    run: SyncRun,
    event: SourceEvent,
    format: SlideFormat,
    renderHash: string,
    buffer: Buffer,
    slide: SourceEventSlide | undefined,
  ): Promise<void> {
    const { organisationId, id: sourceId } = run.source;
    const filename = `${event.eventDate}_${slugify(event.title)}_${format}.jpg`;
    const title = `${event.title} · ${formatDateLabel(event.eventDate)} · ${event.venue}`;
    const content = slide
      ? await this.contentService.replaceManagedFile(
          organisationId,
          sourceId,
          slide.contentId,
          buffer,
          filename,
        )
      : await this.contentService.createManaged(organisationId, sourceId, buffer, filename, title, [
          format,
        ]);

    try {
      await this.db
        .insert(sourceEventSlides)
        .values({ sourceEventId: event.id, format, contentId: content.id, renderHash })
        .onConflictDoUpdate({
          target: [sourceEventSlides.sourceEventId, sourceEventSlides.format],
          set: { contentId: content.id, renderHash },
        });
    } catch (error) {
      // Without its slide row a new content would never be cleaned up: drop it again.
      if (!slide) await this.discardContent(organisationId, content.id);
      throw error;
    }
  }

  private async discardContent(organisationId: string, contentId: string): Promise<void> {
    try {
      await this.contentService.deleteManaged(organisationId, contentId);
    } catch (error) {
      this.logger.warn(`Discarding orphaned slide ${contentId} failed: ${errorMessage(error)}`);
    }
  }

  private async finish(
    source: ContentSource,
    status: ContentSourceSyncStatus,
    summary: ContentSourceSyncSummary | null,
    error: string | null,
  ): Promise<void> {
    const now = new Date();
    // Also after a failure, so a broken site is retried on schedule, not every tick.
    const next = new Date(now.getTime() + source.syncIntervalMinutes * MS_PER_MINUTE);
    // A sync requested during the run moved nextSyncAt; that request must survive.
    const unchanged = source.nextSyncAt
      ? eq(contentSources.nextSyncAt, source.nextSyncAt)
      : isNull(contentSources.nextSyncAt);
    await this.db
      .update(contentSources)
      .set({
        lastSyncAt: now,
        lastSyncStatus: status,
        lastSyncError: error,
        ...(summary ? { lastSyncSummary: summary } : {}),
        nextSyncAt: sql`CASE WHEN ${unchanged} THEN ${next.toISOString()}::timestamptz ELSE ${contentSources.nextSyncAt} END`,
      })
      .where(eq(contentSources.id, source.id));
  }

  private emitSynced(
    source: ContentSource,
    triggeredBy: string | null,
    status: ContentSourceSyncStatus,
    summary: ContentSourceSyncSummary,
  ): void {
    const { errors, ...counts } = summary;
    this.eventEmitter.emit(
      AUDIT_CONTENT_SOURCE_SYNCED,
      new AuditContentSourceEvent(source.id, source.organisationId, triggeredBy, {
        status,
        ...counts,
        errorCount: errors.length,
      }),
    );
    this.eventEmitter.emit(
      CONTENT_SOURCE_SYNCED,
      new ContentSourceSyncedEvent(source.id, source.organisationId),
    );
  }

  private addError(summary: ContentSourceSyncSummary, message: string): void {
    if (summary.errors.length < MAX_SUMMARY_ERRORS) {
      summary.errors.push(message);
    }
  }
}
