import { HttpErrorResponse } from '@angular/common/http';
import {
  MFA_ERROR_CODES,
  httpStatus,
  mfaErrorCode,
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
    ]);
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
