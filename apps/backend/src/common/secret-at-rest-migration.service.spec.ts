import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, is, sql } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import type { DrizzleDB } from '../db/drizzle.types';
import * as schema from '../db/schema';
import {
  organisationNotificationConfigs,
  organisations,
  screenPairings,
  screenRemoteControls,
  screens,
} from '../db/schema';
import { closeTestDb, initTestDb, truncateAll } from '../test/db-harness';
import { createTestSecretCipher, expectCheckViolation } from '../test/secret-cipher.testing';
import { SecretCipher } from './secret-cipher.service';
import { SECRET_COLUMNS, SecretAtRestMigrationService } from './secret-at-rest-migration.service';

async function dropConstraints(db: DrizzleDB): Promise<void> {
  for (const target of SECRET_COLUMNS) {
    await db.execute(
      sql`ALTER TABLE ${sql.identifier(target.table)} DROP CONSTRAINT ${sql.identifier(target.constraint)}`,
    );
  }
}

/** The state migration 0031 leaves an upgraded install in: constraints NOT VALID. */
async function addConstraintsNotValid(db: DrizzleDB): Promise<void> {
  for (const target of SECRET_COLUMNS) {
    const column = sql.identifier(target.column);
    await db.execute(sql`ALTER TABLE ${sql.identifier(target.table)}
      ADD CONSTRAINT ${sql.identifier(target.constraint)}
      CHECK (${column} IS NULL OR ${column} = '' OR ${column} LIKE 'enc:v1:%') NOT VALID`);
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

describe('SECRET_COLUMNS', () => {
  it('lists exactly the encryptedOnly CHECK constraints declared in the schema', () => {
    const declared = Object.values(schema as Record<string, unknown>)
      .filter((value): value is PgTable => is(value, PgTable))
      .flatMap((table) => {
        const config = getTableConfig(table);
        return config.checks
          .filter((check) => check.name.endsWith('_encrypted'))
          .map((check) => `${config.name}:${check.name}`);
      })
      .sort();

    expect(SECRET_COLUMNS.map((t) => `${t.table}:${t.constraint}`).sort()).toEqual(declared);
  });
});

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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  interface LegacyRows {
    orgId: string;
    pairingId: string;
    screenId: string;
  }

  /** Plaintext in every secret column, as a keyless older release could have written it. */
  async function seedLegacyPlaintext(): Promise<LegacyRows> {
    await dropConstraints(db);
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
    const [screen] = await db
      .insert(screens)
      .values({
        organisationId: org.id,
        name: 'S',
        resolution: '1920x1080',
        location: 'L',
        apiKeyHash: '$2b$10$h',
      })
      .returning();
    await db.insert(screenRemoteControls).values({
      screenId: screen.id,
      organisationId: org.id,
      devmodePassphrase: 'AEBC72',
    });
    await addConstraintsNotValid(db);
    return { orgId: org.id, pairingId: pairing.id, screenId: screen.id };
  }

  it('encrypts legacy plaintext in every secret column and leaves empty values alone', async () => {
    const { orgId, pairingId, screenId } = await seedLegacyPlaintext();

    const counts = await service.run();

    expect(counts).toEqual({
      'organisation_notification_configs.smtp_password': 1,
      'organisation_notification_configs.ntfy_token': 0,
      'screen_pairings.api_key': 1,
      'screen_remote_controls.devmode_passphrase': 1,
    });
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
    const [remote] = await db
      .select()
      .from(screenRemoteControls)
      .where(eq(screenRemoteControls.screenId, screenId));
    expect(remote.devmodePassphrase).toMatch(/^enc:v1:/);
    expect(cipher.decrypt(remote.devmodePassphrase)).toBe('AEBC72');
  });

  it('validates every CHECK constraint so Postgres rejects plaintext afterwards', async () => {
    await seedLegacyPlaintext();
    expect(await constraintsValidated(db)).toEqual(SECRET_COLUMNS.map(() => false));

    await service.run();

    expect(await constraintsValidated(db)).toEqual(SECRET_COLUMNS.map(() => true));
    await expectCheckViolation(
      db.update(organisationNotificationConfigs).set({ smtpPassword: 'plaintext-again' }),
      'CHK_org_notification_config_smtp_password_encrypted',
    );
    await expectCheckViolation(
      db.update(screenRemoteControls).set({ devmodePassphrase: 'plaintext-again' }),
      'CHK_screen_remote_controls_devmode_passphrase_encrypted',
    );
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

  it('refuses to boot with a key that cannot read the stored secrets', async () => {
    await seedLegacyPlaintext();
    await service.run();
    const otherKey = Buffer.alloc(32, 9).toString('base64');
    const wrongKeyService = new SecretAtRestMigrationService(
      db,
      new SecretCipher(new ConfigService({ SECRETS_ENCRYPTION_KEY: otherKey })),
    );

    await expect(wrongKeyService.run()).rejects.toThrow(
      /SECRETS_ENCRYPTION_KEY does not match .*organisation_notification_configs\.smtp_password/,
    );
  });

  it('never logs a secret value', async () => {
    await seedLegacyPlaintext();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    await service.run();

    const logged = JSON.stringify([...warn.mock.calls, ...log.mock.calls]);
    expect(logged).not.toContain('legacy-smtp');
    expect(logged).not.toContain('legacy-api-key');
    expect(logged).not.toContain('AEBC72');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Encrypted 3 legacy'));
  });
});
