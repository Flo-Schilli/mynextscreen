import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { OrganisationRole } from './organisation-role.enum';
import type { UserOrganisationMembership, Organisation } from '../db/schema';

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
