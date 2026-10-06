import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { SiteAgentController } from './site-agent.controller';
import { SiteAgentService } from './site-agent.service';
import { ROLES_KEY } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import type { SiteAgent } from '../db/schema';

describe('SiteAgentController', () => {
  let controller: SiteAgentController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';
  const agentId = '660e8400-e29b-41d4-a716-446655440000';
  const userId = '880e8400-e29b-41d4-a716-446655440000';
  const mockReq = { user: { userId, email: 'admin@example.com' } } as AuthenticatedRequest;

  const mockAgent: SiteAgent = {
    id: agentId,
    organisationId: orgId,
    name: 'Venue North',
    location: 'Server room',
    agentVersion: null,
    networkInterface: null,
    networkKind: null,
    networkSsid: null,
    networkIp: null,
    lastHeartbeat: null,
    probeIntervalMinutes: 1,
    isOnline: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      createAgent: jest.fn(),
      listWithScreenCounts: jest.fn(),
      findOne: jest.fn(),
      updateAgent: jest.fn(),
      removeAgent: jest.fn(),
      reissueEnrolment: jest.fn(),
      revokeAccess: jest.fn(),
      probeNow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SiteAgentController],
      providers: [{ provide: SiteAgentService, useValue: service }],
    }).compile();

    controller = module.get(SiteAgentController);
  });

  describe('access declarations', () => {
    const reflector = new Reflector();

    // RolesGuard default-denies a route that declares nothing, so a missing
    // decorator here is a 403 at runtime rather than a hole — but it is still a
    // broken endpoint, and only a test catches it before someone deploys it.
    it.each([
      ['create', [OrganisationRole.OrgAdmin]],
      ['update', [OrganisationRole.OrgAdmin]],
      ['remove', [OrganisationRole.OrgAdmin]],
      ['reissueEnrolment', [OrganisationRole.OrgAdmin]],
      ['revoke', [OrganisationRole.OrgAdmin]],
      ['probeNow', [OrganisationRole.OrgAdmin]],
    ])('restricts %s to org admins', (method, expected) => {
      const roles = reflector.get<string[]>(
        ROLES_KEY,
        SiteAgentController.prototype[method as keyof SiteAgentController],
      );
      expect(roles).toEqual(expected);
    });

    it.each(['findAll', 'findOne'])('lets any member read via %s', (method) => {
      const roles = reflector.get<string[]>(
        ROLES_KEY,
        SiteAgentController.prototype[method as keyof SiteAgentController],
      );
      expect(roles).toEqual([
        OrganisationRole.OrgAdmin,
        OrganisationRole.Editor,
        OrganisationRole.Viewer,
      ]);
    });
  });

  describe('create', () => {
    it('returns the enrolment token alongside the agent', async () => {
      const expiresAt = new Date(Date.now() + 86_400_000);
      service.createAgent.mockResolvedValue({
        agent: mockAgent,
        enrolment: { token: 'raw-token', expiresAt },
      });

      const result = await controller.create(orgId, { name: 'Venue North' }, mockReq);

      expect(result).toEqual({ agent: mockAgent, enrolmentToken: 'raw-token', expiresAt });
      expect(service.createAgent).toHaveBeenCalledWith(orgId, { name: 'Venue North' }, userId);
    });
  });

  describe('findAll', () => {
    it('passes the organisation through to the scoped query', async () => {
      service.listWithScreenCounts.mockResolvedValue([{ ...mockAgent, screenCount: 3 }]);

      const result = await controller.findAll(orgId);

      expect(result).toEqual([expect.objectContaining({ ...mockAgent, screenCount: 3 })]);
      expect(service.listWithScreenCounts).toHaveBeenCalledWith(orgId);
    });

    describe('update hint', () => {
      const original = process.env.APP_VERSION;
      afterEach(() => {
        process.env.APP_VERSION = original;
      });

      it('flags an agent behind the server release', async () => {
        process.env.APP_VERSION = '0.18.0';
        service.listWithScreenCounts.mockResolvedValue([
          { ...mockAgent, agentVersion: '0.17.2', screenCount: 1 },
        ]);

        const [agent] = await controller.findAll(orgId);

        expect(agent).toMatchObject({ latestAgentVersion: '0.18.0', updateAvailable: true });
      });

      it('does not flag an agent on the server release', async () => {
        process.env.APP_VERSION = '0.18.0';
        service.findOne.mockResolvedValue({ ...mockAgent, agentVersion: '0.18.0' });

        const agent = await controller.findOne(orgId, agentId);

        expect(agent).toMatchObject({ latestAgentVersion: '0.18.0', updateAvailable: false });
      });
    });
  });

  describe('findOne', () => {
    it('scopes the lookup to the organisation', async () => {
      service.findOne.mockResolvedValue(mockAgent);

      await controller.findOne(orgId, agentId);

      expect(service.findOne).toHaveBeenCalledWith(orgId, agentId);
    });
  });

  describe('update', () => {
    it('forwards the acting user for the audit trail', async () => {
      service.updateAgent.mockResolvedValue(mockAgent);

      await controller.update(orgId, agentId, { name: 'Venue South' }, mockReq);

      expect(service.updateAgent).toHaveBeenCalledWith(
        orgId,
        agentId,
        { name: 'Venue South' },
        userId,
      );
    });
  });

  describe('remove', () => {
    it('scopes the delete to the organisation', async () => {
      service.removeAgent.mockResolvedValue(undefined);

      await controller.remove(orgId, agentId, mockReq);

      expect(service.removeAgent).toHaveBeenCalledWith(orgId, agentId, userId);
    });
  });

  describe('reissueEnrolment', () => {
    it('returns only the token and its expiry, not the agent row', async () => {
      const expiresAt = new Date(Date.now() + 86_400_000);
      service.reissueEnrolment.mockResolvedValue({ token: 'fresh', expiresAt });

      const result = await controller.reissueEnrolment(orgId, agentId, mockReq);

      expect(result).toEqual({ enrolmentToken: 'fresh', expiresAt });
    });
  });

  describe('probeNow', () => {
    it('hands the request to the service, scoped to the organisation', async () => {
      service.probeNow.mockResolvedValue({ commandId: 'cmd-1' });

      const result = await controller.probeNow(orgId, agentId);

      expect(result).toEqual({ commandId: 'cmd-1' });
      expect(service.probeNow).toHaveBeenCalledWith(orgId, agentId);
    });
  });

  describe('revoke', () => {
    it('reports how many sessions were ended', async () => {
      service.revokeAccess.mockResolvedValue({ revoked: 2 });

      const result = await controller.revoke(orgId, agentId, mockReq);

      expect(result).toEqual({ revoked: 2 });
      expect(service.revokeAccess).toHaveBeenCalledWith(orgId, agentId, userId);
    });
  });
});
