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
  ContentSourceRemovedEvent,
  ContentSourceSyncedEvent,
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
  venue: string;
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
  async createDynamic(organisationId: string, dto: CreatePlaylistDto): Promise<Playlist> {
    if (!dto.rule) {
      throw new BadRequestException('A dynamic playlist needs a rule');
    }
    await this.assertRuleSources(organisationId, toPlaylistRule(dto.rule));
    const saved = await this.playlistService.create(organisationId, {
      ...dto,
      kind: PlaylistKind.Dynamic,
    });
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
   * Recomputes one dynamic playlist. Returns null when the playlist is gone or
   * static. The next resolve is due after the refresh interval, or earlier
   * when a shown event expires before that.
   */
  async resolve(playlistId: string, now: Date = new Date()): Promise<ResolveOutcome | null> {
    const [playlist] = await this.db
      .select()
      .from(playlists)
      .where(eq(playlists.id, playlistId))
      .limit(1);
    if (!playlist || playlist.kind !== PlaylistKind.Dynamic || !playlist.rule) {
      return null;
    }
    const rule = playlist.rule;
    const { organisationId } = playlist;
    const refreshAt = new Date(now.getTime() + rule.refreshIntervalMinutes * MS_PER_MINUTE);

    try {
      const timeZone = await this.timeZoneOf(organisationId);
      const entries = await this.resolveEntries(organisationId, rule, now, timeZone);
      const { changed, items } = await this.playlistService.replaceItems(
        playlistId,
        organisationId,
        entries.map(({ contentId }) => ({
          contentId,
          durationSeconds: rule.itemDurationSeconds,
          transition: rule.transition,
          transitionDurationMs: rule.transitionDurationMs,
        })),
      );
      const nextResolveAt = this.nextResolveAt(entries, rule, refreshAt, timeZone);
      await this.db
        .update(playlists)
        .set({ lastResolvedAt: now, nextResolveAt })
        .where(eq(playlists.id, playlistId));
      if (changed) {
        this.eventEmitter.emit(
          AUDIT_PLAYLIST_RESOLVED,
          new AuditPlaylistEvent(playlistId, organisationId, null, { itemCount: items.length }),
        );
      }
      return { changed, itemCount: items.length, nextResolveAt };
    } catch (error) {
      // Back off to the regular interval, so a broken rule is not retried every tick.
      await this.db
        .update(playlists)
        .set({ nextResolveAt: refreshAt })
        .where(eq(playlists.id, playlistId));
      throw error;
    }
  }

  async enqueueResolve(playlistId: string): Promise<void> {
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

  /** Resolves now; on failure the playlist stays due and the scheduler retries it. */
  private async resolveOrDefer(playlistId: string): Promise<void> {
    try {
      await this.resolve(playlistId);
    } catch (error) {
      this.logger.warn(`Resolving playlist ${playlistId} failed: ${errorMessage(error)}`);
    }
  }

  private async resolveEntries(
    organisationId: string,
    rule: PlaylistRule,
    now: Date,
    timeZone: string,
  ): Promise<ResolvedRuleEntry<SourceEventWithSlides>[]> {
    const pool = await this.sourceService.findPool(
      organisationId,
      rule.sourceIds,
      earliestLiveEventDate(now, timeZone),
    );
    return resolvePlaylistRule(pool, rule, now, timeZone);
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
