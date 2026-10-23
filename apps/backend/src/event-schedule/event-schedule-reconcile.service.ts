import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq, gte, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  contentSources,
  eventScheduleRuleExclusions,
  eventScheduleRuleTargets,
  eventScheduleRules,
  organisations,
  scheduleEntries,
  screenGroups,
  sliceJobs,
  sourceEvents,
  type EventScheduleRule,
  type EventScheduleRuleTarget,
  type NewScheduleEntry,
  type ScheduleEntry,
  type SourceEvent,
} from '../db/schema';
import { addDays, localDate } from '../common/zoned-time.util';
import { toVenueAliasMap } from '../content-source/venue-aliases';
import { getOccurrences } from '../schedule/rrule.util';
import { ScheduleService } from '../schedule/schedule.service';
import {
  AUDIT_EVENT_SCHEDULE_RULE_RECONCILED,
  AuditEventScheduleRuleEvent,
} from '../audit-log/audit.events';
import { planEventSlots, slotKey, type PlannedSlot } from './event-schedule-planner';
import type { EventScheduleConflict, EventScheduleReconcileSummary } from './event-schedule.types';
import { ScreenGroupMode } from '../screen-group/screen-group-mode.enum';

/** Generated entries that ended longer ago than this are pruned. */
export const MANAGED_ENTRY_RETENTION_DAYS = 14;

/** Conflicts a summary keeps; the counts stay exact. */
export const MAX_STORED_CONFLICTS = 200;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_ENTRY_NAME_LENGTH = 120;

type Tx = Parameters<Parameters<DrizzleDB['transaction']>[0]>[0];

/** A screen or a group, as targets and entries name them. */
export interface ScheduleTarget {
  screenId: string | null;
  groupId: string | null;
}

interface ReconcileChanges {
  summary: EventScheduleReconcileSummary;
  written: ScheduleEntry[];
  removed: ScheduleEntry[];
  /** Upcoming group entries the rule keeps, written or not. */
  upcomingGroupEntries: ScheduleEntry[];
  organisationId: string;
}

/**
 * Serialises every schedule change rules make in one organisation. Taken
 * inside a transaction; released when it ends.
 */
export async function lockOrganisationSchedules(tx: Tx, organisationId: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${organisationId}))`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function entryName(rule: EventScheduleRule, event: SourceEvent): string {
  return `${rule.name}: ${event.title}`.slice(0, MAX_ENTRY_NAME_LENGTH);
}

/** True when `entry` plays on the same screen or group as `target`. */
function sameTarget(
  entry: Pick<ScheduleEntry, 'screenId' | 'groupId'>,
  target: EventScheduleRuleTarget,
): boolean {
  return target.screenId ? entry.screenId === target.screenId : entry.groupId === target.groupId;
}

/**
 * Brings a rule's generated schedule entries in line with the events its
 * source lists. Manual entries always win: a slot one of them overlaps is
 * left out and reported as a conflict, and an entry of another rule that got
 * there first wins the same way. One organisation reconciles at a time, so two
 * rules cannot fill the same slot concurrently.
 */
@Injectable()
export class EventScheduleReconcileService {
  private readonly logger = new Logger(EventScheduleReconcileService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly scheduleService: ScheduleService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Reconciles one rule. Slots it gives up may be what another rule was
   * waiting for, so the rules on those targets reconcile next; `visited`
   * keeps that chain finite. Returns null when the rule no longer exists.
   */
  async reconcile(
    ruleId: string,
    now: Date = new Date(),
    userId: string | null = null,
    visited: Set<string> = new Set(),
  ): Promise<EventScheduleReconcileSummary | null> {
    visited.add(ruleId);
    const changes = await this.db.transaction((tx) => this.reconcileIn(tx, ruleId, now));
    if (!changes) return null;

    this.scheduleService.announceManagedChanges([...changes.written, ...changes.removed]);
    await this.scheduleService.enqueueSlicesFor([
      ...changes.written,
      ...(await this.unsliced(changes.upcomingGroupEntries)),
    ]);
    this.audit(ruleId, changes, userId);
    if (changes.removed.length > 0) {
      await this.reconcileRulesOn(changes.removed, now, visited);
    }
    return changes.summary;
  }

  /**
   * Reconciles every rule that schedules onto one of `targets`, except those
   * in `visited`. One failing rule does not stop the others.
   */
  async reconcileRulesOn(
    targets: readonly ScheduleTarget[],
    now: Date = new Date(),
    visited: Set<string> = new Set(),
  ): Promise<void> {
    const ruleIds = await this.ruleIdsTargeting(targets);
    for (const id of ruleIds) {
      if (visited.has(id)) continue;
      try {
        await this.reconcile(id, now, null, visited);
      } catch (error) {
        this.logger.warn(`Reconciling event schedule rule ${id} failed: ${errorMessage(error)}`);
      }
    }
  }

  /** Rules fed by a source. */
  async ruleIdsOfSource(sourceId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: eventScheduleRules.id })
      .from(eventScheduleRules)
      .where(eq(eventScheduleRules.sourceId, sourceId));
    return rows.map((row) => row.id);
  }

  /** Rules of one organisation. */
  async ruleIdsOfOrganisation(organisationId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: eventScheduleRules.id })
      .from(eventScheduleRules)
      .where(eq(eventScheduleRules.organisationId, organisationId));
    return rows.map((row) => row.id);
  }

  async allRuleIds(): Promise<string[]> {
    const rows = await this.db.select({ id: eventScheduleRules.id }).from(eventScheduleRules);
    return rows.map((row) => row.id);
  }

  /** Rules that schedule onto one of the screens or groups. */
  async ruleIdsTargeting(targets: readonly ScheduleTarget[]): Promise<string[]> {
    const screenIds = [...new Set(targets.flatMap((t) => (t.screenId ? [t.screenId] : [])))];
    const groupIds = [...new Set(targets.flatMap((t) => (t.groupId ? [t.groupId] : [])))];
    const conditions: SQL[] = [];
    if (screenIds.length > 0)
      conditions.push(inArray(eventScheduleRuleTargets.screenId, screenIds));
    if (groupIds.length > 0) conditions.push(inArray(eventScheduleRuleTargets.groupId, groupIds));
    if (conditions.length === 0) return [];
    const rows = await this.db
      .selectDistinct({ id: eventScheduleRuleTargets.ruleId })
      .from(eventScheduleRuleTargets)
      .where(or(...conditions));
    return rows.map((row) => row.id);
  }

  /**
   * Upcoming split-group entries whose group has never sliced their playlist:
   * a slice job that could not be queued last time is queued again.
   */
  private async unsliced(entries: readonly ScheduleEntry[]): Promise<ScheduleEntry[]> {
    const groupIds = [...new Set(entries.flatMap((e) => (e.groupId ? [e.groupId] : [])))];
    if (groupIds.length === 0) return [];
    const [jobs, splitGroups] = await Promise.all([
      this.db
        .select({ groupId: sliceJobs.groupId, playlistId: sliceJobs.playlistId })
        .from(sliceJobs)
        .where(inArray(sliceJobs.groupId, groupIds)),
      this.db
        .select({ id: screenGroups.id })
        .from(screenGroups)
        .where(
          and(inArray(screenGroups.id, groupIds), eq(screenGroups.mode, ScreenGroupMode.Split)),
        ),
    ]);
    const sliced = new Set(jobs.map((job) => `${job.groupId}:${job.playlistId}`));
    const split = new Set(splitGroups.map((group) => group.id));
    return entries.filter(
      (e) => e.groupId && split.has(e.groupId) && !sliced.has(`${e.groupId}:${e.playlistId}`),
    );
  }

  private audit(ruleId: string, changes: ReconcileChanges, userId: string | null): void {
    const { summary } = changes;
    if (summary.created + summary.updated + summary.removed > 0) {
      this.eventEmitter.emit(
        AUDIT_EVENT_SCHEDULE_RULE_RECONCILED,
        new AuditEventScheduleRuleEvent(ruleId, changes.organisationId, userId, {
          created: summary.created,
          updated: summary.updated,
          removed: summary.removed,
          conflicts: summary.conflicts.length,
        }),
      );
    }
  }

  private async reconcileIn(tx: Tx, ruleId: string, now: Date): Promise<ReconcileChanges | null> {
    const [found] = await tx
      .select({ organisationId: eventScheduleRules.organisationId })
      .from(eventScheduleRules)
      .where(eq(eventScheduleRules.id, ruleId));
    if (!found) return null;
    await lockOrganisationSchedules(tx, found.organisationId);

    // Read again under the lock: the rule may have changed or gone meanwhile.
    const [rule] = await tx
      .select()
      .from(eventScheduleRules)
      .where(eq(eventScheduleRules.id, ruleId));
    if (!rule) return null;

    const slots = await this.plan(tx, rule, now);
    const targets = await tx
      .select()
      .from(eventScheduleRuleTargets)
      .where(eq(eventScheduleRuleTargets.ruleId, rule.id));
    const existing = await tx
      .select()
      .from(scheduleEntries)
      .where(eq(scheduleEntries.managedByRuleId, rule.id));
    const blockers = await this.loadBlockers(tx, rule, targets);

    const changes: ReconcileChanges = {
      summary: { created: 0, updated: 0, removed: 0, conflicts: [] },
      written: [],
      removed: [],
      upcomingGroupEntries: [],
      organisationId: rule.organisationId,
    };
    const existingByKey = new Map(
      existing.map((entry) => [
        slotKey(entry.managedSourceEventId, entry.screenId, entry.groupId),
        entry,
      ]),
    );

    for (const slot of slots) {
      for (const target of targets) {
        const key = slotKey(slot.event.id, target.screenId, target.groupId);
        const current = existingByKey.get(key);
        existingByKey.delete(key);
        await this.applySlot(tx, rule, slot, target, current, blockers, changes);
      }
    }

    const pruneBefore = now.getTime() - MANAGED_ENTRY_RETENTION_DAYS * MS_PER_DAY;
    for (const stale of existingByKey.values()) {
      const ended = stale.endTime.getTime() <= now.getTime();
      // Ended entries stay as history for a while; an unwanted upcoming one goes.
      if (ended && stale.endTime.getTime() >= pruneBefore) continue;
      await tx.delete(scheduleEntries).where(eq(scheduleEntries.id, stale.id));
      if (!ended) {
        changes.summary.removed += 1;
        changes.removed.push(stale);
      }
    }

    const removedIds = new Set(changes.removed.map((entry) => entry.id));
    const kept = [
      ...changes.written,
      ...existing.filter(
        (entry) => !removedIds.has(entry.id) && !changes.written.some((w) => w.id === entry.id),
      ),
    ];
    changes.upcomingGroupEntries = kept.filter(
      (entry) => entry.groupId !== null && entry.endTime.getTime() > now.getTime(),
    );

    const stored = {
      ...changes.summary,
      conflicts: changes.summary.conflicts.slice(0, MAX_STORED_CONFLICTS),
    };
    await tx
      .update(eventScheduleRules)
      .set({ lastReconciledAt: now, lastReconcileSummary: stored })
      .where(eq(eventScheduleRules.id, rule.id));
    return changes;
  }

  /** The slots the rule wants, from the source's current events. */
  private async plan(
    tx: Tx,
    rule: EventScheduleRule,
    now: Date,
  ): Promise<PlannedSlot<SourceEvent>[]> {
    const [org] = await tx
      .select({ timeZone: organisations.timeZone })
      .from(organisations)
      .where(eq(organisations.id, rule.organisationId));
    const [source] = await tx
      .select({ venueAliases: contentSources.venueAliases })
      .from(contentSources)
      .where(eq(contentSources.id, rule.sourceId));
    if (!org || !source) return [];

    // A window may run past midnight, so yesterday's event can still be on.
    const fromDate = addDays(localDate(now, org.timeZone), -1);
    const [events, exclusions] = await Promise.all([
      tx
        .select()
        .from(sourceEvents)
        .where(
          and(
            eq(sourceEvents.sourceId, rule.sourceId),
            isNull(sourceEvents.goneAt),
            gte(sourceEvents.eventDate, fromDate),
          ),
        ),
      tx
        .select({ sourceEventId: eventScheduleRuleExclusions.sourceEventId })
        .from(eventScheduleRuleExclusions)
        .where(eq(eventScheduleRuleExclusions.ruleId, rule.id)),
    ]);
    return planEventSlots(
      rule,
      events,
      toVenueAliasMap(source.venueAliases),
      new Set(exclusions.map((row) => row.sourceEventId)),
      now,
      org.timeZone,
    );
  }

  /** Every other entry on the rule's targets: manual ones and those of other rules. */
  private async loadBlockers(
    tx: Tx,
    rule: EventScheduleRule,
    targets: readonly EventScheduleRuleTarget[],
  ): Promise<ScheduleEntry[]> {
    const screenIds = targets.flatMap((t) => (t.screenId ? [t.screenId] : []));
    const groupIds = targets.flatMap((t) => (t.groupId ? [t.groupId] : []));
    const onTarget: SQL[] = [];
    if (screenIds.length > 0) onTarget.push(inArray(scheduleEntries.screenId, screenIds));
    if (groupIds.length > 0) onTarget.push(inArray(scheduleEntries.groupId, groupIds));
    if (onTarget.length === 0) return [];
    return tx
      .select()
      .from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.organisationId, rule.organisationId),
          or(...onTarget),
          or(isNull(scheduleEntries.managedByRuleId), ne(scheduleEntries.managedByRuleId, rule.id)),
        ),
      );
  }

  private async applySlot(
    tx: Tx,
    rule: EventScheduleRule,
    slot: PlannedSlot<SourceEvent>,
    target: EventScheduleRuleTarget,
    current: ScheduleEntry | undefined,
    blockers: readonly ScheduleEntry[],
    changes: ReconcileChanges,
  ): Promise<void> {
    const blocking = blockers.find(
      (entry) =>
        sameTarget(entry, target) &&
        getOccurrences(
          entry.startTime,
          entry.endTime,
          entry.rrule,
          slot.startTime,
          slot.endTime,
        ).some((occ) => occ.start < slot.endTime && occ.end > slot.startTime),
    );
    if (blocking) {
      changes.summary.conflicts.push(this.conflictOf(slot.event, target, blocking));
      if (current) {
        await tx.delete(scheduleEntries).where(eq(scheduleEntries.id, current.id));
        changes.summary.removed += 1;
        changes.removed.push(current);
      }
      return;
    }

    const wanted = {
      playlistId: rule.playlistId,
      name: entryName(rule, slot.event),
      colour: rule.colour,
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
    if (!current) {
      const values: NewScheduleEntry = {
        ...wanted,
        organisationId: rule.organisationId,
        screenId: target.screenId,
        groupId: target.groupId,
        managedByRuleId: rule.id,
        managedSourceEventId: slot.event.id,
      };
      const [saved] = await tx.insert(scheduleEntries).values(values).returning();
      changes.summary.created += 1;
      changes.written.push(saved);
      return;
    }

    const unchanged =
      current.playlistId === wanted.playlistId &&
      current.name === wanted.name &&
      current.colour === wanted.colour &&
      current.startTime.getTime() === wanted.startTime.getTime() &&
      current.endTime.getTime() === wanted.endTime.getTime();
    if (unchanged) return;
    const [saved] = await tx
      .update(scheduleEntries)
      .set(wanted)
      .where(eq(scheduleEntries.id, current.id))
      .returning();
    changes.summary.updated += 1;
    changes.written.push(saved);
  }

  private conflictOf(
    event: SourceEvent,
    target: EventScheduleRuleTarget,
    blocking: ScheduleEntry,
  ): EventScheduleConflict {
    return {
      sourceEventId: event.id,
      eventTitle: event.title,
      eventDate: event.eventDate,
      screenId: target.screenId,
      groupId: target.groupId,
      blockingEntryId: blocking.id,
    };
  }
}
