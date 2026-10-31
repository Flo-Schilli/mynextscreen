type MultiResult = [Error | null, unknown][];

/**
 * In-memory stand-in for the ioredis commands MfaService uses (strings with
 * TTL, hashes, counters, MULTI). TTLs are recorded, not enforced in time:
 * tests expire a key explicitly with {@link expireNow}.
 */
export class FakeMfaRedis {
  readonly strings = new Map<string, string>();
  readonly hashes = new Map<string, Map<string, string>>();
  readonly ttls = new Map<string, number>();

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.strings.get(key) ?? null);
  }

  set(key: string, value: string, _ex?: 'EX', seconds?: number): Promise<'OK'> {
    this.strings.set(key, value);
    if (seconds !== undefined) {
      this.ttls.set(key, seconds);
    }
    return Promise.resolve('OK');
  }

  del(key: string): Promise<number> {
    const existed = this.strings.delete(key) || this.hashes.delete(key);
    this.ttls.delete(key);
    return Promise.resolve(existed ? 1 : 0);
  }

  incr(key: string): Promise<number> {
    const next = Number(this.strings.get(key) ?? 0) + 1;
    this.strings.set(key, String(next));
    return Promise.resolve(next);
  }

  expire(key: string, seconds: number): Promise<number> {
    if (!this.strings.has(key) && !this.hashes.has(key)) {
      return Promise.resolve(0);
    }
    this.ttls.set(key, seconds);
    return Promise.resolve(1);
  }

  ttl(key: string): Promise<number> {
    if (!this.strings.has(key) && !this.hashes.has(key)) {
      return Promise.resolve(-2);
    }
    return Promise.resolve(this.ttls.get(key) ?? -1);
  }

  hset(key: string, ...pairs: string[]): Promise<number> {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    for (let i = 0; i < pairs.length; i += 2) {
      hash.set(pairs[i], pairs[i + 1]);
    }
    this.hashes.set(key, hash);
    return Promise.resolve(pairs.length / 2);
  }

  hget(key: string, field: string): Promise<string | null> {
    return Promise.resolve(this.hashes.get(key)?.get(field) ?? null);
  }

  hincrby(key: string, field: string, by: number): Promise<number> {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    const next = Number(hash.get(field) ?? 0) + by;
    hash.set(field, String(next));
    this.hashes.set(key, hash);
    return Promise.resolve(next);
  }

  /** Simulates expiry of a key. */
  expireNow(key: string): void {
    this.strings.delete(key);
    this.hashes.delete(key);
    this.ttls.delete(key);
  }

  multi(): FakeMulti {
    return new FakeMulti(this);
  }
}

class FakeMulti {
  private readonly queued: (() => Promise<unknown>)[] = [];

  constructor(private readonly redis: FakeMfaRedis) {}

  hset(key: string, ...pairs: string[]): this {
    this.queued.push(() => this.redis.hset(key, ...pairs));
    return this;
  }

  hincrby(key: string, field: string, by: number): this {
    this.queued.push(() => this.redis.hincrby(key, field, by));
    return this;
  }

  expire(key: string, seconds: number): this {
    this.queued.push(() => this.redis.expire(key, seconds));
    return this;
  }

  ttl(key: string): this {
    this.queued.push(() => this.redis.ttl(key));
    return this;
  }

  async exec(): Promise<MultiResult> {
    const results: MultiResult = [];
    for (const command of this.queued) {
      results.push([null, await command()]);
    }
    return results;
  }
}
