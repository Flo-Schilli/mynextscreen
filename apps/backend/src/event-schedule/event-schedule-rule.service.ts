import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, asc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  contentSources,
  eventScheduleRuleExclusions,
  eventScheduleRuleTargets,
  eventScheduleRules,
  organisations,
  playlists,
  scheduleEntries,
  screenGroups,
  screens,
  sourceEvents,
  type EventScheduleRule,
  type NewEventScheduleRuleTarget,
} from '../db/schema';
import { addDays, localDate } from '../common/zoned-time.util';
import { toVenueAliasMap } from '../content-source/venue-aliases';
import { ScheduleService } from '../schedule/schedule.service';
import { auditChanges, sortedIds } from '../audit-log/audit-changes';
import {
  AUDIT_EVENT_SCHEDULE_RULE_CREATED,
  AUDIT_EVENT_SCHEDULE_RULE_DELETED,
  AUDIT_EVENT_SCHEDULE_RULE_UPDATED,
  AuditEventScheduleRuleEvent,
} from '../audit-log/audit.events';
import { CreateEventScheduleRuleDto, UpdateEventScheduleRuleDto } from './dto';
import { planEventSlots, slotKey } from './event-schedule-planner';
import type { GenreVariant } from './event-schedule.types';
import { variantKey } from './genre-variant-playlists';
import { PlaylistKind } from '../playlist/playlist-kind.enum';
import {
  EventScheduleReconcileService,
  lockOrganisationSchedules,
} from './event-schedule-reconcile.service';

/** Upcoming events a preview lists at most. */
export const PREVIEW_LIMIT = 50;

/** A rule as the API returns it, with its targets. */
export type EventScheduleRuleView = EventScheduleRule & {
  screenIds: string[];
  groupIds: string[];
};

export type PreviewTargetStatus = 'scheduled' | 'conflict' | 'pending' | 'excluded';

export interface EventSchedulePreviewItem {
  sourceEventId: string;
  title: string;
  eventDate: string;
  venue: string;
  cancelled: boolean;
  startTime: Date;
  endTime: Date;
  excluded: boolean;
  targets: { screenId: string | null; groupId: string | null; status: PreviewTargetStatus }[];
}

/** CRUD for event schedule rules; every write reconciles the rule right away. */
@Injectable()
export class EventScheduleRuleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly reconcileService: EventScheduleReconcileService,
    private readonly scheduleService: ScheduleService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(organisationId: string, sourceId: string): Promise<EventScheduleRuleView[]> {
    await this.assertSource(organisationId, sourceId);
    const rules = await this.db
      .select()
      .from(eventScheduleRules)
      .where(
        and(
          eq(eventScheduleRules.organisationId, organisationId),
          eq(eventScheduleRules.sourceId, sourceId),
        ),
      )
      .orderBy(asc(eventScheduleRules.createdAt));
    return this.withTargets(rules);
  }

  async findOne(
    organisationId: string,
    sourceId: string,
    id: string,
  ): Promise<EventScheduleRuleView> {
    const [view] = await this.withTargets([await this.findRule(organisationId, sourceId, id)]);
    return view;
  }

  async create(
    organisationId: string,
    sourceId: string,
    dto: CreateEventScheduleRuleDto,
    userId: string | null,
  ): Promise<EventScheduleRuleView> {
    await this.assertSource(organisationId, sourceId);
    const genreVariants = toGenreVariants(dto.genreVariants ?? []);
    await this.assertPlaylist(organisationId, dto.playlistId, genreVariants);
    await this.assertTargets(organisationId, dto.screenIds, dto.groupIds);

    const rule = await this.db.transaction(async (tx) => {
      const [saved] = await tx
        .insert(eventScheduleRules)
        .values({
          organisationId,
          sourceId,
          name: dto.name.trim(),
          venues: dto.venues,
          playlistId: dto.playlistId,
          genreVariants,
          windowStart: dto.windowStart,
          windowEnd: dto.windowEnd,
          ...(dto.excludeCancelled !== undefined ? { excludeCancelled: dto.excludeCancelled } : {}),
          ...(dto.colour !== undefined ? { colour: dto.colour } : {}),
          ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        })
        .returning();
      await tx.insert(eventScheduleRuleTargets).values(this.targetRows(saved.id, dto));
      return saved;
    });

    this.eventEmitter.emit(
      AUDIT_EVENT_SCHEDULE_RULE_CREATED,
      new AuditEventScheduleRuleEvent(rule.id, organisationId, userId, {
        sourceId,
        name: rule.name,
      }),
    );
    await this.reconcileService.reconcile(rule.id, new Date(), userId);
    return this.findOne(organisationId, sourceId, rule.id);
  }

  async update(
    organisationId: string,
    sourceId: string,
    id: string,
    dto: UpdateEventScheduleRuleDto,
    userId: string | null,
  ): Promise<EventScheduleRuleView> {
    const [current] = await this.withTargets([await this.findRule(organisationId, sourceId, id)]);
    const genreVariants =
      dto.genreVariants !== undefined ? toGenreVariants(dto.genreVariants) : undefined;
    if (dto.playlistId !== undefined || genreVariants !== undefined) {
      await this.assertPlaylist(
        organisationId,
        dto.playlistId ?? current.playlistId,
        genreVariants ?? current.genreVariants,
      );
    }
    const screenIds = dto.screenIds ?? current.screenIds;
    const groupIds = dto.groupIds ?? current.groupIds;
    await this.assertTargets(organisationId, screenIds, groupIds);

    await this.db.transaction(async (tx) => {
      await tx
        .update(eventScheduleRules)
        .set({
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.venues !== undefined ? { venues: dto.venues } : {}),
          ...(dto.playlistId !== undefined ? { playlistId: dto.playlistId } : {}),
          ...(genreVariants !== undefined ? { genreVariants } : {}),
          ...(dto.windowStart !== undefined ? { windowStart: dto.windowStart } : {}),
          ...(dto.windowEnd !== undefined ? { windowEnd: dto.windowEnd } : {}),
          ...(dto.excludeCancelled !== undefined ? { excludeCancelled: dto.excludeCancelled } : {}),
          ...(dto.colour !== undefined ? { colour: dto.colour } : {}),
          ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        })
        .where(eq(eventScheduleRules.id, id));
      if (dto.screenIds !== undefined || dto.groupIds !== undefined) {
        await tx.delete(eventScheduleRuleTargets).where(eq(eventScheduleRuleTargets.ruleId, id));
        await tx
          .insert(eventScheduleRuleTargets)
          .values(this.targetRows(id, { screenIds, groupIds }));
      }
    });

    const [saved] = await this.withTargets([await this.findRule(organisationId, sourceId, id)]);
    const playlistNames = await this.playlistNames([
      ...current.genreVariants,
      ...saved.genreVariants,
    ]);
    this.eventEmitter.emit(
      AUDIT_EVENT_SCHEDULE_RULE_UPDATED,
      new AuditEventScheduleRuleEvent(id, organisationId, userId, {
        sourceId,
        name: saved.name,
        changes: auditChanges(
          current,
          saved,
          [
            'name',
            'venues',
            'playlistId',
            'genreVariants',
            'windowStart',
            'windowEnd',
            'excludeCancelled',
            'colour',
            'enabled',
            'screenIds',
            'groupIds',
          ],
          {
            map: {
              screenIds: sortedIds,
              groupIds: sortedIds,
              genreVariants: (value) => genreGroupLabels(value, playlistNames),
            },
          },
        ),
      }),
    );
    await this.reconcileService.reconcile(id, new Date(), userId);
    return this.findOne(organisationId, sourceId, id);
  }

  /** Deletes the rule and its generated entries, and tells the screens. */
  async remove(
    organisationId: string,
    sourceId: string,
    id: string,
    userId: string | null,
  ): Promise<void> {
    const rule = await this.findRule(organisationId, sourceId, id);
    const removed = await this.db.transaction(async (tx) => {
      // Under the lock no reconcile can add an entry between reading and deleting.
      await lockOrganisationSchedules(tx, organisationId);
      const entries = await tx
        .select()
        .from(scheduleEntries)
        .where(eq(scheduleEntries.managedByRuleId, id));
      await tx.delete(eventScheduleRules).where(eq(eventScheduleRules.id, id));
      return entries;
    });
    this.scheduleService.announceManagedChanges(removed);
    this.eventEmitter.emit(
      AUDIT_EVENT_SCHEDULE_RULE_DELETED,
      new AuditEventScheduleRuleEvent(id, organisationId, userId, { sourceId, name: rule.name }),
    );
    // The freed slots may be what other rules on these targets were waiting for.
    await this.reconcileService.reconcileRulesOn(removed, new Date(), new Set([id]));
  }

  /** Leaves one event out of the rule, or takes it back in. */
  async setExcluded(
    organisationId: string,
    sourceId: string,
    id: string,
    sourceEventId: string,
    excluded: boolean,
    userId: string | null,
  ): Promise<void> {
    await this.findRule(organisationId, sourceId, id);
    const [event] = await this.db
      .select({ id: sourceEvents.id })
      .from(sourceEvents)
      .where(and(eq(sourceEvents.id, sourceEventId), eq(sourceEvents.sourceId, sourceId)))
      .limit(1);
    if (!event) {
      throw new NotFoundException(`Event "${sourceEventId}" not found in source "${sourceId}"`);
    }
    if (excluded) {
      await this.db
        .insert(eventScheduleRuleExclusions)
        .values({ ruleId: id, sourceEventId })
        .onConflictDoNothing();
    } else {
      await this.db
        .delete(eventScheduleRuleExclusions)
        .where(
          and(
            eq(eventScheduleRuleExclusions.ruleId, id),
            eq(eventScheduleRuleExclusions.sourceEventId, sourceEventId),
          ),
        );
    }
    await this.reconcileService.reconcile(id, new Date(), userId);
  }

  /**
   * The rule's upcoming events with the status of each target: scheduled,
   * held by another entry, excluded, or not reconciled yet.
   */
  async preview(
    organisationId: string,
    sourceId: string,
    id: string,
    now: Date = new Date(),
  ): Promise<EventSchedulePreviewItem[]> {
    const [rule] = await this.withTargets([await this.findRule(organisationId, sourceId, id)]);
    const [org] = await this.db
      .select({ timeZone: organisations.timeZone })
      .from(organisations)
      .where(eq(organisations.id, organisationId));
    const [source] = await this.db
      .select({ venueAliases: contentSources.venueAliases })
      .from(contentSources)
      .where(eq(contentSources.id, sourceId));
    const [events, exclusions, entries] = await Promise.all([
      this.db
        .select()
        .from(sourceEvents)
        .where(
          and(
            eq(sourceEvents.sourceId, sourceId),
            isNull(sourceEvents.goneAt),
            gte(sourceEvents.eventDate, addDays(localDate(now, org.timeZone), -1)),
          ),
        )
        .orderBy(asc(sourceEvents.startsAt), asc(sourceEvents.title)),
      this.db
        .select({ sourceEventId: eventScheduleRuleExclusions.sourceEventId })
        .from(eventScheduleRuleExclusions)
        .where(eq(eventScheduleRuleExclusions.ruleId, id)),
      this.db.select().from(scheduleEntries).where(eq(scheduleEntries.managedByRuleId, id)),
    ]);

    const excluded = new Set(exclusions.map((row) => row.sourceEventId));
    const scheduled = new Set(
      entries.map((e) => slotKey(e.managedSourceEventId, e.screenId, e.groupId)),
    );
    const conflicts = new Set(
      (rule.lastReconcileSummary?.conflicts ?? []).map((c) =>
        slotKey(c.sourceEventId, c.screenId, c.groupId),
      ),
    );
    const targets = [
      ...rule.screenIds.map((screenId) => ({ screenId, groupId: null })),
      ...rule.groupIds.map((groupId) => ({ screenId: null, groupId })),
    ];
    // Plan as if nothing were excluded, so excluded events stay visible to take back in.
    const slots = planEventSlots(
      { ...rule, enabled: true },
      events,
      toVenueAliasMap(source?.venueAliases),
      new Set(),
      now,
      org.timeZone,
    ).slice(0, PREVIEW_LIMIT);

    return slots.map(({ event, startTime, endTime }) => {
      const isExcluded = excluded.has(event.id);
      return {
        sourceEventId: event.id,
        title: event.title,
        eventDate: event.eventDate,
        venue: event.venue,
        cancelled: event.cancelled,
        startTime,
        endTime,
        excluded: isExcluded,
        targets: targets.map((target) => {
          const key = slotKey(event.id, target.screenId, target.groupId);
          const status: PreviewTargetStatus = isExcluded
            ? 'excluded'
            : scheduled.has(key)
              ? 'scheduled'
              : conflicts.has(key)
                ? 'conflict'
                : 'pending';
          return { ...target, status };
        }),
      };
    });
  }

  private async findRule(
    organisationId: string,
    sourceId: string,
    id: string,
  ): Promise<EventScheduleRule> {
    const [rule] = await this.db
      .select()
      .from(eventScheduleRules)
      .where(
        and(
          eq(eventScheduleRules.id, id),
          eq(eventScheduleRules.organisationId, organisationId),
          eq(eventScheduleRules.sourceId, sourceId),
        ),
      )
      .limit(1);
    if (!rule) {
      throw new NotFoundException(`Event schedule rule "${id}" not found`);
    }
    return rule;
  }

  private async withTargets(rules: EventScheduleRule[]): Promise<EventScheduleRuleView[]> {
    if (rules.length === 0) return [];
    const targets = await this.db
      .select()
      .from(eventScheduleRuleTargets)
      .where(
        inArray(
          eventScheduleRuleTargets.ruleId,
          rules.map((rule) => rule.id),
        ),
      );
    return rules.map((rule) => {
      const own = targets.filter((target) => target.ruleId === rule.id);
      return {
        ...rule,
        screenIds: own.flatMap((t) => (t.screenId ? [t.screenId] : [])),
        groupIds: own.flatMap((t) => (t.groupId ? [t.groupId] : [])),
      };
    });
  }

  private targetRows(
    ruleId: string,
    targets: { screenIds: readonly string[]; groupIds: readonly string[] },
  ): NewEventScheduleRuleTarget[] {
    return [
      ...targets.screenIds.map((screenId) => ({ ruleId, screenId, groupId: null })),
      ...targets.groupIds.map((groupId) => ({ ruleId, screenId: null, groupId })),
    ];
  }

  private async assertSource(organisationId: string, sourceId: string): Promise<void> {
    const [source] = await this.db
      .select({ id: contentSources.id })
      .from(contentSources)
      .where(
        and(eq(contentSources.id, sourceId), eq(contentSources.organisationId, organisationId)),
      )
      .limit(1);
    if (!source) {
      throw new NotFoundException(`Content source "${sourceId}" not found`);
    }
  }

  /**
   * The rule's playlist and every group's own playlist are the organisation's
   * own, not another rule's hidden copies. The rule's playlist has to be
   * dynamic only when a group relies on it, since such a group narrows it.
   */
  private async assertPlaylist(
    organisationId: string,
    playlistId: string,
    genreVariants: readonly GenreVariant[],
  ): Promise<void> {
    const groupPlaylistIds = genreVariants
      .map((variant) => variant.playlistId)
      .filter((id): id is string => id !== undefined);
    const wanted = [...new Set([playlistId, ...groupPlaylistIds])];
    const found = await this.db
      .select({ id: playlists.id, kind: playlists.kind })
      .from(playlists)
      .where(
        and(
          inArray(playlists.id, wanted),
          eq(playlists.organisationId, organisationId),
          isNull(playlists.managedByRuleId),
        ),
      );
    const kindOf = new Map(found.map((playlist) => [playlist.id, playlist.kind]));
    const missing = wanted.find((id) => !kindOf.has(id));
    if (missing) {
      throw new NotFoundException(`Playlist "${missing}" not found`);
    }
    const reliesOnRulePlaylist = genreVariants.some((variant) => !variant.playlistId);
    if (reliesOnRulePlaylist && kindOf.get(playlistId) !== PlaylistKind.Dynamic) {
      throw new BadRequestException(
        'A genre group without its own playlist needs the rule playlist to be dynamic',
      );
    }
    const keys = genreVariants.map(variantKey);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Two genre groups list the same genres');
    }
  }

  /** Names of the groups' own playlists, for the audit entry. */
  private async playlistNames(variants: readonly GenreVariant[]): Promise<Map<string, string>> {
    const ids = [
      ...new Set(variants.map((variant) => variant.playlistId).filter((id): id is string => !!id)),
    ];
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.db
      .select({ id: playlists.id, name: playlists.name })
      .from(playlists)
      .where(inArray(playlists.id, ids));
    return new Map(rows.map((row) => [row.id, row.name]));
  }

  /** At least one target, and every one in the organisation. */
  private async assertTargets(
    organisationId: string,
    screenIds: readonly string[],
    groupIds: readonly string[],
  ): Promise<void> {
    if (screenIds.length + groupIds.length === 0) {
      throw new BadRequestException('A rule needs at least one screen or screen group');
    }
    const foundScreens =
      screenIds.length === 0
        ? []
        : await this.db
            .select({ id: screens.id })
            .from(screens)
            .where(
              and(eq(screens.organisationId, organisationId), inArray(screens.id, [...screenIds])),
            );
    const foundGroups =
      groupIds.length === 0
        ? []
        : await this.db
            .select({ id: screenGroups.id })
            .from(screenGroups)
            .where(
              and(
                eq(screenGroups.organisationId, organisationId),
                inArray(screenGroups.id, [...groupIds]),
              ),
            );
    if (foundScreens.length !== screenIds.length || foundGroups.length !== groupIds.length) {
      throw new NotFoundException('Some screens or screen groups were not found');
    }
  }
}

/**
 * Genre groups as the audit log shows them: `["Rock/Metal → Rock-Abend", "Jazz"]`,
 * naming a group's own playlist when it has one.
 */
function genreGroupLabels(value: unknown, playlistNames: ReadonlyMap<string, string>): unknown {
  return Array.isArray(value)
    ? value.map((variant: GenreVariant) => {
        const genres = variant.genres.join('/');
        return variant.playlistId
          ? `${genres} → ${playlistNames.get(variant.playlistId) ?? variant.playlistId}`
          : genres;
      })
    : value;
}

/** Drops an empty or null playlist, so a group without one is stored as before. */
function toGenreVariants(
  dtos: readonly { genres: string[]; playlistId?: string | null }[],
): GenreVariant[] {
  return dtos.map(({ genres, playlistId }) => (playlistId ? { genres, playlistId } : { genres }));
}
