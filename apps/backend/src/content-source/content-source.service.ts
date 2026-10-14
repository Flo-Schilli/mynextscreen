import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import { and, asc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  contentSources,
  contents,
  sourceEventSlides,
  sourceEvents,
  type ContentSource,
  type SourceEvent,
} from '../db/schema';
import { ContentService } from '../content/content.service';
import {
  AUDIT_CONTENT_SOURCE_CREATED,
  AUDIT_CONTENT_SOURCE_DELETED,
  AUDIT_CONTENT_SOURCE_UPDATED,
  AuditContentSourceEvent,
} from '../audit-log/audit.events';
import { byNaturalName } from '../common/natural-sort.util';
import { ContentSourceAdapterRegistry, type AdapterDescriptor } from './adapter.registry';
import { InvalidSourceParamsError } from './adapters/content-source-adapter.interface';
import {
  CONTENT_SOURCE_SYNC_JOB,
  CONTENT_SOURCE_SYNC_QUEUE,
  syncJobId,
  type ContentSourceSyncJobData,
} from './content-source.constants';
import {
  DEFAULT_SLIDE_STYLE,
  type ContentSourceParams,
  type SlideFormat,
} from './content-source.types';
import type {
  CreateContentSourceDto,
  SourceEventsQueryDto,
  SourceFacetsQueryDto,
  UpdateContentSourceDto,
} from './dto';
import { DEFAULT_EVENTS_PAGE } from './dto/source-events-query.dto';

const MS_PER_MINUTE = 60_000;

export interface SourceEventWithSlides extends SourceEvent {
  slides: { format: SlideFormat; contentId: string }[];
}

export interface SourceFacets {
  venues: string[];
  genres: string[];
}

const byNatural = (a: string, b: string): number => byNaturalName({ name: a }, { name: b });

/** CRUD, event pool and sync requests for content sources, always scoped to one organisation. */
@Injectable()
export class ContentSourceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @InjectQueue(CONTENT_SOURCE_SYNC_QUEUE) private readonly syncQueue: Queue,
    private readonly registry: ContentSourceAdapterRegistry,
    private readonly contentService: ContentService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  adapters(): AdapterDescriptor[] {
    return this.registry.describe();
  }

  async findAll(organisationId: string): Promise<ContentSource[]> {
    const rows = await this.db
      .select()
      .from(contentSources)
      .where(eq(contentSources.organisationId, organisationId));
    return rows.sort(byNaturalName);
  }

  async findOne(organisationId: string, id: string): Promise<ContentSource> {
    const [source] = await this.db
      .select()
      .from(contentSources)
      .where(and(eq(contentSources.id, id), eq(contentSources.organisationId, organisationId)))
      .limit(1);
    if (!source) {
      throw new NotFoundException(`Content source "${id}" not found`);
    }
    return source;
  }

  async create(
    organisationId: string,
    dto: CreateContentSourceDto,
    userId: string | null,
  ): Promise<ContentSource> {
    if (!this.registry.has(dto.adapterType)) {
      throw new BadRequestException(`Unknown adapter type "${dto.adapterType}"`);
    }
    const params = this.validateParams(dto.adapterType, dto.params);
    const [source] = await this.db
      .insert(contentSources)
      .values({
        organisationId,
        name: dto.name,
        adapterType: dto.adapterType,
        params,
        formats: dto.formats,
        style: dto.style ? { ...dto.style } : DEFAULT_SLIDE_STYLE,
        syncIntervalMinutes: dto.syncIntervalMinutes,
        enabled: dto.enabled,
        // Null means due: the scheduler picks a new source up on its next tick.
        nextSyncAt: null,
      })
      .returning();

    this.audit(AUDIT_CONTENT_SOURCE_CREATED, source, userId, {
      name: source.name,
      adapterType: source.adapterType,
    });
    return source;
  }

  async update(
    organisationId: string,
    id: string,
    dto: UpdateContentSourceDto,
    userId: string | null,
  ): Promise<ContentSource> {
    const existing = await this.findOne(organisationId, id);
    const updates: Partial<ContentSource> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.params !== undefined) {
      updates.params = this.validateParams(existing.adapterType, dto.params);
    }
    if (dto.formats !== undefined) updates.formats = dto.formats;
    if (dto.style !== undefined) updates.style = { ...dto.style };
    if (dto.enabled !== undefined) updates.enabled = dto.enabled;
    if (
      dto.syncIntervalMinutes !== undefined &&
      dto.syncIntervalMinutes !== existing.syncIntervalMinutes
    ) {
      updates.syncIntervalMinutes = dto.syncIntervalMinutes;
      updates.nextSyncAt = existing.lastSyncAt
        ? new Date(existing.lastSyncAt.getTime() + dto.syncIntervalMinutes * MS_PER_MINUTE)
        : null;
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const [saved] = await this.db
      .update(contentSources)
      .set(updates)
      .where(and(eq(contentSources.id, id), eq(contentSources.organisationId, organisationId)))
      .returning();

    this.audit(AUDIT_CONTENT_SOURCE_UPDATED, saved, userId, { fields: Object.keys(updates) });
    return saved;
  }

  /**
   * Deletes the source with its events and slides. Slides go through the
   * content service first, so their files are removed and the quota is freed;
   * the FK cascade alone would only drop the rows.
   */
  async remove(organisationId: string, id: string, userId: string | null): Promise<void> {
    const source = await this.findOne(organisationId, id);
    const managed = await this.db
      .select({ id: contents.id })
      .from(contents)
      .where(and(eq(contents.organisationId, organisationId), eq(contents.managedBySourceId, id)));
    for (const { id: contentId } of managed) {
      await this.contentService.delete(organisationId, contentId);
    }
    await this.db
      .delete(contentSources)
      .where(and(eq(contentSources.id, id), eq(contentSources.organisationId, organisationId)));

    this.audit(AUDIT_CONTENT_SOURCE_DELETED, source, userId, {
      name: source.name,
      slidesDeleted: managed.length,
    });
  }

  /** Queues a sync now. A sync that is already waiting or running absorbs the request. */
  async requestSync(
    organisationId: string,
    id: string,
    userId: string | null,
  ): Promise<{ queued: true }> {
    await this.findOne(organisationId, id);
    await this.enqueueSync(id, userId);
    return { queued: true };
  }

  async enqueueSync(sourceId: string, triggeredBy: string | null): Promise<void> {
    const data: ContentSourceSyncJobData = { sourceId, triggeredBy };
    await this.syncQueue.add(CONTENT_SOURCE_SYNC_JOB, data, {
      jobId: syncJobId(sourceId),
      // Finished jobs must not linger: a kept job id would swallow every later sync.
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  /** Enabled sources whose next sync is due (or that never ran). */
  async findDueSourceIds(now: Date): Promise<string[]> {
    const rows = await this.db
      .select({ id: contentSources.id })
      .from(contentSources)
      .where(
        and(
          eq(contentSources.enabled, true),
          or(isNull(contentSources.nextSyncAt), lte(contentSources.nextSyncAt, now)),
        ),
      );
    return rows.map((row) => row.id);
  }

  async listEvents(
    organisationId: string,
    sourceId: string,
    query: SourceEventsQueryDto,
  ): Promise<SourceEventWithSlides[]> {
    await this.findOne(organisationId, sourceId);
    const conditions: SQL[] = [
      eq(sourceEvents.organisationId, organisationId),
      eq(sourceEvents.sourceId, sourceId),
    ];
    if (!query.includeGone) conditions.push(isNull(sourceEvents.goneAt));
    if (query.from) conditions.push(gte(sourceEvents.eventDate, query.from));
    if (query.to) conditions.push(lte(sourceEvents.eventDate, query.to));
    if (query.venues?.length) conditions.push(inArray(sourceEvents.venue, query.venues));
    if (query.genres?.length) {
      conditions.push(
        sql`${sourceEvents.genres} ?| array[${sql.join(
          query.genres.map((genre) => sql`${genre}`),
          sql`, `,
        )}]::text[]`,
      );
    }

    const events = await this.db
      .select()
      .from(sourceEvents)
      .where(and(...conditions))
      .orderBy(asc(sourceEvents.startsAt), asc(sourceEvents.title))
      .limit(query.limit ?? DEFAULT_EVENTS_PAGE)
      .offset(query.offset ?? 0);
    return this.attachSlides(events);
  }

  /** Distinct venues and genres of the organisation's current events, for rule pickers. */
  async facets(organisationId: string, query: SourceFacetsQueryDto): Promise<SourceFacets> {
    const conditions: SQL[] = [
      eq(sourceEvents.organisationId, organisationId),
      isNull(sourceEvents.goneAt),
    ];
    if (query.sourceIds?.length) conditions.push(inArray(sourceEvents.sourceId, query.sourceIds));

    const rows = await this.db
      .select({ venue: sourceEvents.venue, genres: sourceEvents.genres })
      .from(sourceEvents)
      .where(and(...conditions));
    const venues = new Set(rows.map((row) => row.venue).filter((venue) => venue !== ''));
    const genres = new Set(rows.flatMap((row) => row.genres));
    return {
      venues: [...venues].sort(byNatural),
      genres: [...genres].sort(byNatural),
    };
  }

  private async attachSlides(events: SourceEvent[]): Promise<SourceEventWithSlides[]> {
    if (events.length === 0) return [];
    const slides = await this.db
      .select({
        sourceEventId: sourceEventSlides.sourceEventId,
        format: sourceEventSlides.format,
        contentId: sourceEventSlides.contentId,
      })
      .from(sourceEventSlides)
      .where(
        inArray(
          sourceEventSlides.sourceEventId,
          events.map((event) => event.id),
        ),
      );
    return events.map((event) => ({
      ...event,
      slides: slides
        .filter((slide) => slide.sourceEventId === event.id)
        .map(({ format, contentId }) => ({ format, contentId })),
    }));
  }

  private validateParams(adapterType: string, raw: unknown): ContentSourceParams {
    try {
      return this.registry.get(adapterType).validateParams(raw);
    } catch (error) {
      if (error instanceof InvalidSourceParamsError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private audit(
    event: string,
    source: ContentSource,
    userId: string | null,
    details: Record<string, unknown>,
  ): void {
    this.eventEmitter.emit(
      event,
      new AuditContentSourceEvent(source.id, source.organisationId, userId, details),
    );
  }
}
