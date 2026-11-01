import { HttpErrorResponse } from '@angular/common/http';
import {
  MFA_ERROR_CODES,
  httpStatus,
  mfaErrorCode,
  mfaResetErrorKey,
  mfaErrorRequiredBy,
  parseMfaRequiredBy,
} from './mfa-errors';

const err = (status: number, error: unknown): HttpErrorResponse =>
  new HttpErrorResponse({ status, error });

describe('mfa-errors', () => {
  it('reads known MFA codes only', () => {
    for (const code of [
      'MFA_ENROLMENT_REQUIRED',
      'MFA_DISABLE_FORBIDDEN',
      'MFA_LOCKED_OUT',
      'MFA_CHALLENGE_EXPIRED',
      'MFA_INVALID_CODE',
      'MFA_INVALID_PASSWORD',
    ]) {
      expect(mfaErrorCode(err(401, { code }))).toBe(code);
    }
    expect(mfaErrorCode(err(403, { code: 'MFA_REQUIRED' }))).toBeNull();
    expect(mfaErrorCode(err(403, { code: 'SOMETHING_ELSE' }))).toBeNull();
    expect(mfaErrorCode(err(403, 'plain text'))).toBeNull();
    expect(mfaErrorCode(new Error('x'))).toBeNull();
  });

  it('derives the known codes from an exhaustive record over MfaErrorCode', () => {
    expect([...MFA_ERROR_CODES].sort()).toEqual([
      'MFA_CHALLENGE_EXPIRED',
      'MFA_DISABLE_FORBIDDEN',
      'MFA_ENROLMENT_REQUIRED',
      'MFA_INVALID_CODE',
      'MFA_INVALID_PASSWORD',
      'MFA_LOCKED_OUT',
      'MFA_NOT_ENABLED',
      'MFA_RESET_NEEDS_SUPER_ADMIN',
      'MFA_RESET_NOT_MEMBER',
      'MFA_RESET_SELF',
      'MFA_RESET_TARGET_SUPER_ADMIN',
      'MFA_SELF_REQUIRED',
      'MFA_SETUP_EXPIRED',
    ]);
  });

  it.each([
    ['MFA_RESET_NEEDS_SUPER_ADMIN', 403, 'mfaAdmin.reset.errors.needsSuperAdmin'],
    ['MFA_RESET_TARGET_SUPER_ADMIN', 403, 'mfaAdmin.reset.errors.targetSuperAdmin'],
    ['MFA_RESET_SELF', 403, 'mfaAdmin.reset.errors.self'],
    ['MFA_RESET_NOT_MEMBER', 404, 'mfaAdmin.reset.errors.notMember'],
    ['MFA_SELF_REQUIRED', 403, 'mfaAdmin.reset.errors.selfRequired'],
    ['MFA_NOT_ENABLED', 409, 'mfaAdmin.reset.errors.notEnabled'],
  ])('maps the reset refusal %s to its own message', (code, status, key) => {
    expect(mfaResetErrorKey(err(status, { code }))).toBe(key);
  });

  it('maps any other reset failure to the generic message', () => {
    expect(mfaResetErrorKey(err(500, null))).toBe('mfaAdmin.reset.errors.generic');
  });

  it('reads requiredBy of MFA_ENROLMENT_REQUIRED', () => {
    const requiredBy = { superAdmin: false, organisationIds: ['o1'] };
    expect(mfaErrorRequiredBy(err(403, { code: 'MFA_ENROLMENT_REQUIRED', requiredBy }))).toEqual(
      requiredBy,
    );
    expect(mfaErrorRequiredBy(err(403, { code: 'MFA_ENROLMENT_REQUIRED' }))).toBeNull();
  });

  it('rejects malformed requiredBy values and drops non-string ids', () => {
    expect(parseMfaRequiredBy(null)).toBeNull();
    expect(parseMfaRequiredBy({ superAdmin: 'yes', organisationIds: [] })).toBeNull();
    expect(parseMfaRequiredBy({ superAdmin: true })).toBeNull();
    expect(parseMfaRequiredBy({ superAdmin: true, organisationIds: ['o1', 7] })).toEqual({
      superAdmin: true,
      organisationIds: ['o1'],
    });
  });

  it('reads the status of plain error shapes too', () => {
    expect(httpStatus({ status: 403 })).toBe(403);
    expect(httpStatus('nope')).toBeNull();
  });
});
