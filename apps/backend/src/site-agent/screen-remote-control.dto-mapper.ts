import type { ScreenRemoteControl } from '../db/schema';

/** What a masked secret looks like on the wire. */
export const MASKED_SECRET = '••••••••';

/**
 * The dashboard's view of a screen's remote-control settings.
 *
 * Structurally distinct from what the agent receives, and deliberately so: the
 * agent needs the Developer Mode passphrase in plaintext to decrypt the TV's
 * key, the dashboard must never see it. Two types rather than one with a flag
 * means forgetting to mask is a compile error, not something a reviewer has to
 * catch.
 */
export interface ScreenRemoteControlDto extends Omit<ScreenRemoteControl, 'devmodePassphrase'> {
  /** {@link MASKED_SECRET} when one is stored, null when none is. Never the value. */
  devmodePassphrase: string | null;
}

export function toDashboardDto(row: ScreenRemoteControl): ScreenRemoteControlDto {
  return {
    ...row,
    devmodePassphrase: row.devmodePassphrase ? MASKED_SECRET : null,
  };
}
