import { Controller, Get, Patch, Param, Query, Req, ParseUUIDPipe } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { CurrentOrganisation } from '../organisation/current-organisation.decorator';
import { Roles } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async getNotifications(
    @Req() req: AuthenticatedRequest,
    @CurrentOrganisation() organisationId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationService.findRecent(
      req.user.userId,
      organisationId,
      unreadOnly === 'true',
    );
  }

  @Get('unread-count')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async getUnreadCount(
    @Req() req: AuthenticatedRequest,
    @CurrentOrganisation() organisationId: string,
  ) {
    const count = await this.notificationService.countUnread(req.user.userId, organisationId);
    return { count };
  }

  @Patch(':id/read')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async markAsRead(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.notificationService.markAsRead(id, req.user.userId);
  }

  @Patch('read-all')
  @Roles(OrganisationRole.OrgAdmin, OrganisationRole.Editor, OrganisationRole.Viewer)
  async markAllAsRead(
    @Req() req: AuthenticatedRequest,
    @CurrentOrganisation() organisationId: string,
  ) {
    await this.notificationService.markAllAsRead(req.user.userId, organisationId);
  }
}
