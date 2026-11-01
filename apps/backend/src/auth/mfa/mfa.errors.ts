import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import { MFA_CHALLENGE_EXPIRED, MFA_INVALID_CODE, MFA_INVALID_PASSWORD } from './mfa.constants';

// The 401s of the MFA flow carry a machine-readable `code` next to the message,
// so the SPA can tell "restart at the password" from "wrong code, try again"
// without parsing text. Messages never include the submitted code or secret.

function mfaUnauthorized(code: string, message: string): UnauthorizedException {
  return new UnauthorizedException({ statusCode: HttpStatus.UNAUTHORIZED, code, message });
}

/** Login challenge cookie missing, expired, consumed or worthless. */
export function mfaChallengeExpired(): UnauthorizedException {
  return mfaUnauthorized(MFA_CHALLENGE_EXPIRED, 'MFA challenge expired — sign in again');
}

/** Wrong TOTP or recovery code. */
export function mfaInvalidCode(message = 'Invalid code'): UnauthorizedException {
  return mfaUnauthorized(MFA_INVALID_CODE, message);
}

/** Wrong `currentPassword` on an MFA management action. */
export function mfaInvalidPassword(): UnauthorizedException {
  return mfaUnauthorized(MFA_INVALID_PASSWORD, 'Current password is incorrect');
}
