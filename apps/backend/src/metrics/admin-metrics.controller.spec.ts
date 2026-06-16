import { AdminMetricsController } from './admin-metrics.controller';
import type { MetricsQueryService } from './metrics-query.service';
import type { SystemLoadHistory } from './dto/metrics.dto';

describe('AdminMetricsController', () => {
  let controller: AdminMetricsController;
  let metrics: { getSystemLoad: jest.Mock };

  beforeEach(() => {
    metrics = { getSystemLoad: jest.fn() };
    controller = new AdminMetricsController(metrics as unknown as MetricsQueryService);
  });

  it('delegates to the metrics service', async () => {
    const load: SystemLoadHistory = { cpu: [10, 20], ram: [30, 40], cores: 8, ramTotalGB: 16 };
    metrics.getSystemLoad.mockResolvedValue(load);

    const result = await controller.getLoad();

    expect(result).toBe(load);
    expect(metrics.getSystemLoad).toHaveBeenCalledTimes(1);
  });
});
