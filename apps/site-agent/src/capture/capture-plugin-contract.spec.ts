import type { AgentNdiStreamConfig } from '../protocol/server-protocol';
import { PluginClient, toPluginConfig } from './plugin-client';
import type { PluginResponse, PluginTransport } from './plugin-transport';
import {
  statusFixture,
  STREAM_ID,
  streamConfigFixture,
  streamListFixture,
  streamStatusFixture,
} from './testing/plugin-fixtures';
import {
  assertRequestMatches,
  assertResponseMatches,
  openApiDocument,
} from './testing/openapi-contract';

const agentStream: AgentNdiStreamConfig = {
  streamId: STREAM_ID,
  ...streamConfigFixture({ ndiSourceName: 'CAMERA (Cam 1)', encoderPref: 'hardware' }),
  ptz: { protocol: 'visca_udp', port: 52381 },
};

/** Answers like the plugin and records what the client asked for. */
class RecordingTransport implements PluginTransport {
  readonly requests: { method: string; path: string; body?: unknown }[] = [];

  async send(method: string, path: string, body?: unknown): Promise<PluginResponse> {
    this.requests.push({ method, path, body });
    if (path === '/v1/status') return { status: 200, body: statusFixture() };
    if (path === '/v1/streams' && method === 'GET') {
      return { status: 200, body: streamListFixture() };
    }
    if (method === 'PUT') return { status: 200, body: streamStatusFixture() };
    return { status: 204, body: undefined };
  }
}

describe('capture plugin contract (vendored openapi.json)', () => {
  it('is the plugin contract this client was written for', () => {
    expect((openApiDocument as unknown as { info: { version: string } }).info.version).toBe(
      '1.0.0',
    );
  });

  describe('fixtures', () => {
    it.each([
      ['GET', '/v1/status', 200, statusFixture()],
      ['GET', '/v1/status', 200, statusFixture({ state: 'license_required', acceptance: null })],
      [
        'GET',
        '/v1/status',
        200,
        statusFixture({ state: 'error', errorCode: 'runtime_missing', license: null }),
      ],
      ['GET', '/v1/streams', 200, streamListFixture()],
      ['GET', '/v1/streams', 200, streamListFixture([])],
      [
        'GET',
        '/v1/streams',
        200,
        streamListFixture([streamStatusFixture({ state: 'error', error: 'no_frames', fps: null })]),
      ],
      ['PUT', `/v1/streams/${STREAM_ID}`, 200, streamStatusFixture()],
      [
        'PUT',
        `/v1/streams/${STREAM_ID}`,
        409,
        { error: { code: 'license_required', message: 'x' } },
      ],
      ['DELETE', `/v1/streams/${STREAM_ID}`, 204, undefined],
    ])('%s %s %i matches the documented schema', (method, path, status, body) => {
      expect(() => assertResponseMatches(method, path, status, body)).not.toThrow();
    });

    it('rejects a body the schema does not allow', () => {
      expect(() =>
        assertResponseMatches('GET', '/v1/status', 200, { ...statusFixture(), extra: true }),
      ).toThrow(/violates PluginStatus/);
      expect(() => assertResponseMatches('GET', '/v1/status', 201, statusFixture())).toThrow(
        /not documented/,
      );
    });
  });

  describe('requests the client sends', () => {
    it('sends only documented fields for a stream, without id and ptz', async () => {
      const transport = new RecordingTransport();

      await new PluginClient(transport, { enabled: true }).putStream(STREAM_ID, agentStream);

      const [request] = transport.requests;
      expect(request).toMatchObject({ method: 'PUT', path: `/v1/streams/${STREAM_ID}` });
      expect(() => assertRequestMatches('PUT', request.path, request.body)).not.toThrow();
      expect(request.body).not.toHaveProperty('ptz');
      expect(request.body).not.toHaveProperty('streamId');
    });

    it('would catch a leaked field', () => {
      expect(() =>
        assertRequestMatches('PUT', `/v1/streams/${STREAM_ID}`, {
          ...toPluginConfig(agentStream),
          ptz: null,
        }),
      ).toThrow(/violates StreamConfig/);
    });

    it('polls and deletes only documented routes', async () => {
      const transport = new RecordingTransport();
      const client = new PluginClient(transport, { enabled: true });

      await client.poll();
      await client.deleteStream(STREAM_ID);

      const sent = [...transport.requests];
      for (const { method, path } of sent) {
        const answer = await transport.send(method, path);
        expect(() => assertResponseMatches(method, path, answer.status, answer.body)).not.toThrow();
      }
      expect(sent.map((r) => `${r.method} ${r.path}`)).toEqual([
        'GET /v1/status',
        'GET /v1/streams',
        `DELETE /v1/streams/${STREAM_ID}`,
      ]);
    });
  });
});
