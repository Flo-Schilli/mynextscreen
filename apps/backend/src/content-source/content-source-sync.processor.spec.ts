import type { Job } from 'bullmq';
import type { JobMetricsService } from '../observability/job-metrics.service';
import { ContentSourceSyncProcessor } from './content-source-sync.processor';
import type { ContentSourceSyncService } from './content-source-sync.service';
import type { ContentSourceCleanupService } from './content-source-cleanup.service';
import type {
  ContentSourceCleanupJobData,
  ContentSourceSyncJobData,
} from './content-source.constants';

describe('ContentSourceSyncProcessor', () => {
  const summary = {
    listed: 1,
    created: 1,
    updated: 0,
    gone: 0,
    rendered: 2,
    failed: 0,
    errors: [],
  };
  let syncService: { sync: jest.Mock };
  let cleanupService: { cleanup: jest.Mock };
  let metrics: { recordCompleted: jest.Mock; recordFailed: jest.Mock };
  let processor: ContentSourceSyncProcessor;

  const job = {
    id: 'sync-1',
    name: 'sync',
    data: { sourceId: 's1', triggeredBy: 'u1' },
  } as Job<ContentSourceSyncJobData>;
  const cleanupJob = {
    id: 'cleanup-2026-11-01',
    name: 'cleanup',
    data: { day: '2026-11-01' },
  } as Job<ContentSourceCleanupJobData>;

  beforeEach(() => {
    syncService = { sync: jest.fn().mockResolvedValue(summary) };
    cleanupService = {
      cleanup: jest.fn().mockResolvedValue({ slidesDeleted: 2, slidesFailed: 0, eventsDeleted: 1 }),
    };
    metrics = { recordCompleted: jest.fn(), recordFailed: jest.fn() };
    processor = new ContentSourceSyncProcessor(
      syncService as unknown as ContentSourceSyncService,
      cleanupService as unknown as ContentSourceCleanupService,
      metrics as unknown as JobMetricsService,
    );
  });

  it('runs the sync of the job’s source', async () => {
    await processor.process(job);

    expect(syncService.sync).toHaveBeenCalledWith('s1', 'u1');
  });

  it('runs the cleanup for a cleanup job instead of a sync', async () => {
    await processor.process(cleanupJob);

    expect(cleanupService.cleanup).toHaveBeenCalledTimes(1);
    expect(syncService.sync).not.toHaveBeenCalled();
  });

  it('tolerates a source that vanished', async () => {
    syncService.sync.mockResolvedValue(null);

    await expect(processor.process(job)).resolves.toBeUndefined();
  });

  it('propagates a failed sync so the job is marked failed', async () => {
    syncService.sync.mockRejectedValue(new Error('boom'));

    await expect(processor.process(job)).rejects.toThrow('boom');
  });

  it('records job metrics under its queue name', () => {
    processor.onCompleted(job);
    processor.onFailed(job);

    expect(metrics.recordCompleted).toHaveBeenCalledWith('content-source-sync', job);
    expect(metrics.recordFailed).toHaveBeenCalledWith('content-source-sync', job);
  });
});
