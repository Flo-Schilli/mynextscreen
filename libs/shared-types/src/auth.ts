// Auth / MFA wire contract between the backend (`apps/backend/src/auth/`) and
// the SPA. The backend keeps its own copy (`auth.types.ts`, `mfa/mfa.service.ts`,
// `mfa/mfa.constants.ts`) because it cannot import this library across its
// `rootDir`; a field added there has to be added here too.

/** Second-factor methods accepted by `POST /api/auth/login/mfa`. */
export type MfaMethod = "totp" | "recovery";

export interface AuthUserView {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
}

/**
 * Why MFA is mandatory for a user. MFA is bound to the USER, not to an org:
 * it is mandatory as soon as the user is a super-admin OR a member of at least
 * one organisation with `requireMfa` — and then for every org of the user.
 * Both false/empty → MFA is optional (but can still be set up).
 */
export interface MfaRequiredBy {
  superAdmin: boolean;
  /** Orgs of the user that have `requireMfa` switched on. */
  organisationIds: string[];
}

/** A session was issued (cookies set): login without TOTP, login/mfa, setup, verify-email. */
export interface AuthSuccessResponse {
  user: AuthUserView;
  /**
   * The session is not MFA-confirmed but MFA is mandatory for the user
   * (super-admin or any org with `requireMfa`): open the enrolment wizard.
   */
  mfaEnrolmentRequired: boolean;
}

/** `GET /api/auth/me` — evaluated live on every call. */
export interface AuthMeResponse extends AuthUserView {
  /** The current session is MFA-confirmed (access-token claim). */
  mfa: boolean;
  /** Same meaning as in `AuthSuccessResponse`: `!mfa && MFA mandatory`. */
  mfaEnrolmentRequired: boolean;
}

/**
 * Password accepted, second factor needed. No session yet — the challenge sits
 * in an httpOnly cookie; send the code to `POST /api/auth/login/mfa`.
 */
export interface MfaRequiredResponse {
  mfaRequired: true;
  methods: MfaMethod[];
}

/** Response of `POST /api/auth/login` and `POST /api/auth/verify-email`. */
export type LoginResponse = AuthSuccessResponse | MfaRequiredResponse;

/** Body of `POST /api/auth/login/mfa`: one of the two. */
export type LoginMfaRequest = { code: string } | { recoveryCode: string };

/** `GET /api/auth/mfa/status` */
export interface MfaStatusResponse {
  totpEnabled: boolean;
  /** ISO timestamp, null while TOTP is not enabled. */
  enabledAt: string | null;
  recoveryCodesRemaining: number;
  requiredBy: MfaRequiredBy;
}

/** `POST /api/auth/mfa/totp/setup` — shown once, never stored by the client. */
export interface TotpSetupResponse {
  otpauthUri: string;
  qrDataUrl: string;
  secret: string;
}

/** `POST /api/auth/mfa/totp/confirm` and `/recovery-codes/regenerate` — shown once. */
export interface RecoveryCodesResponse {
  recoveryCodes: string[];
}

/** `code` field of the 401/403/409/429 error bodies of the MFA flow. */
export type MfaErrorCode =
  /** 403 — session not MFA-confirmed but MFA is mandatory; body has `requiredBy`. */
  | "MFA_ENROLMENT_REQUIRED"
  /** 409 — `totp/disable` while MFA is mandatory. */
  | "MFA_DISABLE_FORBIDDEN"
  /** 429 — too many failed second-factor attempts. */
  | "MFA_LOCKED_OUT"
  /** 401 — `login/mfa`: challenge cookie missing/expired/used → restart at the password. */
  | "MFA_CHALLENGE_EXPIRED"
  /** 401 — wrong TOTP or recovery code (login/mfa and all `/api/auth/mfa/*` actions). */
  | "MFA_INVALID_CODE"
  /** 401 — wrong `currentPassword` on an `/api/auth/mfa/*` action. */
  | "MFA_INVALID_PASSWORD";

/** Body of the 403 `MFA_ENROLMENT_REQUIRED` error (JwtAuthGuard, every route but `@AllowWithoutMfa`). */
export interface MfaEnrolmentRequiredError {
  statusCode: 403;
  code: "MFA_ENROLMENT_REQUIRED";
  message: string;
  requiredBy: MfaRequiredBy;
}
