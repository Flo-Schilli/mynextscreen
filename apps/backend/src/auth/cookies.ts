import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
/** Refresh cookie is scoped to the auth endpoints only — never sent elsewhere. */
export const REFRESH_COOKIE_PATH = '/api/auth';

type SameSite = 'strict' | 'lax' | 'none';

function sameSite(config: ConfigService): SameSite {
  const value = config.get<string>('COOKIE_SAMESITE', 'strict').toLowerCase();
  if (value === 'lax' || value === 'none') {
    return value;
  }
  return 'strict';
}

function isSecure(config: ConfigService): boolean {
  const explicit = config.get<string>('COOKIE_SECURE');
  if (explicit !== undefined) {
    return explicit === 'true';
  }
  return config.get<string>('NODE_ENV') === 'production';
}

function baseOptions(config: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    sameSite: sameSite(config),
    secure: isSecure(config),
  };
}

export function setAccessCookie(
  res: Response,
  config: ConfigService,
  token: string,
  expiresAt: Date,
): void {
  res.cookie(ACCESS_COOKIE, token, { ...baseOptions(config), path: '/', expires: expiresAt });
}

export function setRefreshCookie(
  res: Response,
  config: ConfigService,
  token: string,
  expiresAt: Date,
): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(config),
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(config), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(config), path: REFRESH_COOKIE_PATH });
}
