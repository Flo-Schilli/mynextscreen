import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user?.userId) {
      throw new ForbiddenException('Access denied');
    }

    const superAdminIds = this.configService.get<string>(
      'SUPER_ADMIN_USER_IDS',
      '',
    );
    const allowedIds = superAdminIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (!allowedIds.includes(user.userId)) {
      throw new ForbiddenException('Super-admin access required');
    }

    return true;
  }
}
