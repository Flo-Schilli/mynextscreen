import type { Job } from 'bullmq';
import type { JobMetricsService } from '../observability/job-metrics.service';
import { PlaylistResolveProcessor } from './playlist-resolve.processor';
import type { PlaylistRuleService } from './playlist-rule.service';
import type { PlaylistResolveJobData } from './playlist-resolve.constants';

describe('PlaylistResolveProcessor', () => {
  let ruleService: { resolve: jest.Mock };
  let metrics: { recordCompleted: jest.Mock; recordFailed: jest.Mock };
  let processor: PlaylistResolveProcessor;

  const job = { id: 'resolve-p1', data: { playlistId: 'p1' } } as Job<PlaylistResolveJobData>;

  beforeEach(() => {
    ruleService = {
      resolve: jest
        .fn()
        .mockResolvedValue({ changed: true, itemCount: 3, nextResolveAt: new Date() }),
    };
    metrics = { recordCompleted: jest.fn(), recordFailed: jest.fn() };
    processor = new PlaylistResolveProcessor(
      ruleService as unknown as PlaylistRuleService,
      metrics as unknown as JobMetricsService,
    );
  });

  it('resolves the job’s playlist', async () => {
    await processor.process(job);

    expect(ruleService.resolve).toHaveBeenCalledWith('p1');
  });

  it('tolerates a playlist that vanished or turned static', async () => {
    ruleService.resolve.mockResolvedValue(null);

    await expect(processor.process(job)).resolves.toBeUndefined();
  });

  it('propagates a failed resolve so the job is marked failed', async () => {
    ruleService.resolve.mockRejectedValue(new Error('boom'));

    await expect(processor.process(job)).rejects.toThrow('boom');
  });

  it('records job metrics under its queue name', () => {
    processor.onCompleted(job);
    processor.onFailed(job);

    expect(metrics.recordCompleted).toHaveBeenCalledWith('playlist-resolve', job);
    expect(metrics.recordFailed).toHaveBeenCalledWith('playlist-resolve', job);
  });
});
