import { BadRequestException } from '@nestjs/common';
import { SetupService } from './setup.service';
import { ConnectionStore } from '../connection/connection.store';
import { AgentConfigStore } from '../config/agent-config.store';
import { ServerClient, ServerUnreachableError } from '../connection/server-client.service';
import type { AgentConfigMessage } from '../protocol/server-protocol';

describe('SetupService', () => {
  let service: SetupService;
  let connections: { load: jest.Mock; clear: jest.Mock; isServerUrlPinned: boolean };
  let configs: { current: jest.Mock; clear: jest.Mock };
  let client: { enrol: jest.Mock; invalidateAccessToken: jest.Mock; requestReset: jest.Mock };

  const connection = {
    serverUrl: 'https://signage.example.com',
    agentId: 'agent-1',
    organisationId: 'org-1',
    refreshToken: 'refresh-1',
  };

  beforeEach(() => {
    connections = {
      load: jest.fn().mockResolvedValue(null),
      clear: jest.fn(),
      isServerUrlPinned: false,
    };
    configs = { current: jest.fn().mockReturnValue(null), clear: jest.fn() };
    client = {
      enrol: jest.fn(),
      invalidateAccessToken: jest.fn(),
      requestReset: jest.fn().mockResolvedValue(undefined),
    };

    service = build(null);
  });

  function build(pinned: string | null): SetupService {
    return new SetupService(
      connections as unknown as ConnectionStore,
      configs as unknown as AgentConfigStore,
      client as unknown as ServerClient,
      '1.2.3',
      pinned,
    );
  }

  describe('a pinned server address', () => {
    const pinned = 'https://pinned.example.com';

    it('is reported so the setup page can show the field read-only', async () => {
      connections.isServerUrlPinned = true;

      expect((await build(pinned).status()).serverUrlPinned).toBe(true);
    });

    it('is shown before enrolment, so the page is not blank', async () => {
      connections.isServerUrlPinned = true;

      expect((await build(pinned).status()).serverUrl).toBe(pinned);
    });

    // Letting the form enrol elsewhere would reopen exactly the hole the pin
    // closes: the agent would hand a fresh session to whoever asked.
    it('is used instead of whatever the form posted', async () => {
      client.enrol.mockResolvedValue(connection);

      await build(pinned).enrol('https://attacker.example.com', 'token');

      expect(client.enrol).toHaveBeenCalledWith(pinned, 'token');
    });

    it('leaves the posted address alone when nothing is pinned', async () => {
      client.enrol.mockResolvedValue(connection);

      await build(null).enrol('https://signage.example.com', 'token');

      expect(client.enrol).toHaveBeenCalledWith('https://signage.example.com', 'token');
    });
  });

  describe('status', () => {
    it('reports not connected before enrolment', async () => {
      expect(await service.status()).toMatchObject({
        connected: false,
        serverUrl: null,
        screenCount: 0,
        agentVersion: '1.2.3',
      });
    });

    it('reports the server and screen count once connected', async () => {
      connections.load.mockResolvedValue(connection);
      configs.current.mockReturnValue({
        screens: [{ screenId: 'a' }, { screenId: 'b' }],
      } as AgentConfigMessage);

      expect(await service.status()).toMatchObject({
        connected: true,
        serverUrl: 'https://signage.example.com',
        agentId: 'agent-1',
        screenCount: 2,
      });
    });

    // The status endpoint is reachable without the PIN, so anything it returns
    // is effectively public on the venue LAN.
    it('returns no secret of any kind', async () => {
      connections.load.mockResolvedValue(connection);
      configs.current.mockReturnValue({
        screens: [{ screenId: 'a', devmodePassphrase: 'AEBC72', localIp: '192.168.1.50' }],
      } as unknown as AgentConfigMessage);

      const serialised = JSON.stringify(await service.status());

      expect(serialised).not.toContain('refresh-1');
      expect(serialised).not.toContain('AEBC72');
      expect(serialised).not.toContain('192.168.1.50');
    });

    it('reports when the config was last pulled', async () => {
      const at = new Date('2026-10-01T10:00:00.000Z');

      service.recordConfigPull(at);

      expect((await service.status()).lastConfigPullAt).toBe(at.toISOString());
    });
  });

  describe('enrol', () => {
    it('returns the new status on success', async () => {
      client.enrol.mockImplementation(async () => {
        connections.load.mockResolvedValue(connection);
        return connection;
      });

      expect(await service.enrol('https://signage.example.com', 'token')).toMatchObject({
        connected: true,
      });
    });

    it('tells enrolment listeners once the agent is enrolled', async () => {
      client.enrol.mockResolvedValue(connection);
      const listener = jest.fn();
      service.onEnrolled(listener);

      await service.enrol('https://signage.example.com', 'token');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not tell enrolment listeners when enrolment fails', async () => {
      client.enrol.mockRejectedValue(new Error('/api/agents/enrol returned 410'));
      const listener = jest.fn();
      service.onEnrolled(listener);

      await expect(service.enrol('https://signage.example.com', 'token')).rejects.toThrow();

      expect(listener).not.toHaveBeenCalled();
    });

    // The operator is standing at the machine with the token in hand; a generic
    // failure would send them looking in the wrong place.
    it.each([
      ['410', /already been used/],
      ['401', /not valid or has expired/],
    ])('turns a %s into an actionable message', async (status, expected) => {
      client.enrol.mockRejectedValue(new Error(`/api/agents/enrol returned ${status}`));

      await expect(service.enrol('https://x.example.com', 'token')).rejects.toThrow(expected);
    });

    it('says so when the address itself is wrong', async () => {
      client.enrol.mockRejectedValue(new ServerUnreachableError(new Error('ENOTFOUND')));

      await expect(service.enrol('https://typo.example.com', 'token')).rejects.toThrow(
        /could not be reached/,
      );
    });

    it('reports failures as a bad request, not a server error', async () => {
      client.enrol.mockRejectedValue(new Error('boom'));

      await expect(service.enrol('https://x.example.com', 't')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    // Nothing pinned and the form left the address blank: there is nowhere to
    // send the token, so the operator must be told before anything leaves.
    it('refuses to enrol when no address is pinned or supplied', async () => {
      await expect(build(null).enrol(undefined, 'token')).rejects.toThrow(
        /address of the myNextScreen server/,
      );
      expect(client.enrol).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('confirms the reset with the server before touching local state', async () => {
      connections.load.mockResolvedValue(connection);

      await service.reset('fresh-code');

      expect(client.requestReset).toHaveBeenCalledWith('fresh-code');
    });

    it('forgets the session, the cached config and the access token', async () => {
      connections.load.mockResolvedValue(connection);

      await service.reset('fresh-code');

      expect(connections.clear).toHaveBeenCalled();
      expect(configs.clear).toHaveBeenCalled();
      expect(client.invalidateAccessToken).toHaveBeenCalled();
    });

    // If the server refuses the code, the local session must survive: a reset
    // that fails halfway would strand the agent exactly as an unauthorised one
    // would.
    it('keeps the local session when the server rejects the code', async () => {
      connections.load.mockResolvedValue(connection);
      client.requestReset.mockRejectedValue(new Error('/api/agents/me/reset returned 401'));

      await expect(service.reset('stale-code')).rejects.toThrow(BadRequestException);
      expect(connections.clear).not.toHaveBeenCalled();
      expect(configs.clear).not.toHaveBeenCalled();
    });

    it.each([
      ['410', /already been used/],
      ['401', /not valid or has expired/],
      ['403', /not valid or has expired/],
    ])('turns a %s from the server into an actionable message', async (status, expected) => {
      connections.load.mockResolvedValue(connection);
      client.requestReset.mockRejectedValue(new Error(`/api/agents/me/reset returned ${status}`));

      await expect(service.reset('code')).rejects.toThrow(expected);
    });

    it('says the server was unreachable when the reset could not be confirmed', async () => {
      connections.load.mockResolvedValue(connection);
      client.requestReset.mockRejectedValue(new ServerUnreachableError(new Error('ECONNREFUSED')));

      await expect(service.reset('fresh-code')).rejects.toThrow(/could not be reached/);
      expect(connections.clear).not.toHaveBeenCalled();
    });

    it('surfaces an unexpected failure verbatim rather than swallowing it', async () => {
      connections.load.mockResolvedValue(connection);
      client.requestReset.mockRejectedValue(new Error('disk on fire'));

      await expect(service.reset('fresh-code')).rejects.toThrow(/Reset failed: disk on fire/);
    });

    it('clears the last pull time so the page does not look fresh', async () => {
      service.recordConfigPull(new Date());
      connections.load.mockResolvedValue(null);

      expect((await service.reset('fresh-code')).lastConfigPullAt).toBeNull();
    });
  });
});
