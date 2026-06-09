import type { User } from '../db/schema';
import type { IssuedAccessToken, IssuedRefreshToken } from './token.types';

export interface AuthenticatedUserView {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
}

export interface LoginResult {
  user: User;
  accessToken: IssuedAccessToken;
  refreshToken: IssuedRefreshToken;
}

export interface RefreshResult {
  userId: string;
  accessToken: IssuedAccessToken;
  refreshToken: IssuedRefreshToken;
}
