import * as nodemailer from 'nodemailer';
import type { ConfigService } from '@nestjs/config';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MAIL_TEXT_MAX_LENGTH,
  PlatformMailerService,
  sanitizeMailText,
} from './platform-mailer.service';
import {
  AUDIT_EMAIL_SENT,
  AUDIT_EMAIL_SEND_FAILED,
  AuthEmailChangeRequestedEvent,
  AuthEmailVerificationRequestedEvent,
  AuthMfaDisabledEvent,
  AuthMfaEnabledEvent,
  AuthMfaRecoveryCodeUsedEvent,
  AuthMfaResetEvent,
  AuthOrgMfaRequiredEvent,
  AuthPasswordChangedEvent,
  AuthPasswordResetRequestedEvent,
  AuthUserInvitedEvent,
} from '../../audit-log/audit.events';

jest.mock('nodemailer');

describe('PlatformMailerService', () => {
  const mockSendMail = jest.fn();
  const mockCreateTransport = nodemailer.createTransport as jest.Mock;
  const mockEmit = jest.fn();

  const env: Record<string, unknown> = {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 1025,
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    SMTP_SECURE: false,
    SMTP_FROM: 'Signage <noreply@mynextscreen.local>',
    PUBLIC_BASE_URL: 'https://app.example.com/',
  };

  function makeService(overrides: Record<string, unknown> = {}): PlatformMailerService {
    const merged = { ...env, ...overrides };
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => merged[key] ?? fallback),
    } as unknown as ConfigService;
    const events = { emit: mockEmit } as unknown as EventEmitter2;
    return new PlatformMailerService(config, events);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });
  });

  it('sends a verification email with a /verify-email link (trailing slash stripped)', async () => {
    const service = makeService();

    await service.handleVerificationRequested(
      new AuthEmailVerificationRequestedEvent('new@example.com', 'tok 123'),
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const sent = mockSendMail.mock.calls[0][0];
    expect(sent.from).toBe('Signage <noreply@mynextscreen.local>');
    expect(sent.to).toBe('new@example.com');
    expect(sent.subject).toMatch(/verify/i);
    // base URL trailing slash collapsed + token URI-encoded
    expect(sent.text).toContain('https://app.example.com/verify-email?t=tok%20123');
  });

  it('sends an invite with a /set-password link that asks for a name', async () => {
    const service = makeService();

    await service.handleUserInvited(new AuthUserInvitedEvent('invitee@example.com', 'invtok'));

    const sent = mockSendMail.mock.calls[0][0];
    expect(sent.to).toBe('invitee@example.com');
    expect(sent.text).toContain('https://app.example.com/set-password?t=invtok&invite=1');
  });

  it('sends a password reset with a /set-password link', async () => {
    const service = makeService();

    await service.handlePasswordResetRequested(
      new AuthPasswordResetRequestedEvent('user@example.com', 'resettok'),
    );

    const sent = mockSendMail.mock.calls[0][0];
    expect(sent.text).toContain('https://app.example.com/set-password?t=resettok');
    expect(sent.text).not.toContain('invite=1');
  });

  it('on email change: confirms the NEW address and notifies the OLD address', async () => {
    const service = makeService();

    await service.handleEmailChangeRequested(
      new AuthEmailChangeRequestedEvent('old@example.com', 'new@example.com', 'changetok'),
    );

    expect(mockSendMail).toHaveBeenCalledTimes(2);
    const [confirm, notice] = mockSendMail.mock.calls.map((c) => c[0]);
    expect(confirm.to).toBe('new@example.com');
    expect(confirm.text).toContain('https://app.example.com/confirm-email-change?t=changetok');
    expect(notice.to).toBe('old@example.com');
    expect(notice.text).toContain('new@example.com');
  });

  it('sends a password-changed notice', async () => {
    const service = makeService();

    await service.handlePasswordChanged(new AuthPasswordChangedEvent('user@example.com'));

    const sent = mockSendMail.mock.calls[0][0];
    expect(sent.to).toBe('user@example.com');
    expect(sent.subject).toMatch(/password/i);
  });

  it('sends an MFA-enabled notice, worded for a device change when replaced', async () => {
    const service = makeService();

    await service.handleMfaEnabled(new AuthMfaEnabledEvent('user@example.com', false));
    await service.handleMfaEnabled(new AuthMfaEnabledEvent('user@example.com', true));

    const [first, second] = mockSendMail.mock.calls.map((call) => call[0]);
    expect(first.to).toBe('user@example.com');
    expect(first.subject).toMatch(/two-factor authentication enabled/i);
    expect(first.text).toMatch(/turned on/);
    expect(second.text).toMatch(/new authenticator app/);
  });

  it('sends an MFA-disabled notice', async () => {
    const service = makeService();

    await service.handleMfaDisabled(new AuthMfaDisabledEvent('user@example.com'));

    const sent = mockSendMail.mock.calls[0][0];
    expect(sent.subject).toMatch(/disabled/i);
  });

  it('sends a recovery-code-used notice with the remaining count', async () => {
    const service = makeService();

    await service.handleMfaRecoveryCodeUsed(
      new AuthMfaRecoveryCodeUsedEvent('user@example.com', 3),
    );

    const sent = mockSendMail.mock.calls[0][0];
    expect(sent.subject).toMatch(/recovery code/i);
    expect(sent.text).toContain('3 unused recovery code(s) remain');
  });

  it('sends an MFA-reset notice naming who reset it', async () => {
    const service = makeService();

    await service.handleMfaReset(new AuthMfaResetEvent('user@example.com', 'super_admin'));
    await service.handleMfaReset(new AuthMfaResetEvent('user@example.com', 'org_admin'));

    const [bySuperAdmin, byOrgAdmin] = mockSendMail.mock.calls.map((call) => call[0]);
    expect(bySuperAdmin.to).toBe('user@example.com');
    expect(bySuperAdmin.subject).toMatch(/reset/i);
    expect(bySuperAdmin.text).toContain('a platform administrator');
    expect(byOrgAdmin.text).toContain('an administrator of your organisation');
  });

  it('sends an org-requires-MFA notice naming the organisation', async () => {
    const service = makeService();

    await service.handleOrgMfaRequired(new AuthOrgMfaRequiredEvent('user@example.com', 'Venue'));

    const sent = mockSendMail.mock.calls[0][0];
    expect(sent.subject).toMatch(/required/i);
    expect(sent.text).toContain('"Venue"');
  });

  it('quotes a hostile org name as one inert line (no breaks, links or markup)', async () => {
    const service = makeService();
    const hostile = 'Venue\r\n\r\nClick https://evil.example/login <b>now</b>\t mail a@b.io';

    await service.handleOrgMfaRequired(new AuthOrgMfaRequiredEvent('user@example.com', hostile));

    const { text } = mockSendMail.mock.calls[0][0] as { text: string };
    const quoted = /"([^"]*)"/.exec(text)?.[1] ?? '';
    expect(quoted).not.toMatch(/[\r\n\t<>@]|https?:|:\/\/|\.[a-z]/i);
    expect(quoted).toContain('Venue Click');
  });

  it('caps the quoted org name and keeps ordinary names unchanged', () => {
    expect(sanitizeMailText('Club 2.0  Süd')).toBe('Club 2.0 Süd');
    const long = sanitizeMailText('x'.repeat(500));
    expect(Array.from(long)).toHaveLength(MAIL_TEXT_MAX_LENGTH);
    expect(long.endsWith('…')).toBe(true);
  });

  it('omits SMTP auth when user and password are empty', async () => {
    const service = makeService();

    await service.sendVerifyEmail('a@b.com', 'tok');

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com', port: 1025, auth: undefined }),
    );
  });

  it('passes SMTP auth when user and password are set', async () => {
    const service = makeService({ SMTP_USER: 'u', SMTP_PASSWORD: 'p' });

    await service.sendVerifyEmail('a@b.com', 'tok');

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { user: 'u', pass: 'p' } }),
    );
  });

  it('is best-effort: skips silently when SMTP_HOST is not configured', async () => {
    const service = makeService({ SMTP_HOST: '' });

    await expect(service.sendVerifyEmail('a@b.com', 'tok')).resolves.toBeUndefined();
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  it('is best-effort: swallows send errors (never throws)', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP down'));
    const service = makeService();

    await expect(service.sendVerifyEmail('a@b.com', 'tok')).resolves.toBeUndefined();
  });

  it('emits an email-sent audit event (recipient + subject only, no token) on success', async () => {
    const service = makeService();

    await service.sendVerifyEmail('a@b.com', 'secret-token');

    expect(mockEmit).toHaveBeenCalledWith(AUDIT_EMAIL_SENT, expect.anything());
    const [, event] = mockEmit.mock.calls[0];
    expect(event.details.to).toBe('a@b.com');
    expect(event.details.subject).toMatch(/verify/i);
    expect(JSON.stringify(event.details)).not.toContain('secret-token');
  });

  it('emits an email-send-failed audit event with the reason on send error', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP down'));
    const service = makeService();

    await service.sendVerifyEmail('a@b.com', 'tok');

    expect(mockEmit).toHaveBeenCalledWith(AUDIT_EMAIL_SEND_FAILED, expect.anything());
    const [, event] = mockEmit.mock.calls[0];
    expect(event.details.reason).toBe('SMTP down');
  });

  it('emits an email-send-failed audit event when SMTP is not configured', async () => {
    const service = makeService({ SMTP_HOST: '' });

    await service.sendVerifyEmail('a@b.com', 'tok');

    expect(mockEmit).toHaveBeenCalledWith(AUDIT_EMAIL_SEND_FAILED, expect.anything());
  });
});
