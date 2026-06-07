import { Controller, Get, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { UserOrganisationMembership } from './user-organisation-membership.entity';

@Controller('me')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @Get('profile')
  getProfile(@Req() req: AuthenticatedRequest) {
    const superAdminIds = this.configService.get<string>('SUPER_ADMIN_USER_IDS', '');
    const allowedIds = superAdminIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    return {
      userId: req.user.userId,
      email: req.user.email,
      isSuperAdmin: allowedIds.includes(req.user.userId),
    };
  }

  @Get('memberships')
  getMemberships(@Req() req: AuthenticatedRequest): Promise<UserOrganisationMembership[]> {
    return this.userService.getMemberships(req.user.userId);
  }
}
