import { Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { DrizzleDB } from '../db/drizzle.types';
import { organisationNotificationConfigs, organisations, screenPairings } from '../db/schema';
import { closeTestDb, initTestDb, truncateAll } from '../test/db-harness';
import { createTestSecretCipher } from '../test/secret-cipher.testing';
import { SECRET_COLUMNS, SecretAtRestMigrationService } from './secret-at-rest-migration.service';

async function disableConstraints(db: DrizzleDB): Promise<void> {
  for (const target of SECRET_COLUMNS) {
    await db.execute(
      sql`ALTER TABLE ${sql.identifier(target.table)} DROP CONSTRAINT ${sql.identifier(target.constraint)}`,
    );
  }
}

async function constraintsValidated(db: DrizzleDB): Promise<boolean[]> {
  const result = await db.execute<{ convalidated: boolean }>(sql`
    SELECT convalidated FROM pg_constraint
    WHERE conname IN (${sql.join(
      SECRET_COLUMNS.map((t) => sql`${t.constraint}`),
      sql`, `,
    )})`);
  return result.rows.map((r) => r.convalidated);
}

describe('SecretAtRestMigrationService', () => {
  let db: DrizzleDB;
  const cipher = createTestSecretCipher();
  let service: SecretAtRestMigrationService;

  beforeAll(async () => {
    db = await initTestDb();
    service = new SecretAtRestMigrationService(db, cipher);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  async function seedLegacyPlaintext(): Promise<{ orgId: string; pairingId: string }> {
    // Plaintext could only get in before 0031; afterwards an upgraded install
    // carries the constraints NOT VALID — reproduce exactly that state.
    await disableConstraints(db);
    const [org] = await db
      .insert(organisations)
      .values({ name: 'Org', timeZone: 'UTC' })
      .returning();
    await db.insert(organisationNotificationConfigs).values({
      organisationId: org.id,
      smtpPassword: 'legacy-smtp',
      ntfyToken: '',
    });
    const [pairing] = await db
      .insert(screenPairings)
      .values({
        code: '123456',
        pairingSecretHash: 'h',
        apiKey: 'legacy-api-key',
        expiresAt: new Date(Date.now() + 60_000),
      })
      .returning();
    await addConstraintsNotValid();
    return { orgId: org.id, pairingId: pairing.id };
  }

  async function addConstraintsNotValid(): Promise<void> {
    for (const target of SECRET_COLUMNS) {
      const column = sql.identifier(target.column);
      await db.execute(sql`ALTER TABLE ${sql.identifier(target.table)}
        ADD CONSTRAINT ${sql.identifier(target.constraint)}
        CHECK (${column} IS NULL OR ${column} = '' OR ${column} LIKE 'enc:v1:%') NOT VALID`);
    }
  }

  it('encrypts legacy plaintext secrets and leaves empty values alone', async () => {
    const { orgId, pairingId } = await seedLegacyPlaintext();

    const counts = await service.run();

    expect(counts['organisation_notification_configs.smtp_password']).toBe(1);
    expect(counts['organisation_notification_configs.ntfy_token']).toBe(0);
    expect(counts['screen_pairings.api_key']).toBe(1);
    const [config] = await db
      .select()
      .from(organisationNotificationConfigs)
      .where(eq(organisationNotificationConfigs.organisationId, orgId));
    expect(config.smtpPassword).toMatch(/^enc:v1:/);
    expect(cipher.decrypt(config.smtpPassword)).toBe('legacy-smtp');
    expect(config.ntfyToken).toBe('');
    const [pairing] = await db
      .select()
      .from(screenPairings)
      .where(eq(screenPairings.id, pairingId));
    expect(cipher.decrypt(pairing.apiKey)).toBe('legacy-api-key');
  });

  it('validates every CHECK constraint so Postgres rejects plaintext afterwards', async () => {
    await seedLegacyPlaintext();
    expect(await constraintsValidated(db)).toEqual(SECRET_COLUMNS.map(() => false));

    await service.run();

    expect(await constraintsValidated(db)).toEqual(SECRET_COLUMNS.map(() => true));
    await expect(
      db.update(organisationNotificationConfigs).set({ smtpPassword: 'plaintext-again' }),
    ).rejects.toThrow();
  });

  it('is idempotent: a second run encrypts nothing and keeps the ciphertext', async () => {
    const { orgId } = await seedLegacyPlaintext();
    await service.run();
    const [before] = await db
      .select()
      .from(organisationNotificationConfigs)
      .where(eq(organisationNotificationConfigs.organisationId, orgId));

    const counts = await service.run();

    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
    const [after] = await db
      .select()
      .from(organisationNotificationConfigs)
      .where(eq(organisationNotificationConfigs.organisationId, orgId));
    expect(after.smtpPassword).toBe(before.smtpPassword);
  });

  it('never logs a secret value', async () => {
    await seedLegacyPlaintext();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    await service.run();

    const logged = JSON.stringify([...warn.mock.calls, ...log.mock.calls]);
    expect(logged).not.toContain('legacy-smtp');
    expect(logged).not.toContain('legacy-api-key');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Encrypted 2 legacy'));
    warn.mockRestore();
    log.mockRestore();
  });
});
