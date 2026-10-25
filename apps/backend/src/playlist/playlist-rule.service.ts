import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { organisations, playlists, type Playlist } from '../db/schema';
import {
  ContentSourceService,
  type SourceEventWithSlides,
} from '../content-source/content-source.service';
import {
  CONTENT_SOURCE_REMOVED,
  CONTENT_SOURCE_SYNCED,
  CONTENT_SOURCE_VENUE_ALIASES_UPDATED,
  ContentSourceRemovedEvent,
  ContentSourceSyncedEvent,
  ContentSourceVenueAliasesUpdatedEvent,
} from '../content-source/content-source.constants';
import {
  AUDIT_PLAYLIST_RESOLVED,
  AUDIT_PLAYLIST_RULE_UPDATED,
  AuditPlaylistEvent,
} from '../audit-log/audit.events';
import { PlaylistService } from './playlist.service';
import { PlaylistKind } from './playlist-kind.enum';
import type { PlaylistRule } from './playlist-rule.types';
import { type CreatePlaylistDto } from './dto/create-playlist.dto';
import { toPlaylistRule, type PlaylistRuleDto } from './dto/playlist-rule.dto';
import {
  earliestLiveEventDate,
  eventExpiresAt,
  resolvePlaylistRule,
  type ResolvedRuleEntry,
} from './playlist-rule.resolver';
import {
  PLAYLIST_RESOLVE_JOB,
  PLAYLIST_RESOLVE_QUEUE,
  resolveJobId,
  type PlaylistResolveJobData,
} from './playlist-resolve.constants';

const MS_PER_MINUTE = 60_000;

/** One event of a rule preview, with the slide it would show. */
export interface RulePreviewItem {
  sourceEventId: string;
  sourceId: string;
  contentId: string;
  /** `updatedAt` of the slide content, ISO; versions the thumbnail URL. */
  contentUpdatedAt: string | null;
  title: string;
  eventDate: string;
  startTime: string | null;
  /** As the website writes it; the slide shows this. */
  venue: string;
  /** After the source's aliases. */
  venueCanonical: string;
  city: string | null;
  genres: string[];
  statusLabels: string[];
  cancelled: boolean;
  soldOut: boolean;
  /** When the event drops out of the playlist (end of day + grace hours). */
  expiresAt: string;
}

export interface RulePreviewResult {
  items: RulePreviewItem[];
  /** Length of one loop in seconds. */
  totalDurationSeconds: number;
}

export interface ResolveOutcome {
  changed: boolean;
  itemCount: number;
  nextResolveAt: Date;
}

type DynamicPlaylist = Playlist & { rule: PlaylistRule };

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Rule engine of dynamic playlists: validates rules against the organisation's
 * content sources, resolves them over the event pool and materialises the
 * result as playlist items via {@link PlaylistService.replaceItems}.
 */
@Injectable()
export class PlaylistRuleService {
  private readonly logger = new Logger(PlaylistRuleService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @InjectQueue(PLAYLIST_RESOLVE_QUEUE) private readonly resolveQueue: Queue,
    private readonly playlistService: PlaylistService,
    private readonly sourceService: ContentSourceService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Creates a dynamic playlist and fills it right away. */
  async createDynamic(
    organisationId: string,
    dto: CreatePlaylistDto,
    actorUserId: string | null = null,
  ): Promise<Playlist> {
    if (!dto.rule) {
      throw new BadRequestException('A dynamic playlist needs a rule');
    }
    await this.assertRuleSources(organisationId, toPlaylistRule(dto.rule));
    const saved = await this.playlistService.create(
      organisationId,
      { ...dto, kind: PlaylistKind.Dynamic },
      actorUserId,
    );
    await this.resolveOrDefer(saved.id);
    return this.playlistService.findOne(saved.id, organisationId);
  }

  /** Stores a new rule and recomputes the items at once. */
  async updateRule(
    organisationId: string,
    id: string,
    dto: PlaylistRuleDto,
    userId: string | null,
  ): Promise<Playlist> {
    const playlist = await this.playlistService.findOne(id, organisationId);
    if (playlist.kind !== PlaylistKind.Dynamic) {
      throw new ConflictException(`Playlist "${id}" is static and has no rule`);
    }
    const rule = toPlaylistRule(dto);
    await this.assertRuleSources(organisationId, rule);
    await this.db
      .update(playlists)
      .set({ rule })
      .where(and(eq(playlists.id, id), eq(playlists.organisationId, organisationId)));
    this.eventEmitter.emit(
      AUDIT_PLAYLIST_RULE_UPDATED,
      new AuditPlaylistEvent(id, organisationId, userId, {
        sourceIds: rule.sourceIds,
        format: rule.format,
        limit: rule.limit,
      }),
    );
    await this.resolveOrDefer(id);
    return this.playlistService.findOne(id, organisationId);
  }

  /** What a rule would show now, without storing anything. */
  async preview(organisationId: string, dto: PlaylistRuleDto): Promise<RulePreviewResult> {
    const rule = toPlaylistRule(dto);
    await this.assertRuleSources(organisationId, rule);
    const now = new Date();
    const timeZone = await this.timeZoneOf(organisationId);
    const entries = await this.resolveEntries(organisationId, rule, now, timeZone);
    return {
      items: entries.map(({ event, contentId }) => ({
        sourceEventId: event.id,
        sourceId: event.sourceId,
        contentId,
        contentUpdatedAt:
          event.slides.find((slide) => slide.contentId === contentId)?.updatedAt.toISOString() ??
          null,
        title: event.title,
        eventDate: event.eventDate,
        startTime: event.startTime,
        venue: event.venue,
        venueCanonical: event.venueCanonical,
        city: event.city,
        genres: event.genres,
        statusLabels: event.statusLabels,
        cancelled: event.cancelled,
        soldOut: event.soldOut,
        expiresAt: eventExpiresAt(event.eventDate, rule.graceHours, timeZone).toISOString(),
      })),
      totalDurationSeconds: entries.length * rule.itemDurationSeconds,
    };
  }

  /**
   * Recomputes one dynamic playlist; the path of the resolve job. Returns null
   * when the playlist is gone or static, or when its rule changed meanwhile
   * (it is then left due). The next resolve is due after the refresh
   * interval, or earlier when a shown event expires before that. On failure
   * it backs off to the refresh interval, so a broken rule is not retried
   * every tick.
   */
  async resolve(playlistId: string, now: Date = new Date()): Promise<ResolveOutcome | null> {
    const playlist = await this.loadDynamic(playlistId);
    if (!playlist) return null;
    try {
      return await this.apply(playlist, now);
    } catch (error) {
      const refreshAt = new Date(
        now.getTime() + playlist.rule.refreshIntervalMinutes * MS_PER_MINUTE,
      );
      await this.scheduleNext(playlist, refreshAt);
      throw error;
    }
  }

  /**
   * Marks the playlist due when its resolve job is already running: the job
   * id would absorb the new request, although the running job may have read
   * the pool before the change that triggered it. The scheduler queues it
   * again once the running job is done.
   */
  async enqueueResolve(playlistId: string): Promise<void> {
    const jobId = resolveJobId(playlistId);
    const running = await this.resolveQueue.getJob(jobId);
    if (running && (await running.isActive())) {
      await this.db
        .update(playlists)
        .set({ nextResolveAt: new Date() })
        .where(eq(playlists.id, playlistId));
    }
    await this.addResolveJob(playlistId);
  }

  /**
   * Queues the resolve of a due playlist for the scheduler. Unlike
   * {@link enqueueResolve} it never marks a running playlist due: the
   * scheduler finds it due throughout its own run, and marking it would queue
   * every resolve that outlasts one tick again, forever.
   */
  async enqueueScheduledResolve(playlistId: string): Promise<void> {
    await this.addResolveJob(playlistId);
  }

  private async addResolveJob(playlistId: string): Promise<void> {
    const data: PlaylistResolveJobData = { playlistId };
    await this.resolveQueue.add(PLAYLIST_RESOLVE_JOB, data, {
      jobId: resolveJobId(playlistId),
      // Finished jobs must not linger: a kept job id would swallow every later resolve.
      removeOnComplete: true,
      removeOnFail: true,
    });
  }

  /** Dynamic playlists whose next resolve is due (or that never resolved). */
  async findDuePlaylistIds(now: Date): Promise<string[]> {
    const rows = await this.db
      .select({ id: playlists.id })
      .from(playlists)
      .where(
        and(
          eq(playlists.kind, PlaylistKind.Dynamic),
          or(isNull(playlists.nextResolveAt), lte(playlists.nextResolveAt, now)),
        ),
      );
    return rows.map((row) => row.id);
  }

  /** A sync may have added, changed or cancelled events: refresh every playlist fed by it. */
  @OnEvent(CONTENT_SOURCE_SYNCED, { async: true })
  async onSourceSynced(event: ContentSourceSyncedEvent): Promise<void> {
    await this.enqueueFedBy(event);
  }

  /** New aliases change which events a venue filter matches. */
  @OnEvent(CONTENT_SOURCE_VENUE_ALIASES_UPDATED, { async: true })
  async onVenueAliasesUpdated(event: ContentSourceVenueAliasesUpdatedEvent): Promise<void> {
    await this.enqueueFedBy(event);
  }

  /** Queues a resolve of every dynamic playlist whose rule names the source. */
  private async enqueueFedBy(event: { sourceId: string; organisationId: string }): Promise<void> {
    try {
      const rows = await this.db
        .select({ id: playlists.id })
        .from(playlists)
        .where(
          and(
            eq(playlists.organisationId, event.organisationId),
            eq(playlists.kind, PlaylistKind.Dynamic),
            sql`${playlists.rule} -> 'sourceIds' ? ${event.sourceId}`,
          ),
        );
      for (const { id } of rows) {
        await this.enqueueResolve(id);
      }
    } catch (error) {
      // The scheduler still resolves these playlists on their interval.
      this.logger.warn(
        `Enqueueing playlists of source ${event.sourceId} failed: ${errorMessage(error)}`,
      );
    }
  }

  /**
   * A deleted source can no longer feed a playlist: drop it from every rule
   * that names it and resolve those playlists, so their screens let go of the
   * removed slides.
   */
  @OnEvent(CONTENT_SOURCE_REMOVED, { async: true })
  async onSourceRemoved(event: ContentSourceRemovedEvent): Promise<void> {
    try {
      const rows = await this.db
        .update(playlists)
        .set({
          rule: sql`jsonb_set(${playlists.rule}, '{sourceIds}', (${playlists.rule} -> 'sourceIds') - ${event.sourceId}::text)`,
        })
        .where(
          and(
            eq(playlists.organisationId, event.organisationId),
            eq(playlists.kind, PlaylistKind.Dynamic),
            sql`${playlists.rule} -> 'sourceIds' ? ${event.sourceId}`,
          ),
        )
        .returning({ id: playlists.id });
      for (const { id } of rows) {
        await this.enqueueResolve(id);
      }
    } catch (error) {
      this.logger.warn(
        `Updating playlists of removed source ${event.sourceId} failed: ${errorMessage(error)}`,
      );
    }
  }

  /** Resolves now; on failure the playlist is left due and the scheduler retries it. */
  private async resolveOrDefer(playlistId: string): Promise<void> {
    try {
      const playlist = await this.loadDynamic(playlistId);
      if (playlist) await this.apply(playlist, new Date());
    } catch (error) {
      this.logger.warn(`Resolving playlist ${playlistId} failed: ${errorMessage(error)}`);
      await this.db
        .update(playlists)
        .set({ nextResolveAt: new Date() })
        .where(eq(playlists.id, playlistId))
        .catch((markError: unknown) =>
          this.logger.warn(`Marking playlist ${playlistId} due failed: ${errorMessage(markError)}`),
        );
    }
  }

  private async loadDynamic(playlistId: string): Promise<DynamicPlaylist | null> {
    const [playlist] = await this.db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .limit(1);
    if (!playlist || playlist.kind !== PlaylistKind.Dynamic || !playlist.rule) {
      return null;
    }
    return { ...playlist, rule: playlist.rule };
  }

  /** Resolves the rule as read and writes the items, unless the rule changed meanwhile. */
  private async apply(playlist: DynamicPlaylist, now: Date): Promise<ResolveOutcome | null> {
    const { id: playlistId, organisationId, rule } = playlist;
    const refreshAt = new Date(now.getTime() + rule.refreshIntervalMinutes * MS_PER_MINUTE);
    const timeZone = await this.timeZoneOf(organisationId);
    const entries = await this.resolveEntries(organisationId, rule, now, timeZone);
    const result = await this.playlistService.replaceItems(
      playlistId,
      organisationId,
      entries.map(({ contentId }) => ({
        contentId,
        durationSeconds: rule.itemDurationSeconds,
        transition: rule.transition,
        transitionDurationMs: rule.transitionDurationMs,
      })),
      rule,
    );
    if (!result) {
      // The new rule's own resolve, or the scheduler, takes over.
      await this.scheduleNext(playlist, now);
      return null;
    }
    const nextResolveAt = this.nextResolveAt(entries, rule, refreshAt, timeZone);
    await this.scheduleNext(playlist, nextResolveAt, now);
    if (result.changed) {
      this.eventEmitter.emit(
        AUDIT_PLAYLIST_RESOLVED,
        new AuditPlaylistEvent(playlistId, organisationId, null, {
          itemCount: result.items.length,
        }),
      );
    }
    return { changed: result.changed, itemCount: result.items.length, nextResolveAt };
  }

  /**
   * Stores the next resolve, unless someone moved it since the playlist was
   * read (see {@link enqueueResolve}): that earlier request must survive.
   */
  private async scheduleNext(
    playlist: DynamicPlaylist,
    nextResolveAt: Date,
    resolvedAt?: Date,
  ): Promise<void> {
    const unchanged = playlist.nextResolveAt
      ? eq(playlists.nextResolveAt, playlist.nextResolveAt)
      : isNull(playlists.nextResolveAt);
    await this.db
      .update(playlists)
      .set({
        nextResolveAt: sql`CASE WHEN ${unchanged} THEN ${nextResolveAt.toISOString()}::timestamptz ELSE ${playlists.nextResolveAt} END`,
        ...(resolvedAt ? { lastResolvedAt: resolvedAt } : {}),
      })
      .where(eq(playlists.id, playlist.id));
  }

  private async resolveEntries(
    organisationId: string,
    rule: PlaylistRule,
    now: Date,
    timeZone: string,
  ): Promise<ResolvedRuleEntry<SourceEventWithSlides>[]> {
    const [pool, aliases] = await Promise.all([
      this.sourceService.findPool(
        organisationId,
        rule.sourceIds,
        earliestLiveEventDate(now, timeZone),
      ),
      this.sourceService.venueAliasesBySource(organisationId, rule.sourceIds),
    ]);
    return resolvePlaylistRule(pool, rule, now, timeZone, aliases);
  }

  private nextResolveAt(
    entries: ResolvedRuleEntry<SourceEventWithSlides>[],
    rule: PlaylistRule,
    refreshAt: Date,
    timeZone: string,
  ): Date {
    const expiries = entries.map(({ event }) =>
      eventExpiresAt(event.eventDate, rule.graceHours, timeZone).getTime(),
    );
    return new Date(Math.min(refreshAt.getTime(), ...expiries));
  }

  private async timeZoneOf(organisationId: string): Promise<string> {
    const [org] = await this.db
      .select({ timeZone: organisations.timeZone })
      .from(organisations)
      .where(eq(organisations.id, organisationId))
      .limit(1);
    if (!org) {
      throw new NotFoundException(`Organisation "${organisationId}" not found`);
    }
    return org.timeZone;
  }

  /** Every source must belong to the organisation, and at least one must render the format. */
  private async assertRuleSources(organisationId: string, rule: PlaylistRule): Promise<void> {
    const sources = await this.sourceService.findAll(organisationId);
    const byId = new Map(sources.map((source) => [source.id, source]));
    const missingIds = rule.sourceIds.filter((id) => !byId.has(id));
    if (missingIds.length > 0) {
      throw new BadRequestException({
        message: `Content sources not found in organisation "${organisationId}"`,
        missingIds,
      });
    }
    const rendersFormat = rule.sourceIds.some((id) => byId.get(id)!.formats.includes(rule.format));
    if (!rendersFormat) {
      throw new BadRequestException(
        `None of the selected content sources renders the format "${rule.format}"`,
      );
    }
  }
}
