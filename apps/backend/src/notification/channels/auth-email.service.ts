import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { OrgNotificationConfigService } from '../org-notification-config.service';
import { SmtpEmailProvider } from './smtp-email-provider';
import {
  AUTH_PASSWORD_RESET_REQUESTED,
  AUTH_USER_INVITED,
  AuthPasswordResetRequestedEvent,
  AuthUserInvitedEvent,
} from '../../audit-log/audit.events';

/**
 * Sends auth lifecycle emails (set-password / invite, password-reset) by
 * reusing the per-organisation SMTP config (`OrgNotificationConfigService`),
 * per CLAUDE.md "Externe Calls hinter Interface/Modul". Lives in the
 * NotificationModule (alongside the SMTP provider) and is driven purely by
 * events, so the AuthModule needs no import edge to NotificationModule (avoids
 * a module load cycle). Best-effort: missing SMTP / SMTP errors are logged,
 * never thrown, so account existence cannot leak via timing.
 */
@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  constructor(
    private readonly orgConfigService: OrgNotificationConfigService,
    private readonly config: ConfigService,
  ) {}

  @OnEvent(AUTH_USER_INVITED)
  async handleUserInvited(event: AuthUserInvitedEvent): Promise<void> {
    await this.sendSetPasswordEmail(
      event.organisationId,
      event.email,
      event.setPasswordToken,
      'invite',
    );
  }

  @OnEvent(AUTH_PASSWORD_RESET_REQUESTED)
  async handlePasswordResetRequested(event: AuthPasswordResetRequestedEvent): Promise<void> {
    await this.sendSetPasswordEmail(event.organisationId, event.email, event.resetToken, 'reset');
  }

  buildSetPasswordUrl(token: string): string {
    const base = this.config.get<string>('PUBLIC_BASE_URL', '').replace(/\/+$/, '');
    return `${base}/set-password?t=${encodeURIComponent(token)}`;
  }

  async sendSetPasswordEmail(
    organisationId: string,
    to: string,
    token: string,
    kind: 'invite' | 'reset',
  ): Promise<void> {
    const url = this.buildSetPasswordUrl(token);
    const subject =
      kind === 'invite' ? 'You have been invited to Signage Server' : 'Reset your password';
    const intro =
      kind === 'invite'
        ? 'An administrator has invited you to Signage Server. Set your password to activate your account:'
        : 'A password reset was requested for your account. Set a new password using the link below:';
    await this.send(
      organisationId,
      to,
      subject,
      `${intro}\n\n${url}\n\nThis link expires in 24 hours.`,
    );
  }

  private async send(
    organisationId: string,
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    try {
      const orgConfig = await this.orgConfigService.getForOrg(organisationId);
      if (!orgConfig?.smtpHost) {
        this.logger.warn(
          `No SMTP configured for org ${organisationId}; cannot email "${subject}". Link must be shared manually.`,
        );
        return;
      }
      const provider = new SmtpEmailProvider({
        host: orgConfig.smtpHost,
        port: orgConfig.smtpPort ?? 587,
        user: orgConfig.smtpUser,
        password: orgConfig.smtpPassword,
        secure: orgConfig.smtpSecure,
        from: orgConfig.smtpFrom ?? `noreply@${orgConfig.smtpHost}`,
      });
      await provider.sendMail({ to, subject, text });
      this.logger.debug(`Auth email "${subject}" sent to ${to}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send auth email "${subject}" to ${to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
