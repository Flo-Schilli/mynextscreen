import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { DashboardModule } from '../dashboard';
import { LiveStreamModule } from '../live-stream';
import { SiteAgentModule } from '../site-agent';
import { SLICE_CONTENT_QUEUE } from '../slice-content/slice-content.constants';
import { MetricsController } from './metrics.controller';
import { MetricsScrapeAuthGuard } from './metrics-scrape-auth.guard';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { DomainMetricsCollector } from './domain-metrics.collector';
import { AgentMetricsService } from './agent-metrics.service';
import { JobMetricsService } from './job-metrics.service';
import { observabilityMetricProviders } from './observability.providers';

/**
 * Prometheus observability for the backend. Separate from the `metrics` module,
 * which serves the dashboard's history charts — this one exposes runtime
 * telemetry for Prometheus to scrape at `GET /api/metrics`.
 *
 * Global so `JobMetricsService` (used by the BullMQ processors) and
 * `AgentMetricsService` (used by the agent device controller) are injectable
 * without each domain module importing this one, which keeps the dependency
 * graph acyclic: observability depends on the domain modules it scrapes, never
 * the reverse.
 *
 * The transcoding and slice queues are re-registered here so the collector can
 * read their depth; BullMQ resolves repeated `registerQueue` calls for the same
 * name to the one queue.
 */
@Global()
@Module({
  imports: [
    PrometheusModule.register({
      // Our controller carries the scrape-token guard and @Public() decorator.
      controller: MetricsController,
      defaultMetrics: { enabled: true },
    }),
    BullModule.registerQueue({ name: 'transcoding' }, { name: SLICE_CONTENT_QUEUE }),
    DashboardModule,
    LiveStreamModule,
    SiteAgentModule,
  ],
  providers: [
    ...observabilityMetricProviders,
    MetricsScrapeAuthGuard,
    DomainMetricsCollector,
    AgentMetricsService,
    JobMetricsService,
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
  ],
  exports: [AgentMetricsService, JobMetricsService],
})
export class ObservabilityModule {}
