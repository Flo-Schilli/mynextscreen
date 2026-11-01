import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MFA_CHALLENGE_EXPIRED,
  MFA_INVALID_CODE,
  MFA_INVALID_PASSWORD,
  MFA_NOT_ENABLED,
  MFA_RESET_NOT_MEMBER,
  MFA_SETUP_EXPIRED,
} from './mfa.constants';

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

/** `totp/confirm` without a pending setup: the wizard restarts at the password. */
export function mfaSetupExpired(): BadRequestException {
  return new BadRequestException({
    statusCode: HttpStatus.BAD_REQUEST,
    code: MFA_SETUP_EXPIRED,
    message: 'No pending MFA setup — start the setup again',
  });
}

/** A refused MFA admin action (`MFA_SELF_REQUIRED`, `MFA_RESET_*`). */
export function mfaForbidden(code: string, message: string): ForbiddenException {
  return new ForbiddenException({ statusCode: HttpStatus.FORBIDDEN, code, message });
}

/** Org-admin reset of someone who is not a member of the organisation. */
export function mfaResetNotMember(): NotFoundException {
  return new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    code: MFA_RESET_NOT_MEMBER,
    message: 'User is not a member of this organisation',
  });
}

/** Reset of a user without a second factor. */
export function mfaNotEnabled(): ConflictException {
  return new ConflictException({
    statusCode: HttpStatus.CONFLICT,
    code: MFA_NOT_ENABLED,
    message: 'Multi-factor authentication is not set up for this user',
  });
}
