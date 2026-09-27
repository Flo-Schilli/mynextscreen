import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
import { IS_USER_SCOPED_KEY } from './user-scoped.decorator';
import { ORG_PARAM_KEY } from './org-from-param.decorator';
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
    isUserScoped?: boolean;
    roles?: string[];
    /** Simulates @OrgFromParam('<name>') on the route. */
    orgParam?: string;
    user?: { userId: string; email: string; isSuperAdmin: boolean };
    headers?: Record<string, string>;
    query?: Record<string, string>;
    params?: Record<string, string | string[]>;
  }): ExecutionContext {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: unknown) => {
      if (key === IS_PUBLIC_KEY) return opts.isPublic ?? false;
      if (key === IS_SCREEN_AUTH_KEY) return opts.isScreen ?? false;
      if (key === IS_USER_SCOPED_KEY) return opts.isUserScoped ?? false;
      if (key === ROLES_KEY) return opts.roles;
      if (key === ORG_PARAM_KEY) return opts.orgParam;
      return undefined;
    });
    const request = {
      user: opts.user,
      headers: opts.headers ?? {},
      query: opts.query ?? {},
      params: opts.params ?? {},
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

  // Default-deny. This used to resolve to `true`: a missing @Roles() meant
  // "allow, and never verify membership", so any organisation-scoped route that
  // forgot the decorator was an open cross-tenant hole. Routes that legitimately
  // need no organisation now say so with @UserScoped().
  it('denies a route that declares no access model at all', async () => {
    const ctx = context({
      roles: undefined,
      user: { userId: 'u1', email: 'a@x.com', isSuperAdmin: false },
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(userService.getMembership).not.toHaveBeenCalled();
  });

  it('allows @UserScoped() routes without an organisation context', async () => {
    const ctx = context({
      isUserScoped: true,
      roles: undefined,
      user: { userId: 'u1', email: 'a@x.com', isSuperAdmin: false },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(userService.getMembership).not.toHaveBeenCalled();
  });

  // The admin/* controllers are guarded by SuperAdminGuard and carry no @Roles(),
  // so the super-admin bypass has to come before the default-deny above.
  it('lets super-admins through a route that declares no access model', async () => {
    const ctx = context({
      roles: undefined,
      user: { userId: 'su', email: 'su@x.com', isSuperAdmin: true },
    });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
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

  describe('@OrgFromParam() routes', () => {
    // The cross-tenant takeover this guard change exists to close: on
    // `organisations/:orgId/...` the guard used to validate the header while the
    // handler used the path, so an OrgAdmin of their own org could point the path
    // at a victim org and operate there. The membership check must follow the
    // path, and the header must not be able to satisfy it.
    it('checks membership against the path param, not the header', async () => {
      userService.getMembership.mockResolvedValue(null);
      const ctx = context({
        roles: [OrganisationRole.OrgAdmin],
        orgParam: 'orgId',
        user: { userId: 'attacker', email: 'a@x.com', isSuperAdmin: false },
        headers: { 'x-organisation-id': 'my-own-org' },
        params: { orgId: 'victim-org' },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      expect(userService.getMembership).toHaveBeenCalledWith('attacker', 'victim-org');
      expect(userService.getMembership).not.toHaveBeenCalledWith('attacker', 'my-own-org');
    });

    it('allows the route when the user is a member of the organisation in the path', async () => {
      userService.getMembership.mockResolvedValue({ role: OrganisationRole.OrgAdmin });
      const ctx = context({
        roles: [OrganisationRole.OrgAdmin],
        orgParam: 'orgId',
        user: { userId: 'u1', email: 'a@x.com', isSuperAdmin: false },
        params: { orgId: 'org-1' },
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(userService.getMembership).toHaveBeenCalledWith('u1', 'org-1');
    });

    it('supports a param name other than orgId', async () => {
      userService.getMembership.mockResolvedValue({ role: OrganisationRole.OrgAdmin });
      const ctx = context({
        roles: [OrganisationRole.OrgAdmin],
        orgParam: 'id',
        user: { userId: 'u1', email: 'a@x.com', isSuperAdmin: false },
        params: { id: 'org-7' },
      });

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(userService.getMembership).toHaveBeenCalledWith('u1', 'org-7');
    });

    it('does not fall back to the header when the declared param is absent', async () => {
      const ctx = context({
        roles: [OrganisationRole.OrgAdmin],
        orgParam: 'orgId',
        user: { userId: 'u1', email: 'a@x.com', isSuperAdmin: false },
        headers: { 'x-organisation-id': 'org-1' },
        params: {},
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      expect(userService.getMembership).not.toHaveBeenCalled();
    });

    it('rejects an array-valued param instead of coercing it', async () => {
      const ctx = context({
        roles: [OrganisationRole.OrgAdmin],
        orgParam: 'orgId',
        user: { userId: 'u1', email: 'a@x.com', isSuperAdmin: false },
        params: { orgId: ['org-1', 'org-2'] },
      });

      await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
      expect(userService.getMembership).not.toHaveBeenCalled();
    });
  });
});
