import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { isAxiosError, type AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { OutboundGuard } from '../common/outbound-guard.service';
import type { SourceFetcher } from './adapters/content-source-adapter.interface';

export const SOURCE_HTTP_OPTIONS = Symbol('SOURCE_HTTP_OPTIONS');

export interface SourceHttpOptions {
  timeoutMs: number;
  maxContentLengthBytes: number;
  maxRedirects: number;
  /** Extra attempts after a 5xx or network error. */
  maxRetries: number;
  /** Multiplied by the attempt number. */
  retryDelayMs: number;
  /** Minimum gap between two requests, to stay polite to the scraped site. */
  requestPauseMs: number;
  userAgent: string;
}

export const DEFAULT_SOURCE_HTTP_OPTIONS: SourceHttpOptions = {
  timeoutMs: 20_000,
  maxContentLengthBytes: 5 * 1024 * 1024,
  maxRedirects: 5,
  maxRetries: 2,
  retryDelayMs: 1_000,
  requestPauseMs: 300,
  userAgent: 'myNextScreen-content-source/1.0 (+digital signage event slides)',
};

const HTTP_REDIRECT_MIN = 300;
const HTTP_REDIRECT_MAX = 399;
const HTTP_SUCCESS_MIN = 200;
const HTTP_SUCCESS_MAX = 299;
const HTTP_SERVER_ERROR_MIN = 500;

/** Non-2xx answer that is not a followable redirect. */
export class SourceHttpError extends Error {
  constructor(
    public readonly status: number,
    url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
    this.name = 'SourceHttpError';
  }
}

/** Target outside the adapter's host allowlist, or a redirect loop/chain too long. */
export class SourceRequestRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceRequestRejectedError';
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * The only way content sources reach the internet. Every hop, redirects
 * included, must be on the adapter's host allowlist and pass the SSRF guard;
 * axios follows no redirect on its own, so a public page cannot bounce the
 * request into the private network.
 */
@Injectable()
export class SourceHttpClient {
  private readonly logger = new Logger(SourceHttpClient.name);
  private lastRequestAt = 0;

  constructor(
    private readonly http: HttpService,
    private readonly outbound: OutboundGuard,
    @Inject(SOURCE_HTTP_OPTIONS) private readonly options: SourceHttpOptions,
  ) {}

  /** A fetcher bound to one adapter's allowlist. */
  forHosts(allowedHosts: readonly string[]): SourceFetcher {
    const hosts = allowedHosts.map((host) => host.toLowerCase());
    return {
      getText: async (url) => (await this.fetch(url, hosts)).toString('utf8'),
      getBuffer: (url) => this.fetch(url, hosts),
    };
  }

  async fetch(url: string, allowedHosts: readonly string[]): Promise<Buffer> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.fetchOnce(url, allowedHosts);
      } catch (error) {
        if (attempt >= this.options.maxRetries || !isRetryable(error)) {
          throw error;
        }
        this.logger.debug(`Retrying ${url} after: ${(error as Error).message}`);
        await sleep(this.options.retryDelayMs * (attempt + 1));
      }
    }
  }

  private async fetchOnce(url: string, allowedHosts: readonly string[]): Promise<Buffer> {
    let current = url;
    for (let hop = 0; hop <= this.options.maxRedirects; hop += 1) {
      await this.assertAllowed(current, allowedHosts);
      const response = await this.request(current);
      const location = response.headers?.location;
      if (
        response.status >= HTTP_REDIRECT_MIN &&
        response.status <= HTTP_REDIRECT_MAX &&
        typeof location === 'string'
      ) {
        current = new URL(location, current).href;
        continue;
      }
      if (response.status < HTTP_SUCCESS_MIN || response.status > HTTP_SUCCESS_MAX) {
        throw new SourceHttpError(response.status, current);
      }
      return Buffer.from(response.data);
    }
    throw new SourceRequestRejectedError(
      `More than ${this.options.maxRedirects} redirects for ${url}`,
    );
  }

  private async assertAllowed(url: string, allowedHosts: readonly string[]): Promise<void> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new SourceRequestRejectedError(`Invalid URL ${url}`);
    }
    if (!allowedHosts.includes(parsed.hostname.toLowerCase())) {
      throw new SourceRequestRejectedError(`Host ${parsed.hostname} is not allowed`);
    }
    await this.outbound.assertUrl(url);
  }

  private async request(url: string): Promise<AxiosResponse<ArrayBuffer>> {
    await this.pause();
    return firstValueFrom(
      this.http.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        maxRedirects: 0,
        timeout: this.options.timeoutMs,
        maxContentLength: this.options.maxContentLengthBytes,
        validateStatus: () => true,
        headers: { 'User-Agent': this.options.userAgent },
      }),
    );
  }

  private async pause(): Promise<void> {
    const wait = this.lastRequestAt + this.options.requestPauseMs - Date.now();
    if (wait > 0) {
      await sleep(wait);
    }
    this.lastRequestAt = Date.now();
  }
}

/** 5xx and plain network failures are worth a retry; policy rejections and 4xx are not. */
function isRetryable(error: unknown): boolean {
  if (error instanceof SourceHttpError) {
    return error.status >= HTTP_SERVER_ERROR_MIN;
  }
  // ERR_BAD_RESPONSE is axios' code for an exceeded maxContentLength.
  return isAxiosError(error) && !error.response && error.code !== 'ERR_BAD_RESPONSE';
}
