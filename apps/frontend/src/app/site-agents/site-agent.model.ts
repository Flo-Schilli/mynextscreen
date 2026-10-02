/** Reachability of a TV as the site agent last saw it on the network. */
export type ScreenReachability = 'unknown' | 'reachable' | 'unreachable';

export type DevmodeKeyStatus =
  'unknown' | 'ok' | 'key_server_off' | 'wrong_passphrase' | 'unreachable' | 'no_passphrase';

export type SshStatus = 'unknown' | 'ok' | 'auth_failed' | 'host_key_mismatch' | 'unreachable';

export type SsapStatus = 'unknown' | 'ok' | 'awaiting_pairing' | 'rejected' | 'unreachable';

export interface SiteAgent {
  id: string;
  organisationId: string;
  name: string;
  location: string | null;
  agentVersion: string | null;
  lastHeartbeat: string | null;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteAgentListItem extends SiteAgent {
  screenCount: number;
}

export interface CreateSiteAgentRequest {
  name: string;
  location?: string | null;
}

/** Shown exactly once, when the agent is created or a token is reissued. */
export interface EnrolmentTokenResponse {
  enrolmentToken: string;
  expiresAt: string;
}

export interface CreatedSiteAgent extends EnrolmentTokenResponse {
  agent: SiteAgent;
}

/**
 * A screen's remote-control settings as the dashboard sees them.
 *
 * `devmodePassphrase` is never the real value: the server sends a mask when one
 * is stored and null when none is. Sending an empty string back means "keep
 * what is stored", which is the only honest thing a client that cannot read it
 * can say.
 */
export interface ScreenRemoteControl {
  screenId: string;
  organisationId: string;
  agentId: string | null;
  localIp: string | null;
  macAddress: string | null;
  devmodePassphrase: string | null;
  ssapPort: number;
  autoLaunchEnabled: boolean;
  extendDevmodeEnabled: boolean;
  devmodeExtendIntervalDays: number;
  wakeBeforeScheduleEnabled: boolean;
  wakeLeadTimeMinutes: number;
  wakeOnUnreachableEnabled: boolean;
  reachability: ScreenReachability;
  lastProbeAt: string | null;
  lastProbeError: string | null;
  lastLaunchAt: string | null;
  lastWakeAt: string | null;
  lastDevmodeExtendAt: string | null;
  lastDevmodeExtendOk: boolean | null;
  keyStatus: DevmodeKeyStatus;
  sshStatus: SshStatus;
  ssapStatus: SsapStatus;
  sshHostKeyFingerprint: string | null;
  onboardingStep: number;
  onboardingCompletedAt: string | null;
  /** What the TV reports as installed; null when the app is not on the set. */
  installedAppId: string | null;
  installedAppVersion: string | null;
  installedAppVersionAt: string | null;
  /** What this server has packaged, for the comparison. */
  availableAppVersion: string | null;
}

export interface UpdateScreenRemoteControlRequest {
  agentId?: string | null;
  localIp?: string | null;
  macAddress?: string | null;
  devmodePassphrase?: string | null;
  ssapPort?: number;
  autoLaunchEnabled?: boolean;
  extendDevmodeEnabled?: boolean;
  devmodeExtendIntervalDays?: number;
  wakeBeforeScheduleEnabled?: boolean;
  wakeLeadTimeMinutes?: number;
  wakeOnUnreachableEnabled?: boolean;
}

export type RemoteCommandType = 'launch' | 'wake' | 'extend_devmode' | 'refetch_key';

export interface DispatchedCommand {
  commandId: string;
}

/** What the mask looks like on the wire, so the UI can recognise it. */
export const MASKED_SECRET = '••••••••';

/** Bounds the server enforces; mirrored so the form can say so before saving. */
export const DEVMODE_INTERVAL_MIN_DAYS = 1;
export const DEVMODE_INTERVAL_MAX_DAYS = 40;
/**
 * Above this the Developer Mode session (~1000h ≈ 41.7 days) can lapse between
 * two attempts on a set that is not on every day, and the TV deletes the app
 * when it does. Allowed, but worth saying out loud.
 */
export const DEVMODE_INTERVAL_WARN_DAYS = 30;
