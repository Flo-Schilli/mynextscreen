import { Controller, Get, UseGuards } from '@nestjs/common';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import {
  InstanceAdminDashboardService,
  InstanceAdminSummary,
} from './instance-admin-dashboard.service';

/**
 * Super-admin instance overview: aggregate user/organisation counts, storage
 * limits vs. usage across all tenants and host disk free space. Guarded by
 * {@link SuperAdminGuard} — no organisation scope applies.
 */
@Controller('admin/dashboard')
@UseGuards(SuperAdminGuard)
export class InstanceAdminDashboardController {
  constructor(private readonly dashboardService: InstanceAdminDashboardService) {}

  @Get()
  getSummary(): Promise<InstanceAdminSummary> {
    return this.dashboardService.getSummary();
  }
}
