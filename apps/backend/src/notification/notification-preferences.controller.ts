import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { UserScoped } from '../auth/user-scoped.decorator';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { UpdateNotificationPreferencesDto } from './dto';
import type { UserNotificationPreference } from '../db/schema';

/**
 * The signed-in user's global notification preferences. These apply across every
 * organisation they belong to, so no organisation context is required here — any
 * authenticated user manages their own single set of channel toggles.
 */
@Controller('me/notification-preferences')
@UserScoped()
export class NotificationPreferencesController {
  constructor(private readonly prefService: UserNotificationPreferenceService) {}

  @Get()
  getPreferences(@Req() req: AuthenticatedRequest): Promise<UserNotificationPreference> {
    return this.prefService.getForUser(req.user.userId);
  }

  @Patch()
  updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<UserNotificationPreference> {
    return this.prefService.upsert(req.user.userId, dto);
  }
}
