import type { MfaErrorCode, MfaRequiredBy } from '@mynextscreen/shared-types';

/**
 * Every `MfaErrorCode`, as a record so the compiler insists on an entry for
 * each member: a code added to `@mynextscreen/shared-types` without one here
 * fails the build instead of being silently ignored by {@link mfaErrorCode}.
 */
const MFA_ERROR_CODE_SET: Readonly<Record<MfaErrorCode, true>> = {
  MFA_ENROLMENT_REQUIRED: true,
  MFA_DISABLE_FORBIDDEN: true,
  MFA_LOCKED_OUT: true,
  MFA_CHALLENGE_EXPIRED: true,
  MFA_INVALID_CODE: true,
  MFA_INVALID_PASSWORD: true,
  MFA_SETUP_EXPIRED: true,
  MFA_SELF_REQUIRED: true,
  MFA_RESET_SELF: true,
  MFA_RESET_NOT_MEMBER: true,
  MFA_RESET_TARGET_SUPER_ADMIN: true,
  MFA_RESET_NEEDS_SUPER_ADMIN: true,
  MFA_NOT_ENABLED: true,
};

export const MFA_ERROR_CODES = Object.keys(MFA_ERROR_CODE_SET) as readonly MfaErrorCode[];

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

/** The `code` of an MFA error body (400/401/403/404/409/429), or null for anything else. */
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

/**
 * i18n key for a failed MFA reset (org-admin or super-admin). Each refusal
 * reason of the backend gets its own explanation; anything else is generic.
 */
export function mfaResetErrorKey(err: unknown): string {
  switch (mfaErrorCode(err)) {
    case 'MFA_RESET_NEEDS_SUPER_ADMIN':
      return 'mfaAdmin.reset.errors.needsSuperAdmin';
    case 'MFA_RESET_TARGET_SUPER_ADMIN':
      return 'mfaAdmin.reset.errors.targetSuperAdmin';
    case 'MFA_RESET_SELF':
      return 'mfaAdmin.reset.errors.self';
    case 'MFA_RESET_NOT_MEMBER':
      return 'mfaAdmin.reset.errors.notMember';
    case 'MFA_SELF_REQUIRED':
      return 'mfaAdmin.reset.errors.selfRequired';
    case 'MFA_NOT_ENABLED':
      return 'mfaAdmin.reset.errors.notEnabled';
    default:
      return 'mfaAdmin.reset.errors.generic';
  }
}
