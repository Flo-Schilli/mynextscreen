import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetupPinService } from './setup-pin.service';
import { IS_SETUP_PUBLIC_KEY } from './setup-public.decorator';

/** Attempts per window, per process. Enough for a typo, not for a search. */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

/**
 * Requires the setup PIN on anything that changes the agent's identity.
 *
 * Reads are open — the status endpoint deliberately returns no secret — so an
 * operator can see whether the agent is connected without hunting for the PIN.
 */
@Injectable()
export class SetupAuthGuard implements CanActivate {
  private attempts = 0;
  private windowStartedAt = 0;

  constructor(
    private readonly reflector: Reflector,
    private readonly pins: SetupPinService,
  ) {}

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

    if (!this.pins.matches(request.headers['x-setup-pin'])) {
      this.recordFailure();
      throw new UnauthorizedException('Invalid setup PIN');
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
