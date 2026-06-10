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
