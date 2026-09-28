import { Test, TestingModule } from '@nestjs/testing';
import { NotificationHub } from './notification-hub.service';
import { NotificationEventListener } from './notification-event-listener.service';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { NotificationEvent } from './notification-event.interface';
import { NotificationEventType } from './notification-event-type.enum';
import { IN_APP_CHANNEL, EMAIL_CHANNEL, NTFY_CHANNEL } from './channels';
import { ScreenStatusEvent } from '../screen/screen-status.event';
import { TranscodingCompletedEvent, TranscodingFailedEvent } from '../content/transcoding.event';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  users,
  userOrganisationMemberships,
  screens,
  contents,
  type Organisation,
  type User,
  type OrganisationNotificationConfig,
  type UserNotificationPreference,
} from '../db/schema';
import { OrganisationRole } from '../user/organisation-role.enum';
import { ContentType } from '../content/content-type.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('NotificationHub Integration', () => {
  let module: TestingModule;
  let hub: NotificationHub;
  let listener: NotificationEventListener;
  let db: DrizzleDB;

  let getForUser: jest.Mock;
  let getForOrg: jest.Mock;
  let inAppChannel: { send: jest.Mock };
  let emailChannel: { send: jest.Mock };
  let ntfyChannel: { send: jest.Mock };

  let org: Organisation;
  let user1: User;
  let user2: User;
  let user3: User;

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
    ntfyTopic: 'mynextscreen',
    ntfyToken: 'token-123',
  });

  let baseEvent: NotificationEvent;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    getForUser = jest.fn();
    getForOrg = jest.fn();
    inAppChannel = { send: jest.fn().mockResolvedValue(undefined) };
    emailChannel = { send: jest.fn().mockResolvedValue(undefined) };
    ntfyChannel = { send: jest.fn().mockResolvedValue(undefined) };

    module = await Test.createTestingModule({
      providers: [
        NotificationHub,
        NotificationEventListener,
        { provide: DRIZZLE, useValue: db },
        { provide: UserNotificationPreferenceService, useValue: { getForUser } },
        { provide: OrgNotificationConfigService, useValue: { getForOrg } },
        { provide: IN_APP_CHANNEL, useValue: inAppChannel },
        { provide: EMAIL_CHANNEL, useValue: emailChannel },
        { provide: NTFY_CHANNEL, useValue: ntfyChannel },
      ],
    }).compile();

    hub = module.get<NotificationHub>(NotificationHub);
    listener = module.get<NotificationEventListener>(NotificationEventListener);

    [org] = await db.insert(organisations).values({ name: 'Org', timeZone: 'UTC' }).returning();
    [user1] = await db.insert(users).values({ email: 'user1@example.com' }).returning();
    [user2] = await db.insert(users).values({ email: 'user2@example.com' }).returning();
    [user3] = await db.insert(users).values({ email: 'user3@example.com' }).returning();

    baseEvent = {
      orgId: org.id,
      eventType: NotificationEventType.SCREEN_OFFLINE,
      title: 'Screen offline',
      message: 'Screen "Main Hall" has gone offline',
      resourceId: 'screen-1',
    };
  });

  afterEach(async () => {
    await module.close();
  });

  async function addMembership(userId: string): Promise<void> {
    await db.insert(userOrganisationMemberships).values({
      userId,
      organisationId: org.id,
      role: OrganisationRole.Viewer,
    });
  }

  describe('NotificationHub.dispatch()', () => {
    it('should call all three channels when user has all enabled and org is fully configured', async () => {
      await addMembership(user1.id);
      getForOrg.mockResolvedValue(fullOrgConfig());
      getForUser.mockResolvedValue(
        makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: true }),
      );

      await hub.dispatch(baseEvent);

      const expectedPayload = {
        eventType: baseEvent.eventType,
        title: baseEvent.title,
        message: baseEvent.message,
        resourceId: baseEvent.resourceId,
      };
      expect(inAppChannel.send).toHaveBeenCalledWith(user1.id, org.id, expectedPayload);
      expect(emailChannel.send).toHaveBeenCalledWith(user1.id, org.id, expectedPayload);
      expect(ntfyChannel.send).toHaveBeenCalledWith(org.id, expectedPayload);
    });

    it('should call only InAppNotificationChannel.send() when only in-app is enabled', async () => {
      await addMembership(user1.id);
      getForOrg.mockResolvedValue(fullOrgConfig());
      getForUser.mockResolvedValue(
        makePrefs({ inAppEnabled: true, emailEnabled: false, ntfyEnabled: false }),
      );

      await hub.dispatch(baseEvent);

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

      await hub.dispatch(baseEvent);

      expect(inAppChannel.send).toHaveBeenCalledTimes(1);
      expect(emailChannel.send).not.toHaveBeenCalled();
    });

    it('should skip ntfy channel when org ntfy URL is missing', async () => {
      await addMembership(user1.id);
      getForOrg.mockResolvedValue({ ...fullOrgConfig(), ntfyUrl: null, ntfyTopic: null });
      getForUser.mockResolvedValue(
        makePrefs({ inAppEnabled: false, emailEnabled: false, ntfyEnabled: true }),
      );

      await hub.dispatch(baseEvent);

      expect(ntfyChannel.send).not.toHaveBeenCalled();
    });

    it('should handle multiple users with different preferences independently', async () => {
      await addMembership(user1.id);
      await addMembership(user2.id);
      await addMembership(user3.id);
      getForOrg.mockResolvedValue(fullOrgConfig());

      // User 1: all channels; User 2: only email; User 3: only ntfy (deduplicated)
      getForUser.mockImplementation((userId: string) => {
        if (userId === user1.id) {
          return Promise.resolve(
            makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: true }),
          );
        }
        if (userId === user2.id) {
          return Promise.resolve(
            makePrefs({ inAppEnabled: false, emailEnabled: true, ntfyEnabled: false }),
          );
        }
        return Promise.resolve(
          makePrefs({ inAppEnabled: false, emailEnabled: false, ntfyEnabled: true }),
        );
      });

      await hub.dispatch(baseEvent);

      expect(inAppChannel.send).toHaveBeenCalledWith(user1.id, org.id, expect.any(Object));
      expect(emailChannel.send).toHaveBeenCalledWith(user1.id, org.id, expect.any(Object));
      expect(emailChannel.send).toHaveBeenCalledWith(user2.id, org.id, expect.any(Object));
      expect(inAppChannel.send).toHaveBeenCalledTimes(1);
      expect(emailChannel.send).toHaveBeenCalledTimes(2);
      expect(ntfyChannel.send).toHaveBeenCalledTimes(1);
    });

    it('should catch and log channel errors without affecting other channels', async () => {
      await addMembership(user1.id);
      getForOrg.mockResolvedValue(fullOrgConfig());
      getForUser.mockResolvedValue(
        makePrefs({ inAppEnabled: true, emailEnabled: true, ntfyEnabled: true }),
      );

      inAppChannel.send.mockRejectedValue(new Error('in-app failed'));
      emailChannel.send.mockRejectedValue(new Error('email failed'));

      await expect(hub.dispatch(baseEvent)).resolves.toBeUndefined();

      expect(inAppChannel.send).toHaveBeenCalledTimes(1);
      expect(emailChannel.send).toHaveBeenCalledTimes(1);
      expect(ntfyChannel.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('NotificationEventListener event handlers', () => {
    async function seedScreen(name: string, location: string) {
      const [screen] = await db
        .insert(screens)
        .values({
          organisationId: org.id,
          name,
          resolution: '1920x1080',
          location,
          apiKeyHash: 'hash',
        })
        .returning();
      return screen;
    }

    async function seedContent(title: string) {
      const [content] = await db
        .insert(contents)
        .values({
          organisationId: org.id,
          title,
          type: ContentType.Video,
          originalFilename: 'file.mp4',
          originalMimeType: 'video/mp4',
          originalSizeBytes: 1024,
        })
        .returning();
      return content;
    }

    it('should dispatch correct payload for screen.offline event', async () => {
      jest.spyOn(hub, 'dispatch').mockResolvedValue(undefined);
      const screen = await seedScreen('Lobby Display', 'Entrance');

      const event = new ScreenStatusEvent(screen.id, org.id, false);
      await listener.handleScreenStatusChanged(event);

      expect(hub.dispatch).toHaveBeenCalledWith({
        orgId: org.id,
        eventType: NotificationEventType.SCREEN_OFFLINE,
        title: 'Screen offline',
        message: 'Screen "Lobby Display" (Entrance) has gone offline.',
        resourceId: screen.id,
      });
    });

    it('should dispatch correct payload for screen.online event', async () => {
      jest.spyOn(hub, 'dispatch').mockResolvedValue(undefined);
      const screen = await seedScreen('Lobby Display', 'Entrance');

      const event = new ScreenStatusEvent(screen.id, org.id, true);
      await listener.handleScreenStatusChanged(event);

      expect(hub.dispatch).toHaveBeenCalledWith({
        orgId: org.id,
        eventType: NotificationEventType.SCREEN_ONLINE,
        title: 'Screen online',
        message: 'Screen "Lobby Display" (Entrance) is back online.',
        resourceId: screen.id,
      });
    });

    it('should dispatch correct payload for transcoding.complete event', async () => {
      jest.spyOn(hub, 'dispatch').mockResolvedValue(undefined);
      const content = await seedContent('Welcome Video');

      const event = new TranscodingCompletedEvent(content.id, org.id, 2048);
      await listener.handleTranscodingCompleted(event);

      expect(hub.dispatch).toHaveBeenCalledWith({
        orgId: org.id,
        eventType: NotificationEventType.TRANSCODING_COMPLETE,
        title: 'Transcoding complete',
        message: 'Content "Welcome Video" has finished transcoding and is ready to use.',
        resourceId: content.id,
      });
    });

    it('should dispatch correct payload for transcoding.failed event', async () => {
      jest.spyOn(hub, 'dispatch').mockResolvedValue(undefined);
      const content = await seedContent('Promo Clip');

      const event = new TranscodingFailedEvent(content.id, org.id, 'codec not supported');
      await listener.handleTranscodingFailed(event);

      expect(hub.dispatch).toHaveBeenCalledWith({
        orgId: org.id,
        eventType: NotificationEventType.TRANSCODING_FAILED,
        title: 'Transcoding failed',
        message: 'Content "Promo Clip" failed to transcode. Please re-upload the file.',
        resourceId: content.id,
      });
    });
  });
});
