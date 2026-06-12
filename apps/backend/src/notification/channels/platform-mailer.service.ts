import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { SmtpEmailProvider } from './smtp-email-provider';
import {
  AUTH_EMAIL_CHANGE_REQUESTED,
  AUTH_EMAIL_VERIFICATION_REQUESTED,
  AUTH_PASSWORD_CHANGED,
  AUTH_PASSWORD_RESET_REQUESTED,
  AUTH_USER_INVITED,
  AuthEmailChangeRequestedEvent,
  AuthEmailVerificationRequestedEvent,
  AuthPasswordChangedEvent,
  AuthPasswordResetRequestedEvent,
  AuthUserInvitedEvent,
} from '../../audit-log/audit.events';

/**
 * Platform-level mailer for ALL account/system emails (verify, invite, password
 * reset, email change, password-changed notice). Builds ONE SMTP transport from
 * ENV (`SMTP_*`) — independent of any organisation's SMTP config, because a
 * self-signup user has no org yet. Per-org SMTP stays in place for *org
 * notifications* (see EmailNotificationChannel); this replaces the former
 * org-scoped AuthEmailService for account mail.
 *
 * Driven purely by events (same decoupling the codebase uses to avoid a
 * NotificationModule → AuthModule/UserModule load cycle). Best-effort: a missing
 * SMTP host or a send error is logged, never thrown, so account existence cannot
 * leak via timing and a mailer outage never breaks the auth flow.
 */
@Injectable()
export class PlatformMailerService {
  private readonly logger = new Logger(PlatformMailerService.name);

  constructor(private readonly config: ConfigService) {}

  // ── Event handlers ──────────────────────────────────────────────────────────

  @OnEvent(AUTH_EMAIL_VERIFICATION_REQUESTED)
  async handleVerificationRequested(event: AuthEmailVerificationRequestedEvent): Promise<void> {
    await this.sendVerifyEmail(event.email, event.verificationToken);
  }

  @OnEvent(AUTH_USER_INVITED)
  async handleUserInvited(event: AuthUserInvitedEvent): Promise<void> {
    await this.sendInvite(event.email, event.setPasswordToken);
  }

  @OnEvent(AUTH_PASSWORD_RESET_REQUESTED)
  async handlePasswordResetRequested(event: AuthPasswordResetRequestedEvent): Promise<void> {
    await this.sendPasswordReset(event.email, event.resetToken);
  }

  @OnEvent(AUTH_EMAIL_CHANGE_REQUESTED)
  async handleEmailChangeRequested(event: AuthEmailChangeRequestedEvent): Promise<void> {
    await this.sendEmailChangeConfirm(event.newEmail, event.changeToken);
    await this.sendOldAddressChangeNotice(event.oldEmail, event.newEmail);
  }

  @OnEvent(AUTH_PASSWORD_CHANGED)
  async handlePasswordChanged(event: AuthPasswordChangedEvent): Promise<void> {
    await this.sendPasswordChangedNotice(event.email);
  }

  // ── Message builders ──────────────────────────────────────────────────────────

  async sendVerifyEmail(to: string, token: string): Promise<void> {
    const url = this.buildUrl('/verify-email', token);
    await this.send(
      to,
      'Verify your email for Signage Server',
      `Welcome to Signage Server! Confirm your email address to activate your account and ` +
        `organisation:\n\n${url}\n\nThis link expires in 24 hours. If you did not sign up, ignore this email.`,
    );
  }

  async sendInvite(to: string, token: string): Promise<void> {
    const url = this.buildUrl('/set-password', token);
    await this.send(
      to,
      'You have been invited to Signage Server',
      `An administrator has invited you to Signage Server. Set your password to activate your ` +
        `account:\n\n${url}\n\nThis link expires in 24 hours.`,
    );
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const url = this.buildUrl('/set-password', token);
    await this.send(
      to,
      'Reset your password',
      `A password reset was requested for your account. Set a new password using the link ` +
        `below:\n\n${url}\n\nThis link expires in 24 hours. If you did not request this, ignore this email.`,
    );
  }

  async sendEmailChangeConfirm(to: string, token: string): Promise<void> {
    const url = this.buildUrl('/confirm-email-change', token);
    await this.send(
      to,
      'Confirm your new email address',
      `Confirm this address to finish changing the email on your Signage Server ` +
        `account:\n\n${url}\n\nThis link expires in 24 hours. If you did not request this, ignore this email.`,
    );
  }

  async sendOldAddressChangeNotice(to: string, newEmail: string): Promise<void> {
    await this.send(
      to,
      'Your Signage Server email is being changed',
      `A request was made to change the email on your account to ${newEmail}. The change only ` +
        `takes effect once the new address is confirmed. If you did not request this, reset your ` +
        `password immediately and contact your administrator.`,
    );
  }

  async sendPasswordChangedNotice(to: string): Promise<void> {
    await this.send(
      to,
      'Your Signage Server password was changed',
      `This is a confirmation that the password for your Signage Server account was just ` +
        `changed. If this wasn't you, reset your password immediately and contact your administrator.`,
    );
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  /** Builds an absolute SPA link `${PUBLIC_BASE_URL}${path}?t=${token}`. */
  private buildUrl(path: string, token: string): string {
    const base = this.config.get<string>('PUBLIC_BASE_URL', '').replace(/\/+$/, '');
    return `${base}${path}?t=${encodeURIComponent(token)}`;
  }

  private buildProvider(): SmtpEmailProvider | null {
    const host = this.config.get<string>('SMTP_HOST', '');
    if (!host) {
      return null;
    }
    const user = this.config.get<string>('SMTP_USER', '') || null;
    const password = this.config.get<string>('SMTP_PASSWORD', '') || null;
    return new SmtpEmailProvider({
      host,
      port: this.config.get<number>('SMTP_PORT', 1025),
      user,
      password,
      secure: this.config.get<boolean>('SMTP_SECURE', false),
      from: this.config.get<string>('SMTP_FROM', `noreply@${host}`),
    });
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    try {
      const provider = this.buildProvider();
      if (!provider) {
        this.logger.warn(
          `SMTP_HOST not configured; cannot send "${subject}". Link must be shared manually.`,
        );
        return;
      }
      await provider.sendMail({ to, subject, text });
      this.logger.debug(`Account email "${subject}" sent to ${to}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send account email "${subject}" to ${to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
