import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_SETUP_PUBLIC_KEY } from './setup-public.decorator';

/** Attempts per window, per process. Enough for a typo, not for a search. */
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 60_000;

/**
 * Guards the sensitive setup actions behind a fresh setup code.
 *
 * The code itself is verified by the server — it is org-scoped, single-use and
 * short-lived, and only an OrgAdmin can mint one in a real dashboard session.
 * This guard only enforces that *a* code was supplied and rate-limits blind
 * attempts, so the controller never runs a reset with an empty credential.
 *
 * Reads stay open: the status endpoint returns no secret, so an operator can see
 * whether the agent is connected without a code.
 *
 * Nothing is persisted here and nothing is written to the log — the old boot PIN
 * is gone, and with the server address pinned there is no rogue-server hole left
 * for it to cover.
 */
@Injectable()
export class SetupAuthGuard implements CanActivate {
  private attempts = 0;
  private windowStartedAt = 0;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_SETUP_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();

    if (this.isRateLimited()) {
      throw new UnauthorizedException('Too many attempts, try again shortly');
    }

    const code = request.headers['x-setup-code'];
    if (!code || code.trim() === '') {
      this.recordFailure();
      throw new UnauthorizedException('A setup code from the dashboard is required');
    }

    this.attempts = 0;
    return true;
  }

  private isRateLimited(): boolean {
    if (Date.now() - this.windowStartedAt > WINDOW_MS) {
      this.attempts = 0;
      this.windowStartedAt = Date.now();
      return false;
    }
    return this.attempts >= MAX_ATTEMPTS;
  }

  private recordFailure(): void {
    if (this.windowStartedAt === 0) {
      this.windowStartedAt = Date.now();
    }
    this.attempts += 1;
  }
}
