/** Error code: a super-admin session without MFA hit a route that needs it. */
export const MFA_ENROLMENT_REQUIRED = 'MFA_ENROLMENT_REQUIRED';
/** Error code: MFA is mandatory for this user, so it cannot be switched off. */
export const MFA_DISABLE_FORBIDDEN = 'MFA_DISABLE_FORBIDDEN';

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
};
