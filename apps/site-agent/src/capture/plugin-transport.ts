import { request } from 'node:http';

/** A plugin answer that arrived: any HTTP status, body already parsed. */
export interface PluginResponse {
  status: number;
  body: unknown;
}

/**
 * The one seam between the client and the socket. Specs replace it, so the
 * client's state handling is tested without a socket.
 */
export interface PluginTransport {
  /**
   * Resolves for every HTTP answer, whatever the status. Rejects with
   * {@link PluginUnreachableError} when nothing answered (socket missing,
   * refused, timed out).
   */
  send(method: 'GET' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<PluginResponse>;
}

/** The plugin did not answer: not installed, not started, or hung. */
export class PluginUnreachableError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'PluginUnreachableError';
  }
}

export const REQUEST_TIMEOUT_MS = 5_000;
/** The largest answer is a license text of some tens of KiB; this is a ceiling, not an expectation. */
export const MAX_RESPONSE_BYTES = 1024 * 1024;

/** HTTP/1.1 over a unix socket, with a hard timeout and a response size cap. */
export class UnixSocketTransport implements PluginTransport {
  constructor(
    private readonly socketPath: string,
    private readonly timeoutMs = REQUEST_TIMEOUT_MS,
  ) {}

  send(method: 'GET' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<PluginResponse> {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body), 'utf8');
    return new Promise((resolve, reject) => {
      const req = request(
        {
          socketPath: this.socketPath,
          method,
          path,
          timeout: this.timeoutMs,
          headers: payload
            ? { 'content-type': 'application/json', 'content-length': payload.length }
            : {},
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_RESPONSE_BYTES) {
              req.destroy(new PluginUnreachableError('Plugin response too large', null));
              return;
            }
            chunks.push(chunk);
          });
          res.on('end', () => {
            resolve({ status: res.statusCode ?? 0, body: parseBody(Buffer.concat(chunks)) });
          });
          res.on('error', (error) => reject(toUnreachable(error)));
        },
      );
      req.on('timeout', () => req.destroy(new PluginUnreachableError('Plugin timed out', null)));
      req.on('error', (error) => reject(toUnreachable(error)));
      req.end(payload ?? undefined);
    });
  }
}

function parseBody(raw: Buffer): unknown {
  if (raw.length === 0) {
    return undefined;
  }
  try {
    return JSON.parse(raw.toString('utf8')) as unknown;
  } catch {
    return undefined;
  }
}

function toUnreachable(error: Error): PluginUnreachableError {
  if (error instanceof PluginUnreachableError) {
    return error;
  }
  const code = (error as NodeJS.ErrnoException).code ?? null;
  return new PluginUnreachableError(error.message, code);
}
