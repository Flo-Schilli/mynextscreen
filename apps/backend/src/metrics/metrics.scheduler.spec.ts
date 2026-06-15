import { MetricsScheduler } from './metrics.scheduler';
import type { MetricsCollectorService } from './metrics-collector.service';

describe('MetricsScheduler', () => {
  let collector: { captureSnapshots: jest.Mock; cleanupOld: jest.Mock };
  let scheduler: MetricsScheduler;

  beforeEach(() => {
    collector = { captureSnapshots: jest.fn(), cleanupOld: jest.fn() };
    scheduler = new MetricsScheduler(collector as unknown as MetricsCollectorService);
  });

  it('captures and prunes on each tick', async () => {
    collector.captureSnapshots.mockResolvedValue(undefined);
    collector.cleanupOld.mockResolvedValue(undefined);

    await scheduler.capture();

    expect(collector.captureSnapshots).toHaveBeenCalledTimes(1);
    expect(collector.cleanupOld).toHaveBeenCalledTimes(1);
  });

  it('swallows capture errors so the interval keeps running', async () => {
    collector.captureSnapshots.mockRejectedValue(new Error('db down'));

    await expect(scheduler.capture()).resolves.toBeUndefined();
    expect(collector.cleanupOld).not.toHaveBeenCalled();
  });

  it('seeds a first capture at application bootstrap', async () => {
    collector.captureSnapshots.mockResolvedValue(undefined);
    collector.cleanupOld.mockResolvedValue(undefined);

    await scheduler.onApplicationBootstrap();

    expect(collector.captureSnapshots).toHaveBeenCalledTimes(1);
  });
});
