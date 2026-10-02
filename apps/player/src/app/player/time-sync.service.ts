import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ConnectionService } from '../connection/connection.service';
import { selectOffsetByMinRtt, type RoundTripSample } from './time-sync.util';

/** Number of round-trip samples taken per synchronization pass. */
const SAMPLE_COUNT = 9;
/** How often the offset is refreshed to bound residual clock drift. */
const RESYNC_INTERVAL_MS = 60_000;
/** Samples on the fast first pass — enough for a usable offset before the first anchor. */
const FIRST_PASS_SAMPLE_COUNT = 3;
/** Hard cap on how long startup may wait for that first pass. */
const FIRST_PASS_TIMEOUT_MS = 1_500;

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

  /**
   * A short sampling pass to run before the first playback anchor, so the screen
   * does not pick its starting item from an uncorrected local clock. Resolves as
   * soon as an offset is in hand or the cap elapses, and never rejects — a
   * screen that cannot reach `/api/time` still has to play.
   */
  async syncFirstPass(): Promise<void> {
    await Promise.race([
      this.sync(FIRST_PASS_SAMPLE_COUNT).catch(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, FIRST_PASS_TIMEOUT_MS)),
    ]);
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

  /** Take several samples against `/api/time` and adopt the lowest-RTT offset. */
  async sync(samples = SAMPLE_COUNT): Promise<void> {
    const url = `${this.connection.serverUrl()}/api/time`;
    const collected: RoundTripSample[] = [];

    for (let i = 0; i < samples; i++) {
      try {
        const sentAtMs = Date.now();
        const res = await firstValueFrom(this.http.get<{ now: number }>(url));
        const receivedAtMs = Date.now();
        if (typeof res?.now === 'number') {
          collected.push({ serverTimeMs: res.now, sentAtMs, receivedAtMs });
        }
      } catch {
        // Ignore individual sample failures — a later pass will retry.
      }
    }

    const offset = selectOffsetByMinRtt(collected);
    if (offset !== null) {
      this._offsetMs.set(offset);
      this._synced.set(true);
    }
  }
}
