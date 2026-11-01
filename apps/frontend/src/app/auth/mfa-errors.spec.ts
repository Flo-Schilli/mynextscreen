import { HttpErrorResponse } from '@angular/common/http';
import {
  httpStatus,
  isMfaChallengeExpired,
  mfaErrorCode,
  mfaErrorOrganisationId,
} from './mfa-errors';

const err = (status: number, error: unknown): HttpErrorResponse =>
  new HttpErrorResponse({ status, error });

describe('mfa-errors', () => {
  it('reads known MFA codes only', () => {
    expect(mfaErrorCode(err(403, { code: 'MFA_REQUIRED' }))).toBe('MFA_REQUIRED');
    expect(mfaErrorCode(err(403, { code: 'SOMETHING_ELSE' }))).toBeNull();
    expect(mfaErrorCode(err(403, 'plain text'))).toBeNull();
    expect(mfaErrorCode(new Error('x'))).toBeNull();
  });

  it('reads the organisation id of MFA_REQUIRED', () => {
    expect(mfaErrorOrganisationId(err(403, { organisationId: 'o1' }))).toBe('o1');
    expect(mfaErrorOrganisationId(err(403, {}))).toBeNull();
  });

  it('tells an expired challenge from a wrong code', () => {
    expect(
      isMfaChallengeExpired(err(401, { message: 'MFA challenge expired — sign in again' })),
    ).toBe(true);
    expect(isMfaChallengeExpired(err(401, { message: 'Invalid code' }))).toBe(false);
    expect(isMfaChallengeExpired(err(429, { message: 'challenge expired' }))).toBe(false);
  });

  it('reads the status of plain error shapes too', () => {
    expect(httpStatus({ status: 403 })).toBe(403);
    expect(httpStatus('nope')).toBeNull();
  });
});
