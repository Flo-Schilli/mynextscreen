import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
import { IS_USER_SCOPED_KEY } from './user-scoped.decorator';
import { ORG_PARAM_KEY } from './org-from-param.decorator';
import { UserService } from '../user/user.service';
import { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip for public routes
    if (this.metadata<boolean>(IS_PUBLIC_KEY, context)) {
      return true;
    }

    // Skip for screen-authenticated routes (API key auth, no user roles)
    if (this.metadata<boolean>(IS_SCREEN_AUTH_KEY, context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user?.userId) {
      throw new ForbiddenException('Access denied');
    }

    // Super-admins bypass role checks (flag carried in the access JWT). Checked
    // before the default-deny below so that the `admin/*` controllers — which
    // are protected by SuperAdminGuard and carry no @Roles() — keep working.
    if (user.isSuperAdmin) {
      return true;
    }

    // Routes that operate purely on req.user (own profile/password/prefs) or on
    // repo-owned static content opt out explicitly.
    if (this.metadata<boolean>(IS_USER_SCOPED_KEY, context)) {
      return true;
    }

    // Default-deny. A missing @Roles() used to mean "allow, and never verify
    // membership", which turned every forgotten decorator into a cross-tenant
    // hole. A route must now declare its access model.
    const requiredRoles = this.metadata<string[]>(ROLES_KEY, context);
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException(
        'Route is missing an access declaration (@Roles, @UserScoped, @ScreenAuth or @Public)',
      );
    }

    const organisationId = this.resolveOrganisationId(request, context);
    if (!organisationId) {
      throw new ForbiddenException('Organisation context required for role-based access');
    }

    // Users pre-exist (provisioned by a super-admin / org-admin) — look up role.
    const membership = await this.userService.getMembership(user.userId, organisationId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organisation');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient role for this operation');
    }

    return true;
  }

  /**
   * Resolves the organisation whose membership is about to be verified.
   *
   * It MUST be the same value the handler goes on to use, otherwise the two can
   * be pointed at different tenants. Routes that take the organisation from the
   * path declare that with `@OrgFromParam()`; for those the header/query is
   * ignored on purpose, because the path is what the handler reads.
   */
  private resolveOrganisationId(
    request: AuthenticatedRequest,
    context: ExecutionContext,
  ): string | undefined {
    const orgParam = this.metadata<string>(ORG_PARAM_KEY, context);
    if (orgParam) {
      // Reject rather than coerce a repeated/array-valued param: anything other
      // than a single string means the route was not matched as expected.
      const value = request.params?.[orgParam];
      return typeof value === 'string' ? value : undefined;
    }

    return (
      (request.headers?.['x-organisation-id'] as string | undefined) ??
      (request.query?.['organisationId'] as string | undefined)
    );
  }

  private metadata<T>(key: string, context: ExecutionContext): T | undefined {
    return this.reflector.getAllAndOverride<T>(key, [context.getHandler(), context.getClass()]);
  }
}
