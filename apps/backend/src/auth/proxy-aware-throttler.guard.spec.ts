import type { Request } from 'express';
import { ProxyAwareThrottlerGuard } from './proxy-aware-throttler.guard';

type GuardInternals = { getTracker(req: Request): Promise<string> };

function makeRequest(options: {
  socketAddress?: string;
  realIp?: string | string[];
  ip?: string;
}): Request {
  return {
    socket: { remoteAddress: options.socketAddress } as Request['socket'],
    headers: options.realIp === undefined ? {} : { 'x-real-ip': options.realIp },
    ip: options.ip,
  } as unknown as Request;
}

describe('ProxyAwareThrottlerGuard', () => {
  let track: (req: Request) => Promise<string>;

  beforeEach(() => {
    const guard = Object.create(ProxyAwareThrottlerGuard.prototype) as GuardInternals;
    track = (req) => guard.getTracker(req);
  });

  it('keys on X-Real-IP when the request came through the internal proxy', async () => {
    const tracker = await track(
      makeRequest({ socketAddress: '10.89.0.3', realIp: '203.0.113.7', ip: '10.89.0.3' }),
    );

    expect(tracker).toBe('203.0.113.7');
  });

  it('puts two clients behind the same proxy into different buckets', async () => {
    const first = await track(makeRequest({ socketAddress: '10.89.0.3', realIp: '203.0.113.7' }));
    const second = await track(makeRequest({ socketAddress: '10.89.0.3', realIp: '198.51.100.9' }));

    expect(first).not.toBe(second);
  });

  it('keys both proxy paths identically — direct api.* and app.*/api/ via nginx', async () => {
    const viaCaddy = await track(
      makeRequest({ socketAddress: '10.89.0.3', realIp: '203.0.113.7' }),
    );
    const viaNginx = await track(
      makeRequest({ socketAddress: '10.89.0.8', realIp: '203.0.113.7' }),
    );

    expect(viaCaddy).toBe(viaNginx);
  });

  it('ignores a forged X-Real-IP from a direct, external connection', async () => {
    const tracker = await track(
      makeRequest({ socketAddress: '203.0.113.99', realIp: 'not-my-bucket', ip: '203.0.113.99' }),
    );

    expect(tracker).toBe('203.0.113.99');
  });

  it('falls back to the socket address when no header is present', async () => {
    const tracker = await track(makeRequest({ socketAddress: '10.89.0.3', ip: '10.89.0.3' }));

    expect(tracker).toBe('10.89.0.3');
  });

  it('takes the first value when the header arrives duplicated', async () => {
    const tracker = await track(
      makeRequest({ socketAddress: '10.89.0.3', realIp: ['203.0.113.7', '1.2.3.4'] }),
    );

    expect(tracker).toBe('203.0.113.7');
  });
});
