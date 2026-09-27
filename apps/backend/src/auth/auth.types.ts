import type { User } from '../db/schema';
import type { IssuedAccessToken, IssuedRefreshToken } from './token.types';

export interface AuthenticatedUserView {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
}

/** A freshly issued access + refresh token pair (one logged-in session). */
export interface SessionTokens {
  accessToken: IssuedAccessToken;
  refreshToken: IssuedRefreshToken;
}

export interface LoginResult extends SessionTokens {
  user: User;
}

export interface RefreshResult extends SessionTokens {
  userId: string;
}
