import {
  ServerClient,
  ServerUnreachableError,
  SessionRejectedError,
} from './server-client.service';
import { ConnectionStore } from './connection.store';

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

    it('still checks in when it has no version to report', async () => {
      fetchMock.mockResolvedValueOnce(respond(204));

      await client.sendHeartbeat(null);

      expect(JSON.parse(initOf(1).body as string)).toEqual({});
    });

    it('posts reports as a batch', async () => {
      fetchMock.mockResolvedValueOnce(respond(204));

      await client.sendReports({ screens: [{ screenId: 's1', reachability: 'reachable' }] });

      expect(urlOf(1)).toContain('/api/agents/me/reports');
      expect(JSON.parse(initOf(1).body as string).screens).toHaveLength(1);
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
