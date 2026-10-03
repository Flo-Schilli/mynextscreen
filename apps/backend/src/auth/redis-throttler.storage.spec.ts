import type { Redis } from 'ioredis';
import { RedisThrottlerStorage } from './redis-throttler.storage';

describe('RedisThrottlerStorage', () => {
  let redis: { eval: jest.Mock };
  let storage: RedisThrottlerStorage;

  beforeEach(() => {
    redis = { eval: jest.fn() };
    storage = new RedisThrottlerStorage(redis as unknown as Redis);
  });

  it('keys the hit and block entries in one hash slot and forwards the throttler arguments', async () => {
    redis.eval.mockResolvedValue([1, 60_000, 0, 0]);

    await storage.increment('1.2.3.4', 60_000, 120, 30_000, 'default');

    const [script, numKeys, hitKey, blockKey, ...args] = redis.eval.mock.calls[0];
    expect(typeof script).toBe('string');
    expect(numKeys).toBe(2);
    // Hash-tag braces pin both keys to the same Redis Cluster slot so the Lua
    // script can touch them atomically.
    expect(hitKey).toBe('{1.2.3.4:default}:hits');
    expect(blockKey).toBe('{1.2.3.4:default}:blocked');
    expect(args).toEqual(['default', 60_000, 120, 30_000]);
  });

  it('maps an unblocked result and converts milliseconds to whole seconds', async () => {
    redis.eval.mockResolvedValue([3, 60_000, 0, 0]);

    const record = await storage.increment('ip', 60_000, 120, 30_000, 'default');

    expect(record).toEqual({
      totalHits: 3,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it('reports a blocked result and rounds sub-second expiries up', async () => {
    redis.eval.mockResolvedValue([121, 500, 1, 29_001]);

    const record = await storage.increment('ip', 60_000, 120, 30_000, 'default');

    expect(record).toEqual({
      totalHits: 121,
      timeToExpire: 1,
      isBlocked: true,
      timeToBlockExpire: 30,
    });
  });

  it('throws when the script does not return an array', async () => {
    redis.eval.mockResolvedValue('OK');

    await expect(storage.increment('ip', 60_000, 120, 30_000, 'default')).rejects.toThrow(
      TypeError,
    );
  });

  it('throws when a returned field is not a number', async () => {
    redis.eval.mockResolvedValue([1, 60_000, 'nope', 0]);

    await expect(storage.increment('ip', 60_000, 120, 30_000, 'default')).rejects.toThrow(
      TypeError,
    );
  });
});
