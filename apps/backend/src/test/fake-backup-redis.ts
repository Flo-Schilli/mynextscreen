import {
  DELETE_UNLESS_SCRIPT,
  LOCK_UPDATE_SCRIPT,
  TRANSITION_SCRIPT,
} from '../site-agent/site-agent-backup.scripts';

/**
 * Enough of ioredis for the agent-backup services: get, set (EX, optional NX),
 * del, and `eval` for the three backup scripts, reimplemented here with the
 * same semantics. The scripts themselves run against a real Redis only in the
 * dev stack and production; these tests pin what they are meant to do.
 */
export class FakeBackupRedis {
  readonly store = new Map<string, string>();
  readonly ttls = new Map<string, number>();

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }

  set(key: string, value: string, _ex?: 'EX', seconds?: number, nx?: 'NX'): Promise<'OK' | null> {
    if (nx && this.store.has(key)) {
      return Promise.resolve(null);
    }
    this.store.set(key, value);
    if (seconds !== undefined) {
      this.ttls.set(key, seconds);
    }
    return Promise.resolve('OK');
  }

  del(key: string): Promise<number> {
    return Promise.resolve(this.store.delete(key) ? 1 : 0);
  }

  eval(script: string, _numKeys: number, key: string, ...args: string[]): Promise<number> {
    const raw = this.store.get(key);
    const current = raw ? (JSON.parse(raw) as { state?: string; id?: string }) : null;

    if (script === TRANSITION_SCRIPT) {
      const [from, next, ttl] = args;
      if (!current || current.state !== from) {
        return Promise.resolve(0);
      }
      this.store.set(key, next);
      this.ttls.set(key, Number(ttl));
      return Promise.resolve(1);
    }
    if (script === DELETE_UNLESS_SCRIPT) {
      if (!current) {
        return Promise.resolve(0);
      }
      if (args.includes(current.state ?? '')) {
        return Promise.resolve(-1);
      }
      this.store.delete(key);
      return Promise.resolve(1);
    }
    if (script === LOCK_UPDATE_SCRIPT) {
      const [id, value, ttl] = args;
      if (!current || current.id !== id) {
        return Promise.resolve(0);
      }
      if (value === '') {
        this.store.delete(key);
      } else {
        this.store.set(key, value);
        this.ttls.set(key, Number(ttl));
      }
      return Promise.resolve(1);
    }
    throw new Error('FakeBackupRedis: unknown script');
  }

  /** Everything stored, as text — for "no secret in Redis" checks. */
  dump(): string {
    return [...this.store.values()].join('\n');
  }
}
