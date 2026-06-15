import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard';
import { DashboardMetricsController } from './dashboard-metrics.controller';
import { AdminMetricsController } from './admin-metrics.controller';
import { MetricsCollectorService } from './metrics-collector.service';
import { MetricsQueryService } from './metrics-query.service';
import { MetricsScheduler } from './metrics.scheduler';
import { SystemMetricsService } from './system-metrics.service';

/**
 * Captures and serves the time-series metric snapshots behind the dashboard
 * history charts. Reuses {@link DashboardSummaryService} (from `DashboardModule`)
 * for org KPIs so captured values match the live dashboard exactly.
 */
@Module({
  imports: [DashboardModule],
  controllers: [DashboardMetricsController, AdminMetricsController],
  providers: [SystemMetricsService, MetricsCollectorService, MetricsQueryService, MetricsScheduler],
})
export class MetricsModule {}
