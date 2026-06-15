import { SystemMetricsService } from './system-metrics.service';

describe('SystemMetricsService', () => {
  const service = new SystemMetricsService();

  it('returns a normalised host-load sample within valid ranges', () => {
    const sample = service.read();

    expect(sample.cpuPercent).toBeGreaterThanOrEqual(0);
    expect(sample.cpuPercent).toBeLessThanOrEqual(100);
    expect(Number.isInteger(sample.cpuPercent)).toBe(true);

    expect(sample.ramPercent).toBeGreaterThanOrEqual(0);
    expect(sample.ramPercent).toBeLessThanOrEqual(100);
    expect(Number.isInteger(sample.ramPercent)).toBe(true);

    expect(sample.cores).toBeGreaterThanOrEqual(1);
    expect(sample.ramTotalBytes).toBeGreaterThan(0);
  });
});
