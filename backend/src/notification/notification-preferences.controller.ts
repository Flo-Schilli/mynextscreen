import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { Roles } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { UpdateNotificationPreferencesDto } from './dto';
import { UserNotificationPreference } from './user-notification-preference.entity';

@Controller('me/notification-preferences')
export class NotificationPreferencesController {
  constructor(private readonly prefService: UserNotificationPreferenceService) {}

  @Get()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  getPreferences(
    @Req() req: AuthenticatedRequest,
    @CurrentOrganisation() organisationId: string,
  ): Promise<UserNotificationPreference> {
    return this.prefService.getForUser(req.user.userId, organisationId);
  }

  @Patch()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  updatePreferences(
    @Req() req: AuthenticatedRequest,
    @CurrentOrganisation() organisationId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<UserNotificationPreference> {
    return this.prefService.upsert(req.user.userId, organisationId, dto);
  }
}
