/** Per-screen state the loop keeps in memory, not on disk. */
export interface ScreenRuntime {
  /** Consecutive failed rounds, for the backoff. */
  failures: number;
  /** Earliest time this screen is looked at again. */
  nextAttemptAt: number;
  lastLaunchAt: number;
  lastWakeAt: number;
  /**
   * When this agent last extended Developer Mode, 0 if never.
   *
   * Kept here as well as in the server's config because the cached config is
   * not refetched after a report: relying on it alone made the extension look
   * due on every round, which relaunched the Developer Mode app each minute and
   * starved the launch branch that follows it.
   */
  lastDevmodeExtendAt: number;
  /** Jitter offset for the Developer Mode extension, stable per screen. */
  devmodeJitterMs: number;
}

export function newRuntime(devmodeJitterMs: number): ScreenRuntime {
  return {
    failures: 0,
    nextAttemptAt: 0,
    lastLaunchAt: 0,
    lastWakeAt: 0,
    lastDevmodeExtendAt: 0,
    devmodeJitterMs,
  };
}
