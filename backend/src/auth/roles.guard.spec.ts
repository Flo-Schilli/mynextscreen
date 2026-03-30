import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserService } from '../user/user.service';
import { OrganisationRole } from '../user/organisation-role.enum';
import { UserOrganisationMembership } from '../user/user-organisation-membership.entity';
import { User } from '../user/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let userService: jest.Mocked<UserService>;

  beforeEach(() => {
    reflector = new Reflector();
    userService = {
      findOrCreate: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      } as User),
      getMemberships: jest.fn(),
      getMembership: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    guard = new RolesGuard(reflector, userService);
  });

  function createMockContext(options: {
    user?: { userId: string; email: string };
    headers?: Record<string, string>;
    query?: Record<string, string>;
    isPublic?: boolean;
    roles?: string[];
  }): ExecutionContext {
    const request = {
      headers: options.headers ?? {},
      query: options.query ?? {},
      user: options.user,
    };

    const mockContext = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'isPublic') return options.isPublic ?? false;
      if (key === 'roles') return options.roles ?? null;
      return undefined;
    });

    return mockContext;
  }

  describe('public routes', () => {
    it('should allow access to public routes', async () => {
      const context = createMockContext({ isPublic: true });
      expect(await guard.canActivate(context)).toBe(true);
      expect(userService.getMembership).not.toHaveBeenCalled();
    });
  });

  describe('routes without @Roles()', () => {
    it('should allow access when no roles are required', async () => {
      const context = createMockContext({
        user: { userId: 'user-1', email: 'test@example.com' },
      });
      expect(await guard.canActivate(context)).toBe(true);
      expect(userService.getMembership).not.toHaveBeenCalled();
    });
  });

  describe('missing organisation context', () => {
    it('should throw ForbiddenException when no organisation header or query param', async () => {
      const context = createMockContext({
        user: { userId: 'user-1', email: 'test@example.com' },
        roles: [OrganisationRole.OrgAdmin],
      });
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('organisation from header', () => {
    it('should extract organisationId from X-Organisation-Id header', async () => {
      userService.getMembership.mockResolvedValue({
        role: OrganisationRole.OrgAdmin,
      } as UserOrganisationMembership);

      const context = createMockContext({
        user: { userId: 'user-1', email: 'test@example.com' },
        headers: { 'x-organisation-id': 'org-1' },
        roles: [OrganisationRole.OrgAdmin],
      });

      expect(await guard.canActivate(context)).toBe(true);
      expect(userService.getMembership).toHaveBeenCalledWith('user-1', 'org-1');
    });
  });

  describe('organisation from query param', () => {
    it('should extract organisationId from query parameter', async () => {
      userService.getMembership.mockResolvedValue({
        role: OrganisationRole.Editor,
      } as UserOrganisationMembership);

      const context = createMockContext({
        user: { userId: 'user-1', email: 'test@example.com' },
        query: { organisationId: 'org-2' },
        roles: [OrganisationRole.Editor],
      });

      expect(await guard.canActivate(context)).toBe(true);
      expect(userService.getMembership).toHaveBeenCalledWith('user-1', 'org-2');
    });
  });

  describe('no membership', () => {
    it('should throw ForbiddenException when user has no membership in the organisation', async () => {
      userService.getMembership.mockResolvedValue(null);

      const context = createMockContext({
        user: { userId: 'user-1', email: 'test@example.com' },
        headers: { 'x-organisation-id': 'org-1' },
        roles: [OrganisationRole.OrgAdmin],
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'You are not a member of this organisation',
      );
    });
  });

  describe('insufficient role', () => {
    it('should throw ForbiddenException when user role is not in allowed roles', async () => {
      userService.getMembership.mockResolvedValue({
        role: OrganisationRole.Viewer,
      } as UserOrganisationMembership);

      const context = createMockContext({
        user: { userId: 'user-1', email: 'test@example.com' },
        headers: { 'x-organisation-id': 'org-1' },
        roles: [OrganisationRole.OrgAdmin, OrganisationRole.Editor],
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Insufficient role for this operation',
      );
    });

    it('should deny editor when only org_admin is required', async () => {
      userService.getMembership.mockResolvedValue({
        role: OrganisationRole.Editor,
      } as UserOrganisationMembership);

      const context = createMockContext({
        user: { userId: 'user-1', email: 'test@example.com' },
        headers: { 'x-organisation-id': 'org-1' },
        roles: [OrganisationRole.OrgAdmin],
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should deny viewer when editor or admin is required', async () => {
      userService.getMembership.mockResolvedValue({
        role: OrganisationRole.Viewer,
      } as UserOrganisationMembership);

      const context = createMockContext({
        user: { userId: 'user-1', email: 'test@example.com' },
        headers: { 'x-organisation-id': 'org-1' },
        roles: [OrganisationRole.OrgAdmin, OrganisationRole.Editor],
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('allowed roles', () => {
    it('should allow org_admin when org_admin is required', async () => {
      userService.getMembership.mockResolvedValue({
        role: OrganisationRole.OrgAdmin,
      } as UserOrganisationMembership);

      const context = createMockContext({
        user: { userId: 'user-1', email: 'test@example.com' },
        headers: { 'x-organisation-id': 'org-1' },
        roles: [OrganisationRole.OrgAdmin],
      });

      expect(await guard.canActivate(context)).toBe(true);
    });

    it('should allow editor when editor or admin is required', async () => {
      userService.getMembership.mockResolvedValue({
        role: OrganisationRole.Editor,
      } as UserOrganisationMembership);

      const context = createMockContext({
        user: { userId: 'user-1', email: 'test@example.com' },
        headers: { 'x-organisation-id': 'org-1' },
        roles: [OrganisationRole.OrgAdmin, OrganisationRole.Editor],
      });

      expect(await guard.canActivate(context)).toBe(true);
    });

    it('should allow viewer when all roles are permitted', async () => {
      userService.getMembership.mockResolvedValue({
        role: OrganisationRole.Viewer,
      } as UserOrganisationMembership);

      const context = createMockContext({
        user: { userId: 'user-1', email: 'test@example.com' },
        headers: { 'x-organisation-id': 'org-1' },
        roles: [
          OrganisationRole.OrgAdmin,
          OrganisationRole.Editor,
          OrganisationRole.Viewer,
        ],
      });

      expect(await guard.canActivate(context)).toBe(true);
    });
  });

  describe('findOrCreate on first request', () => {
    it('should call findOrCreate to ensure user record exists', async () => {
      userService.getMembership.mockResolvedValue({
        role: OrganisationRole.OrgAdmin,
      } as UserOrganisationMembership);

      const context = createMockContext({
        user: { userId: 'new-user', email: 'new@example.com' },
        headers: { 'x-organisation-id': 'org-1' },
        roles: [OrganisationRole.OrgAdmin],
      });

      await guard.canActivate(context);
      expect(userService.findOrCreate).toHaveBeenCalledWith(
        'new-user',
        'new@example.com',
      );
    });
  });

  describe('missing user', () => {
    it('should throw ForbiddenException when no user on request', async () => {
      const context = createMockContext({
        headers: { 'x-organisation-id': 'org-1' },
        roles: [OrganisationRole.OrgAdmin],
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
