import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Req,
  Logger,
  ParseUUIDPipe,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Roles } from '../auth/roles.decorator';
import { OrgFromParam } from '../auth/org-from-param.decorator';
import { OrganisationRole } from '../user/organisation-role.enum';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { UpdateOrgNotificationConfigDto } from './dto';
import { DEFAULT_ALERT_RULES, type OrganisationNotificationConfig } from '../db/schema';
import { SmtpEmailProvider } from './channels/smtp-email-provider';
import { OutboundGuard } from '../common/outbound-guard.service';

/**
 * Deliberately identical for every failure cause (refused, timeout, auth,
 * blocked target): the test endpoints must not double as a network oracle.
 */
const SMTP_TEST_FAILED_MESSAGE =
  'Failed to send the test email. Check the SMTP settings and try again.';
const NTFY_TEST_FAILED_MESSAGE =
  'Failed to send the test notification. Check the ntfy settings and try again.';

@Controller('organisations')
@OrgFromParam('id')
export class OrgNotificationConfigController {
  private readonly logger = new Logger(OrgNotificationConfigController.name);

  constructor(
    private readonly configService: OrgNotificationConfigService,
    private readonly httpService: HttpService,
    private readonly outbound: OutboundGuard,
  ) {}

  @Get(':id/notification-config')
  @Roles(OrganisationRole.OrgAdmin)
  async getConfig(@Param('id', ParseUUIDPipe) id: string): Promise<OrganisationNotificationConfig> {
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
      alertRules: DEFAULT_ALERT_RULES,
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

    // Blocks the endpoint from being used as an internal port scanner.
    try {
      await this.outbound.assertHost(config.smtpHost);
    } catch (error) {
      this.logger.warn(
        `Blocked SMTP test for org ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnprocessableEntityException(SMTP_TEST_FAILED_MESSAGE);
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
      // Generic on the wire, detailed in the log: distinct errors ("connection
      // refused" vs. "timeout") would map the internal network for the caller.
      this.logger.warn(
        `SMTP test failed for org ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnprocessableEntityException(SMTP_TEST_FAILED_MESSAGE);
    }

    return { message: 'Test email sent successfully.' };
  }

  @Post(':id/notification-config/test-ntfy')
  @Roles(OrganisationRole.OrgAdmin)
  async testNtfy(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    const config = await this.configService.getForOrg(id);

    if (!config?.ntfyUrl || !config?.ntfyTopic) {
      throw new UnprocessableEntityException(
        'ntfy is not configured. Please save ntfy settings first.',
      );
    }

    const url = `${config.ntfyUrl.replace(/\/+$/, '')}/${encodeURIComponent(config.ntfyTopic)}`;
    try {
      await this.outbound.assertUrl(url);
    } catch (error) {
      this.logger.warn(
        `Blocked ntfy test for org ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnprocessableEntityException(NTFY_TEST_FAILED_MESSAGE);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain',
      Title: 'Signage — Test Notification',
    };
    if (config.ntfyToken) {
      headers['Authorization'] = `Bearer ${config.ntfyToken}`;
    }

    try {
      await firstValueFrom(
        this.httpService.post(url, 'This is a test notification from your Signage configuration.', {
          headers,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `ntfy test failed for org ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnprocessableEntityException(NTFY_TEST_FAILED_MESSAGE);
    }

    return { message: 'Test notification sent successfully.' };
  }
}
