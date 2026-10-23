import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { DrizzleDB } from '../db/drizzle.types';
import {
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
import { EventScheduleListener } from './event-schedule.listener';
import type { EventScheduleReconcileService } from './event-schedule-reconcile.service';
import type { EventScheduleRuleService } from './event-schedule-rule.service';

describe('EventScheduleListener', () => {
  const orgId = 'org-1';
  let ruleService: Record<string, jest.Mock>;
  let reconcile: jest.Mock;
  let emit: jest.Mock;
  let selectResults: { id: string }[][];
  let listener: EventScheduleListener;

  beforeEach(() => {
    ruleService = {
      ruleIdsOfSource: jest.fn().mockResolvedValue(['r1', 'r2']),
      ruleIdsTargeting: jest.fn().mockResolvedValue(['r3']),
      allRuleIds: jest.fn().mockResolvedValue(['r1', 'r2', 'r3']),
    };
    reconcile = jest.fn().mockResolvedValue(null);
    emit = jest.fn();
    selectResults = [[{ id: 's1' }, { id: 's2' }], [{ id: 'g1' }]];
    const db = {
      select: () => ({
        from: () => ({ where: () => Promise.resolve(selectResults.shift() ?? []) }),
      }),
    } as unknown as DrizzleDB;
    listener = new EventScheduleListener(
      db,
      ruleService as unknown as EventScheduleRuleService,
      { reconcile } as unknown as EventScheduleReconcileService,
      { emit } as unknown as EventEmitter2,
    );
  });

  it('reconciles the rules of a synced source', async () => {
    await listener.onSourceSynced(new ContentSourceSyncedEvent('src-1', orgId));

    expect(ruleService.ruleIdsOfSource).toHaveBeenCalledWith('src-1');
    expect(reconcile.mock.calls.map(([id]) => id)).toEqual(['r1', 'r2']);
  });

  it('reconciles the rules of a source whose aliases changed', async () => {
    await listener.onVenueAliasesUpdated(new ContentSourceVenueAliasesUpdatedEvent('src-1', orgId));

    expect(reconcile).toHaveBeenCalledTimes(2);
  });

  it('reconciles the rules on a screen or group after a manual change', async () => {
    await listener.onScreenScheduleChanged(new ScheduleEntryChangedEvent('s1', orgId));
    await listener.onGroupScheduleChanged(new GroupScheduleChangedEvent('g1', orgId, 'p1'));

    expect(ruleService.ruleIdsTargeting).toHaveBeenNthCalledWith(1, { screenId: 's1' });
    expect(ruleService.ruleIdsTargeting).toHaveBeenNthCalledWith(2, { groupId: 'g1' });
    expect(reconcile).toHaveBeenCalledTimes(2);
  });

  it('ignores changes a rule made itself', async () => {
    await listener.onScreenScheduleChanged(new ScheduleEntryChangedEvent('s1', orgId, true));
    await listener.onGroupScheduleChanged(new GroupScheduleChangedEvent('g1', orgId, 'p1', true));

    expect(ruleService.ruleIdsTargeting).not.toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('reconciles every rule on the tick', async () => {
    await listener.tick();

    expect(reconcile).toHaveBeenCalledTimes(3);
  });

  it('keeps going when one rule fails', async () => {
    reconcile.mockRejectedValueOnce(new Error('boom'));

    await listener.tick();

    expect(reconcile).toHaveBeenCalledTimes(3);
  });

  it('survives a failing rule lookup', async () => {
    ruleService.allRuleIds.mockRejectedValue(new Error('db down'));

    await expect(listener.tick()).resolves.toBeUndefined();
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('re-resolves every screen and group after a source was removed', async () => {
    await listener.onSourceRemoved(new ContentSourceRemovedEvent('src-1', orgId));

    expect(emit).toHaveBeenCalledWith(
      SCHEDULE_ENTRY_CHANGED,
      expect.objectContaining({ screenId: 's1', managed: true }),
    );
    expect(emit).toHaveBeenCalledWith(
      SCHEDULE_ENTRY_CHANGED,
      expect.objectContaining({ screenId: 's2', managed: true }),
    );
    expect(emit).toHaveBeenCalledWith(
      GROUP_SCHEDULE_CHANGED,
      expect.objectContaining({ groupId: 'g1', managed: true }),
    );
  });

  it('survives a failing lookup after a source was removed', async () => {
    listener = new EventScheduleListener(
      {
        select: () => {
          throw new Error('db down');
        },
      } as unknown as DrizzleDB,
      ruleService as unknown as EventScheduleRuleService,
      { reconcile } as unknown as EventScheduleReconcileService,
      { emit } as unknown as EventEmitter2,
    );

    await expect(
      listener.onSourceRemoved(new ContentSourceRemovedEvent('src-1', orgId)),
    ).resolves.toBeUndefined();
    expect(emit).not.toHaveBeenCalled();
  });
});
