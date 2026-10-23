import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, asc, eq, gte, inArray, isNull, or } from 'drizzle-orm';
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
import {
  AUDIT_EVENT_SCHEDULE_RULE_CREATED,
  AUDIT_EVENT_SCHEDULE_RULE_DELETED,
  AUDIT_EVENT_SCHEDULE_RULE_UPDATED,
  AuditEventScheduleRuleEvent,
} from '../audit-log/audit.events';
import { CreateEventScheduleRuleDto, UpdateEventScheduleRuleDto } from './dto';
import { planEventSlots, slotKey } from './event-schedule-planner';
import { EventScheduleReconcileService } from './event-schedule-reconcile.service';

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
    await this.assertPlaylist(organisationId, dto.playlistId);
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
    if (dto.playlistId) await this.assertPlaylist(organisationId, dto.playlistId);
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

    this.eventEmitter.emit(
      AUDIT_EVENT_SCHEDULE_RULE_UPDATED,
      new AuditEventScheduleRuleEvent(id, organisationId, userId, { sourceId }),
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
      const entries = await tx
        .select()
        .from(scheduleEntries)
        .where(eq(scheduleEntries.managedByRuleId, id));
      await tx.delete(eventScheduleRules).where(eq(eventScheduleRules.id, id));
      return entries;
    });
    await this.scheduleService.announceManagedChanges([], removed);
    this.eventEmitter.emit(
      AUDIT_EVENT_SCHEDULE_RULE_DELETED,
      new AuditEventScheduleRuleEvent(id, organisationId, userId, { sourceId, name: rule.name }),
    );
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

  /** Rules fed by a source. */
  async ruleIdsOfSource(sourceId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: eventScheduleRules.id })
      .from(eventScheduleRules)
      .where(eq(eventScheduleRules.sourceId, sourceId));
    return rows.map((row) => row.id);
  }

  /** Rules that schedule onto a screen or a group. */
  async ruleIdsTargeting(target: { screenId?: string; groupId?: string }): Promise<string[]> {
    const conditions = [
      ...(target.screenId ? [eq(eventScheduleRuleTargets.screenId, target.screenId)] : []),
      ...(target.groupId ? [eq(eventScheduleRuleTargets.groupId, target.groupId)] : []),
    ];
    if (conditions.length === 0) return [];
    const rows = await this.db
      .selectDistinct({ id: eventScheduleRuleTargets.ruleId })
      .from(eventScheduleRuleTargets)
      .where(or(...conditions));
    return rows.map((row) => row.id);
  }

  async allRuleIds(): Promise<string[]> {
    const rows = await this.db.select({ id: eventScheduleRules.id }).from(eventScheduleRules);
    return rows.map((row) => row.id);
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

  private async assertPlaylist(organisationId: string, playlistId: string): Promise<void> {
    const [playlist] = await this.db
      .select({ id: playlists.id })
      .from(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.organisationId, organisationId)))
      .limit(1);
    if (!playlist) {
      throw new NotFoundException(`Playlist "${playlistId}" not found`);
    }
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
