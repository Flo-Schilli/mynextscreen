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
  jti: string;
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

export interface RotateSuccess {
  status: 'ok';
  userId: string;
  familyId: string;
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
