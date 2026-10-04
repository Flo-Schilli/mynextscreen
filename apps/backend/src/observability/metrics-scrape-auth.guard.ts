import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Protects `GET /api/metrics` with a static Bearer scrape token from
 * `METRICS_SCRAPE_TOKEN`.
 *
 * Design choices:
 * - When no token is configured the endpoint is **disabled** (404), never open.
 *   A metrics endpoint leaks route templates, queue depths and pool state, so
 *   "no credential configured" must fail closed, not open.
 * - A missing/wrong token also answers 404, not 401: an unauthenticated caller
 *   must not even learn the endpoint exists.
 * - The comparison is constant-time to avoid leaking the token byte-by-byte via
 *   response timing.
 */
@Injectable()
export class MetricsScrapeAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('METRICS_SCRAPE_TOKEN', '');
    if (!expected) {
      // Not configured → endpoint does not exist.
      throw new NotFoundException();
    }

    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const presented = this.extractToken(request);
    if (!presented || !this.tokensMatch(presented, expected)) {
      throw new NotFoundException();
    }

    return true;
  }

  private extractToken(request: RequestWithHeaders): string | null {
    const header = request.headers['authorization'];
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) {
      return null;
    }
    const [scheme, token] = value.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }
    return token;
  }

  private tokensMatch(presented: string, expected: string): boolean {
    const a = Buffer.from(presented);
    const b = Buffer.from(expected);
    // timingSafeEqual throws on length mismatch; guard first so the length check
    // itself does not short-circuit before the constant-time compare.
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }
}
