import { Test, TestingModule } from '@nestjs/testing';
import { EmailNotificationChannel } from './email-notification-channel.service';
import { NotificationEventType } from '../notification-event-type.enum';
import { NotificationPayload } from './notification-channel.interfaces';
import { OrgNotificationConfigService } from '../org-notification-config.service';
import { DRIZZLE } from '../../db/database.constants';
import { organisations, users, type Organisation, type User } from '../../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../../test/db-harness';
import type { DrizzleDB } from '../../db/drizzle.types';
import type { OrganisationNotificationConfig } from '../../db/schema';

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
  let db: DrizzleDB;
  let getForOrg: jest.Mock;
  let org: Organisation;
  let user: User;

  const payload: NotificationPayload = {
    eventType: NotificationEventType.SCREEN_OFFLINE,
    title: 'Screen offline',
    message: 'Screen "Main Hall" has gone offline',
    resourceId: 'screen-1',
  };

  const mockOrgConfig = (): Partial<OrganisationNotificationConfig> => ({
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'user@example.com',
    smtpPassword: 'secret',
    smtpFrom: 'noreply@example.com',
    smtpSecure: false,
  });

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue(undefined);
    getForOrg = jest.fn().mockResolvedValue(mockOrgConfig());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailNotificationChannel,
        { provide: DRIZZLE, useValue: db },
        { provide: OrgNotificationConfigService, useValue: { getForOrg } },
      ],
    }).compile();
    channel = module.get<EmailNotificationChannel>(EmailNotificationChannel);

    [org] = await db.insert(organisations).values({ name: 'Org', timeZone: 'UTC' }).returning();
    [user] = await db.insert(users).values({ email: 'recipient@example.com' }).returning();
  });

  it('should send an email with correct subject and body', async () => {
    await channel.send(user.id, org.id, payload);

    expect(getForOrg).toHaveBeenCalledWith(org.id);
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
    getForOrg.mockResolvedValue({ smtpHost: null });

    await channel.send(user.id, org.id, payload);

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should skip silently when org config is null', async () => {
    getForOrg.mockResolvedValue(null);

    await channel.send(user.id, org.id, payload);

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should skip when user is not found', async () => {
    await channel.send('00000000-0000-0000-0000-000000000000', org.id, payload);

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('should use default port 587 when smtpPort is null', async () => {
    getForOrg.mockResolvedValue({ ...mockOrgConfig(), smtpPort: null });

    await channel.send(user.id, org.id, payload);

    expect(SmtpEmailProvider).toHaveBeenCalledWith(expect.objectContaining({ port: 587 }));
  });

  it('should use fallback from address when smtpFrom is null', async () => {
    getForOrg.mockResolvedValue({ ...mockOrgConfig(), smtpFrom: null });

    await channel.send(user.id, org.id, payload);

    expect(SmtpEmailProvider).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'noreply@smtp.example.com' }),
    );
  });

  it('should propagate errors from the email provider', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP error'));

    await expect(channel.send(user.id, org.id, payload)).rejects.toThrow('SMTP error');
  });
});
