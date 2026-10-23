import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screenGroups, screens } from '../db/schema';
import {
  CONTENT_SOURCE_REMOVED,
  CONTENT_SOURCE_SYNCED,
  CONTENT_SOURCE_VENUE_ALIASES_UPDATED,
  ContentSourceRemovedEvent,
  ContentSourceSyncedEvent,
  ContentSourceVenueAliasesUpdatedEvent,
} from '../content-source/content-source.constants';
import {
  GROUP_SCHEDULE_CHANGED,
  GroupScheduleChangedEvent,
  SCHEDULE_ENTRY_CHANGED,
  ScheduleEntryChangedEvent,
} from '../schedule/schedule.event';
import { EventScheduleReconcileService } from './event-schedule-reconcile.service';
import { EventScheduleRuleService } from './event-schedule-rule.service';

/** Rolls every rule's horizon on and heals a reconcile that failed. */
export const EVENT_SCHEDULE_TICK_MS = 60 * 60 * 1000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Reconciles rules whenever their inputs change: a sync or new aliases of
 * their source, a manual entry on one of their targets, or the hourly tick.
 * Changes a rule makes itself carry `managed` and are ignored here, so a
 * reconcile never triggers another one.
 */
@Injectable()
export class EventScheduleListener {
  private readonly logger = new Logger(EventScheduleListener.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly ruleService: EventScheduleRuleService,
    private readonly reconcileService: EventScheduleReconcileService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(CONTENT_SOURCE_SYNCED, { async: true })
  async onSourceSynced(event: ContentSourceSyncedEvent): Promise<void> {
    await this.reconcileAll(() => this.ruleService.ruleIdsOfSource(event.sourceId));
  }

  @OnEvent(CONTENT_SOURCE_VENUE_ALIASES_UPDATED, { async: true })
  async onVenueAliasesUpdated(event: ContentSourceVenueAliasesUpdatedEvent): Promise<void> {
    await this.reconcileAll(() => this.ruleService.ruleIdsOfSource(event.sourceId));
  }

  /** A manual entry may now hold a slot a rule filled: the rule steps aside. */
  @OnEvent(SCHEDULE_ENTRY_CHANGED, { async: true })
  async onScreenScheduleChanged(event: ScheduleEntryChangedEvent): Promise<void> {
    if (event.managed) return;
    await this.reconcileAll(() => this.ruleService.ruleIdsTargeting({ screenId: event.screenId }));
  }

  @OnEvent(GROUP_SCHEDULE_CHANGED, { async: true })
  async onGroupScheduleChanged(event: GroupScheduleChangedEvent): Promise<void> {
    if (event.managed) return;
    await this.reconcileAll(() => this.ruleService.ruleIdsTargeting({ groupId: event.groupId }));
  }

  /**
   * Deleting a source deleted its rules and their entries by cascade, before
   * anyone could say which screens showed them. Every screen and group of the
   * organisation re-resolves instead; removing a source is rare.
   */
  @OnEvent(CONTENT_SOURCE_REMOVED, { async: true })
  async onSourceRemoved(event: ContentSourceRemovedEvent): Promise<void> {
    try {
      const [orgScreens, orgGroups] = await Promise.all([
        this.db
          .select({ id: screens.id })
          .from(screens)
          .where(eq(screens.organisationId, event.organisationId)),
        this.db
          .select({ id: screenGroups.id })
          .from(screenGroups)
          .where(eq(screenGroups.organisationId, event.organisationId)),
      ]);
      for (const { id } of orgScreens) {
        this.eventEmitter.emit(
          SCHEDULE_ENTRY_CHANGED,
          new ScheduleEntryChangedEvent(id, event.organisationId, true),
        );
      }
      for (const { id } of orgGroups) {
        this.eventEmitter.emit(
          GROUP_SCHEDULE_CHANGED,
          new GroupScheduleChangedEvent(id, event.organisationId, null, true),
        );
      }
    } catch (error) {
      this.logger.warn(
        `Announcing schedules after removing source ${event.sourceId} failed: ${errorMessage(error)}`,
      );
    }
  }

  @Interval(EVENT_SCHEDULE_TICK_MS)
  async tick(): Promise<void> {
    await this.reconcileAll(() => this.ruleService.allRuleIds());
  }

  /** One failing rule must not stop the others; the next tick retries it. */
  private async reconcileAll(ruleIds: () => Promise<string[]>): Promise<void> {
    let ids: string[];
    try {
      ids = await ruleIds();
    } catch (error) {
      this.logger.warn(`Loading event schedule rules failed: ${errorMessage(error)}`);
      return;
    }
    for (const id of ids) {
      try {
        await this.reconcileService.reconcile(id);
      } catch (error) {
        this.logger.warn(`Reconciling event schedule rule ${id} failed: ${errorMessage(error)}`);
      }
    }
  }
}
