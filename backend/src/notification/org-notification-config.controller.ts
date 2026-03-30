import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { UpdateOrgNotificationConfigDto } from './dto';
import { OrganisationNotificationConfig } from './organisation-notification-config.entity';

@Controller('organisations')
export class OrgNotificationConfigController {
  constructor(private readonly configService: OrgNotificationConfigService) {}

  @Get(':id/notification-config')
  @Roles(OrganisationRole.OrgAdmin)
  async getConfig(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrganisationNotificationConfig> {
    const config = await this.configService.getForOrg(id);
    if (config) {
      // Redact sensitive fields in the response
      return {
        ...config,
        smtpPassword: config.smtpPassword ? '••••••••' : null,
        ntfyToken: config.ntfyToken ? '••••••••' : null,
      };
    }
    // Return a default empty config shape
    return {
      id: '',
      organisationId: id,
      smtpHost: null,
      smtpPort: null,
      smtpUser: null,
      smtpPassword: null,
      smtpFrom: null,
      smtpSecure: false,
      ntfyUrl: null,
      ntfyTopic: null,
      ntfyToken: null,
    } as OrganisationNotificationConfig;
  }

  @Patch(':id/notification-config')
  @Roles(OrganisationRole.OrgAdmin)
  async updateConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrgNotificationConfigDto,
  ): Promise<OrganisationNotificationConfig> {
    const saved = await this.configService.upsert(id, dto);
    // Redact sensitive fields in the response
    return {
      ...saved,
      smtpPassword: saved.smtpPassword ? '••••••••' : null,
      ntfyToken: saved.ntfyToken ? '••••••••' : null,
    };
  }
}
