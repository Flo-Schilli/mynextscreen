import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrganisationController } from './organisation.controller';
import { OrganisationService } from './organisation.service';
import { MembershipService } from '../user/membership.service';
import type { Organisation } from '../db/schema';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';

describe('OrganisationController', () => {
  let controller: OrganisationController;
  let service: Record<string, jest.Mock>;

  const mockOrganisation: Organisation = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Org',
    timeZone: 'Europe/Vienna',
    storageOriginalLimitBytes: 1073741824,
    storageTranscodedLimitBytes: 2147483648,
    storageOriginalUsedBytes: 0,
    storageTranscodedUsedBytes: 0,
    defaultPlaylistId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMembershipService = {
    listMembers: jest.fn(),
    addMember: jest.fn(),
    updateRole: jest.fn(),
    removeMember: jest.fn(),
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganisationController],
      providers: [
        { provide: OrganisationService, useValue: service },
        { provide: MembershipService, useValue: mockMembershipService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('admin-1') },
        },
      ],
    }).compile();

    controller = module.get<OrganisationController>(OrganisationController);
  });

  describe('create', () => {
    it('should create an organisation', async () => {
      const dto = {
        name: 'Test Org',
        timeZone: 'Europe/Vienna',
        storageOriginalLimitBytes: 1073741824,
        storageTranscodedLimitBytes: 2147483648,
      };
      service.create.mockResolvedValue(mockOrganisation);

      const mockReq = {
        user: { userId: 'user-1', email: 'admin@test.com' },
      } as unknown as AuthenticatedRequest;
      const result = await controller.create(dto, mockReq);

      expect(service.create).toHaveBeenCalledWith(dto, mockReq.user);
      expect(result).toEqual(mockOrganisation);
    });
  });

  describe('findAll', () => {
    it('should return all organisations', async () => {
      service.findAll.mockResolvedValue([mockOrganisation]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockOrganisation]);
    });
  });

  describe('findOne', () => {
    it('should return an organisation by id', async () => {
      service.findOne.mockResolvedValue(mockOrganisation);

      const result = await controller.findOne(mockOrganisation.id);

      expect(service.findOne).toHaveBeenCalledWith(mockOrganisation.id);
      expect(result).toEqual(mockOrganisation);
    });
  });

  describe('update', () => {
    it('should update an organisation', async () => {
      const dto = { name: 'Updated Org' };
      const updated = { ...mockOrganisation, name: 'Updated Org' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(mockOrganisation.id, dto);

      expect(service.update).toHaveBeenCalledWith(mockOrganisation.id, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('delegates deletion to the service', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockOrganisation.id);

      expect(service.remove).toHaveBeenCalledWith(mockOrganisation.id);
    });
  });

  describe('super-admin member routes', () => {
    /**
     * These routes return rows joined with the full user record. Asserting on
     * key absence rather than on a shape keeps a future schema addition from
     * silently re-exposing a secret.
     */
    const membershipRow = {
      id: 'm1',
      userId: 'u1',
      organisationId: 'org-1',
      role: 'org_admin',
      createdAt: new Date(),
      user: {
        id: 'u1',
        email: 'member@example.com',
        name: 'Member',
        passwordHash: '$2b$12$hash',
        passwordResetToken: 'reset-token',
        passwordResetTokenExpiresAt: new Date(),
        emailVerified: true,
        emailVerificationToken: 'verify-token',
        emailVerificationTokenExpiresAt: new Date(),
        pendingEmail: 'new@example.com',
        emailChangeToken: 'change-token',
        emailChangeTokenExpiresAt: new Date(),
        isSuperAdmin: false,
        gravatarEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const SECRET_KEYS = [
      'passwordHash',
      'passwordResetToken',
      'emailVerificationToken',
      'emailChangeToken',
      'pendingEmail',
    ];

    it('does not leak user secrets when listing members', async () => {
      mockMembershipService.listMembers.mockResolvedValue([membershipRow]);

      const [member] = await controller.listMembers('org-1');

      expect(JSON.stringify(member)).not.toContain('$2b$12$hash');
      for (const key of SECRET_KEYS) {
        expect(member.user).not.toHaveProperty(key);
      }
    });

    it('does not leak a fresh reset token when adding a member', async () => {
      mockMembershipService.addMember.mockResolvedValue(membershipRow);

      const member = await controller.addMember('org-1', {
        email: 'member@example.com',
        role: 'org_admin',
      } as never);

      expect(JSON.stringify(member)).not.toContain('reset-token');
    });
  });
});
