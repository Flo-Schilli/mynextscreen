import { SetMetadata } from '@nestjs/common';
import { PER_USER_THROTTLE_KEY } from './proxy-aware-throttler.guard';

/**
 * Rate-limit this route per authenticated user instead of per client IP
 * (enforced by the global `UserThrottlerGuard`). Combine with `@Throttle(...)`
 * to set the limit.
 */
export const PerUserThrottle = (): MethodDecorator & ClassDecorator =>
  SetMetadata(PER_USER_THROTTLE_KEY, true);
