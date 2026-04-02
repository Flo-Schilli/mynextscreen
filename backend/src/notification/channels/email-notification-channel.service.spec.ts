import { EmailNotificationChannel } from './email-notification-channel.service';
import { NotificationEventType } from '../notification-event-type.enum';
import { NotificationPayload } from './notification-channel.interfaces';
import { OrgNotificationConfigService } from '../org-notification-config.service';
import { OrganisationNotificationConfig } from '../organisation-notification-config.entity';
import { User } from '../../user/user.entity';

// Mock SmtpEmailProvider before importing the module
const mockSendMail = jest.fn();
jest.mock('./smtp-email-provider', () => ({
  SmtpEmailProvider: jest.fn().mockImplementation(() => ({
    sendMail: mockSendMail,
  })),
}));

import { SmtpEmailProvider } from './smtp-email-provider';

describe('EmailNotificationChannel', () => {
  let channel: EmailNotificationChannel;
  let userRepo: Record<string, jest.Mock>;
  let orgConfigService: Record<string, jest.Mock>;

  const userId = 'user-1';
  const orgId = 'org-1';
  const payload: NotificationPayload = {
    eventType: NotificationEventType.SCREEN_OFFLINE,
    title: 'Screen offline',
    message: 'Screen "Main Hall" has gone offline',
    resourceId: 'screen-1',
  };

  const mockOrgConfig: Partial<OrganisationNotificationConfig> = {
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'user@example.com',
    smtpPassword: 'secret',
    smtpFrom: 'noreply@example.com',
    smtpSecure: false,
  };

  const mockUser: Partial<User> = {
    id: userId,
    email: 'recipient@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue(undefined);

    userRepo = {
      findOne: jest.fn().mockResolvedValue(mockUser),
    };
    orgConfigService = {
      getForOrg: jest.fn().mockResolvedValue(mockOrgConfig),
    };

    channel = new EmailNotificationChannel(
      userRepo as unknown as import('typeorm').Repository<User>,
      orgConfigService as unknown as OrgNotificationConfigService,
    );
  });

  it('should send an email with correct subject and body', async () => {
    await channel.send(userId, orgId, payload);

    expect(orgConfigService.getForOrg).toHaveBeenCalledWith(orgId);
    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { id: userId },
    });
    expect(SmtpEmailProvider).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      user: 'user@example.com',
      password: 'secret',
      secure: false,
      from: 'noreply@example.com',
    });
    expect(mockSendMail).toHaveBeenCalledWith({
      to: 'recipient@example.com',
      subject: 'Screen offline',
      text: 'Screen "Main Hall" has gone offline',
    });
  });

  it('should skip silently when SMTP host is not configured', async () => {
    orgConfigService.getForOrg.mockResolvedValue({ smtpHost: null });

    await channel.send(userId, orgId, payload);

    expect(userRepo.findOne).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should skip silently when org config is null', async () => {
    orgConfigService.getForOrg.mockResolvedValue(null);

    await channel.send(userId, orgId, payload);

    expect(userRepo.findOne).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should skip when user is not found', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await channel.send(userId, orgId, payload);

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should use default port 587 when smtpPort is null', async () => {
    orgConfigService.getForOrg.mockResolvedValue({
      ...mockOrgConfig,
      smtpPort: null,
    });

    await channel.send(userId, orgId, payload);

    expect(SmtpEmailProvider).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587 }),
    );
  });

  it('should use fallback from address when smtpFrom is null', async () => {
    orgConfigService.getForOrg.mockResolvedValue({
      ...mockOrgConfig,
      smtpFrom: null,
    });

    await channel.send(userId, orgId, payload);

    expect(SmtpEmailProvider).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'noreply@smtp.example.com' }),
    );
  });

  it('should propagate errors from the email provider', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP error'));

    await expect(channel.send(userId, orgId, payload)).rejects.toThrow(
      'SMTP error',
    );
  });
});
