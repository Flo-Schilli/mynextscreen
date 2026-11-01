export interface IssuedRefreshToken {
  token: string;
  familyId: string;
  expiresAt: Date;
}

export interface IssuedAccessToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
  /**
   * The session was confirmed with a second factor. Tokens minted before MFA
   * existed carry no claim; verification normalises that to `false`.
   */
  mfa: boolean;
  jti: string;
  /** Issued-at, epoch seconds; 0 when the claim is missing (= oldest possible). */
  iat: number;
}

/**
 * Claims of a screen access token. A screen is not a user: it has no email and
 * no super-admin flag, and it carries its organisation so the guard needs
 * neither a database round trip nor a bcrypt comparison per request.
 */
export interface ScreenTokenPayload {
  sub: string;
  org: string;
  typ: 'screen';
  jti: string;
}

/**
 * Claims of a site-agent access token. Same shape as a screen's — an agent is
 * not a user either — but a separate type so the two cannot be assigned to one
 * another by accident.
 */
export interface AgentTokenPayload {
  sub: string;
  org: string;
  typ: 'agent';
  jti: string;
}

export interface RotateSuccess {
  status: 'ok';
  userId: string;
  familyId: string;
  /** Carried over from the rotated record; a record without the field is `false`. */
  mfa: boolean;
  next: IssuedRefreshToken;
}

export interface RotateReuse {
  status: 'reuse';
  familyId: string;
}

export interface RotateUnknown {
  status: 'unknown';
}

export type RotateResult = RotateSuccess | RotateReuse | RotateUnknown;
