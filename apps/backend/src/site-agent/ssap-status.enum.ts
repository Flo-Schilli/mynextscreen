/** Outcome of the agent's last SSAP (LG remote-control WebSocket) connection. */
export enum SsapStatus {
  Unknown = 'unknown',
  Ok = 'ok',
  /**
   * The TV is showing the pairing prompt. Someone has to confirm it with the
   * remote — once per TV, and the only step of onboarding that cannot be done
   * from the dashboard.
   */
  AwaitingPairing = 'awaiting_pairing',
  /** The prompt was declined, or the stored client key is no longer accepted. */
  Rejected = 'rejected',
  Unreachable = 'unreachable',
}
