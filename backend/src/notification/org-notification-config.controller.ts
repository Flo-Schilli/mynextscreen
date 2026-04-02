import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Req,
  ParseUUIDPipe,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Roles } from '../auth/roles.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { UpdateOrgNotificationConfigDto } from './dto';
import { OrganisationNotificationConfig } from './organisation-notification-config.entity';
import { SmtpEmailProvider } from './channels/smtp-email-provider';

@Controller('organisations')
export class OrgNotificationConfigController {
  constructor(
    private readonly configService: OrgNotificationConfigService,
    private readonly httpService: HttpService,
  ) {}

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

  @Post(':id/notification-config/test-email')
  @Roles(OrganisationRole.OrgAdmin)
  async testEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const config = await this.configService.getForOrg(id);

    if (!config?.smtpHost) {
      throw new UnprocessableEntityException(
        'SMTP is not configured. Please save SMTP settings first.',
      );
    }

    const provider = new SmtpEmailProvider({
      host: config.smtpHost,
      port: config.smtpPort ?? 587,
      user: config.smtpUser,
      password: config.smtpPassword,
      secure: config.smtpSecure,
      from: config.smtpFrom ?? `noreply@${config.smtpHost}`,
    });

    try {
      await provider.sendMail({
        to: req.user.email,
        subject: 'Signage — Test Email',
        text: 'This is a test email from your Signage notification configuration. If you received this, your SMTP settings are working correctly.',
      });
    } catch (error) {
      throw new UnprocessableEntityException(
        `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return { message: 'Test email sent successfully.' };
  }

  @Post(':id/notification-config/test-ntfy')
  @Roles(OrganisationRole.OrgAdmin)
  async testNtfy(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    const config = await this.configService.getForOrg(id);

    if (!config?.ntfyUrl || !config?.ntfyTopic) {
      throw new UnprocessableEntityException(
        'ntfy is not configured. Please save ntfy settings first.',
      );
    }

    const url = `${config.ntfyUrl.replace(/\/+$/, '')}/${config.ntfyTopic}`;
    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
      Title: 'Signage — Test Notification',
    };
    if (config.ntfyToken) {
      headers['Authorization'] = `Bearer ${config.ntfyToken}`;
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          url,
          'This is a test notification from your Signage configuration.',
          { headers },
        ),
      );
    } catch (error) {
      throw new UnprocessableEntityException(
        `Failed to send test notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    return { message: 'Test notification sent successfully.' };
  }
}
