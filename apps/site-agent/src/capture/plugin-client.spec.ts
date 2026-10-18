import { Logger } from '@nestjs/common';
import type { AgentNdiStreamConfig } from '../protocol/server-protocol';
import { PluginClient, PluginRequestError, toPluginConfig } from './plugin-client';
import {
  PluginUnreachableError,
  type PluginResponse,
  type PluginTransport,
} from './plugin-transport';
import {
  statusFixture,
  STREAM_ID,
  streamConfigFixture,
  streamListFixture,
  streamStatusFixture,
} from './testing/plugin-fixtures';

type Answer = PluginResponse | Error;

/** Routes by `METHOD path`; each entry can be changed between polls. */
class ScriptedTransport implements PluginTransport {
  routes = new Map<string, Answer>();
  readonly calls: string[] = [];
  readonly bodies: unknown[] = [];

  async send(method: string, path: string, body?: unknown): Promise<PluginResponse> {
    const key = `${method} ${path}`;
    this.calls.push(key);
    this.bodies.push(body);
    const answer = this.routes.get(key);
    if (answer === undefined) {
      throw new PluginUnreachableError('connect ENOENT', 'ENOENT');
    }
    if (answer instanceof Error) {
      throw answer;
    }
    return answer;
  }
}

const ok = (body: unknown): PluginResponse => ({ status: 200, body });

const agentStream: AgentNdiStreamConfig = {
  streamId: STREAM_ID,
  ...streamConfigFixture(),
  ptz: { protocol: 'visca_tcp', port: 5678 },
};

describe('PluginClient', () => {
  let transport: ScriptedTransport;
  let client: PluginClient;
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;

  beforeEach(() => {
    transport = new ScriptedTransport();
    client = new PluginClient(transport, { enabled: true });
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    client.onModuleDestroy();
    jest.restoreAllMocks();
  });

  describe('polling', () => {
    it('knows nothing before the first poll', () => {
      expect(client.snapshot()).toMatchObject({ state: 'unknown', status: null, streams: [] });
    });

    it('is absent, silently, when the socket does not exist', async () => {
      await client.poll();
      await client.poll();

      expect(client.snapshot()).toMatchObject({ state: 'absent', status: null, streams: [] });
      expect(warn).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    });

    it('takes the plugin state and lists streams only when ready', async () => {
      transport.routes.set('GET /v1/status', ok(statusFixture()));
      transport.routes.set('GET /v1/streams', ok(streamListFixture()));

      await client.poll();

      expect(client.snapshot().state).toBe('ready');
      expect(client.snapshot().streams).toEqual(streamListFixture().streams);
    });

    it.each(['license_required', 'error', 'incompatible'] as const)(
      'does not ask for streams while the plugin is %s',
      async (state) => {
        transport.routes.set('GET /v1/status', ok(statusFixture({ state })));

        await client.poll();

        expect(client.snapshot()).toMatchObject({ state, streams: [] });
        expect(transport.calls).not.toContain('GET /v1/streams');
      },
    );

    it('is incompatible for another API major version, and says why', async () => {
      transport.routes.set('GET /v1/status', ok(statusFixture({ apiVersion: '2.0' })));

      await client.poll();

      expect(client.snapshot()).toMatchObject({
        state: 'incompatible',
        agentErrorCode: 'unsupported_api_version',
      });
      expect(client.snapshot().status?.apiVersion).toBe('2.0');
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('accepts a minor version of the same major', async () => {
      transport.routes.set(
        'GET /v1/status',
        ok(statusFixture({ apiVersion: '1.4', state: 'license_required' })),
      );

      await client.poll();

      expect(client.snapshot().state).toBe('license_required');
    });

    it('is incompatible for a status that is not the documented shape', async () => {
      transport.routes.set('GET /v1/status', ok({ hello: 'world' }));

      await client.poll();

      expect(client.snapshot()).toMatchObject({ state: 'incompatible', status: null });
    });

    it('is incompatible for a status with an unknown state', async () => {
      transport.routes.set('GET /v1/status', ok({ ...statusFixture(), state: 'on_fire' }));

      await client.poll();

      expect(client.snapshot().state).toBe('incompatible');
    });

    it('is in error when the status call fails with an HTTP error', async () => {
      transport.routes.set('GET /v1/status', { status: 500, body: undefined });

      await client.poll();

      expect(client.snapshot().state).toBe('error');
    });

    it('keeps the known streams when only the stream list fails', async () => {
      transport.routes.set('GET /v1/status', ok(statusFixture()));
      transport.routes.set('GET /v1/streams', ok(streamListFixture()));
      await client.poll();

      transport.routes.set('GET /v1/streams', { status: 500, body: undefined });
      await client.poll();
      expect(client.snapshot().streams).toHaveLength(1);

      transport.routes.set('GET /v1/streams', ok({ nope: true }));
      await client.poll();
      expect(client.snapshot().streams).toHaveLength(1);

      transport.routes.set('GET /v1/streams', new PluginUnreachableError('timeout', null));
      await client.poll();
      expect(client.snapshot().streams).toHaveLength(1);
      expect(client.snapshot().state).toBe('ready');
    });

    it('warns once when a plugin it knew disappears, and logs transitions once', async () => {
      transport.routes.set('GET /v1/status', ok(statusFixture()));
      transport.routes.set('GET /v1/streams', ok(streamListFixture()));
      await client.poll();
      await client.poll();
      expect(log).toHaveBeenCalledTimes(1);

      transport.routes.delete('GET /v1/status');
      await client.poll();
      await client.poll();

      expect(client.snapshot().state).toBe('absent');
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('treats an unexpected non-transport failure as absent, with a warning', async () => {
      transport.routes.set('GET /v1/status', new TypeError('boom'));

      await client.poll();

      expect(client.snapshot().state).toBe('absent');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });

    it('shares one poll between overlapping callers', async () => {
      transport.routes.set('GET /v1/status', ok(statusFixture({ state: 'license_required' })));

      await Promise.all([client.poll(), client.poll()]);

      expect(transport.calls).toEqual(['GET /v1/status']);
    });

    it('calls listeners after each poll, and survives a throwing listener', async () => {
      const listener = jest.fn();
      client.onPoll(() => {
        throw new Error('listener bug');
      });
      client.onPoll(listener);

      await client.poll();
      await client.poll();

      expect(listener).toHaveBeenCalledTimes(2);
    });

    describe('timer', () => {
      beforeEach(() => jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] }));
      afterEach(() => jest.useRealTimers());

      it('polls at start and every 2 s until destroyed', async () => {
        transport.routes.set('GET /v1/status', ok(statusFixture({ state: 'license_required' })));

        client.onModuleInit();
        await jest.advanceTimersByTimeAsync(4_000);
        client.onModuleDestroy();
        const calls = transport.calls.length;
        await jest.advanceTimersByTimeAsync(10_000);

        expect(calls).toBe(3);
        expect(transport.calls).toHaveLength(calls);
      });

      it('does not poll when disabled', async () => {
        const disabled = new PluginClient(transport, { enabled: false });

        disabled.onModuleInit();
        await jest.advanceTimersByTimeAsync(10_000);

        expect(transport.calls).toHaveLength(0);
        expect(disabled.snapshot().state).toBe('unknown');
      });
    });
  });

  describe('putStream', () => {
    it('sends the plugin fields of the stream, never ptz or the id', async () => {
      transport.routes.set(`PUT /v1/streams/${STREAM_ID}`, ok(streamStatusFixture()));

      await client.putStream(STREAM_ID, agentStream);

      expect(transport.calls).toEqual([`PUT /v1/streams/${STREAM_ID}`]);
      expect(transport.bodies).toEqual([streamConfigFixture()]);
      expect(toPluginConfig(agentStream)).not.toHaveProperty('ptz');
    });

    it('throws with the plugin error code on a refusal', async () => {
      transport.routes.set(`PUT /v1/streams/${STREAM_ID}`, {
        status: 409,
        body: { error: { code: 'license_required', message: 'x' } },
      });

      const failure = await client
        .putStream(STREAM_ID, agentStream)
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(PluginRequestError);
      expect(failure).toMatchObject({ status: 409, code: 'license_required' });
    });

    it('names an unparseable refusal "unknown"', async () => {
      transport.routes.set(`PUT /v1/streams/${STREAM_ID}`, { status: 502, body: undefined });

      await expect(client.putStream(STREAM_ID, agentStream)).rejects.toMatchObject({
        status: 502,
        code: 'unknown',
      });
    });

    it('passes a transport failure on', async () => {
      await expect(client.putStream(STREAM_ID, agentStream)).rejects.toBeInstanceOf(
        PluginUnreachableError,
      );
    });
  });

  describe('deleteStream', () => {
    it('accepts 204', async () => {
      transport.routes.set(`DELETE /v1/streams/${STREAM_ID}`, { status: 204, body: undefined });

      await expect(client.deleteStream(STREAM_ID)).resolves.toBeUndefined();
    });

    it('throws on anything else', async () => {
      transport.routes.set(`DELETE /v1/streams/${STREAM_ID}`, { status: 500, body: undefined });

      await expect(client.deleteStream(STREAM_ID)).rejects.toMatchObject({ status: 500 });
    });
  });
});
