import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { MetricsCollectorService } from './metrics-collector.service';
import { SNAPSHOT_INTERVAL_MS } from './metrics.constants';

/**
 * Drives periodic metric capture + retention pruning. Seeds a first snapshot at
 * boot so the dashboards have a data point immediately rather than after the
 * first interval elapses. All work is best-effort — a failed tick is logged, not
 * propagated, so the scheduler keeps running.
 */
@Injectable()
export class MetricsScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(MetricsScheduler.name);

  constructor(private readonly collector: MetricsCollectorService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.capture();
  }

  @Interval(SNAPSHOT_INTERVAL_MS)
  async capture(): Promise<void> {
    try {
      await this.collector.captureSnapshots();
      await this.collector.cleanupOld();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Metric capture tick failed: ${message}`);
    }
  }
}
