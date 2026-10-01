/** Outcome of the agent's last SSH connection to the TV (port 9922, `prisoner`). */
export enum SshStatus {
  Unknown = 'unknown',
  Ok = 'ok',
  /** The key was rejected — usually a stale key after Developer Mode was re-enabled. */
  AuthFailed = 'auth_failed',
  /**
   * The host key changed. Never silently accepted: a factory reset is the benign
   * cause, and the other one is worth a human looking at it.
   */
  HostKeyMismatch = 'host_key_mismatch',
  Unreachable = 'unreachable',
}
