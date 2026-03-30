import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationHub } from './notification-hub.service';
import { NotificationEventListener } from './notification-event-listener.service';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { NotificationEvent } from './notification-event.interface';
import { NotificationEventType } from './notification-event-type.enum';
import { IN_APP_CHANNEL, EMAIL_CHANNEL, NTFY_CHANNEL } from './channels';
import { UserOrganisationMembership } from '../user/user-organisation-membership.entity';
import { UserNotificationPreference } from './user-notification-preference.entity';
import { OrganisationNotificationConfig } from './organisation-notification-config.entity';
import { Screen } from '../screen/screen.entity';
import { Content } from '../content/content.entity';
import { ScreenStatusEvent } from '../screen/screen-status.event';
import {
  TranscodingCompletedEvent,
  TranscodingFailedEvent,
} from '../content/transcoding.event';

describe('NotificationHub Integration', () => {
  let module: TestingModule;
  let hub: NotificationHub;
  let listener: NotificationEventListener;

  let membershipRepo: Record<string, jest.Mock>;
  let userPrefService: Record<string, jest.Mock>;
  let orgConfigService: Record<string, jest.Mock>;
  let inAppChannel: { send: jest.Mock };
  let emailChannel: { send: jest.Mock };
  let ntfyChannel: { send: jest.Mock };
  let screenRepo: Record<string, jest.Mock>;
  let contentRepo: Record<string, jest.Mock>;

  const orgId = 'org-1';
  const user1Id = 'user-1';
  const user2Id = 'user-2';
  const user3Id = 'user-3';

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

  const baseEvent: NotificationEvent = {
    orgId,
    eventType: NotificationEventType.SCREEN_OFFLINE,
    title: 'Screen offline',
    message: 'Screen "Main Hall" has gone offline',
    resourceId: 'screen-1',
  };

  beforeEach(async () => {
    membershipRepo = { find: jest.fn() };
    userPrefService = { getForUser: jest.fn() };
    orgConfigService = { getForOrg: jest.fn() };
    inAppChannel = { send: jest.fn().mockResolvedValue(undefined) };
    emailChannel = { send: jest.fn().mockResolvedValue(undefined) };
    ntfyChannel = { send: jest.fn().mockResolvedValue(undefined) };
    screenRepo = { findOne: jest.fn() };
    contentRepo = { findOne: jest.fn() };

    module = await Test.createTestingModule({
      providers: [
        NotificationHub,
        NotificationEventListener,
        {
          provide: getRepositoryToken(UserOrganisationMembership),
          useValue: membershipRepo,
        },
        {
          provide: UserNotificationPreferenceService,
          useValue: userPrefService,
        },
        {
          provide: OrgNotificationConfigService,
          useValue: orgConfigService,
        },
        {
          provide: IN_APP_CHANNEL,
          useValue: inAppChannel,
        },
        {
          provide: EMAIL_CHANNEL,
          useValue: emailChannel,
        },
        {
          provide: NTFY_CHANNEL,
          useValue: ntfyChannel,
        },
        {
          provide: getRepositoryToken(Screen),
          useValue: screenRepo,
        },
        {
          provide: getRepositoryToken(Content),
          useValue: contentRepo,
        },
      ],
    }).compile();

    hub = module.get<NotificationHub>(NotificationHub);
    listener = module.get<NotificationEventListener>(NotificationEventListener);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('NotificationHub.dispatch()', () => {
    it('should call all three channels when user has all enabled and org is fully configured', async () => {
      membershipRepo.find.mockResolvedValue([makeMembership(user1Id)]);
      orgConfigService.getForOrg.mockResolvedValue(fullOrgConfig);
      userPrefService.getForUser.mockResolvedValue(
        makePrefs({
          inAppEnabled: true,
          emailEnabled: true,
          ntfyEnabled: true,
        }),
      );

      await hub.dispatch(baseEvent);

      const expectedPayload = {
        eventType: baseEvent.eventType,
        title: baseEvent.title,
        message: baseEvent.message,
        resourceId: baseEvent.resourceId,
      };

      expect(inAppChannel.send).toHaveBeenCalledWith(
        user1Id,
        orgId,
        expectedPayload,
      );
      expect(emailChannel.send).toHaveBeenCalledWith(
        user1Id,
        orgId,
        expectedPayload,
      );
      expect(ntfyChannel.send).toHaveBeenCalledWith(orgId, expectedPayload);
    });

    it('should call only InAppNotificationChannel.send() when only in-app is enabled', async () => {
      membershipRepo.find.mockResolvedValue([makeMembership(user1Id)]);
      orgConfigService.getForOrg.mockResolvedValue(fullOrgConfig);
      userPrefService.getForUser.mockResolvedValue(
        makePrefs({
          inAppEnabled: true,
          emailEnabled: false,
          ntfyEnabled: false,
        }),
      );

      await hub.dispatch(baseEvent);

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
        makePrefs({
          inAppEnabled: true,
          emailEnabled: true,
          ntfyEnabled: false,
        }),
      );

      await hub.dispatch(baseEvent);

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

      await hub.dispatch(baseEvent);

      expect(ntfyChannel.send).not.toHaveBeenCalled();
    });

    it('should handle multiple users with different preferences independently', async () => {
      membershipRepo.find.mockResolvedValue([
        makeMembership(user1Id),
        makeMembership(user2Id),
        makeMembership(user3Id),
      ]);
      orgConfigService.getForOrg.mockResolvedValue(fullOrgConfig);

      // User 1: all channels enabled
      // User 2: only email
      // User 3: only ntfy (but ntfy already sent for user 1)
      userPrefService.getForUser
        .mockResolvedValueOnce(
          makePrefs({
            inAppEnabled: true,
            emailEnabled: true,
            ntfyEnabled: true,
          }),
        )
        .mockResolvedValueOnce(
          makePrefs({
            inAppEnabled: false,
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

      await hub.dispatch(baseEvent);

      // User 1 gets in-app + email
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

      // User 2 gets email only
      expect(emailChannel.send).toHaveBeenCalledWith(
        user2Id,
        orgId,
        expect.any(Object),
      );

      // In-app called only once (user 1)
      expect(inAppChannel.send).toHaveBeenCalledTimes(1);
      // Email called twice (user 1 + user 2)
      expect(emailChannel.send).toHaveBeenCalledTimes(2);
      // Ntfy deduplication: sent only once despite user 1 and user 3 having it enabled
      expect(ntfyChannel.send).toHaveBeenCalledTimes(1);
    });

    it('should catch and log channel errors without affecting other channels', async () => {
      membershipRepo.find.mockResolvedValue([makeMembership(user1Id)]);
      orgConfigService.getForOrg.mockResolvedValue(fullOrgConfig);
      userPrefService.getForUser.mockResolvedValue(
        makePrefs({
          inAppEnabled: true,
          emailEnabled: true,
          ntfyEnabled: true,
        }),
      );

      inAppChannel.send.mockRejectedValue(new Error('in-app failed'));
      emailChannel.send.mockRejectedValue(new Error('email failed'));

      await expect(hub.dispatch(baseEvent)).resolves.toBeUndefined();

      // All channels were still called despite failures
      expect(inAppChannel.send).toHaveBeenCalledTimes(1);
      expect(emailChannel.send).toHaveBeenCalledTimes(1);
      expect(ntfyChannel.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('NotificationEventListener event handlers', () => {
    it('should dispatch correct payload for screen.offline event', async () => {
      jest.spyOn(hub, 'dispatch').mockResolvedValue(undefined);

      screenRepo.findOne.mockResolvedValue({
        id: 'screen-1',
        name: 'Lobby Display',
        location: 'Entrance',
        organisationId: orgId,
      });

      const event = new ScreenStatusEvent('screen-1', orgId, false);
      await listener.handleScreenStatusChanged(event);

      expect(hub.dispatch).toHaveBeenCalledWith({
        orgId,
        eventType: NotificationEventType.SCREEN_OFFLINE,
        title: 'Screen offline',
        message: 'Screen "Lobby Display" (Entrance) has gone offline.',
        resourceId: 'screen-1',
      });
    });

    it('should dispatch correct payload for screen.online event', async () => {
      jest.spyOn(hub, 'dispatch').mockResolvedValue(undefined);

      screenRepo.findOne.mockResolvedValue({
        id: 'screen-1',
        name: 'Lobby Display',
        location: 'Entrance',
        organisationId: orgId,
      });

      const event = new ScreenStatusEvent('screen-1', orgId, true);
      await listener.handleScreenStatusChanged(event);

      expect(hub.dispatch).toHaveBeenCalledWith({
        orgId,
        eventType: NotificationEventType.SCREEN_ONLINE,
        title: 'Screen online',
        message: 'Screen "Lobby Display" (Entrance) is back online.',
        resourceId: 'screen-1',
      });
    });

    it('should dispatch correct payload for transcoding.complete event', async () => {
      jest.spyOn(hub, 'dispatch').mockResolvedValue(undefined);

      contentRepo.findOne.mockResolvedValue({
        id: 'content-1',
        title: 'Welcome Video',
        organisationId: orgId,
      });

      const event = new TranscodingCompletedEvent('content-1', orgId, 2048);
      await listener.handleTranscodingCompleted(event);

      expect(hub.dispatch).toHaveBeenCalledWith({
        orgId,
        eventType: NotificationEventType.TRANSCODING_COMPLETE,
        title: 'Transcoding complete',
        message:
          'Content "Welcome Video" has finished transcoding and is ready to use.',
        resourceId: 'content-1',
      });
    });

    it('should dispatch correct payload for transcoding.failed event', async () => {
      jest.spyOn(hub, 'dispatch').mockResolvedValue(undefined);

      contentRepo.findOne.mockResolvedValue({
        id: 'content-1',
        title: 'Promo Clip',
        organisationId: orgId,
      });

      const event = new TranscodingFailedEvent(
        'content-1',
        orgId,
        'codec not supported',
      );
      await listener.handleTranscodingFailed(event);

      expect(hub.dispatch).toHaveBeenCalledWith({
        orgId,
        eventType: NotificationEventType.TRANSCODING_FAILED,
        title: 'Transcoding failed',
        message:
          'Content "Promo Clip" failed to transcode. Please re-upload the file.',
        resourceId: 'content-1',
      });
    });
  });
});
