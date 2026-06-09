import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Allows only system-level super-admins. The flag is carried in the access JWT
 * (`isSuperAdmin`), seeded from the `users.is_super_admin` column. The former
 * env-based `SUPER_ADMIN_USER_IDS` list is retired (UUID PKs are unknowable
 * pre-seed).
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user?.userId) {
      throw new ForbiddenException('Access denied');
    }

    if (!user.isSuperAdmin) {
      throw new ForbiddenException('Super-admin access required');
    }

    return true;
  }
}
