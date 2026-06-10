import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  clearAuthCookies,
  setAccessCookie,
  setRefreshCookie,
} from './cookies';

function makeConfig(values: Record<string, string | undefined> = {}): ConfigService {
  return {
    get: (key: string, def?: string) => (key in values ? values[key] : def),
  } as unknown as ConfigService;
}

function makeRes(): { cookie: jest.Mock; clearCookie: jest.Mock } {
  return { cookie: jest.fn(), clearCookie: jest.fn() };
}

describe('cookies', () => {
  const expires = new Date(Date.now() + 60_000);

  it('sets the access cookie httpOnly at path / with strict sameSite by default', () => {
    const res = makeRes();
    setAccessCookie(res as unknown as Response, makeConfig(), 'tok', expires);
    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_COOKIE,
      'tok',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/', expires }),
    );
  });

  it('scopes the refresh cookie to the auth path', () => {
    const res = makeRes();
    setRefreshCookie(res as unknown as Response, makeConfig(), 'rtok', expires);
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      'rtok',
      expect.objectContaining({ path: REFRESH_COOKIE_PATH }),
    );
  });

  it('honours COOKIE_SAMESITE and COOKIE_SECURE overrides', () => {
    const res = makeRes();
    setAccessCookie(
      res as unknown as Response,
      makeConfig({ COOKIE_SAMESITE: 'none', COOKIE_SECURE: 'true' }),
      'tok',
      expires,
    );
    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_COOKIE,
      'tok',
      expect.objectContaining({ sameSite: 'none', secure: true }),
    );
  });

  it('marks cookies secure in production by default', () => {
    const res = makeRes();
    setAccessCookie(
      res as unknown as Response,
      makeConfig({ NODE_ENV: 'production' }),
      'tok',
      expires,
    );
    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_COOKIE,
      'tok',
      expect.objectContaining({ secure: true }),
    );
  });

  it('clears both auth cookies', () => {
    const res = makeRes();
    clearAuthCookies(res as unknown as Response, makeConfig());
    expect(res.clearCookie).toHaveBeenCalledWith(
      ACCESS_COOKIE,
      expect.objectContaining({ path: '/' }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      expect.objectContaining({ path: REFRESH_COOKIE_PATH }),
    );
  });
});
