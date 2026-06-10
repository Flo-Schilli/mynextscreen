import { Test, TestingModule } from '@nestjs/testing';
import { NotificationHub } from './notification-hub.service';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { NotificationEvent } from './notification-event.interface';
import { NotificationEventType } from './notification-event-type.enum';
import { IN_APP_CHANNEL, EMAIL_CHANNEL, NTFY_CHANNEL } from './channels';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  users,
  userOrganisationMemberships,
  type Organisation,
  type User,
  type OrganisationNotificationConfig,
  type UserNotificationPreference,
} from '../db/schema';
import { OrganisationRole } from '../user/organisation-role.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('NotificationHub', () => {
  let hub: NotificationHub;
  let db: DrizzleDB;
  let getForUser: jest.Mock;
  let getForOrg: jest.Mock;
  let inAppChannel: { send: jest.Mock };
  let emailChannel: { send: jest.Mock };
  let ntfyChannel: { send: jest.Mock };

  let org: Organisation;
  let user1: User;
  let user2: User;

  const makePrefs = (
    overrides: Partial<UserNotificationPreference> = {},
  ): UserNotificationPreference =>
    ({
      inAppEnabled: true,
      emailEnabled: false,
      ntfyEnabled: false,
      ...overrides,
    }) as UserNotificationPreference;

  const fullOrgConfig = (): Partial<OrganisationNotificationConfig> => ({
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'user',
    smtpPassword: 'pass',
    smtpFrom: 'no-reply@example.com',
    smtpSecure: false,
    ntfyUrl: 'https://ntfy.sh',
    ntfyTopic: 'signage',
    ntfyToken: 'token-123',
  });

  let event: NotificationEvent;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  function buildHub(withChannels = true): Promise<NotificationHub> {
    const providers: Parameters<typeof Test.createTestingModule>[0]['providers'] = [
      NotificationHub,
      { provide: DRIZZLE, useValue: db },
      { provide: UserNotificationPreferenceService, useValue: { getForUser } },
      { provide: OrgNotificationConfigService, useValue: { getForOrg } },
    ];
    if (withChannels) {
      providers.push(
        { provide: IN_APP_CHANNEL, useValue: inAppChannel },
        { provide: EMAIL_CHANNEL, useValue: emailChannel },
        { provide: NTFY_CHANNEL, useValue: ntfyChannel },
      );
    }
    return Test.createTestingModule({ providers })
      .compile()
      .then((m: TestingModule) => m.get<NotificationHub>(NotificationHub));
  }

  async function addMembership(userId: string): Promise<void> {
    await db.insert(userOrganisationMemberships).values({
      userId,
      organisationId: org.id,
      role: OrganisationRole.Viewer,
    });
  }

  beforeEach(async () => {
    await truncateAll();
    getForUser = jest.fn();
    getForOrg = jest.fn();
    inAppChannel = { send: jest.fn().mockResolvedValue(undefined) };
    emailChannel = { send: jest.fn().mockResolvedValue(undefined) };
    ntfyChannel = { send: jest.fn().mockResolvedValue(undefined) };

    hub = await buildHub();

    [org] = await db.insert(organisations).values({ name: 'Org', timeZone: 'UTC' }).returning();
    [user1] = await db.insert(users).values({ email: 'user1@example.com' }).returning();
    [user2] = await db.insert(users).values({ email: 'user2@example.com' }).returning();

    event = {
      orgId: org.id,
      eventType: NotificationEventType.SCREEN_OFFLINE,
      title: 'Screen offline',
      message: 'Screen "Main Hall" has gone offline',
      resourceId: 'screen-1',
    };
  });

  it('should call all three channels when user has all enabled and org is fully configured', async () => {
    await addMembership(user1.id);
    getForOrg.mockResolvedValue(fullOrgConfig());
    getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: true }),
    );

    await hub.dispatch(event);

    const expectedPayload = {
      eventType: event.eventType,
      title: event.title,
      message: event.message,
      resourceId: event.resourceId,
    };
    expect(inAppChannel.send).toHaveBeenCalledWith(user1.id, org.id, expectedPayload);
    expect(emailChannel.send).toHaveBeenCalledWith(user1.id, org.id, expectedPayload);
    expect(ntfyChannel.send).toHaveBeenCalledWith(org.id, expectedPayload);
  });

  it('should call only in-app channel when only inAppEnabled is true', async () => {
    await addMembership(user1.id);
    getForOrg.mockResolvedValue(fullOrgConfig());
    getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: true, emailEnabled: false, ntfyEnabled: false }),
    );

    await hub.dispatch(event);

    expect(inAppChannel.send).toHaveBeenCalledTimes(1);
    expect(emailChannel.send).not.toHaveBeenCalled();
    expect(ntfyChannel.send).not.toHaveBeenCalled();
  });

  it('should skip email channel when org SMTP is not configured', async () => {
    await addMembership(user1.id);
    getForOrg.mockResolvedValue({ ...fullOrgConfig(), smtpHost: null });
    getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: false }),
    );

    await hub.dispatch(event);

    expect(inAppChannel.send).toHaveBeenCalledTimes(1);
    expect(emailChannel.send).not.toHaveBeenCalled();
  });

  it('should skip ntfy channel when org ntfy URL is missing', async () => {
    await addMembership(user1.id);
    getForOrg.mockResolvedValue({ ...fullOrgConfig(), ntfyUrl: null, ntfyTopic: null });
    getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: false, emailEnabled: false, ntfyEnabled: true }),
    );

    await hub.dispatch(event);

    expect(ntfyChannel.send).not.toHaveBeenCalled();
  });

  it('should skip all channels when org config is null', async () => {
    await addMembership(user1.id);
    getForOrg.mockResolvedValue(null);
    getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: false, emailEnabled: true, ntfyEnabled: true }),
    );

    await hub.dispatch(event);

    expect(inAppChannel.send).not.toHaveBeenCalled();
    expect(emailChannel.send).not.toHaveBeenCalled();
    expect(ntfyChannel.send).not.toHaveBeenCalled();
  });

  it('should handle multiple users with different preferences independently', async () => {
    await addMembership(user1.id);
    await addMembership(user2.id);
    getForOrg.mockResolvedValue(fullOrgConfig());
    getForUser.mockImplementation((userId: string) =>
      Promise.resolve(
        userId === user1.id
          ? makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: false })
          : makePrefs({ inAppEnabled: false, emailEnabled: false, ntfyEnabled: true }),
      ),
    );

    await hub.dispatch(event);

    expect(inAppChannel.send).toHaveBeenCalledWith(user1.id, org.id, expect.any(Object));
    expect(emailChannel.send).toHaveBeenCalledWith(user1.id, org.id, expect.any(Object));
    expect(ntfyChannel.send).toHaveBeenCalledTimes(1);
    expect(ntfyChannel.send).toHaveBeenCalledWith(org.id, expect.any(Object));
    expect(inAppChannel.send).toHaveBeenCalledTimes(1);
    expect(emailChannel.send).toHaveBeenCalledTimes(1);
  });

  it('should deduplicate ntfy — send at most once per dispatch even with multiple ntfy-enabled users', async () => {
    await addMembership(user1.id);
    await addMembership(user2.id);
    getForOrg.mockResolvedValue(fullOrgConfig());
    getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: false, emailEnabled: false, ntfyEnabled: true }),
    );

    await hub.dispatch(event);

    expect(ntfyChannel.send).toHaveBeenCalledTimes(1);
  });

  it('should catch and log channel errors without affecting other channels', async () => {
    await addMembership(user1.id);
    getForOrg.mockResolvedValue(fullOrgConfig());
    getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: true }),
    );

    inAppChannel.send.mockRejectedValue(new Error('in-app failed'));

    await expect(hub.dispatch(event)).resolves.toBeUndefined();

    expect(emailChannel.send).toHaveBeenCalledTimes(1);
    expect(ntfyChannel.send).toHaveBeenCalledTimes(1);
  });

  it('should do nothing when org has no members', async () => {
    getForOrg.mockResolvedValue(fullOrgConfig());

    await hub.dispatch(event);

    expect(inAppChannel.send).not.toHaveBeenCalled();
    expect(emailChannel.send).not.toHaveBeenCalled();
    expect(ntfyChannel.send).not.toHaveBeenCalled();
  });

  it('should work when channel handlers are not injected (optional)', async () => {
    const hubNoChannels = await buildHub(false);

    await addMembership(user1.id);
    getForOrg.mockResolvedValue(fullOrgConfig());
    getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: true }),
    );

    await expect(hubNoChannels.dispatch(event)).resolves.toBeUndefined();
  });
});
