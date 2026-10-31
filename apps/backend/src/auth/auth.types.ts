import type { User } from '../db/schema';
import type { MfaMethod } from './mfa/mfa.constants';
import type { IssuedAccessToken, IssuedRefreshToken } from './token.types';

// Wire types are mirrored in `libs/shared-types/src/auth.ts` for the SPA. The
// backend cannot import that library (no build target, `rootDir: ./src`), so a
// field added here has to be added there as well.

export interface AuthenticatedUserView {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
}

/** A session was issued (cookies set). */
export interface AuthSuccessResponse {
  user: AuthenticatedUserView;
  /**
   * The session is not MFA-confirmed but MFA is mandatory for the user
   * (super-admin): the SPA must open the enrolment wizard.
   */
  mfaEnrolmentRequired: boolean;
}

/** Password accepted, second factor needed: `POST /auth/login/mfa` next. */
export interface MfaRequiredResponse {
  mfaRequired: true;
  methods: MfaMethod[];
}

export type LoginResponse = AuthSuccessResponse | MfaRequiredResponse;

/** A freshly issued access + refresh token pair (one logged-in session). */
export interface SessionTokens {
  accessToken: IssuedAccessToken;
  refreshToken: IssuedRefreshToken;
}

export interface LoginResult extends SessionTokens {
  user: User;
  /** Whether this session is MFA-confirmed (mirrors the access-token claim). */
  mfa: boolean;
}

/**
 * Outcome of a first-factor step (password login, email-verify auto-login):
 * either a session, or — for a user with TOTP — a challenge for step two.
 */
export type FirstFactorOutcome =
  ({ kind: 'session' } & LoginResult) | { kind: 'mfa-required'; user: User; challengeId: string };

export interface RefreshResult extends SessionTokens {
  userId: string;
}
