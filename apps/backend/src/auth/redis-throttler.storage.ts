import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

/**
 * Return shape of {@link ThrottlerStorage.increment}, derived from the installed
 * `@nestjs/throttler` rather than imported from its `dist/` internals: the
 * record interface is not re-exported at the package root, and deep-importing it
 * is fragile under the ESM-only package layout.
 */
type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

/**
 * Atomic increment-and-check as a single Lua round-trip: bump the hit counter,
 * (re)arm its TTL, then set or read the block key. Keeping it in one script
 * means concurrent requests cannot interleave between the INCR and the limit
 * check. Credits to the original `@nest-lab/throttler-storage-redis` /
 * `rate-limit-redis` implementation this is ported from.
 */
const INCREMENT_SCRIPT = `
  local hitKey = KEYS[1]
  local blockKey = KEYS[2]
  local ttl = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local blockDuration = tonumber(ARGV[4])

  local totalHits = redis.call('INCR', hitKey)
  local timeToExpire = redis.call('PTTL', hitKey)

  if timeToExpire <= 0 then
    redis.call('PEXPIRE', hitKey, ttl)
    timeToExpire = ttl
  end

  local isBlocked = redis.call('GET', blockKey)
  local timeToBlockExpire = 0

  if isBlocked then
    timeToBlockExpire = redis.call('PTTL', blockKey)
  elseif totalHits > limit then
    redis.call('SET', blockKey, 1, 'PX', blockDuration)
    isBlocked = '1'
    timeToBlockExpire = blockDuration
  end

  if isBlocked and timeToBlockExpire <= 0 then
    redis.call('DEL', blockKey)
    redis.call('SET', hitKey, 1, 'PX', ttl)
    totalHits = 1
    timeToExpire = ttl
    isBlocked = false
  end

  return { totalHits, timeToExpire, isBlocked and 1 or 0, timeToBlockExpire }
`
  .replace(/^\s+/gm, '')
  .trim();

function assertNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') {
    throw new TypeError(`Expected ${field} to be a number, got ${typeof value}`);
  }
  return value;
}

/**
 * Redis-backed {@link ThrottlerStorage}. Replaces `@nest-lab/throttler-storage-redis`,
 * which has no NestJS 12-compatible release. The Redis client is owned by the
 * caller (the auth module), so this storage never disconnects it.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `{${key}:${throttlerName}}:hits`;
    const blockKey = `{${key}:${throttlerName}}:blocked`;

    const results: unknown = await this.redis.eval(
      INCREMENT_SCRIPT,
      2,
      hitKey,
      blockKey,
      throttlerName,
      ttl,
      limit,
      blockDuration,
    );

    if (!Array.isArray(results)) {
      throw new TypeError(`Expected throttler script to return an array, got ${typeof results}`);
    }

    const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = results as unknown[];

    return {
      totalHits: assertNumber(totalHits, 'totalHits'),
      timeToExpire: Math.ceil(assertNumber(timeToExpire, 'timeToExpire') / 1000),
      isBlocked: assertNumber(isBlocked, 'isBlocked') === 1,
      timeToBlockExpire: Math.ceil(assertNumber(timeToBlockExpire, 'timeToBlockExpire') / 1000),
    };
  }
}
