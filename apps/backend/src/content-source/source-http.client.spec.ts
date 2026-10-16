import { HttpService } from '@nestjs/axios';
import { AxiosError, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import {
  BlockedOutboundUrlError,
  assertOutboundUrlAllowed,
  type DnsLookupFn,
} from '../common/outbound-url.util';
import { OutboundGuard } from '../common/outbound-guard.service';
import {
  DEFAULT_SOURCE_HTTP_OPTIONS,
  SourceHttpClient,
  SourceHttpError,
  SourceRequestRejectedError,
} from './source-http.client';

const HOSTS = ['www.example.org', 'example.org'];

/** Public hosts resolve to a documentation address, `internal.example.org` into RFC 1918. */
const fakeLookup: DnsLookupFn = async (hostname) =>
  hostname === 'internal.example.org'
    ? [{ address: '10.0.0.5', family: 4 }]
    : [{ address: '93.184.216.34', family: 4 }];

function response(status: number, body = '', headers: Record<string, string> = {}) {
  return of({
    status,
    data: Buffer.from(body),
    headers,
    statusText: '',
    config: {},
  } as unknown as AxiosResponse<ArrayBuffer>);
}

describe('SourceHttpClient', () => {
  let get: jest.Mock;
  let client: SourceHttpClient;

  beforeEach(() => {
    get = jest.fn();
    const outbound = {
      assertUrl: (url: string) =>
        assertOutboundUrlAllowed(url, { lookup: fakeLookup, allowlist: [] }),
    } as unknown as OutboundGuard;
    client = new SourceHttpClient({ get } as unknown as HttpService, outbound, {
      ...DEFAULT_SOURCE_HTTP_OPTIONS,
      retryDelayMs: 0,
      requestPauseMs: 0,
    });
  });

  it('returns the body as text without following redirects in axios', async () => {
    get.mockReturnValue(response(200, '<p>ok</p>'));

    const text = await client.forHosts(HOSTS).getText('https://www.example.org/a.html');

    expect(text).toBe('<p>ok</p>');
    expect(get).toHaveBeenCalledWith(
      'https://www.example.org/a.html',
      expect.objectContaining({
        maxRedirects: 0,
        timeout: 20_000,
        maxContentLength: 5 * 1024 * 1024,
        responseType: 'arraybuffer',
        headers: { 'User-Agent': DEFAULT_SOURCE_HTTP_OPTIONS.userAgent },
      }),
    );
  });

  it('returns binary bodies as buffers', async () => {
    get.mockReturnValue(response(200, 'JPEG'));

    const buffer = await client.forHosts(HOSTS).getBuffer('https://example.org/img.jpg');

    expect(buffer.equals(Buffer.from('JPEG'))).toBe(true);
  });

  it('follows an allowed redirect and checks every hop', async () => {
    get
      .mockReturnValueOnce(response(301, '', { location: '/b.html' }))
      .mockReturnValueOnce(response(200, 'final'));

    const text = await client.forHosts(HOSTS).getText('https://www.example.org/a.html');

    expect(text).toBe('final');
    expect(get).toHaveBeenLastCalledWith('https://www.example.org/b.html', expect.anything());
  });

  it('rejects a host outside the allowlist without a request', async () => {
    await expect(client.fetch('https://evil.example.com/', HOSTS)).rejects.toBeInstanceOf(
      SourceRequestRejectedError,
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('rejects a private IP literal even when it is allowlisted', async () => {
    await expect(client.fetch('http://127.0.0.1/', ['127.0.0.1'])).rejects.toBeInstanceOf(
      BlockedOutboundUrlError,
    );
    expect(get).not.toHaveBeenCalled();
  });

  it('rejects a redirect to a host that resolves into the private network', async () => {
    get.mockReturnValueOnce(response(302, '', { location: 'http://internal.example.org/admin' }));

    await expect(
      client.fetch('https://www.example.org/a.html', [...HOSTS, 'internal.example.org']),
    ).rejects.toBeInstanceOf(BlockedOutboundUrlError);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('rejects a redirect to a host outside the allowlist', async () => {
    get.mockReturnValueOnce(response(302, '', { location: 'https://other.example.net/' }));

    await expect(client.fetch('https://www.example.org/', HOSTS)).rejects.toBeInstanceOf(
      SourceRequestRejectedError,
    );
  });

  it('gives up after too many redirects', async () => {
    get.mockReturnValue(response(302, '', { location: '/loop' }));

    await expect(client.fetch('https://www.example.org/loop', HOSTS)).rejects.toThrow(
      'More than 5 redirects',
    );
    expect(get).toHaveBeenCalledTimes(6);
  });

  it('rejects malformed URLs', async () => {
    await expect(client.fetch('not a url', HOSTS)).rejects.toBeInstanceOf(
      SourceRequestRejectedError,
    );
  });

  it('retries a 5xx and succeeds', async () => {
    get.mockReturnValueOnce(response(503)).mockReturnValueOnce(response(200, 'ok'));

    await expect(client.forHosts(HOSTS).getText('https://www.example.org/')).resolves.toBe('ok');
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('stops after the retry budget for persistent 5xx', async () => {
    get.mockReturnValue(response(500));

    await expect(client.fetch('https://www.example.org/', HOSTS)).rejects.toBeInstanceOf(
      SourceHttpError,
    );
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('does not retry a 404', async () => {
    get.mockReturnValue(response(404));

    await expect(client.fetch('https://www.example.org/', HOSTS)).rejects.toThrow('HTTP 404');
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('retries network errors but not an exceeded size limit', async () => {
    get
      .mockReturnValueOnce(throwError(() => new AxiosError('socket hang up', 'ECONNRESET')))
      .mockReturnValueOnce(response(200, 'ok'));
    await expect(client.fetch('https://www.example.org/', HOSTS)).resolves.toBeInstanceOf(Buffer);

    get.mockReset();
    get.mockReturnValue(
      throwError(() => new AxiosError('maxContentLength exceeded', 'ERR_BAD_RESPONSE')),
    );
    await expect(client.fetch('https://www.example.org/', HOSTS)).rejects.toThrow(
      'maxContentLength',
    );
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('waits between requests', async () => {
    const paced = new SourceHttpClient(
      { get } as unknown as HttpService,
      { assertUrl: jest.fn().mockResolvedValue(undefined) } as unknown as OutboundGuard,
      { ...DEFAULT_SOURCE_HTTP_OPTIONS, requestPauseMs: 40 },
    );
    get.mockReturnValue(response(200, 'ok'));

    const started = Date.now();
    await paced.fetch('https://www.example.org/1', HOSTS);
    await paced.fetch('https://www.example.org/2', HOSTS);

    expect(Date.now() - started).toBeGreaterThanOrEqual(35);
  });
});
