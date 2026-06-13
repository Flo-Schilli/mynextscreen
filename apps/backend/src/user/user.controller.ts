import { Body, Controller, Get, NotFoundException, Patch, Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto';
import type { User, UserOrganisationMembership } from '../db/schema';

/** Self-service view of the signed-in user's own profile. */
interface ProfileView {
  userId: string;
  email: string;
  name: string | null;
  isSuperAdmin: boolean;
}

@Controller('me')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest): Promise<ProfileView> {
    const user = await this.userService.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toProfileView(user);
  }

  @Patch('profile')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileView> {
    const user = await this.userService.updateProfile(req.user.userId, { name: dto.name });
    return this.toProfileView(user);
  }

  @Get('memberships')
  getMemberships(@Req() req: AuthenticatedRequest): Promise<UserOrganisationMembership[]> {
    return this.userService.getMemberships(req.user.userId);
  }

  private toProfileView(user: User): ProfileView {
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}
