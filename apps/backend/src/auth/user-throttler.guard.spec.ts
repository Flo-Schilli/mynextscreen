import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PER_USER_THROTTLE_KEY, ProxyAwareThrottlerGuard } from './proxy-aware-throttler.guard';
import { UserThrottlerGuard } from './user-throttler.guard';

type Internals = {
  getTracker(req: unknown): Promise<string>;
  shouldSkip(context: ExecutionContext): Promise<boolean>;
};

const context = {
  getHandler: () => 'handler',
  getClass: () => 'class',
} as unknown as ExecutionContext;

function guardOf<T extends object>(proto: T, flagged: boolean): Internals {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(flagged),
  } as unknown as Reflector;
  return Object.assign(Object.create(proto) as Internals, { reflector });
}

describe('UserThrottlerGuard', () => {
  const guard = Object.create(UserThrottlerGuard.prototype) as Internals;

  it('keys on the authenticated user id', async () => {
    const tracker = await guard.getTracker({ user: { userId: 'u-1' }, ip: '203.0.113.7' });

    expect(tracker).toBe('user:u-1');
  });

  it('gives two users behind one IP separate buckets', async () => {
    const a = await guard.getTracker({ user: { userId: 'u-1' }, ip: '203.0.113.7' });
    const b = await guard.getTracker({ user: { userId: 'u-2' }, ip: '203.0.113.7' });

    expect(a).not.toBe(b);
  });

  it('falls back to the client IP without a user', async () => {
    const tracker = await guard.getTracker({
      socket: { remoteAddress: '203.0.113.7' } as Request['socket'],
      headers: {},
      ip: '203.0.113.7',
    });

    expect(tracker).toBe('203.0.113.7');
  });

  it('only counts handlers flagged for per-user throttling', async () => {
    await expect(guardOf(UserThrottlerGuard.prototype, true).shouldSkip(context)).resolves.toBe(
      false,
    );
    await expect(guardOf(UserThrottlerGuard.prototype, false).shouldSkip(context)).resolves.toBe(
      true,
    );
  });
});

describe('ProxyAwareThrottlerGuard per-user routes', () => {
  it('skips handlers flagged for per-user throttling', async () => {
    const guard = guardOf(ProxyAwareThrottlerGuard.prototype, true);

    await expect(guard.shouldSkip(context)).resolves.toBe(true);
    expect(
      (guard as unknown as { reflector: { getAllAndOverride: jest.Mock } }).reflector
        .getAllAndOverride,
    ).toHaveBeenCalledWith(PER_USER_THROTTLE_KEY, ['handler', 'class']);
  });

  it('does not skip other handlers', async () => {
    const guard = guardOf(ProxyAwareThrottlerGuard.prototype, false);

    await expect(guard.shouldSkip(context)).resolves.toBe(false);
  });
});
