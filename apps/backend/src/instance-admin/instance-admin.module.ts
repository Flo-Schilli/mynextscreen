import { Module } from '@nestjs/common';
import { InstanceAdminDashboardService } from './instance-admin-dashboard.service';
import { InstanceAdminDashboardController } from './instance-admin-dashboard.controller';

@Module({
  controllers: [InstanceAdminDashboardController],
  providers: [InstanceAdminDashboardService],
})
export class InstanceAdminModule {}
