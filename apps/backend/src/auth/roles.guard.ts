import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { IS_SCREEN_AUTH_KEY } from './screen-auth.decorator';
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
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Skip for screen-authenticated routes (API key auth, no user roles)
    const isScreenAuth = this.reflector.getAllAndOverride<boolean>(IS_SCREEN_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isScreenAuth) {
      return true;
    }

    // If no @Roles() decorator, allow (only JWT auth required)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user?.userId) {
      throw new ForbiddenException('Access denied');
    }

    // Super-admins bypass role checks (flag carried in the access JWT).
    if (user.isSuperAdmin) {
      return true;
    }

    // Extract organisationId from header or query param
    const organisationId =
      (request.headers?.['x-organisation-id'] as string | undefined) ??
      (request.query?.['organisationId'] as string | undefined);

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
}
