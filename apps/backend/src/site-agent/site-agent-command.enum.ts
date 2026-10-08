/**
 * Commands the server pushes down a site agent's SSE channel.
 *
 * Deliberately small: anything the agent does on its own schedule (probing,
 * waking before a schedule, extending Developer Mode when it falls due) is
 * driven by the config it already holds, not by a command. A command is only
 * for "do it now, because a human asked" — which is also why a command to an
 * offline agent is rejected rather than queued.
 */
export enum SiteAgentCommandType {
  /** Start the signage app on the TV over SSAP. */
  Launch = 'launch',
  /** Send a Wake-on-LAN magic packet. */
  Wake = 'wake',
  /**
   * Put the set into standby over SSAP.
   *
   * Standby, not screen-off: the TV's power service refuses the screen-only
   * calls over SSAP, measured on a real set. Coming back needs Wake-on-LAN.
   */
  Standby = 'standby',
  /** Extend the Developer Mode session over SSH + Luna. */
  ExtendDevmode = 'extend_devmode',
  /** Install the packaged player app on the TV over SSH. */
  InstallApp = 'install_app',
  /** Discard the cached SSH key and fetch it from the TV again. */
  RefetchKey = 'refetch_key',
  /** Re-pull `/api/agents/me/config`. Carries no payload on purpose. */
  ReloadConfig = 'reload_config',
  /**
   * Probe every display now instead of at the next interval. Agent-wide, and
   * it also clears the backoff, so a TV that was just switched back on is
   * picked up straight away. The launch and wake cooldowns still apply; the
   * per-screen "start app" command is what overrides those.
   */
  ProbeNow = 'probe_now',
  /** Run one onboarding check; carries the step number. */
  Check = 'check',
  /**
   * Update the agent to the server's version. The agent cannot restart itself
   * from inside its hardened container, so it drops a sentinel file in its
   * state directory; a host-side systemd path unit runs `podman auto-update`,
   * which pulls the rolling image tag and restarts the container with
   * healthcheck-gated rollback.
   */
  UpdateAgent = 'update_agent',
}

/**
 * Steps of the per-screen onboarding wizard. Stored as a plain integer on
 * `screen_remote_controls.onboarding_step` so "how far did we get" survives a
 * reload and is the same for every operator looking at that screen.
 */
export enum OnboardingStep {
  AssignAgent = 1,
  Network = 2,
  InstallDevmodeApp = 3,
  KeyServer = 4,
  Passphrase = 5,
  Ssh = 6,
  /**
   * Inserted ahead of pairing: the launch at the end has nothing to start
   * without it, and the agent can only install once SSH works.
   */
  InstallApp = 7,
  SsapPairing = 8,
  Finish = 9,
}

/** Highest step; reaching it is what sets `onboardingCompletedAt`. */
export const ONBOARDING_LAST_STEP = OnboardingStep.Finish;
