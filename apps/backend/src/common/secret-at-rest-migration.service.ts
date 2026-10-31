import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { ENCRYPTED_PREFIX, SecretCipher } from './secret-cipher.service';

/** One column that holds a recoverable secret, plus its `enc:v1:` CHECK constraint. */
export interface SecretColumn {
  readonly table: string;
  readonly idColumn: string;
  readonly column: string;
  readonly constraint: string;
}

/**
 * Every column that stores a recoverable secret. Physical (snake_case) names,
 * matching the CHECK constraints added in migration 0031. A new secret column
 * belongs here AND gets an `encryptedOnly(...)` check in `db/schema.ts`.
 */
export const SECRET_COLUMNS: readonly SecretColumn[] = [
  {
    table: 'organisation_notification_configs',
    idColumn: 'id',
    column: 'smtp_password',
    constraint: 'CHK_org_notification_config_smtp_password_encrypted',
  },
  {
    table: 'organisation_notification_configs',
    idColumn: 'id',
    column: 'ntfy_token',
    constraint: 'CHK_org_notification_config_ntfy_token_encrypted',
  },
  {
    table: 'screen_pairings',
    idColumn: 'id',
    column: 'api_key',
    constraint: 'CHK_screen_pairings_api_key_encrypted',
  },
  {
    table: 'screen_remote_controls',
    idColumn: 'screen_id',
    column: 'devmode_passphrase',
    constraint: 'CHK_screen_remote_controls_devmode_passphrase_encrypted',
  },
];

interface PlaintextRow extends Record<string, unknown> {
  id: string;
  value: string;
}

/**
 * Encrypts secrets that older releases stored in plaintext (they did so when no
 * `SECRETS_ENCRYPTION_KEY` was configured), then validates the per-column CHECK
 * constraints so Postgres rejects plaintext from then on.
 *
 * Runs once per boot from `main.ts`, after the SQL migrations and before the app
 * initialises (no cron, worker or HTTP request can touch these rows yet). It is
 * idempotent: an already-encrypted row is never selected, and validating an
 * already-valid constraint is a no-op. A SQL migration cannot do this, because
 * the key only exists in the backend's environment.
 *
 * Only counts are logged — never a value.
 */
@Injectable()
export class SecretAtRestMigrationService {
  private readonly logger = new Logger(SecretAtRestMigrationService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cipher: SecretCipher,
  ) {}

  /** Returns how many values were encrypted per `table.column`. */
  async run(): Promise<Record<string, number>> {
    const encrypted: Record<string, number> = {};
    for (const target of SECRET_COLUMNS) {
      const key = `${target.table}.${target.column}`;
      encrypted[key] = await this.encryptColumn(target);
      await this.validateConstraint(target);
    }
    const total = Object.values(encrypted).reduce((sum, n) => sum + n, 0);
    if (total > 0) {
      this.logger.warn(
        `Encrypted ${total} legacy plaintext secret(s): ${JSON.stringify(encrypted)}`,
      );
    }
    this.logger.log('All stored secrets are encrypted; CHECK constraints validated');
    return encrypted;
  }

  private async encryptColumn(target: SecretColumn): Promise<number> {
    const table = sql.identifier(target.table);
    const id = sql.identifier(target.idColumn);
    const column = sql.identifier(target.column);
    return this.db.transaction(async (tx) => {
      const result = await tx.execute<PlaintextRow>(sql`
        SELECT ${id}::text AS id, ${column} AS value FROM ${table}
        WHERE ${column} IS NOT NULL AND ${column} <> ''
          AND ${column} NOT LIKE ${`${ENCRYPTED_PREFIX}%`}
        FOR UPDATE`);
      for (const row of result.rows) {
        const envelope = this.cipher.encrypt(row.value);
        await tx.execute(
          sql`UPDATE ${table} SET ${column} = ${envelope} WHERE ${id}::text = ${row.id}`,
        );
      }
      return result.rows.length;
    });
  }

  private async validateConstraint(target: SecretColumn): Promise<void> {
    await this.db.execute(
      sql`ALTER TABLE ${sql.identifier(target.table)} VALIDATE CONSTRAINT ${sql.identifier(target.constraint)}`,
    );
  }
}
