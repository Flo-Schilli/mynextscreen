/** Per-screen state the loop keeps in memory, not on disk. */
export interface ScreenRuntime {
  /** Consecutive failed rounds, for the backoff. */
  failures: number;
  /** Earliest time this screen is looked at again. */
  nextAttemptAt: number;
  lastLaunchAt: number;
  lastWakeAt: number;
  /** Jitter offset for the Developer Mode extension, stable per screen. */
  devmodeJitterMs: number;
}

export function newRuntime(devmodeJitterMs: number): ScreenRuntime {
  return {
    failures: 0,
    nextAttemptAt: 0,
    lastLaunchAt: 0,
    lastWakeAt: 0,
    devmodeJitterMs,
  };
}
