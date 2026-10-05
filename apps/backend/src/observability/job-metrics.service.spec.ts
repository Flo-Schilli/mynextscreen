import { Histogram } from 'prom-client';
import type { Job } from 'bullmq';
import { JobMetricsService } from './job-metrics.service';

function job(processedOn?: number, finishedOn?: number): Job {
  return { processedOn, finishedOn } as Job;
}

describe('JobMetricsService', () => {
  let histogram: jest.Mocked<Pick<Histogram<string>, 'observe'>>;
  let service: JobMetricsService;

  beforeEach(() => {
    histogram = { observe: jest.fn() };
    service = new JobMetricsService(histogram as unknown as Histogram<string>);
  });

  it('observes processing duration in seconds for a completed job', () => {
    service.recordCompleted('transcoding', job(1000, 4000));
    expect(histogram.observe).toHaveBeenCalledWith(
      { queue: 'transcoding', status: 'completed' },
      3,
    );
  });

  it('observes a failed job with the failed label', () => {
    service.recordFailed('slice-content', job(1000, 2500));
    expect(histogram.observe).toHaveBeenCalledWith(
      { queue: 'slice-content', status: 'failed' },
      1.5,
    );
  });

  it('ignores a failed event with no job', () => {
    service.recordFailed('transcoding', undefined);
    expect(histogram.observe).not.toHaveBeenCalled();
  });

  it('ignores a job missing timing fields', () => {
    service.recordCompleted('transcoding', job(undefined, 4000));
    service.recordCompleted('transcoding', job(1000, undefined));
    expect(histogram.observe).not.toHaveBeenCalled();
  });

  it('ignores a job whose finish precedes its start', () => {
    service.recordCompleted('transcoding', job(5000, 1000));
    expect(histogram.observe).not.toHaveBeenCalled();
  });
});
