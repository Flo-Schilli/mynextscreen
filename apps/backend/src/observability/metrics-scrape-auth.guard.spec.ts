import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsScrapeAuthGuard } from './metrics-scrape-auth.guard';

function contextWithAuth(header?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: header === undefined ? {} : { authorization: header } }),
    }),
  } as unknown as ExecutionContext;
}

function guardWithToken(token: string): MetricsScrapeAuthGuard {
  const config = { get: (_: string, fallback: string) => token || fallback } as ConfigService;
  return new MetricsScrapeAuthGuard(config);
}

describe('MetricsScrapeAuthGuard', () => {
  const token = 'super-secret-scrape-token';

  it('allows a request with the correct bearer token', () => {
    const guard = guardWithToken(token);
    expect(guard.canActivate(contextWithAuth(`Bearer ${token}`))).toBe(true);
  });

  it('accepts a case-insensitive bearer scheme', () => {
    const guard = guardWithToken(token);
    expect(guard.canActivate(contextWithAuth(`bearer ${token}`))).toBe(true);
  });

  it('rejects a wrong token with 404 (not 401)', () => {
    const guard = guardWithToken(token);
    expect(() => guard.canActivate(contextWithAuth('Bearer wrong'))).toThrow(NotFoundException);
  });

  it('rejects a missing authorization header with 404', () => {
    const guard = guardWithToken(token);
    expect(() => guard.canActivate(contextWithAuth())).toThrow(NotFoundException);
  });

  it('rejects a non-bearer scheme with 404', () => {
    const guard = guardWithToken(token);
    expect(() => guard.canActivate(contextWithAuth(`Basic ${token}`))).toThrow(NotFoundException);
  });

  it('disables the endpoint (404) when no token is configured', () => {
    const guard = guardWithToken('');
    expect(() => guard.canActivate(contextWithAuth(`Bearer anything`))).toThrow(NotFoundException);
  });

  it('rejects a token of a different length without throwing from timingSafeEqual', () => {
    const guard = guardWithToken(token);
    expect(() => guard.canActivate(contextWithAuth(`Bearer ${token}extra`))).toThrow(
      NotFoundException,
    );
  });
});
