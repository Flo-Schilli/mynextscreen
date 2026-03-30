import { NotificationHub } from './notification-hub.service';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { NotificationEvent } from './notification-event.interface';
import { NotificationEventType } from './notification-event-type.enum';
import { InAppChannel, EmailChannel, NtfyChannel } from './channels';
import { UserNotificationPreference } from './user-notification-preference.entity';
import { OrganisationNotificationConfig } from './organisation-notification-config.entity';
import { UserOrganisationMembership } from '../user/user-organisation-membership.entity';

describe('NotificationHub', () => {
  let hub: NotificationHub;
  let membershipRepo: Record<string, jest.Mock>;
  let userPrefService: { getForUser: jest.Mock };
  let orgConfigService: { getForOrg: jest.Mock };
  let inAppChannel: { send: jest.Mock };
  let emailChannel: { send: jest.Mock };
  let ntfyChannel: { send: jest.Mock };

  const orgId = 'org-1';
  const user1Id = 'user-1';
  const user2Id = 'user-2';

  const event: NotificationEvent = {
    orgId,
    eventType: NotificationEventType.SCREEN_OFFLINE,
    title: 'Screen offline',
    message: 'Screen "Main Hall" has gone offline',
    resourceId: 'screen-1',
  };

  const makeMembership = (
    userId: string,
  ): Partial<UserOrganisationMembership> => ({
    userId,
    organisationId: orgId,
  });

  const makePrefs = (
    overrides: Partial<UserNotificationPreference> = {},
  ): UserNotificationPreference =>
    ({
      inAppEnabled: true,
      emailEnabled: false,
      ntfyEnabled: false,
      ...overrides,
    }) as UserNotificationPreference;

  const fullOrgConfig: Partial<OrganisationNotificationConfig> = {
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'user',
    smtpPassword: 'pass',
    smtpFrom: 'no-reply@example.com',
    smtpSecure: false,
    ntfyUrl: 'https://ntfy.sh',
    ntfyTopic: 'signage',
    ntfyToken: 'token-123',
  };

  beforeEach(() => {
    membershipRepo = {
      find: jest.fn(),
    };
    userPrefService = {
      getForUser: jest.fn(),
    };
    orgConfigService = {
      getForOrg: jest.fn(),
    };
    inAppChannel = { send: jest.fn().mockResolvedValue(undefined) };
    emailChannel = { send: jest.fn().mockResolvedValue(undefined) };
    ntfyChannel = { send: jest.fn().mockResolvedValue(undefined) };

    hub = new NotificationHub(
      membershipRepo as unknown as import('typeorm').Repository<UserOrganisationMembership>,
      userPrefService as unknown as UserNotificationPreferenceService,
      orgConfigService as unknown as OrgNotificationConfigService,
      inAppChannel as InAppChannel,
      emailChannel as EmailChannel,
      ntfyChannel as NtfyChannel,
    );
  });

  it('should call all three channels when user has all enabled and org is fully configured', async () => {
    membershipRepo.find.mockResolvedValue([makeMembership(user1Id)]);
    orgConfigService.getForOrg.mockResolvedValue(fullOrgConfig);
    userPrefService.getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: true }),
    );

    await hub.dispatch(event);

    expect(inAppChannel.send).toHaveBeenCalledWith(user1Id, orgId, {
      eventType: event.eventType,
      title: event.title,
      message: event.message,
      resourceId: event.resourceId,
    });
    expect(emailChannel.send).toHaveBeenCalledWith(user1Id, orgId, {
      eventType: event.eventType,
      title: event.title,
      message: event.message,
      resourceId: event.resourceId,
    });
    expect(ntfyChannel.send).toHaveBeenCalledWith(orgId, {
      eventType: event.eventType,
      title: event.title,
      message: event.message,
      resourceId: event.resourceId,
    });
  });

  it('should call only in-app channel when only inAppEnabled is true', async () => {
    membershipRepo.find.mockResolvedValue([makeMembership(user1Id)]);
    orgConfigService.getForOrg.mockResolvedValue(fullOrgConfig);
    userPrefService.getForUser.mockResolvedValue(
      makePrefs({
        inAppEnabled: true,
        emailEnabled: false,
        ntfyEnabled: false,
      }),
    );

    await hub.dispatch(event);

    expect(inAppChannel.send).toHaveBeenCalledTimes(1);
    expect(emailChannel.send).not.toHaveBeenCalled();
    expect(ntfyChannel.send).not.toHaveBeenCalled();
  });

  it('should skip email channel when org SMTP is not configured', async () => {
    membershipRepo.find.mockResolvedValue([makeMembership(user1Id)]);
    orgConfigService.getForOrg.mockResolvedValue({
      ...fullOrgConfig,
      smtpHost: null,
    });
    userPrefService.getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: false }),
    );

    await hub.dispatch(event);

    expect(inAppChannel.send).toHaveBeenCalledTimes(1);
    expect(emailChannel.send).not.toHaveBeenCalled();
  });

  it('should skip ntfy channel when org ntfy URL is missing', async () => {
    membershipRepo.find.mockResolvedValue([makeMembership(user1Id)]);
    orgConfigService.getForOrg.mockResolvedValue({
      ...fullOrgConfig,
      ntfyUrl: null,
      ntfyTopic: null,
    });
    userPrefService.getForUser.mockResolvedValue(
      makePrefs({
        inAppEnabled: false,
        emailEnabled: false,
        ntfyEnabled: true,
      }),
    );

    await hub.dispatch(event);

    expect(ntfyChannel.send).not.toHaveBeenCalled();
  });

  it('should skip all channels when org config is null', async () => {
    membershipRepo.find.mockResolvedValue([makeMembership(user1Id)]);
    orgConfigService.getForOrg.mockResolvedValue(null);
    userPrefService.getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: false, emailEnabled: true, ntfyEnabled: true }),
    );

    await hub.dispatch(event);

    expect(inAppChannel.send).not.toHaveBeenCalled();
    expect(emailChannel.send).not.toHaveBeenCalled();
    expect(ntfyChannel.send).not.toHaveBeenCalled();
  });

  it('should handle multiple users with different preferences independently', async () => {
    membershipRepo.find.mockResolvedValue([
      makeMembership(user1Id),
      makeMembership(user2Id),
    ]);
    orgConfigService.getForOrg.mockResolvedValue(fullOrgConfig);
    userPrefService.getForUser
      .mockResolvedValueOnce(
        makePrefs({
          inAppEnabled: true,
          emailEnabled: true,
          ntfyEnabled: false,
        }),
      )
      .mockResolvedValueOnce(
        makePrefs({
          inAppEnabled: false,
          emailEnabled: false,
          ntfyEnabled: true,
        }),
      );

    await hub.dispatch(event);

    // User 1: in-app + email
    expect(inAppChannel.send).toHaveBeenCalledWith(
      user1Id,
      orgId,
      expect.any(Object),
    );
    expect(emailChannel.send).toHaveBeenCalledWith(
      user1Id,
      orgId,
      expect.any(Object),
    );

    // User 2: ntfy only (org-level)
    expect(ntfyChannel.send).toHaveBeenCalledTimes(1);
    expect(ntfyChannel.send).toHaveBeenCalledWith(orgId, expect.any(Object));

    // User 2 does not get in-app
    expect(inAppChannel.send).toHaveBeenCalledTimes(1);
    expect(emailChannel.send).toHaveBeenCalledTimes(1);
  });

  it('should deduplicate ntfy — send at most once per dispatch even with multiple ntfy-enabled users', async () => {
    membershipRepo.find.mockResolvedValue([
      makeMembership(user1Id),
      makeMembership(user2Id),
    ]);
    orgConfigService.getForOrg.mockResolvedValue(fullOrgConfig);
    userPrefService.getForUser.mockResolvedValue(
      makePrefs({
        inAppEnabled: false,
        emailEnabled: false,
        ntfyEnabled: true,
      }),
    );

    await hub.dispatch(event);

    expect(ntfyChannel.send).toHaveBeenCalledTimes(1);
  });

  it('should catch and log channel errors without affecting other channels', async () => {
    membershipRepo.find.mockResolvedValue([makeMembership(user1Id)]);
    orgConfigService.getForOrg.mockResolvedValue(fullOrgConfig);
    userPrefService.getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: true }),
    );

    inAppChannel.send.mockRejectedValue(new Error('in-app failed'));
    // email and ntfy should still be called
    emailChannel.send.mockResolvedValue(undefined);
    ntfyChannel.send.mockResolvedValue(undefined);

    // Should not throw
    await expect(hub.dispatch(event)).resolves.toBeUndefined();

    expect(emailChannel.send).toHaveBeenCalledTimes(1);
    expect(ntfyChannel.send).toHaveBeenCalledTimes(1);
  });

  it('should do nothing when org has no members', async () => {
    membershipRepo.find.mockResolvedValue([]);
    orgConfigService.getForOrg.mockResolvedValue(fullOrgConfig);

    await hub.dispatch(event);

    expect(inAppChannel.send).not.toHaveBeenCalled();
    expect(emailChannel.send).not.toHaveBeenCalled();
    expect(ntfyChannel.send).not.toHaveBeenCalled();
  });

  it('should work when channel handlers are not injected (optional)', async () => {
    const hubNoChannels = new NotificationHub(
      membershipRepo as unknown as import('typeorm').Repository<UserOrganisationMembership>,
      userPrefService as unknown as UserNotificationPreferenceService,
      orgConfigService as unknown as OrgNotificationConfigService,
    );

    membershipRepo.find.mockResolvedValue([makeMembership(user1Id)]);
    orgConfigService.getForOrg.mockResolvedValue(fullOrgConfig);
    userPrefService.getForUser.mockResolvedValue(
      makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: true }),
    );

    // Should not throw even though no channels are injected
    await expect(hubNoChannels.dispatch(event)).resolves.toBeUndefined();
  });
});
