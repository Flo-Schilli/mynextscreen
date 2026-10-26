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
  SCHEDULE_ENTRIES_EDITED,
  SCHEDULE_ENTRY_CHANGED,
  ScheduleEntriesEditedEvent,
  ScheduleEntryChangedEvent,
} from '../schedule/schedule.event';
import { PLAYLIST_RULE_CHANGED, PlaylistRuleChangedEvent } from '../playlist/playlist.event';
import { EventScheduleReconcileService } from './event-schedule-reconcile.service';

/** Rolls every rule's horizon on and heals a reconcile that failed. */
export const EVENT_SCHEDULE_TICK_MS = 60 * 60 * 1000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Reconciles rules whenever their inputs change: a sync or new aliases of
 * their source, a manual entry on one of their targets, a new rule on the
 * playlist their genre variants copy, or the hourly tick.
 * Generated entries never raise `SCHEDULE_ENTRIES_EDITED`, so a reconcile
 * never triggers another one through this listener.
 */
@Injectable()
export class EventScheduleListener {
  private readonly logger = new Logger(EventScheduleListener.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly reconcileService: EventScheduleReconcileService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(CONTENT_SOURCE_SYNCED, { async: true })
  async onSourceSynced(event: ContentSourceSyncedEvent): Promise<void> {
    await this.reconcileAll(() => this.reconcileService.ruleIdsOfSource(event.sourceId));
  }

  @OnEvent(CONTENT_SOURCE_VENUE_ALIASES_UPDATED, { async: true })
  async onVenueAliasesUpdated(event: ContentSourceVenueAliasesUpdatedEvent): Promise<void> {
    await this.reconcileAll(() => this.reconcileService.ruleIdsOfSource(event.sourceId));
  }

  /** Genre variants copy their playlist's rule, so they follow when it changes. */
  @OnEvent(PLAYLIST_RULE_CHANGED, { async: true })
  async onPlaylistRuleChanged(event: PlaylistRuleChangedEvent): Promise<void> {
    await this.reconcileAll(() => this.reconcileService.ruleIdsWithVariantsOf(event.playlistId));
  }

  /** A manual entry may now hold a slot a rule filled, or free one: the rules adjust. */
  @OnEvent(SCHEDULE_ENTRIES_EDITED, { async: true })
  async onScheduleEdited(event: ScheduleEntriesEditedEvent): Promise<void> {
    try {
      await this.reconcileService.reconcileRulesOn([
        { screenId: event.screenId, groupId: event.groupId },
      ]);
    } catch (error) {
      this.logger.warn(`Reconciling rules after a schedule edit failed: ${errorMessage(error)}`);
    }
  }

  /**
   * Deleting a source deleted its rules and their entries by cascade, before
   * anyone could say which screens showed them. Every screen and group of the
   * organisation re-resolves instead, and the organisation's other rules may
   * take the freed slots; removing a source is rare.
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
          new ScheduleEntryChangedEvent(id, event.organisationId),
        );
      }
      for (const { id } of orgGroups) {
        this.eventEmitter.emit(
          GROUP_SCHEDULE_CHANGED,
          new GroupScheduleChangedEvent(id, event.organisationId, null),
        );
      }
    } catch (error) {
      this.logger.warn(
        `Announcing schedules after removing source ${event.sourceId} failed: ${errorMessage(error)}`,
      );
    }
    await this.reconcileAll(() =>
      this.reconcileService.ruleIdsOfOrganisation(event.organisationId),
    );
  }

  @Interval(EVENT_SCHEDULE_TICK_MS)
  async tick(): Promise<void> {
    await this.reconcileAll(() => this.reconcileService.allRuleIds());
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
