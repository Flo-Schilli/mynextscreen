/**
 * The agent's half of the wire contract with the backend.
 *
 * The other half is `apps/backend/src/site-agent/agent-config.types.ts` plus the
 * DTO classes next to it. The two are deliberately not one shared declaration:
 * `libs/shared-types` has no build target, and every app here compiles with
 * `rootDir: ./src`, so importing across that boundary would nest the build
 * output and move the asset paths. Unifying them is a workspace-wide change to
 * both apps' build configuration, not something to smuggle into this feature.
 *
 * Until then: a field added on one side has to be added on the other, and the
 * end-to-end check in `docs/site-agent.md` is what catches it if it is not.
 */

export type ScreenReachabilityValue = 'unknown' | 'reachable' | 'unreachable';

export type DevmodeKeyStatusValue =
  'unknown' | 'ok' | 'key_server_off' | 'wrong_passphrase' | 'unreachable' | 'no_passphrase';

export type SshStatusValue = 'unknown' | 'ok' | 'auth_failed' | 'host_key_mismatch' | 'unreachable';

export type SsapStatusValue = 'unknown' | 'ok' | 'awaiting_pairing' | 'rejected' | 'unreachable';

export type SiteAgentCommandTypeValue =
  'launch' | 'wake' | 'extend_devmode' | 'refetch_key' | 'reload_config' | 'check';

/** One instruction pushed down the agent's SSE channel. */
export interface SiteAgentCommandMessage {
  commandId: string;
  type: SiteAgentCommandTypeValue;
  /** Absent for agent-wide commands such as `reload_config`. */
  screenId?: string;
  /** Only for `check`: which onboarding step to run. */
  step?: number;
}

/** One screen as the agent sees it. */
export interface AgentScreenConfigMessage {
  screenId: string;
  name: string;
  localIp: string | null;
  macAddress: string | null;
  ssapPort: number;
  /**
   * Plaintext, and necessarily so: the agent decrypts the TV's SSH key with it.
   * This is the only payload that carries it; the dashboard never sees it.
   */
  devmodePassphrase: string | null;
  autoLaunchEnabled: boolean;
  extendDevmodeEnabled: boolean;
  devmodeExtendIntervalDays: number;
  lastDevmodeExtendAt: string | null;
  wakeBeforeScheduleEnabled: boolean;
  wakeLeadTimeMinutes: number;
  wakeOnUnreachableEnabled: boolean;
  playerHeartbeatStale: boolean;
  nextScheduleStartAt: string | null;
  sshHostKeyFingerprint: string | null;
  keyStatus: DevmodeKeyStatusValue;
  sshStatus: SshStatusValue;
  ssapStatus: SsapStatusValue;
  onboardingStep: number;
}

export interface AgentConfigMessage {
  agentId: string;
  organisationId: string;
  probeIntervalMs: number;
  appId: string;
  screens: AgentScreenConfigMessage[];
}

/** One screen's worth of what the agent observed, sent back in a batch. */
export interface AgentScreenReportMessage {
  screenId: string;
  commandId?: string;
  step?: number;
  reachability?: ScreenReachabilityValue;
  detail?: string;
  keyStatus?: DevmodeKeyStatusValue;
  sshStatus?: SshStatusValue;
  ssapStatus?: SsapStatusValue;
  sshHostKeyFingerprint?: string;
  launched?: boolean;
  woken?: boolean;
  devmodeExtended?: boolean;
}

export interface AgentReportMessage {
  screens: AgentScreenReportMessage[];
}

export interface AgentSessionMessage {
  accessToken: string;
  refreshToken: string;
  /** Seconds, never an absolute instant: the venue machine's clock may be off. */
  expiresIn: number;
}

export interface AgentEnrolmentMessage extends AgentSessionMessage {
  agentId: string;
  organisationId: string;
}
