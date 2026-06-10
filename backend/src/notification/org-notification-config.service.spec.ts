import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { OrgNotificationConfigService } from './org-notification-config.service';
import { DRIZZLE } from '../db/database.constants';
import { organisations, organisationNotificationConfigs, type Organisation } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('OrgNotificationConfigService', () => {
  let service: OrgNotificationConfigService;
  let db: DrizzleDB;
  let org: Organisation;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrgNotificationConfigService, { provide: DRIZZLE, useValue: db }],
    }).compile();
    service = module.get<OrgNotificationConfigService>(OrgNotificationConfigService);

    [org] = await db.insert(organisations).values({ name: 'Org', timeZone: 'UTC' }).returning();
  });

  async function seedConfig() {
    const [config] = await db
      .insert(organisationNotificationConfigs)
      .values({
        organisationId: org.id,
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        smtpUser: 'user@example.com',
        smtpPassword: 'secret',
        smtpFrom: 'noreply@example.com',
        smtpSecure: false,
        ntfyUrl: 'https://ntfy.sh',
        ntfyTopic: 'my-topic',
        ntfyToken: 'token123',
      })
      .returning();
    return config;
  }

  async function readConfig() {
    const [config] = await db
      .select()
      .from(organisationNotificationConfigs)
      .where(eq(organisationNotificationConfigs.organisationId, org.id));
    return config;
  }

  describe('getForOrg', () => {
    it('should return config if exists', async () => {
      const seeded = await seedConfig();

      const result = await service.getForOrg(org.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(seeded.id);
      expect(result?.smtpHost).toBe('smtp.example.com');
    });

    it('should return null if no config exists', async () => {
      const result = await service.getForOrg(org.id);

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should update existing config fields', async () => {
      await seedConfig();

      await service.upsert(org.id, { smtpHost: 'new-host.example.com' });

      const persisted = await readConfig();
      expect(persisted.smtpHost).toBe('new-host.example.com');
    });

    it('should preserve existing password when blank password is provided', async () => {
      await seedConfig();

      // A blank password means "keep existing"; it is sent alongside other edits
      // (as the config form always does), so the existing secret is untouched.
      await service.upsert(org.id, { smtpUser: 'changed@example.com', smtpPassword: '' });

      const persisted = await readConfig();
      expect(persisted.smtpPassword).toBe('secret');
      expect(persisted.smtpUser).toBe('changed@example.com');
    });

    it('should update password when non-blank value is provided', async () => {
      await seedConfig();

      await service.upsert(org.id, { smtpPassword: 'new-secret' });

      const persisted = await readConfig();
      expect(persisted.smtpPassword).toBe('new-secret');
    });

    it('should preserve existing ntfy token when blank token is provided', async () => {
      await seedConfig();

      // A blank token means "keep existing"; sent alongside other edits, the
      // existing token is preserved while the other field is updated.
      await service.upsert(org.id, { ntfyTopic: 'new-topic', ntfyToken: '' });

      const persisted = await readConfig();
      expect(persisted.ntfyToken).toBe('token123');
      expect(persisted.ntfyTopic).toBe('new-topic');
    });

    it('should no-op when only a blank secret is sent (no values to set)', async () => {
      const seeded = await seedConfig();

      // Only a blank secret reaches the service: every branch is skipped, so the
      // update payload is empty. Drizzle's .set({}) would throw "No values to set"
      // without the guard — instead we keep the row untouched and return it as-is.
      const result = await service.upsert(org.id, { smtpPassword: '' });

      expect(result.id).toBe(seeded.id);
      expect(result.smtpPassword).toBe('secret');

      const persisted = await readConfig();
      expect(persisted.smtpPassword).toBe('secret');
      expect(persisted.smtpHost).toBe('smtp.example.com');
    });

    it('should create new config if none exists', async () => {
      const result = await service.upsert(org.id, {
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
      });

      expect(result.organisationId).toBe(org.id);
      expect(result.smtpHost).toBe('smtp.example.com');
      expect(result.smtpPort).toBe(587);
      expect(result.smtpUser).toBeNull();
      expect(result.smtpPassword).toBeNull();
      expect(result.smtpSecure).toBe(false);
      expect(result.ntfyToken).toBeNull();

      const persisted = await readConfig();
      expect(persisted.id).toBe(result.id);
    });
  });
});
