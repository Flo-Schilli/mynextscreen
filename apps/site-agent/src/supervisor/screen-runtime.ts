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
  /**
   * When the installed app version was last read, 0 if never.
   *
   * A healthy screen rarely relaunches, so reading the version only during a
   * launch would leave it unknown indefinitely. One read per agent run covers
   * that without opening an SSAP session every round.
   */
  appVersionReadAt: number;
  /** Jitter offset for the Developer Mode extension, stable per screen. */
  devmodeJitterMs: number;
  /** Monotonic count of successful app launches since start, for metrics. */
  launchCount: number;
  /** Monotonic count of Wake-on-LAN packets sent since start, for metrics. */
  wakeCount: number;
  /** Monotonic count of successful Developer Mode extensions, for metrics. */
  devmodeExtendCount: number;
  /** Last observed network reachability of the TV, for metrics. */
  reachable: boolean;
}

export function newRuntime(devmodeJitterMs: number): ScreenRuntime {
  return {
    failures: 0,
    nextAttemptAt: 0,
    lastLaunchAt: 0,
    lastWakeAt: 0,
    lastDevmodeExtendAt: 0,
    appVersionReadAt: 0,
    devmodeJitterMs,
    launchCount: 0,
    wakeCount: 0,
    devmodeExtendCount: 0,
    reachable: false,
  };
}
