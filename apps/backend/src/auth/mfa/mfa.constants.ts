// `code` values of the MFA error bodies — mirrored as `MfaErrorCode` in
// `libs/shared-types/src/auth.ts`.

/** 403: a session without MFA hit a route that needs it (MFA mandatory for the user). */
export const MFA_ENROLMENT_REQUIRED = 'MFA_ENROLMENT_REQUIRED';
/** 409: MFA is mandatory for this user, so it cannot be switched off. */
export const MFA_DISABLE_FORBIDDEN = 'MFA_DISABLE_FORBIDDEN';
/** 429: too many failed second-factor attempts. */
export const MFA_LOCKED_OUT = 'MFA_LOCKED_OUT';
/** 401: login challenge cookie missing, expired or already used — restart at the password. */
export const MFA_CHALLENGE_EXPIRED = 'MFA_CHALLENGE_EXPIRED';
/** 401: wrong TOTP or recovery code. */
export const MFA_INVALID_CODE = 'MFA_INVALID_CODE';
/** 401: wrong `currentPassword` on an MFA management action. */
export const MFA_INVALID_PASSWORD = 'MFA_INVALID_PASSWORD';
/** 400: `totp/confirm` without a pending setup (expired after 10 min or never started). */
export const MFA_SETUP_EXPIRED = 'MFA_SETUP_EXPIRED';
/**
 * 403: the action needs the caller's own session to be MFA-confirmed —
 * switching an org's `requireMfa` on (no self-lockout) and the org-admin reset.
 */
export const MFA_SELF_REQUIRED = 'MFA_SELF_REQUIRED';
/** 403: an admin tried to reset their own factor (use the security settings instead). */
export const MFA_RESET_SELF = 'MFA_RESET_SELF';
/** 404: org-admin reset of a user who is not a member of that organisation. */
export const MFA_RESET_NOT_MEMBER = 'MFA_RESET_NOT_MEMBER';
/** 403: org-admin reset of a super-admin — only another super-admin may do that. */
export const MFA_RESET_TARGET_SUPER_ADMIN = 'MFA_RESET_TARGET_SUPER_ADMIN';
/**
 * 403: org-admin reset of a user who also belongs to an org where the caller
 * is not OrgAdmin. The reset is global, so a platform admin has to do it.
 */
export const MFA_RESET_NEEDS_SUPER_ADMIN = 'MFA_RESET_NEEDS_SUPER_ADMIN';
/** 409: reset of a user who has no second factor set up. */
export const MFA_NOT_ENABLED = 'MFA_NOT_ENABLED';

/** Short-lived httpOnly cookie carrying the login challenge between both steps. */
export const MFA_CHALLENGE_COOKIE = 'mfa_challenge';
export const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;
/** Wrong codes allowed on one challenge before it is dropped. */
export const MFA_CHALLENGE_MAX_ATTEMPTS = 5;

/** Pending (unconfirmed) TOTP secret lifetime. */
export const MFA_ENROLMENT_TTL_SECONDS = 10 * 60;

/** Failed second-factor attempts per user before new challenges answer 429. */
export const MFA_LOCKOUT_THRESHOLD = 10;
export const MFA_LOCKOUT_WINDOW_SECONDS = 15 * 60;

export const RECOVERY_CODE_COUNT = 10;

export type MfaMethod = 'totp' | 'recovery';
export const MFA_METHODS: readonly MfaMethod[] = ['totp', 'recovery'];

export const mfaRedisKeys = {
  enrolment: (userId: string): string => `mfa:enrol:${userId}`,
  challenge: (challengeHash: string): string => `mfa:challenge:${challengeHash}`,
  failures: (userId: string): string => `mfa:fail:${userId}`,
  /** Throttle marker: the "org requires MFA" member mail went out recently. */
  orgRequiredMail: (organisationId: string): string => `mfa:org-required-mail:${organisationId}`,
};

/** The "org requires MFA" member mail goes out at most once per org per day. */
export const MFA_ORG_REQUIRED_MAIL_THROTTLE_SECONDS = 24 * 60 * 60;
