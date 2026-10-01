/**
 * Outcome of the agent's last attempt to obtain the TV's SSH key from the
 * Developer Mode app's key server (`http://<tv>:9991/webos_rsa`).
 *
 * Each value maps to exactly one thing the operator has to do, which is what
 * the onboarding wizard shows them. A single boolean would send them hunting.
 */
export enum DevmodeKeyStatus {
  Unknown = 'unknown',
  Ok = 'ok',
  /** Port 9991 refused the connection — the key server toggle is off. */
  KeyServerOff = 'key_server_off',
  /** The key downloaded but would not decrypt with the stored passphrase. */
  WrongPassphrase = 'wrong_passphrase',
  /** No route to the TV at all. */
  Unreachable = 'unreachable',
  /** Nothing to try with: no passphrase is configured for this screen. */
  NoPassphrase = 'no_passphrase',
}
