import { Controller, Get, Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { UserOrganisationMembership } from './user-organisation-membership.entity';

@Controller('me')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('memberships')
  getMemberships(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserOrganisationMembership[]> {
    return this.userService.getMemberships(req.user.userId);
  }
}
