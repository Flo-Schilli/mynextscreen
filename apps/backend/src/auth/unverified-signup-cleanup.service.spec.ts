import type { ConfigService } from '@nestjs/config';
import type { UserService } from '../user/user.service';
import { UnverifiedSignupCleanupService } from './unverified-signup-cleanup.service';

describe('UnverifiedSignupCleanupService', () => {
  let users: { deleteStaleUnverifiedSignups: jest.Mock };
  let service: UnverifiedSignupCleanupService;
  let ttlHours: number;

  beforeEach(() => {
    users = { deleteStaleUnverifiedSignups: jest.fn().mockResolvedValue(0) };
    ttlHours = 48;
    const config = {
      get: jest.fn((_key: string, fallback?: unknown) => ttlHours ?? fallback),
    } as unknown as ConfigService;
    service = new UnverifiedSignupCleanupService(users as unknown as UserService, config);
  });

  it('computes the cutoff from SIGNUP_UNVERIFIED_TTL_HOURS and delegates', async () => {
    ttlHours = 24;
    const before = Date.now() - 24 * 60 * 60 * 1000;

    await service.cleanup();

    expect(users.deleteStaleUnverifiedSignups).toHaveBeenCalledTimes(1);
    const cutoff: Date = users.deleteStaleUnverifiedSignups.mock.calls[0][0];
    // cutoff ≈ now - 24h (allow a small execution window)
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - 5_000);
    expect(cutoff.getTime()).toBeLessThanOrEqual(before + 5_000);
  });

  it('swallows errors from the user service (cron must not crash)', async () => {
    users.deleteStaleUnverifiedSignups.mockRejectedValue(new Error('db down'));
    await expect(service.cleanup()).resolves.toBeUndefined();
  });
});
