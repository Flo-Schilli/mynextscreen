import type { MfaErrorCode } from '@mynextscreen/shared-types';

const MFA_ERROR_CODES: readonly MfaErrorCode[] = [
  'MFA_ENROLMENT_REQUIRED',
  'MFA_REQUIRED',
  'MFA_DISABLE_FORBIDDEN',
  'MFA_LOCKED_OUT',
];

interface ErrorBody {
  code?: unknown;
  message?: unknown;
  organisationId?: unknown;
}

/** Works on `HttpErrorResponse` and on plain `{ status, error }` shapes alike. */
function body(err: unknown): ErrorBody | null {
  if (typeof err !== 'object' || err === null || !('error' in err)) {
    return null;
  }
  const raw: unknown = err.error;
  return typeof raw === 'object' && raw !== null ? (raw as ErrorBody) : null;
}

export function httpStatus(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    return typeof err.status === 'number' ? err.status : null;
  }
  return null;
}

/** The `code` of an MFA error body (403/409/429), or null for anything else. */
export function mfaErrorCode(err: unknown): MfaErrorCode | null {
  const code = body(err)?.code;
  return MFA_ERROR_CODES.find((known) => known === code) ?? null;
}

/** `organisationId` of a 403 `MFA_REQUIRED` body, when the backend sends one. */
export function mfaErrorOrganisationId(err: unknown): string | null {
  const id = body(err)?.organisationId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * 401 from `POST /api/auth/login/mfa` because the challenge is gone (expired,
 * consumed, or dropped after too many wrong codes) rather than a wrong code.
 * The backend sends no `code` field for this case, only the message — keep this
 * in sync with `MfaService.verifyChallenge`.
 */
export function isMfaChallengeExpired(err: unknown): boolean {
  if (httpStatus(err) !== 401) {
    return false;
  }
  const message = body(err)?.message;
  return typeof message === 'string' && /challenge expired/i.test(message);
}
