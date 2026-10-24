import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  ContentSourceRemovedEvent,
  ContentSourceSyncedEvent,
  ContentSourceVenueAliasesUpdatedEvent,
} from '../content-source/content-source.constants';
import {
  GROUP_SCHEDULE_CHANGED,
  SCHEDULE_ENTRY_CHANGED,
  ScheduleEntriesEditedEvent,
} from '../schedule/schedule.event';
import { EventScheduleListener } from './event-schedule.listener';
import type { EventScheduleReconcileService } from './event-schedule-reconcile.service';

describe('EventScheduleListener', () => {
  const orgId = 'org-1';
  let reconcileService: Record<string, jest.Mock>;
  let emit: jest.Mock;
  let selectResults: { id: string }[][];
  let listener: EventScheduleListener;

  function build(db: DrizzleDB): EventScheduleListener {
    return new EventScheduleListener(
      db,
      reconcileService as unknown as EventScheduleReconcileService,
      { emit } as unknown as EventEmitter2,
    );
  }

  beforeEach(() => {
    reconcileService = {
      reconcile: jest.fn().mockResolvedValue(null),
      reconcileRulesOn: jest.fn().mockResolvedValue(undefined),
      ruleIdsOfSource: jest.fn().mockResolvedValue(['r1', 'r2']),
      ruleIdsOfOrganisation: jest.fn().mockResolvedValue(['r1']),
      allRuleIds: jest.fn().mockResolvedValue(['r1', 'r2', 'r3']),
    };
    emit = jest.fn();
    selectResults = [[{ id: 's1' }, { id: 's2' }], [{ id: 'g1' }]];
    listener = build({
      select: () => ({
        from: () => ({ where: () => Promise.resolve(selectResults.shift() ?? []) }),
      }),
    } as unknown as DrizzleDB);
  });

  const reconciled = (): string[] => reconcileService.reconcile.mock.calls.map(([id]) => id);

  it('reconciles the rules of a synced source', async () => {
    await listener.onSourceSynced(new ContentSourceSyncedEvent('src-1', orgId));

    expect(reconcileService.ruleIdsOfSource).toHaveBeenCalledWith('src-1');
    expect(reconciled()).toEqual(['r1', 'r2']);
  });

  it('reconciles the rules of a source whose aliases changed', async () => {
    await listener.onVenueAliasesUpdated(new ContentSourceVenueAliasesUpdatedEvent('src-1', orgId));

    expect(reconciled()).toEqual(['r1', 'r2']);
  });

  it('reconciles the rules on the target of a manual edit', async () => {
    await listener.onScheduleEdited(new ScheduleEntriesEditedEvent(orgId, null, 'g1'));

    expect(reconcileService.reconcileRulesOn).toHaveBeenCalledWith([
      { screenId: null, groupId: 'g1' },
    ]);
  });

  it('survives a failing reconcile after a manual edit', async () => {
    reconcileService.reconcileRulesOn.mockRejectedValue(new Error('db down'));

    await expect(
      listener.onScheduleEdited(new ScheduleEntriesEditedEvent(orgId, 's1', null)),
    ).resolves.toBeUndefined();
  });

  it('reconciles every rule on the tick and keeps going when one fails', async () => {
    reconcileService.reconcile.mockRejectedValueOnce(new Error('boom'));

    await listener.tick();

    expect(reconciled()).toEqual(['r1', 'r2', 'r3']);
  });

  it('survives a failing rule lookup', async () => {
    reconcileService.allRuleIds.mockRejectedValue(new Error('db down'));

    await expect(listener.tick()).resolves.toBeUndefined();
    expect(reconcileService.reconcile).not.toHaveBeenCalled();
  });

  it('re-resolves every screen and group and reconciles the organisation after a source was removed', async () => {
    await listener.onSourceRemoved(new ContentSourceRemovedEvent('src-1', orgId));

    expect(emit).toHaveBeenCalledWith(
      SCHEDULE_ENTRY_CHANGED,
      expect.objectContaining({ screenId: 's1' }),
    );
    expect(emit).toHaveBeenCalledWith(
      SCHEDULE_ENTRY_CHANGED,
      expect.objectContaining({ screenId: 's2' }),
    );
    expect(emit).toHaveBeenCalledWith(
      GROUP_SCHEDULE_CHANGED,
      expect.objectContaining({ groupId: 'g1' }),
    );
    expect(reconcileService.ruleIdsOfOrganisation).toHaveBeenCalledWith(orgId);
    expect(reconciled()).toEqual(['r1']);
  });

  it('still reconciles when announcing after a source removal fails', async () => {
    listener = build({
      select: () => {
        throw new Error('db down');
      },
    } as unknown as DrizzleDB);

    await listener.onSourceRemoved(new ContentSourceRemovedEvent('src-1', orgId));

    expect(emit).not.toHaveBeenCalled();
    expect(reconciled()).toEqual(['r1']);
  });
});
