import { RECOVERY_CODE_PATTERN } from '../recovery-code.service';

/** A 6-digit TOTP code. */
export const TOTP_CODE_PATTERN = /^\d{6}$/;
export const TOTP_CODE_MESSAGE = 'code must be a 6-digit number';
export const RECOVERY_CODE_MESSAGE = 'recoveryCode must look like xxxxx-xxxxx';

/**
 * Code of a management action (device change, disable, regeneration): a TOTP
 * code or, the authenticator being lost, a recovery code.
 */
export const MANAGEMENT_CODE_PATTERN = new RegExp(
  `(${TOTP_CODE_PATTERN.source})|(${RECOVERY_CODE_PATTERN.source})`,
  'i',
);
export const MANAGEMENT_CODE_MESSAGE =
  'code must be a 6-digit number or a recovery code (xxxxx-xxxxx)';
