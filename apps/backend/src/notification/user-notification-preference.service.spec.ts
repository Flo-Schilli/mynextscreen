import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { UserNotificationPreferenceService } from './user-notification-preference.service';
import { DRIZZLE } from '../db/database.constants';
import { users, userNotificationPreferences, type User } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('UserNotificationPreferenceService', () => {
  let service: UserNotificationPreferenceService;
  let db: DrizzleDB;
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

    [user] = await db.insert(users).values({ email: 'user@example.com' }).returning();
  });

  async function findPref() {
    const [pref] = await db
      .select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, user.id));
    return pref;
  }

  describe('getForUser', () => {
    it('should return existing preference', async () => {
      const [existing] = await db
        .insert(userNotificationPreferences)
        .values({
          userId: user.id,
          inAppEnabled: true,
          emailEnabled: true,
          ntfyEnabled: false,
        })
        .returning();

      const result = await service.getForUser(user.id);

      expect(result.id).toBe(existing.id);
      expect(result.emailEnabled).toBe(true);
    });

    it('should create default preference if none exists', async () => {
      const result = await service.getForUser(user.id);

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
        inAppEnabled: true,
        emailEnabled: false,
        ntfyEnabled: false,
      });

      const result = await service.upsert(user.id, { emailEnabled: true });

      expect(result.emailEnabled).toBe(true);
      const persisted = await findPref();
      expect(persisted.emailEnabled).toBe(true);
    });

    it('should only update provided fields', async () => {
      await db.insert(userNotificationPreferences).values({
        userId: user.id,
        inAppEnabled: true,
        emailEnabled: false,
        ntfyEnabled: false,
      });

      await service.upsert(user.id, { ntfyEnabled: true });

      const persisted = await findPref();
      expect(persisted.ntfyEnabled).toBe(true);
      expect(persisted.inAppEnabled).toBe(true);
      expect(persisted.emailEnabled).toBe(false);
    });

    it('should create new preference if none exists', async () => {
      const result = await service.upsert(user.id, { emailEnabled: true });

      expect(result.inAppEnabled).toBe(true);
      expect(result.emailEnabled).toBe(true);
      expect(result.ntfyEnabled).toBe(false);

      const persisted = await findPref();
      expect(persisted.id).toBe(result.id);
    });
  });
});
