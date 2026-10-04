import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { MetricsScrapeAuthGuard } from './metrics-scrape-auth.guard';

/**
 * Prometheus scrape endpoint, mounted at `/api/metrics` (the global `api`
 * prefix plus this controller's `metrics` path).
 *
 * `@Public()` opts the route out of the global JWT + roles guards — Prometheus
 * is not a user and carries no session cookie. The route is instead protected
 * by {@link MetricsScrapeAuthGuard} (static Bearer scrape token). Extends
 * willsoto's {@link PrometheusController} so the registry is serialised exactly
 * as the library intends (content-type negotiation included).
 */
@Controller('metrics')
export class MetricsController extends PrometheusController {
  @Get()
  @Public()
  @UseGuards(MetricsScrapeAuthGuard)
  override async index(@Res({ passthrough: true }) response: Response): Promise<string> {
    return super.index(response);
  }
}
