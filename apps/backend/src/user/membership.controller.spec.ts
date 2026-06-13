import { Test, TestingModule } from '@nestjs/testing';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { OrganisationRole } from './organisation-role.enum';
import type { UserOrganisationMembership, User } from '../db/schema';

type MembershipWithUser = UserOrganisationMembership & { user: User };

describe('MembershipController', () => {
  let controller: MembershipController;
  let service: Record<string, jest.Mock>;

  const orgId = '550e8400-e29b-41d4-a716-446655440000';

  const mockUser: User = {
    id: 'u-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: null,
    passwordResetToken: null,
    passwordResetTokenExpiresAt: null,
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationTokenExpiresAt: null,
    pendingEmail: null,
    emailChangeToken: null,
    emailChangeTokenExpiresAt: null,
    isSuperAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMembership: MembershipWithUser = {
    id: 'm-1',
    userId: 'u-1',
    organisationId: orgId,
    role: OrganisationRole.Editor,
    createdAt: new Date(),
    user: mockUser,
  };

  beforeEach(async () => {
    service = {
      listMembers: jest.fn(),
      addMember: jest.fn(),
      updateRole: jest.fn(),
      removeMember: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembershipController],
      providers: [{ provide: MembershipService, useValue: service }],
    }).compile();

    controller = module.get<MembershipController>(MembershipController);
  });

  describe('listMembers', () => {
    it('should return all members of the organisation', async () => {
      service.listMembers.mockResolvedValue([mockMembership]);

      const result = await controller.listMembers(orgId);

      expect(service.listMembers).toHaveBeenCalledWith(orgId);
      expect(result).toEqual([
        {
          id: 'm-1',
          userId: 'u-1',
          organisationId: orgId,
          role: OrganisationRole.Editor,
          createdAt: mockMembership.createdAt,
          // mockUser has a null passwordHash → invite still pending.
          status: 'pending',
          user: {
            id: 'u-1',
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
          },
        },
      ]);
    });

    it('should derive a pending status and never leak the password hash or tokens', async () => {
      service.listMembers.mockResolvedValue([
        { ...mockMembership, user: { ...mockUser, passwordHash: null } },
        {
          ...mockMembership,
          id: 'm-2',
          userId: 'u-2',
          user: { ...mockUser, id: 'u-2', passwordHash: '$2b$hash' },
        },
      ]);

      const [pending, active] = await controller.listMembers(orgId);

      expect(pending.status).toBe('pending');
      expect(active.status).toBe('active');
      // Sensitive fields must not be present on the API response.
      expect(pending.user).not.toHaveProperty('passwordHash');
      expect(pending.user).not.toHaveProperty('passwordResetToken');
      expect(active.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('addMember', () => {
    it('should add a member to the organisation', async () => {
      service.addMember.mockResolvedValue({
        ...mockMembership,
        user: { ...mockUser, passwordHash: null },
      });

      const result = await controller.addMember(orgId, {
        email: 'test@example.com',
        role: OrganisationRole.Editor,
      });

      expect(service.addMember).toHaveBeenCalledWith(
        orgId,
        'test@example.com',
        OrganisationRole.Editor,
      );
      // A brand-new invitee has no password yet → pending.
      expect(result.status).toBe('pending');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('updateRole', () => {
    it('should update a member role', async () => {
      const updated = { ...mockMembership, role: OrganisationRole.Viewer };
      service.updateRole.mockResolvedValue(updated);

      const result = await controller.updateRole(orgId, 'u-1', {
        role: OrganisationRole.Viewer,
      });

      expect(service.updateRole).toHaveBeenCalledWith(orgId, 'u-1', OrganisationRole.Viewer);
      expect(result.role).toBe(OrganisationRole.Viewer);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the organisation', async () => {
      service.removeMember.mockResolvedValue(undefined);

      await controller.removeMember(orgId, 'u-1');

      expect(service.removeMember).toHaveBeenCalledWith(orgId, 'u-1');
    });
  });
});
