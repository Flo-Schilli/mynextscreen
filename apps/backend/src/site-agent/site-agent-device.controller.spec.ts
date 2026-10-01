import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SiteAgentDeviceController } from './site-agent-device.controller';
import { SiteAgentEnrolmentService } from './site-agent-enrolment.service';
import { SiteAgentSessionService } from './site-agent-session.service';
import { SiteAgentService } from './site-agent.service';
import { SiteAgentConfigService } from './site-agent-config.service';
import { SiteAgentSseService } from './site-agent-sse.service';
import { ScreenRemoteCommandService } from './screen-remote-command.service';
import { ScreenReachability } from './screen-reachability.enum';
import { IS_AGENT_AUTH_KEY } from '../auth/agent-auth.decorator';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { ROLES_KEY } from '../auth/roles.decorator';
import { AUDIT_SITE_AGENT_ENROLLED } from '../audit-log/audit.events';
import type { AgentAuthenticatedRequest } from '../auth/agent-auth.guard';

describe('SiteAgentDeviceController', () => {
  let controller: SiteAgentDeviceController;
  let enrolments: Record<string, jest.Mock>;
  let sessions: Record<string, jest.Mock>;
  let siteAgentService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;
  let sse: Record<string, jest.Mock>;
  let commands: Record<string, jest.Mock>;
  let emitter: { emit: jest.Mock };

  const agentId = '660e8400-e29b-41d4-a716-446655440000';
  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const agentReq = { agentId, organisationId: orgId } as AgentAuthenticatedRequest;

  const tokens = {
    accessToken: { token: 'access', jti: 'jti', expiresAt: new Date() },
    refreshToken: 'refresh',
    expiresIn: 900,
  };

  beforeEach(async () => {
    enrolments = { redeem: jest.fn() };
    sessions = { refresh: jest.fn() };
    siteAgentService = { recordHeartbeat: jest.fn() };
    configService = { buildAgentConfig: jest.fn() };
    sse = { subscribe: jest.fn().mockReturnValue('stream') };
    commands = { applyReport: jest.fn() };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteAgentDeviceController],
      providers: [
        { provide: SiteAgentEnrolmentService, useValue: enrolments },
        { provide: SiteAgentSessionService, useValue: sessions },
        { provide: SiteAgentService, useValue: siteAgentService },
        { provide: SiteAgentConfigService, useValue: configService },
        { provide: SiteAgentSseService, useValue: sse },
        { provide: ScreenRemoteCommandService, useValue: commands },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    controller = module.get(SiteAgentDeviceController);
  });

  describe('access declarations', () => {
    const reflector = new Reflector();

    it.each(['enrol', 'refreshSession'])('marks %s public', (method) => {
      const isPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        SiteAgentDeviceController.prototype[method as keyof SiteAgentDeviceController],
      );
      expect(isPublic).toBe(true);
    });

    it.each(['heartbeat', 'config', 'events', 'reports'] as const)(
      'marks %s as agent-authenticated',
      (method) => {
        expect(
          reflector.get<boolean>(IS_AGENT_AUTH_KEY, SiteAgentDeviceController.prototype[method]),
        ).toBe(true);
      },
    );

    // An agent has no membership, so a @Roles() here would make the route
    // permanently unreachable rather than more secure.
    it('declares no roles on any route', () => {
      for (const method of [
        'enrol',
        'refreshSession',
        'heartbeat',
        'config',
        'events',
        'reports',
      ] as const) {
        expect(
          reflector.get<string[]>(ROLES_KEY, SiteAgentDeviceController.prototype[method]),
        ).toBeUndefined();
      }
    });
  });

  describe('enrol', () => {
    it('returns the session plus the identity the agent just learned', async () => {
      enrolments.redeem.mockResolvedValue({ agentId, organisationId: orgId, tokens });

      const result = await controller.enrol({ enrolmentToken: 'raw' });

      expect(result).toEqual({
        agentId,
        organisationId: orgId,
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 900,
      });
    });

    it('audits the enrolment', async () => {
      enrolments.redeem.mockResolvedValue({ agentId, organisationId: orgId, tokens });

      await controller.enrol({ enrolmentToken: 'raw' });

      expect(emitter.emit).toHaveBeenCalledWith(
        AUDIT_SITE_AGENT_ENROLLED,
        expect.objectContaining({ agentId, organisationId: orgId }),
      );
    });

    it('never echoes the enrolment token back', async () => {
      enrolments.redeem.mockResolvedValue({ agentId, organisationId: orgId, tokens });

      const result = await controller.enrol({ enrolmentToken: 'raw' });

      expect(JSON.stringify(result)).not.toContain('raw');
    });
  });

  describe('refreshSession', () => {
    it('returns rotated tokens on success', async () => {
      sessions.refresh.mockResolvedValue({ status: 'ok', agentId, tokens });

      const result = await controller.refreshSession({ refreshToken: 'old' });

      expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh', expiresIn: 900 });
    });

    // The caller must not be able to tell a replay from an unknown token: that
    // difference is exactly what an attacker probing stolen tokens wants.
    it.each(['unknown', 'replayed'])('answers %s with the same 401', async (status) => {
      sessions.refresh.mockResolvedValue({ status, agentId, familyId: 'f' });

      await expect(controller.refreshSession({ refreshToken: 'old' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('gives the same message for both failure modes', async () => {
      sessions.refresh.mockResolvedValueOnce({ status: 'unknown' });
      const unknown = await controller.refreshSession({ refreshToken: 'a' }).catch((e) => e);
      sessions.refresh.mockResolvedValueOnce({ status: 'replayed', agentId, familyId: 'f' });
      const replayed = await controller.refreshSession({ refreshToken: 'b' }).catch((e) => e);

      expect(unknown.message).toBe(replayed.message);
    });
  });

  describe('config', () => {
    it('builds the config for the agent named by the token', async () => {
      configService.buildAgentConfig.mockResolvedValue({ agentId, screens: [] });

      await controller.config(agentReq);

      expect(configService.buildAgentConfig).toHaveBeenCalledWith(agentId);
    });

    // The agent id is never read from a query parameter or the body: an agent
    // must not be able to fetch another venue's addresses and passphrases.
    it('ignores any agent id the caller tries to supply', async () => {
      configService.buildAgentConfig.mockResolvedValue({ agentId, screens: [] });
      const spoofed = {
        ...agentReq,
        query: { agentId: 'someone-else' },
        body: { agentId: 'someone-else' },
      } as unknown as AgentAuthenticatedRequest;

      await controller.config(spoofed);

      expect(configService.buildAgentConfig).toHaveBeenCalledWith(agentId);
    });
  });

  describe('heartbeat', () => {
    it('records the reported version', async () => {
      await controller.heartbeat(agentReq, { agentVersion: '1.2.3' });

      expect(siteAgentService.recordHeartbeat).toHaveBeenCalledWith(agentId, '1.2.3');
    });

    it('accepts a heartbeat without a version, as an older agent sends', async () => {
      await controller.heartbeat(agentReq, {});

      expect(siteAgentService.recordHeartbeat).toHaveBeenCalledWith(agentId, null);
    });

    // The agent id comes from the verified token, never from the body — an
    // agent must not be able to check in on another agent's behalf.
    it('takes the agent id from the request, not the payload', async () => {
      await controller.heartbeat({ ...agentReq, agentId } as AgentAuthenticatedRequest, {
        agentVersion: '1.0.0',
      });

      expect(siteAgentService.recordHeartbeat).toHaveBeenCalledWith(agentId, '1.0.0');
    });
  });

  describe('events', () => {
    it('opens the stream for the agent named by the token', () => {
      expect(controller.events(agentReq)).toBe('stream');
      expect(sse.subscribe).toHaveBeenCalledWith(agentId);
    });
  });

  describe('reports', () => {
    it('applies every screen in the batch', async () => {
      await controller.reports(agentReq, {
        screens: [
          { screenId: 'a', reachability: ScreenReachability.Reachable },
          { screenId: 'b', reachability: ScreenReachability.Unreachable },
        ],
      });

      expect(commands.applyReport).toHaveBeenCalledTimes(2);
    });

    // Both the agent and the organisation come from the verified token, so a
    // report cannot be aimed at another venue.
    it('scopes every entry to the calling agent and its organisation', async () => {
      await controller.reports(agentReq, {
        screens: [{ screenId: 'a', reachability: ScreenReachability.Reachable }],
      });

      expect(commands.applyReport).toHaveBeenCalledWith(
        agentId,
        orgId,
        expect.objectContaining({ screenId: 'a' }),
      );
    });

    it('accepts an empty batch', async () => {
      await expect(controller.reports(agentReq, { screens: [] })).resolves.toBeUndefined();
    });
  });
});
