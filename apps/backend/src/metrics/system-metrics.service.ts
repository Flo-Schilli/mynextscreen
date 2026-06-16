import { Injectable } from '@nestjs/common';
import * as os from 'node:os';

/** A single instantaneous host-load reading. */
export interface SystemLoadSample {
  /** CPU utilisation 0–100, derived from the 1-minute load average ÷ cores. */
  cpuPercent: number;
  /** Memory utilisation 0–100, derived from (total − free) ÷ total. */
  ramPercent: number;
  cores: number;
  ramTotalBytes: number;
}

/** Clamp a value into the inclusive [0, 100] percentage range. */
function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Thin wrapper over the Node `os` module that yields a normalised host-load
 * sample. Isolated behind a service so the collector can be unit-tested with a
 * stubbed reading instead of depending on the real host.
 *
 * CPU is approximated from the 1-minute load average relative to core count —
 * cheap and synchronous (no sampling window). RAM is exact.
 */
@Injectable()
export class SystemMetricsService {
  read(): SystemLoadSample {
    const cores = os.cpus().length || 1;
    const load1 = os.loadavg()[0] ?? 0;
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const ramPercent = totalBytes === 0 ? 0 : ((totalBytes - freeBytes) / totalBytes) * 100;

    return {
      cpuPercent: clampPercent((load1 / cores) * 100),
      ramPercent: clampPercent(ramPercent),
      cores,
      ramTotalBytes: totalBytes,
    };
  }
}
