import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { OrganisationRole } from './organisation-role.enum';
import type { UserOrganisationMembership, Organisation, User } from '../db/schema';
import { NotFoundException } from '@nestjs/common';

type MembershipWithOrganisation = UserOrganisationMembership & { organisation: Organisation };

describe('UserController', () => {
  let controller: UserController;
  let userService: Record<string, jest.Mock>;

  const userId = 'u-1';

  const orgAlpha = {
    id: 'org-1',
    name: 'Org Alpha',
    timeZone: 'Europe/Vienna',
  } as Organisation;
  const orgBeta = {
    id: 'org-2',
    name: 'Org Beta',
    timeZone: 'UTC',
  } as Organisation;

  const mockMemberships: MembershipWithOrganisation[] = [
    {
      id: 'm-1',
      userId,
      organisationId: 'org-1',
      role: OrganisationRole.OrgAdmin,
      createdAt: new Date(),
      organisation: orgAlpha,
    },
    {
      id: 'm-2',
      userId,
      organisationId: 'org-2',
      role: OrganisationRole.Viewer,
      createdAt: new Date(),
      organisation: orgBeta,
    },
  ];

  beforeEach(async () => {
    userService = {
      getMemberships: jest.fn(),
      getMembership: jest.fn(),
      findById: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: ConfigService, useValue: { get: jest.fn(() => '') } },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  const mockUser = {
    id: userId,
    email: 'test@example.com',
    name: 'Test User',
    isSuperAdmin: false,
  } as User;

  const authedReq = {
    user: { userId, email: 'test@example.com', isSuperAdmin: false },
  } as AuthenticatedRequest;

  describe('GET /me/profile', () => {
    it('returns the profile view for the authenticated user', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await controller.getProfile(authedReq);

      expect(userService.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        userId,
        email: 'test@example.com',
        name: 'Test User',
        isSuperAdmin: false,
      });
    });

    it('throws NotFoundException when the user no longer exists', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(controller.getProfile(authedReq)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('PATCH /me/profile', () => {
    it('updates the display name and returns the refreshed profile view', async () => {
      const updated = { ...mockUser, name: 'New Name' } as User;
      userService.updateProfile.mockResolvedValue(updated);

      const result = await controller.updateProfile(authedReq, { name: 'New Name' });

      expect(userService.updateProfile).toHaveBeenCalledWith(userId, { name: 'New Name' });
      expect(result).toEqual({
        userId,
        email: 'test@example.com',
        name: 'New Name',
        isSuperAdmin: false,
      });
    });

    it('reflects a cleared name as null', async () => {
      const cleared = { ...mockUser, name: null } as User;
      userService.updateProfile.mockResolvedValue(cleared);

      const result = await controller.updateProfile(authedReq, { name: '' });

      expect(userService.updateProfile).toHaveBeenCalledWith(userId, { name: '' });
      expect(result.name).toBeNull();
    });
  });

  describe('GET /me/memberships', () => {
    it('should return all memberships for the authenticated user', async () => {
      userService.getMemberships.mockResolvedValue(mockMemberships);

      const req = {
        user: { userId, email: 'test@example.com' },
      } as AuthenticatedRequest;
      const result = await controller.getMemberships(req);

      expect(userService.getMemberships).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockMemberships);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if user has no memberships', async () => {
      userService.getMemberships.mockResolvedValue([]);

      const req = {
        user: { userId, email: 'test@example.com' },
      } as AuthenticatedRequest;
      const result = await controller.getMemberships(req);

      expect(userService.getMemberships).toHaveBeenCalledWith(userId);
      expect(result).toEqual([]);
    });

    it('should include organisation relations in returned memberships', async () => {
      userService.getMemberships.mockResolvedValue(mockMemberships);

      const req = {
        user: { userId, email: 'test@example.com' },
      } as AuthenticatedRequest;
      const result = (await controller.getMemberships(req)) as MembershipWithOrganisation[];

      expect(result[0].organisation.name).toBe('Org Alpha');
      expect(result[0].role).toBe(OrganisationRole.OrgAdmin);
      expect(result[1].organisation.name).toBe('Org Beta');
      expect(result[1].role).toBe(OrganisationRole.Viewer);
    });
  });
});
