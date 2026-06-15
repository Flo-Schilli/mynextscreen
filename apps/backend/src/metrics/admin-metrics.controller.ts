import { Controller, Get, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { MetricsQueryService } from './metrics-query.service';
import type { SystemLoadHistory } from './dto/metrics.dto';

/**
 * Instance-wide host-load history for the super-admin system-load chart. Guarded
 * by {@link SuperAdminGuard} — no organisation scope applies (mirrors
 * {@link InstanceAdminDashboardController}).
 */
@Controller('admin/dashboard')
@UseGuards(SuperAdminGuard)
export class AdminMetricsController {
  constructor(private readonly metrics: MetricsQueryService) {}

  @Get('load')
  getLoad(): Promise<SystemLoadHistory> {
    return this.metrics.getSystemLoad();
  }
}
