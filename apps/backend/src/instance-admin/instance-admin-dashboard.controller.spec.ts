import { InstanceAdminDashboardController } from './instance-admin-dashboard.controller';
import type {
  InstanceAdminDashboardService,
  InstanceAdminSummary,
} from './instance-admin-dashboard.service';

describe('InstanceAdminDashboardController', () => {
  let controller: InstanceAdminDashboardController;
  let dashboardService: { getSummary: jest.Mock };

  beforeEach(() => {
    dashboardService = { getSummary: jest.fn() };
    controller = new InstanceAdminDashboardController(
      dashboardService as unknown as InstanceAdminDashboardService,
    );
  });

  it('delegates to the dashboard service', async () => {
    const summary: InstanceAdminSummary = {
      users: { total: 3, verified: 2, pending: 1 },
      organisationCount: 2,
      storage: {
        originalUsedBytes: 150,
        originalLimitBytes: 1500,
        transcodedUsedBytes: 270,
        transcodedLimitBytes: 2700,
      },
      hostDisk: { path: './media', totalBytes: 1000, freeBytes: 400, available: true },
    };
    dashboardService.getSummary.mockResolvedValue(summary);

    const result = await controller.getSummary();

    expect(result).toBe(summary);
    expect(dashboardService.getSummary).toHaveBeenCalledTimes(1);
  });
});
