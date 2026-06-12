import * as nodemailer from 'nodemailer';
import type { ConfigService } from '@nestjs/config';
import { PlatformMailerService } from './platform-mailer.service';
import {
  AuthEmailChangeRequestedEvent,
  AuthEmailVerificationRequestedEvent,
  AuthPasswordChangedEvent,
  AuthPasswordResetRequestedEvent,
  AuthUserInvitedEvent,
} from '../../audit-log/audit.events';

jest.mock('nodemailer');

describe('PlatformMailerService', () => {
  const mockSendMail = jest.fn();
  const mockCreateTransport = nodemailer.createTransport as jest.Mock;

  const env: Record<string, unknown> = {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 1025,
    SMTP_USER: '',
    SMTP_PASSWORD: '',
    SMTP_SECURE: false,
    SMTP_FROM: 'Signage <noreply@signage.local>',
    PUBLIC_BASE_URL: 'https://app.example.com/',
  };

  function makeService(overrides: Record<string, unknown> = {}): PlatformMailerService {
    const merged = { ...env, ...overrides };
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => merged[key] ?? fallback),
    } as unknown as ConfigService;
    return new PlatformMailerService(config);
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
    expect(sent.from).toBe('Signage <noreply@signage.local>');
    expect(sent.to).toBe('new@example.com');
    expect(sent.subject).toMatch(/verify/i);
    // base URL trailing slash collapsed + token URI-encoded
    expect(sent.text).toContain('https://app.example.com/verify-email?t=tok%20123');
  });

  it('sends an invite with a /set-password link', async () => {
    const service = makeService();

    await service.handleUserInvited(new AuthUserInvitedEvent('invitee@example.com', 'invtok'));

    const sent = mockSendMail.mock.calls[0][0];
    expect(sent.to).toBe('invitee@example.com');
    expect(sent.text).toContain('https://app.example.com/set-password?t=invtok');
  });

  it('sends a password reset with a /set-password link', async () => {
    const service = makeService();

    await service.handlePasswordResetRequested(
      new AuthPasswordResetRequestedEvent('user@example.com', 'resettok'),
    );

    const sent = mockSendMail.mock.calls[0][0];
    expect(sent.text).toContain('https://app.example.com/set-password?t=resettok');
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
});
