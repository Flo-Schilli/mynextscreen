import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConnectionService } from '../connection/connection.service';
import { estimateOffset, median } from './time-sync.util';

/** Number of round-trip samples taken per synchronization pass. */
const SAMPLE_COUNT = 5;
/** How often the offset is refreshed to absorb slow clock drift. */
const RESYNC_INTERVAL_MS = 5 * 60_000;

/**
 * Estimates and maintains the offset between the local clock and the server
 * clock so that {@link serverNow} can drive deterministic, group-synchronized
 * playlist playback. Until the first successful sync the offset is 0 (local
 * clock); callers re-anchor when {@link synced} flips true.
 */
@Injectable({ providedIn: 'root' })
export class TimeSyncService {
  private readonly http = inject(HttpClient);
  private readonly connection = inject(ConnectionService);

  private readonly _offsetMs = signal(0);
  private readonly _synced = signal(false);

  readonly offsetMs = this._offsetMs.asReadonly();
  readonly synced = this._synced.asReadonly();

  private resyncTimer: ReturnType<typeof setInterval> | null = null;

  /** Current best estimate of the server clock in epoch milliseconds. */
  serverNow(): number {
    return Date.now() + this._offsetMs();
  }

  /** Start syncing now and keep the offset fresh on an interval. */
  start(): void {
    this.sync().catch(() => undefined);
    if (this.resyncTimer === null) {
      this.resyncTimer = setInterval(() => this.sync().catch(() => undefined), RESYNC_INTERVAL_MS);
    }
  }

  stop(): void {
    if (this.resyncTimer !== null) {
      clearInterval(this.resyncTimer);
      this.resyncTimer = null;
    }
  }

  /** Take several samples against `/api/time` and adopt the median offset. */
  async sync(samples = SAMPLE_COUNT): Promise<void> {
    const url = `${this.connection.serverUrl()}/api/time`;
    const offsets: number[] = [];

    for (let i = 0; i < samples; i++) {
      try {
        const sentAt = Date.now();
        const res = await firstValueFrom(this.http.get<{ now: number }>(url));
        const receivedAt = Date.now();
        if (typeof res?.now === 'number') {
          offsets.push(estimateOffset(res.now, sentAt, receivedAt));
        }
      } catch {
        // Ignore individual sample failures — a later pass will retry.
      }
    }

    if (offsets.length > 0) {
      this._offsetMs.set(median(offsets));
      this._synced.set(true);
    }
  }
}
