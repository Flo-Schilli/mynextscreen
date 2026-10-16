import { ContentSourceScheduler } from './content-source.scheduler';
import type { ContentSourceService } from './content-source.service';

describe('ContentSourceScheduler', () => {
  let service: {
    findDueSourceIds: jest.Mock;
    enqueueScheduledSync: jest.Mock;
    enqueueCleanup: jest.Mock;
  };
  let scheduler: ContentSourceScheduler;

  beforeEach(() => {
    service = {
      findDueSourceIds: jest.fn().mockResolvedValue(['a', 'b']),
      enqueueScheduledSync: jest.fn().mockResolvedValue(undefined),
      enqueueCleanup: jest.fn().mockResolvedValue(undefined),
    };
    scheduler = new ContentSourceScheduler(service as unknown as ContentSourceService);
  });

  it('enqueues every due source as a scheduled sync', async () => {
    const now = new Date('2026-11-01T10:00:00Z');

    await expect(scheduler.enqueueDueSources(now)).resolves.toBe(2);

    expect(service.findDueSourceIds).toHaveBeenCalledWith(now);
    // A scheduled sync must not mark a running source due again: that would
    // re-queue every sync that outlasts one tick, forever.
    expect(service.enqueueScheduledSync).toHaveBeenNthCalledWith(1, 'a');
    expect(service.enqueueScheduledSync).toHaveBeenNthCalledWith(2, 'b');
  });

  it('runs syncs and the daily cleanup on the interval tick', async () => {
    await scheduler.tick();

    expect(service.enqueueScheduledSync).toHaveBeenCalledTimes(2);
    expect(service.enqueueCleanup).toHaveBeenCalledTimes(1);
  });

  it('survives a failing queue so the next tick can retry', async () => {
    service.enqueueScheduledSync.mockRejectedValue(new Error('redis down'));

    await expect(scheduler.enqueueDueSources(new Date())).resolves.toBe(0);
  });

  describe('daily cleanup', () => {
    it('enqueues the cleanup per UTC day and re-adds it hourly to retry a failed run', async () => {
      const at = (iso: string) => scheduler.enqueueDailyCleanup(new Date(iso));

      await expect(at('2026-11-01T00:05:00Z')).resolves.toBe(true);
      await expect(at('2026-11-01T01:04:00Z')).resolves.toBe(false);
      await expect(at('2026-11-01T01:05:00Z')).resolves.toBe(true);
      await expect(at('2026-11-02T00:00:00Z')).resolves.toBe(true);

      expect(service.enqueueCleanup.mock.calls).toEqual([
        ['2026-11-01'],
        ['2026-11-01'],
        ['2026-11-02'],
      ]);
    });

    it('retries on the next tick when enqueueing failed', async () => {
      service.enqueueCleanup.mockRejectedValueOnce(new Error('redis down'));
      const now = new Date('2026-11-01T10:00:00Z');

      await expect(scheduler.enqueueDailyCleanup(now)).resolves.toBe(false);
      await expect(scheduler.enqueueDailyCleanup(now)).resolves.toBe(true);

      expect(service.enqueueCleanup).toHaveBeenCalledTimes(2);
    });
  });
});
