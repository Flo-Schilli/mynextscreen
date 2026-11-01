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

/** A session was issued (cookies set): login without TOTP, login/mfa, setup, verify-email. */
export interface AuthSuccessResponse {
  user: AuthUserView;
  /**
   * The session is not MFA-confirmed but MFA is mandatory for the user
   * (super-admin): open the enrolment wizard.
   */
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
  requiredBy: {
    superAdmin: boolean;
    organisationIds: string[];
  };
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

/** `code` field of the 403/409/429 error bodies of the MFA flow. */
export type MfaErrorCode =
  | "MFA_ENROLMENT_REQUIRED"
  | "MFA_REQUIRED"
  | "MFA_DISABLE_FORBIDDEN"
  | "MFA_LOCKED_OUT";
