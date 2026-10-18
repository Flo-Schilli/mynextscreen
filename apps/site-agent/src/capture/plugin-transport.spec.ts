import { createServer, type Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MAX_RESPONSE_BYTES,
  NOT_A_SOCKET,
  PluginUnreachableError,
  UnixSocketTransport,
} from './plugin-transport';

describe('UnixSocketTransport', () => {
  let dir: string;
  let socket: string;
  let server: Server | null = null;

  const listen = (handler: Parameters<typeof createServer>[1]): Promise<void> =>
    new Promise((resolve) => {
      server = createServer(handler);
      server.listen(socket, resolve);
    });

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mns-sock-'));
    socket = join(dir, 'plugin.sock');
  });

  afterEach(async () => {
    server?.closeAllConnections();
    await new Promise((resolve) => (server ? server.close(resolve) : resolve(undefined)));
    server = null;
    await rm(dir, { recursive: true, force: true });
  });

  it('gets JSON over the socket', async () => {
    await listen((req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ path: req.url, method: req.method }));
    });

    const response = await new UnixSocketTransport(socket).send('GET', '/v1/status');

    expect(response).toEqual({ status: 200, body: { path: '/v1/status', method: 'GET' } });
  });

  it('puts a JSON body with the right headers', async () => {
    let seen: { type?: string; body: string } = { body: '' };
    await listen((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        seen = { type: req.headers['content-type'], body: Buffer.concat(chunks).toString() };
        res.statusCode = 409;
        res.end(JSON.stringify({ error: { code: 'license_required', message: 'x' } }));
      });
    });

    const response = await new UnixSocketTransport(socket).send('PUT', '/v1/streams/x', { a: 1 });

    expect(seen).toEqual({ type: 'application/json', body: '{"a":1}' });
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: { code: 'license_required', message: 'x' } });
  });

  it('returns an undefined body for 204 and for non-JSON', async () => {
    await listen((req, res) => {
      if (req.method === 'DELETE') {
        res.statusCode = 204;
        res.end();
        return;
      }
      res.end('<html>');
    });
    const transport = new UnixSocketTransport(socket);

    expect(await transport.send('DELETE', '/v1/streams/x')).toEqual({
      status: 204,
      body: undefined,
    });
    expect(await transport.send('GET', '/v1/status')).toEqual({ status: 200, body: undefined });
  });

  it('rejects as unreachable, with the errno code, when the socket does not exist', async () => {
    const failure = await new UnixSocketTransport(socket)
      .send('GET', '/v1/status')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PluginUnreachableError);
    expect(failure).toMatchObject({ code: 'ENOENT' });
  });

  it('refuses a path that exists but is not a socket, naming it', async () => {
    await writeFile(socket, 'not a socket');

    const failure = await new UnixSocketTransport(socket)
      .send('GET', '/v1/status')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PluginUnreachableError);
    expect(failure).toMatchObject({ code: NOT_A_SOCKET });
    expect((failure as Error).message).toContain('not a unix socket');
  });

  it('rejects as unreachable when the plugin does not answer in time', async () => {
    await listen(() => undefined);

    const failure = await new UnixSocketTransport(socket, 50)
      .send('GET', '/v1/status')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PluginUnreachableError);
    expect((failure as Error).message).toMatch(/timed out/);
  });

  it('rejects an oversized answer', async () => {
    await listen((_req, res) => {
      res.end(Buffer.alloc(MAX_RESPONSE_BYTES + 1, 0x61));
    });

    const failure = await new UnixSocketTransport(socket)
      .send('GET', '/v1/license/text')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PluginUnreachableError);
  });
});
