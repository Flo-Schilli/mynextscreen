import { DashboardMetricsController } from './dashboard-metrics.controller';
import type { MetricsQueryService } from './metrics-query.service';
import type { DashboardHistory } from './dto/metrics.dto';

describe('DashboardMetricsController', () => {
  let controller: DashboardMetricsController;
  let metrics: { getOrgHistory: jest.Mock };

  beforeEach(() => {
    metrics = { getOrgHistory: jest.fn() };
    controller = new DashboardMetricsController(metrics as unknown as MetricsQueryService);
  });

  it('delegates to the metrics service with the current organisation', async () => {
    const history: DashboardHistory = {
      points: [
        {
          capturedAt: '2026-06-15T10:00:00.000Z',
          screensOnline: 2,
          contentCount: 5,
          playlistCount: 1,
          openAlerts: 0,
        },
      ],
    };
    metrics.getOrgHistory.mockResolvedValue(history);

    const result = await controller.getHistory('org-1');

    expect(result).toBe(history);
    expect(metrics.getOrgHistory).toHaveBeenCalledWith('org-1');
  });
});
