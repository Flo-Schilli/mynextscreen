import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
import type { UserService } from '../user/user.service';
import { OrganisationRole } from '../user/organisation-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let userService: { getMembership: jest.Mock };

  beforeEach(() => {
    reflector = new Reflector();
    userService = { getMembership: jest.fn() };
    guard = new RolesGuard(reflector, userService as unknown as UserService);
  });

  function context(opts: {
    isPublic?: boolean;
    isScreen?: boolean;
    roles?: string[];
    user?: { userId: string; email: string; isSuperAdmin: boolean };
    headers?: Record<string, string>;
    query?: Record<string, string>;
  }): ExecutionContext {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: unknown) => {
      if (key === IS_PUBLIC_KEY) return opts.isPublic ?? false;
      if (key === IS_SCREEN_AUTH_KEY) return opts.isScreen ?? false;
      if (key === ROLES_KEY) return opts.roles;
      return undefined;
    });
    const request = {
      user: opts.user,
      headers: opts.headers ?? {},
      query: opts.query ?? {},
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('allows public routes', async () => {
    await expect(guard.canActivate(context({ isPublic: true }))).resolves.toBe(true);
  });

  it('allows screen-authenticated routes', async () => {
    await expect(guard.canActivate(context({ isScreen: true }))).resolves.toBe(true);
  });

  it('allows routes without a @Roles() decorator (JWT-only)', async () => {
    await expect(guard.canActivate(context({ roles: undefined }))).resolves.toBe(true);
  });

  it('lets super-admins bypass role checks without a DB lookup', async () => {
    const ctx = context({
      roles: [OrganisationRole.OrgAdmin],
      user: { userId: 'u1', email: 'a@x.com', isSuperAdmin: true },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(userService.getMembership).not.toHaveBeenCalled();
  });

  it('throws when no user is present', async () => {
    const ctx = context({ roles: [OrganisationRole.OrgAdmin], user: undefined });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws when organisation context is missing', async () => {
    const ctx = context({
      roles: [OrganisationRole.OrgAdmin],
      user: { userId: 'u1', email: 'a@x.com', isSuperAdmin: false },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws when the user is not a member of the org', async () => {
    userService.getMembership.mockResolvedValue(null);
    const ctx = context({
      roles: [OrganisationRole.OrgAdmin],
      user: { userId: 'u1', email: 'a@x.com', isSuperAdmin: false },
      headers: { 'x-organisation-id': 'org-1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('throws when the membership role is insufficient', async () => {
    userService.getMembership.mockResolvedValue({ role: OrganisationRole.Viewer });
    const ctx = context({
      roles: [OrganisationRole.OrgAdmin],
      user: { userId: 'u1', email: 'a@x.com', isSuperAdmin: false },
      headers: { 'x-organisation-id': 'org-1' },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows when the membership role matches (org id from query)', async () => {
    userService.getMembership.mockResolvedValue({ role: OrganisationRole.OrgAdmin });
    const ctx = context({
      roles: [OrganisationRole.OrgAdmin],
      user: { userId: 'u1', email: 'a@x.com', isSuperAdmin: false },
      query: { organisationId: 'org-1' },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(userService.getMembership).toHaveBeenCalledWith('u1', 'org-1');
  });
});
