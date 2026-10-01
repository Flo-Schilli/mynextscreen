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
  let client: { enrol: jest.Mock; invalidateAccessToken: jest.Mock };

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
    client = { enrol: jest.fn(), invalidateAccessToken: jest.fn() };

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
  });

  describe('reset', () => {
    it('forgets the session, the cached config and the access token', async () => {
      connections.load.mockResolvedValue(connection);

      await service.reset();

      expect(connections.clear).toHaveBeenCalled();
      expect(configs.clear).toHaveBeenCalled();
      expect(client.invalidateAccessToken).toHaveBeenCalled();
    });

    it('clears the last pull time so the page does not look fresh', async () => {
      service.recordConfigPull(new Date());
      connections.load.mockResolvedValue(null);

      expect((await service.reset()).lastConfigPullAt).toBeNull();
    });
  });
});
