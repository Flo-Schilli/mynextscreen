import {
  BlockedOutboundUrlError,
  assertOutboundHostAllowed,
  assertOutboundUrlAllowed,
  isBlockedIpAddress,
  isSafeOutboundHostSyntax,
  isSafeOutboundUrlSyntax,
} from './outbound-url.util';

describe('isBlockedIpAddress', () => {
  it.each([
    ['127.0.0.1', 'loopback'],
    ['127.99.1.2', 'loopback range'],
    ['0.0.0.0', 'unspecified'],
    ['10.1.2.3', 'private class A'],
    ['172.16.0.1', 'private class B, lower bound'],
    ['172.31.255.254', 'private class B, upper bound'],
    ['192.168.1.1', 'private class C'],
    ['169.254.169.254', 'link-local / cloud metadata'],
    ['100.64.0.1', 'CGNAT'],
    ['192.0.0.1', 'IETF protocol assignments'],
    ['198.18.0.1', 'benchmarking'],
    ['224.0.0.1', 'multicast'],
    ['255.255.255.255', 'broadcast'],
    ['::1', 'IPv6 loopback'],
    ['::', 'IPv6 unspecified'],
    ['fc00::1', 'IPv6 unique local'],
    ['fd12:3456::1', 'IPv6 unique local'],
    ['fe80::1', 'IPv6 link-local'],
    ['ff02::1', 'IPv6 multicast'],
    ['::ffff:127.0.0.1', 'IPv4-mapped loopback'],
    ['::ffff:169.254.169.254', 'IPv4-mapped metadata'],
  ])('blocks %s (%s)', (ip) => {
    expect(isBlockedIpAddress(ip)).toBe(true);
  });

  it.each([['1.1.1.1'], ['93.184.216.34'], ['172.32.0.1'], ['2606:4700:4700::1111']])(
    'allows the public address %s',
    (ip) => {
      expect(isBlockedIpAddress(ip)).toBe(false);
    },
  );

  it('treats a non-address as not blocked (hostnames are resolved elsewhere)', () => {
    expect(isBlockedIpAddress('example.com')).toBe(false);
  });
});

describe('isSafeOutboundUrlSyntax', () => {
  it('accepts a plain https URL', () => {
    expect(isSafeOutboundUrlSyntax('https://ntfy.sh')).toBe(true);
  });

  it.each([
    ['file:///etc/passwd', 'disallowed scheme'],
    ['gopher://example.com', 'disallowed scheme'],
    ['not a url', 'unparseable'],
    ['', 'empty'],
    ['http://127.0.0.1:6379/', 'loopback literal'],
    ['http://169.254.169.254/latest/meta-data/', 'metadata literal'],
    ['http://[::1]:8080/', 'IPv6 loopback literal'],
    ['http://localhost:3000', 'localhost'],
    ['http://service.localhost', 'localhost suffix'],
    ['http://user:pass@example.com', 'embedded credentials'],
  ])('rejects %s (%s)', (raw) => {
    expect(isSafeOutboundUrlSyntax(raw)).toBe(false);
  });

  it('honours the allowlist for an otherwise blocked host', () => {
    expect(isSafeOutboundUrlSyntax('http://127.0.0.1:6379/', { allowlist: ['127.0.0.1'] })).toBe(
      true,
    );
  });

  it('accepts other schemes when asked (live-stream sources)', () => {
    expect(isSafeOutboundUrlSyntax('rtmp://example.com/live', { schemes: ['rtmp:'] })).toBe(true);
    expect(isSafeOutboundUrlSyntax('rtmp://10.0.0.5/live', { schemes: ['rtmp:'] })).toBe(false);
  });
});

describe('isSafeOutboundHostSyntax', () => {
  it('accepts a hostname', () => {
    expect(isSafeOutboundHostSyntax('smtp.example.com')).toBe(true);
  });

  it.each([['127.0.0.1'], ['localhost'], ['10.0.0.1'], ['[::1]'], ['']])('rejects %s', (host) => {
    expect(isSafeOutboundHostSyntax(host)).toBe(false);
  });

  it('honours the allowlist', () => {
    expect(isSafeOutboundHostSyntax('localhost', { allowlist: ['localhost'] })).toBe(true);
  });
});

describe('assertOutboundUrlAllowed', () => {
  const lookup = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('resolves the host and passes for a public address', async () => {
    lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

    const url = await assertOutboundUrlAllowed('https://ntfy.sh/alerts', { lookup });

    expect(url.hostname).toBe('ntfy.sh');
    expect(lookup).toHaveBeenCalledWith('ntfy.sh');
  });

  it('rejects a hostname that resolves to a private address (DNS rebinding)', async () => {
    lookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);

    await expect(assertOutboundUrlAllowed('https://evil.example.com', { lookup })).rejects.toThrow(
      BlockedOutboundUrlError,
    );
  });

  it('rejects when ANY resolved address is internal', async () => {
    lookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.7', family: 4 },
    ]);

    await expect(assertOutboundUrlAllowed('https://split.example.com', { lookup })).rejects.toThrow(
      BlockedOutboundUrlError,
    );
  });

  it('rejects a blocked scheme before resolving anything', async () => {
    await expect(assertOutboundUrlAllowed('file:///etc/passwd', { lookup })).rejects.toThrow(
      BlockedOutboundUrlError,
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it('rejects when the host cannot be resolved', async () => {
    lookup.mockRejectedValue(new Error('ENOTFOUND'));

    await expect(assertOutboundUrlAllowed('https://nope.example.com', { lookup })).rejects.toThrow(
      BlockedOutboundUrlError,
    );
  });

  it('skips resolution for an allowlisted host', async () => {
    const url = await assertOutboundUrlAllowed('http://ntfy.internal:8080/topic', {
      lookup,
      allowlist: ['ntfy.internal'],
    });

    expect(url.port).toBe('8080');
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe('assertOutboundHostAllowed', () => {
  const lookup = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('passes for a host resolving to a public address', async () => {
    lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    await expect(
      assertOutboundHostAllowed('smtp.example.com', { lookup }),
    ).resolves.toBeUndefined();
  });

  it('rejects a host resolving into the container network', async () => {
    lookup.mockResolvedValue([{ address: '172.18.0.2', family: 4 }]);
    await expect(assertOutboundHostAllowed('signage-postgres', { lookup })).rejects.toThrow(
      BlockedOutboundUrlError,
    );
  });
});
