import { PlaylistRuleScheduler } from './playlist-rule.scheduler';
import type { PlaylistRuleService } from './playlist-rule.service';

describe('PlaylistRuleScheduler', () => {
  let ruleService: { findDuePlaylistIds: jest.Mock; enqueueResolve: jest.Mock };
  let scheduler: PlaylistRuleScheduler;

  beforeEach(() => {
    ruleService = {
      findDuePlaylistIds: jest.fn().mockResolvedValue(['a', 'b']),
      enqueueResolve: jest.fn().mockResolvedValue(undefined),
    };
    scheduler = new PlaylistRuleScheduler(ruleService as unknown as PlaylistRuleService);
  });

  it('enqueues every due playlist', async () => {
    const now = new Date('2026-11-01T10:00:00Z');

    await expect(scheduler.enqueueDuePlaylists(now)).resolves.toBe(2);

    expect(ruleService.findDuePlaylistIds).toHaveBeenCalledWith(now);
    expect(ruleService.enqueueResolve).toHaveBeenNthCalledWith(1, 'a');
    expect(ruleService.enqueueResolve).toHaveBeenNthCalledWith(2, 'b');
  });

  it('runs on the interval tick', async () => {
    await scheduler.tick();

    expect(ruleService.enqueueResolve).toHaveBeenCalledTimes(2);
  });

  it('survives a failing queue so the next tick can retry', async () => {
    ruleService.enqueueResolve.mockRejectedValue(new Error('redis down'));

    await expect(scheduler.enqueueDuePlaylists(new Date())).resolves.toBe(0);
  });
});
