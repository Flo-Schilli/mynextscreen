import { Test, TestingModule } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  users,
  userNotificationPreferences,
  type Organisation,
  type User,
} from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('UserNotificationPreferenceService', () => {
  let service: UserNotificationPreferenceService;
  let db: DrizzleDB;
  let org: Organisation;
  let user: User;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserNotificationPreferenceService, { provide: DRIZZLE, useValue: db }],
    }).compile();
    service = module.get<UserNotificationPreferenceService>(UserNotificationPreferenceService);

    [org] = await db.insert(organisations).values({ name: 'Org', timeZone: 'UTC' }).returning();
    [user] = await db.insert(users).values({ email: 'user@example.com' }).returning();
  });

  async function findPref() {
    const [pref] = await db
      .select()
      .from(userNotificationPreferences)
      .where(
        and(
          eq(userNotificationPreferences.userId, user.id),
          eq(userNotificationPreferences.organisationId, org.id),
        ),
      );
    return pref;
  }

  describe('getForUser', () => {
    it('should return existing preference', async () => {
      const [existing] = await db
        .insert(userNotificationPreferences)
        .values({
          userId: user.id,
          organisationId: org.id,
          inAppEnabled: true,
          emailEnabled: true,
          ntfyEnabled: false,
        })
        .returning();

      const result = await service.getForUser(user.id, org.id);

      expect(result.id).toBe(existing.id);
      expect(result.emailEnabled).toBe(true);
    });

    it('should create default preference if none exists', async () => {
      const result = await service.getForUser(user.id, org.id);

      expect(result.inAppEnabled).toBe(true);
      expect(result.emailEnabled).toBe(false);
      expect(result.ntfyEnabled).toBe(false);

      const persisted = await findPref();
      expect(persisted).toBeDefined();
      expect(persisted.id).toBe(result.id);
    });
  });

  describe('upsert', () => {
    it('should update existing preference', async () => {
      await db.insert(userNotificationPreferences).values({
        userId: user.id,
        organisationId: org.id,
        inAppEnabled: true,
        emailEnabled: false,
        ntfyEnabled: false,
      });

      const result = await service.upsert(user.id, org.id, { emailEnabled: true });

      expect(result.emailEnabled).toBe(true);
      const persisted = await findPref();
      expect(persisted.emailEnabled).toBe(true);
    });

    it('should only update provided fields', async () => {
      await db.insert(userNotificationPreferences).values({
        userId: user.id,
        organisationId: org.id,
        inAppEnabled: true,
        emailEnabled: false,
        ntfyEnabled: false,
      });

      await service.upsert(user.id, org.id, { ntfyEnabled: true });

      const persisted = await findPref();
      expect(persisted.ntfyEnabled).toBe(true);
      expect(persisted.inAppEnabled).toBe(true);
      expect(persisted.emailEnabled).toBe(false);
    });

    it('should create new preference if none exists', async () => {
      const result = await service.upsert(user.id, org.id, { emailEnabled: true });

      expect(result.inAppEnabled).toBe(true);
      expect(result.emailEnabled).toBe(true);
      expect(result.ntfyEnabled).toBe(false);

      const persisted = await findPref();
      expect(persisted.id).toBe(result.id);
    });
  });
});
