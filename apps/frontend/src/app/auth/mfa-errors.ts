import type { MfaErrorCode, MfaRequiredBy } from '@mynextscreen/shared-types';

const MFA_ERROR_CODES: readonly MfaErrorCode[] = [
  'MFA_ENROLMENT_REQUIRED',
  'MFA_DISABLE_FORBIDDEN',
  'MFA_LOCKED_OUT',
  'MFA_CHALLENGE_EXPIRED',
  'MFA_INVALID_CODE',
  'MFA_INVALID_PASSWORD',
];

interface ErrorBody {
  code?: unknown;
  requiredBy?: unknown;
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

/** The `code` of an MFA error body (401/403/409/429), or null for anything else. */
export function mfaErrorCode(err: unknown): MfaErrorCode | null {
  const code = body(err)?.code;
  return MFA_ERROR_CODES.find((known) => known === code) ?? null;
}

/** Narrows an untrusted value to `MfaRequiredBy`, or null when it does not fit. */
export function parseMfaRequiredBy(raw: unknown): MfaRequiredBy | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const { superAdmin, organisationIds } = raw as Record<string, unknown>;
  if (typeof superAdmin !== 'boolean' || !Array.isArray(organisationIds)) {
    return null;
  }
  return {
    superAdmin,
    organisationIds: organisationIds.filter((id): id is string => typeof id === 'string'),
  };
}

/** `requiredBy` of a 403 `MFA_ENROLMENT_REQUIRED` body, or null when missing/malformed. */
export function mfaErrorRequiredBy(err: unknown): MfaRequiredBy | null {
  return parseMfaRequiredBy(body(err)?.requiredBy);
}
