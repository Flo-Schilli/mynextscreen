import { Logger } from '@nestjs/common';
import {
  ServerClient,
  ServerUnreachableError,
  SessionRejectedError,
} from './server-client.service';
import { ConnectionStore } from './connection.store';

const STREAM = '6f1c2a52-7d3e-4c1a-9f0e-2b8d5a1c9e11';

describe('ServerClient', () => {
  let client: ServerClient;
  let connections: jest.Mocked<Pick<ConnectionStore, 'load' | 'save' | 'updateRefreshToken'>>;
  let fetchMock: jest.Mock;

  const connection = {
    serverUrl: 'https://signage.example.com',
    agentId: 'agent-1',
    organisationId: 'org-1',
    refreshToken: 'refresh-1',
  };

  function respond(status: number, body: unknown = {}): Response {
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    } as Response;
  }

  beforeEach(() => {
    connections = {
      load: jest.fn().mockResolvedValue(connection),
      save: jest.fn().mockResolvedValue(undefined),
      updateRefreshToken: jest.fn().mockResolvedValue(undefined),
    };
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    client = new ServerClient(connections as unknown as ConnectionStore);
  });

  function urlOf(call: number): string {
    return fetchMock.mock.calls[call][0] as string;
  }

  function initOf(call: number): RequestInit {
    return fetchMock.mock.calls[call][1] as RequestInit;
  }

  describe('fetchAppPackage', () => {
    /** The first call is the token refresh; the package comes on the second. */
    function withToken(packageResponse: unknown): void {
      fetchMock
        .mockResolvedValueOnce(
          respond(200, { accessToken: 'token-1', refreshToken: 'refresh-2', expiresIn: 900 }),
        )
        .mockResolvedValueOnce(packageResponse as Response);
    }

    it('returns the bytes the server sent', async () => {
      withToken({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode('ipk-bytes').buffer,
      });

      const pkg = await client.fetchAppPackage();

      expect(pkg.toString()).toBe('ipk-bytes');
    });

    // Silence here would have the agent upload an empty file to a TV.
    it('fails loudly when the server has no package', async () => {
      withToken({ ok: false, status: 404 });

      await expect(client.fetchAppPackage()).rejects.toThrow('404');
    });
  });

  describe('enrol', () => {
    it('persists the session it was handed', async () => {
      fetchMock.mockResolvedValue(
        respond(200, {
          agentId: 'agent-1',
          organisationId: 'org-1',
          accessToken: 'access-1',
          refreshToken: 'refresh-1',
          expiresIn: 900,
        }),
      );

      await client.enrol('https://signage.example.com/', 'token');

      expect(connections.save).toHaveBeenCalledWith(connection);
    });

    it('reports an already-used token distinctly', async () => {
      fetchMock.mockResolvedValue(respond(410));

      await expect(client.enrol('https://signage.example.com', 'token')).rejects.toThrow(
        SessionRejectedError,
      );
    });
  });

  describe('refresh handling', () => {
    it('refreshes before the first authenticated call', async () => {
      fetchMock
        .mockResolvedValueOnce(
          respond(200, { accessToken: 'access-1', refreshToken: 'r2', expiresIn: 900 }),
        )
        .mockResolvedValueOnce(respond(200, { screens: [] }));

      await client.fetchConfig();

      expect(urlOf(0)).toContain('/api/agents/session/refresh');
      expect(urlOf(1)).toContain('/api/agents/me/config');
      expect(connections.updateRefreshToken).toHaveBeenCalledWith('r2');
    });

    it('retries once after a 401 and then gives up', async () => {
      fetchMock
        .mockResolvedValueOnce(
          respond(200, { accessToken: 'a1', refreshToken: 'r2', expiresIn: 900 }),
        )
        .mockResolvedValueOnce(respond(401))
        .mockResolvedValueOnce(
          respond(200, { accessToken: 'a2', refreshToken: 'r3', expiresIn: 900 }),
        )
        .mockResolvedValueOnce(respond(401));

      await expect(client.fetchConfig()).rejects.toThrow(SessionRejectedError);
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    // The agent has several independent consumers that all hit 401 at the same
    // moment. Without single-flight, each would present the same refresh token
    // and all but one would look like a replay.
    it('rotates once when several callers refresh at the same moment', async () => {
      let resolveRefresh: (value: Response) => void = () => undefined;
      const pending = new Promise<Response>((resolve) => {
        resolveRefresh = resolve;
      });
      fetchMock.mockReturnValueOnce(pending).mockResolvedValue(respond(200, { screens: [] }));

      const calls = Promise.all([client.fetchConfig(), client.fetchConfig(), client.fetchConfig()]);
      resolveRefresh(respond(200, { accessToken: 'a1', refreshToken: 'r2', expiresIn: 900 }));
      await calls;

      const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/session/refresh'),
      );
      expect(refreshCalls).toHaveLength(1);
      expect(connections.updateRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('sends the access token as a bearer credential', async () => {
      fetchMock
        .mockResolvedValueOnce(
          respond(200, { accessToken: 'a1', refreshToken: 'r2', expiresIn: 900 }),
        )
        .mockResolvedValueOnce(respond(200, { screens: [] }));

      await client.fetchConfig();

      expect((initOf(1).headers as Record<string, string>).Authorization).toBe('Bearer a1');
    });
  });

  describe('failure modes', () => {
    // These two must never be conflated: a rejected session means re-enrol, an
    // unreachable server means carry on from the cache. Treating a flaky uplink
    // as a revoked agent would strand the venue.
    it('distinguishes an unreachable server from a rejected session', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(client.fetchConfig()).rejects.toThrow(ServerUnreachableError);
    });

    it('treats 403 as a rejected session', async () => {
      fetchMock
        .mockResolvedValueOnce(
          respond(200, { accessToken: 'a1', refreshToken: 'r2', expiresIn: 900 }),
        )
        .mockResolvedValueOnce(respond(403));

      await expect(client.fetchConfig()).rejects.toThrow(SessionRejectedError);
    });

    it('treats a 500 as an ordinary error, not a session problem', async () => {
      fetchMock
        .mockResolvedValueOnce(
          respond(200, { accessToken: 'a1', refreshToken: 'r2', expiresIn: 900 }),
        )
        .mockResolvedValueOnce(respond(500));

      await expect(client.fetchConfig()).rejects.not.toBeInstanceOf(SessionRejectedError);
    });

    it('reports "not enrolled" as a rejected session', async () => {
      connections.load.mockResolvedValue(null);

      await expect(client.fetchConfig()).rejects.toThrow(SessionRejectedError);
    });
  });

  describe('payloads', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValueOnce(
        respond(200, { accessToken: 'a1', refreshToken: 'r2', expiresIn: 900 }),
      );
    });

    it('sends the version on a heartbeat', async () => {
      fetchMock.mockResolvedValueOnce(respond(204));

      await client.sendHeartbeat('1.2.3');

      expect(JSON.parse(initOf(1).body as string)).toEqual({ agentVersion: '1.2.3' });
    });

    it('pushes the network attachment on the heartbeat when provided', async () => {
      fetchMock.mockResolvedValueOnce(respond(204));
      const network = {
        interfaceName: 'wlan0',
        kind: 'wifi' as const,
        ssid: 'VenueNet',
        ipAddress: '10.0.0.23',
      };

      await client.sendHeartbeat('1.2.3', undefined, network);

      expect(JSON.parse(initOf(1).body as string)).toEqual({ agentVersion: '1.2.3', network });
    });

    // A new agent may reach a server that has not been updated yet; its
    // validation rejects the unknown field, and the agent must still check in.
    it('retries without the network field when an older server rejects it', async () => {
      fetchMock.mockResolvedValueOnce(respond(400)).mockResolvedValueOnce(respond(204));
      const network = {
        interfaceName: 'eth0',
        kind: 'ethernet' as const,
        ssid: null,
        ipAddress: '192.168.1.5',
      };

      await client.sendHeartbeat('1.2.3', undefined, network);

      expect(JSON.parse(initOf(1).body as string)).toEqual({ agentVersion: '1.2.3', network });
      expect(JSON.parse(initOf(2).body as string)).toEqual({ agentVersion: '1.2.3' });
    });

    it('does not retry on other failures', async () => {
      fetchMock.mockResolvedValueOnce(respond(500));
      const network = {
        interfaceName: 'eth0',
        kind: 'ethernet' as const,
        ssid: null,
        ipAddress: '192.168.1.5',
      };

      await expect(client.sendHeartbeat('1.2.3', undefined, network)).rejects.toThrow(/500/);
      // The token refresh plus the one heartbeat, no second attempt.
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('still checks in when it has no version to report', async () => {
      fetchMock.mockResolvedValueOnce(respond(204));

      await client.sendHeartbeat(null);

      expect(JSON.parse(initOf(1).body as string)).toEqual({});
    });

    it('pushes metrics on the heartbeat when provided', async () => {
      fetchMock.mockResolvedValueOnce(respond(204));

      await client.sendHeartbeat('1.2.3', {
        uptimeSeconds: 10,
        memoryRssBytes: 1000,
        connected: true,
        lastConfigPullAtMs: 0,
        screenCount: 1,
        screens: [
          {
            screenId: 's1',
            reachable: true,
            failures: 0,
            devmodeActive: false,
            devmodeExtensions: 0,
            launches: 2,
            wakes: 1,
          },
        ],
      });

      const body = JSON.parse(initOf(1).body as string);
      expect(body.agentVersion).toBe('1.2.3');
      expect(body.metrics.screenCount).toBe(1);
      expect(body.metrics.screens[0].launches).toBe(2);
    });

    it('posts reports as a batch', async () => {
      fetchMock.mockResolvedValueOnce(respond(204));

      await client.sendReports({ screens: [{ screenId: 's1', reachability: 'reachable' }] });

      expect(urlOf(1)).toContain('/api/agents/me/reports');
      expect(JSON.parse(initOf(1).body as string).screens).toHaveLength(1);
    });

    describe('NDI status in reports', () => {
      const ndiStreams = [
        {
          streamId: STREAM,
          state: 'streaming' as const,
          sourceName: 'CAM',
          encoder: 'libx264',
          fps: 30,
          framesDropped: 0,
          uploadLagMs: 120,
          error: null,
        },
      ];
      const screens = [{ screenId: 's1', reachability: 'reachable' as const }];

      it('sends the status along with the screens', async () => {
        fetchMock.mockResolvedValueOnce(respond(204));

        await client.sendReports({ screens, ndiStreams });

        expect(JSON.parse(initOf(1).body as string)).toEqual({ screens, ndiStreams });
      });

      it('retries without the status when an older server rejects it', async () => {
        fetchMock.mockResolvedValueOnce(respond(400)).mockResolvedValueOnce(respond(204));

        await client.sendReports({ screens, ndiStreams });

        expect(JSON.parse(initOf(2).body as string)).toEqual({ screens });
      });

      it('warns once per streak of fallbacks and again after a success', async () => {
        const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        fetchMock
          .mockResolvedValueOnce(respond(400)) // 1st report falls back ...
          .mockResolvedValueOnce(respond(204)) // ... and is retried without status
          .mockResolvedValueOnce(respond(204)) // 2nd report accepted: streak over
          .mockResolvedValueOnce(respond(400)) // 3rd report falls back again
          .mockResolvedValueOnce(respond(204))
          .mockResolvedValueOnce(respond(400)) // 4th report: same streak, no new warning
          .mockResolvedValueOnce(respond(204));

        for (let i = 0; i < 4; i += 1) {
          await client.sendReports({ screens, ndiStreams });
        }

        const fallbackWarnings = warn.mock.calls.filter(([message]) =>
          String(message).includes('NDI status'),
        );
        expect(fallbackWarnings).toHaveLength(2);
        warn.mockRestore();
      });

      it('drops a status-only report an older server rejects', async () => {
        fetchMock.mockResolvedValueOnce(respond(400));

        await client.sendReports({ screens: [], ndiStreams });

        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it('sends the capture plugin block and retries without it on an older server', async () => {
        const capturePlugin = { state: 'ready' as const, pluginVersion: '0.1.0', apiVersion: '1' };
        fetchMock
          .mockResolvedValueOnce(respond(204))
          .mockResolvedValueOnce(respond(400))
          .mockResolvedValueOnce(respond(204));

        await client.sendReports({ screens, capturePlugin });
        await client.sendReports({ screens, capturePlugin });

        expect(JSON.parse(initOf(1).body as string)).toEqual({ screens, capturePlugin });
        expect(JSON.parse(initOf(3).body as string)).toEqual({ screens });
      });

      it('does not retry on other failures', async () => {
        fetchMock.mockResolvedValueOnce(respond(500));

        await expect(client.sendReports({ screens, ndiStreams })).rejects.toThrow(/500/);
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });
    });

    describe('HLS files', () => {
      it('PUTs a segment as bytes with its content type and the agent token', async () => {
        fetchMock.mockResolvedValueOnce(respond(204));

        await client.putHlsFile(STREAM, 'seg_00001.ts', Buffer.from([1, 2, 3]), 'video/mp2t');

        expect(urlOf(1)).toBe(
          `https://signage.example.com/api/agents/me/live-streams/${STREAM}/hls/seg_00001.ts`,
        );
        const init = initOf(1);
        expect(init.method).toBe('PUT');
        expect(init.headers).toEqual({ Authorization: 'Bearer a1', 'Content-Type': 'video/mp2t' });
        expect([...(init.body as Uint8Array)]).toEqual([1, 2, 3]);
      });

      it('DELETEs a file without a body', async () => {
        fetchMock.mockResolvedValueOnce(respond(204));

        await client.deleteHlsFile(STREAM, 'index.m3u8');

        expect(initOf(1)).toMatchObject({ method: 'DELETE', body: undefined });
      });

      it('refreshes once on a 401 and repeats the upload', async () => {
        fetchMock
          .mockResolvedValueOnce(respond(401))
          .mockResolvedValueOnce(
            respond(200, { accessToken: 'a2', refreshToken: 'r3', expiresIn: 900 }),
          )
          .mockResolvedValueOnce(respond(204));

        await client.putHlsFile(
          STREAM,
          'index.m3u8',
          Buffer.from('x'),
          'application/vnd.apple.mpegurl',
        );

        expect(initOf(3).headers).toMatchObject({ Authorization: 'Bearer a2' });
      });

      it('reports an unreachable server', async () => {
        fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        await expect(
          client.putHlsFile(STREAM, 'seg_00001.ts', Buffer.from('x'), 'video/mp2t'),
        ).rejects.toThrow(ServerUnreachableError);
      });

      it('raises on an unexpected status', async () => {
        fetchMock.mockResolvedValueOnce(respond(413));

        await expect(
          client.putHlsFile(STREAM, 'seg_00001.ts', Buffer.from('x'), 'video/mp2t'),
        ).rejects.toThrow(/413/);
      });

      it.each([
        ['not-a-uuid', 'seg_00001.ts'],
        [STREAM, '../seg.ts'],
        [STREAM, 'seg.mp4'],
        [STREAM, 'a/b.ts'],
      ])('refuses id %p with file %p before any request', async (id, name) => {
        await expect(client.deleteHlsFile(id, name)).rejects.toThrow('Invalid HLS');
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });

    it('builds the events URL from the stored server', async () => {
      expect(await client.eventsUrl()).toBe('https://signage.example.com/api/agents/me/events');
    });

    it('posts the setup code when asking the server to reset', async () => {
      fetchMock.mockResolvedValueOnce(respond(204));

      await client.requestReset('fresh-code');

      expect(urlOf(1)).toContain('/api/agents/me/reset');
      expect(JSON.parse(initOf(1).body as string)).toEqual({ setupCode: 'fresh-code' });
    });

    // A rejected code comes back as 401/410 and must surface, not be swallowed —
    // the agent only clears local state once the server has accepted the reset.
    // The 401 here is the reset answer, not the access-token refresh: the second
    // 401 on an already-retried request is not retried again.
    it('raises when the server rejects the setup code', async () => {
      fetchMock
        .mockResolvedValueOnce(respond(401, { message: 'expired access token' }))
        .mockResolvedValueOnce(
          respond(200, { accessToken: 'a2', refreshToken: 'r3', expiresIn: 900 }),
        )
        .mockResolvedValueOnce(respond(410, { message: 'used' }));

      await expect(client.requestReset('stale-code')).rejects.toThrow(SessionRejectedError);
    });
  });
});
