import { ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ProxyAwareThrottlerGuard } from './proxy-aware-throttler.guard';

type RequestWithUser = Request & { user?: { userId?: string } };

/**
 * Rate limit keyed on the authenticated user, falling back to the client IP.
 * Applies only to handlers marked `@PerUserThrottle()`. Registered as a global
 * guard behind the JWT guard, so `req.user` is already set.
 */
@Injectable()
export class UserThrottlerGuard extends ProxyAwareThrottlerGuard {
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    return !(await super.shouldSkip(context));
  }

  protected override async getTracker(req: RequestWithUser): Promise<string> {
    const userId = req.user?.userId;
    return userId ? `user:${userId}` : super.getTracker(req);
  }
}
