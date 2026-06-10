import { Controller, Get, Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import type { UserOrganisationMembership } from '../db/schema';

@Controller('me')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Req() req: AuthenticatedRequest) {
    return {
      userId: req.user.userId,
      email: req.user.email,
      isSuperAdmin: req.user.isSuperAdmin,
    };
  }

  @Get('memberships')
  getMemberships(@Req() req: AuthenticatedRequest): Promise<UserOrganisationMembership[]> {
    return this.userService.getMemberships(req.user.userId);
  }
}
