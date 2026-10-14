import { ContentSourceScheduler } from './content-source.scheduler';
import type { ContentSourceService } from './content-source.service';

describe('ContentSourceScheduler', () => {
  let service: { findDueSourceIds: jest.Mock; enqueueSync: jest.Mock };
  let scheduler: ContentSourceScheduler;

  beforeEach(() => {
    service = {
      findDueSourceIds: jest.fn().mockResolvedValue(['a', 'b']),
      enqueueSync: jest.fn().mockResolvedValue(undefined),
    };
    scheduler = new ContentSourceScheduler(service as unknown as ContentSourceService);
  });

  it('enqueues every due source as a scheduled sync', async () => {
    const now = new Date('2026-11-01T10:00:00Z');

    await expect(scheduler.enqueueDueSources(now)).resolves.toBe(2);

    expect(service.findDueSourceIds).toHaveBeenCalledWith(now);
    expect(service.enqueueSync).toHaveBeenNthCalledWith(1, 'a', null);
    expect(service.enqueueSync).toHaveBeenNthCalledWith(2, 'b', null);
  });

  it('runs on the interval tick', async () => {
    await scheduler.tick();

    expect(service.enqueueSync).toHaveBeenCalledTimes(2);
  });

  it('survives a failing queue so the next tick can retry', async () => {
    service.enqueueSync.mockRejectedValue(new Error('redis down'));

    await expect(scheduler.enqueueDueSources(new Date())).resolves.toBe(0);
  });
});
