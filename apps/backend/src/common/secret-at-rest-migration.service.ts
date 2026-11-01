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
 * matching the CHECK constraints added in migrations 0031 and 0032. A new
 * secret column belongs here AND gets an `…_encrypted` check in `db/schema.ts`.
 * `user_mfa` never held plaintext (its check is valid from the start); it is
 * listed so a wrong key is caught at boot for TOTP secrets as well.
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
  {
    table: 'user_mfa',
    idColumn: 'user_id',
    column: 'totp_secret_enc',
    constraint: 'CHK_user_mfa_totp_secret_encrypted',
  },
];

interface PlaintextRow extends Record<string, unknown> {
  /** uuid primary key, compared as uuid in the UPDATE (index-friendly). */
  id: string;
  value: string;
}

/**
 * Encrypts secrets that older releases stored in plaintext (they did so when no
 * `SECRETS_ENCRYPTION_KEY` was configured), then validates the per-column CHECK
 * constraints so Postgres rejects plaintext from then on.
 *
 * Runs once per boot from `main.ts`, after the SQL migrations and before the app
 * initialises (no cron, worker or HTTP request can touch these rows yet). Old
 * and new backend versions must not run side by side across this upgrade. It is
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

  /**
   * Fails boot if the configured key cannot read what is stored, then encrypts
   * legacy plaintext and validates the constraints. Returns how many values
   * were encrypted per `table.column`.
   */
  async run(): Promise<Record<string, number>> {
    for (const target of SECRET_COLUMNS) {
      await this.assertKeyMatches(target);
    }
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
        SELECT ${id} AS id, ${column} AS value FROM ${table}
        WHERE ${column} IS NOT NULL AND ${column} <> ''
          AND ${column} NOT LIKE ${`${ENCRYPTED_PREFIX}%`}
        FOR UPDATE`);
      for (const row of result.rows) {
        const envelope = this.cipher.encrypt(row.value);
        await tx.execute(sql`UPDATE ${table} SET ${column} = ${envelope} WHERE ${id} = ${row.id}`);
      }
      return result.rows.length;
    });
  }

  /**
   * A wrong or rotated `SECRETS_ENCRYPTION_KEY` must not boot cleanly and fail
   * later at the first SMTP send or pairing: decrypt one stored value per column
   * and stop with a clear message (never the value) if the GCM tag does not match.
   */
  private async assertKeyMatches(target: SecretColumn): Promise<void> {
    const column = sql.identifier(target.column);
    const result = await this.db.execute<{ value: string }>(sql`
      SELECT ${column} AS value FROM ${sql.identifier(target.table)}
      WHERE ${column} LIKE ${`${ENCRYPTED_PREFIX}%`}
      LIMIT 1`);
    const sample = result.rows[0];
    if (!sample) {
      return;
    }
    try {
      this.cipher.decrypt(sample.value);
    } catch {
      throw new Error(
        `SECRETS_ENCRYPTION_KEY does not match the key the stored secrets were encrypted with (${target.table}.${target.column}). Restore the original key; replacing it makes every stored secret unreadable.`,
      );
    }
  }

  private async validateConstraint(target: SecretColumn): Promise<void> {
    await this.db.execute(
      sql`ALTER TABLE ${sql.identifier(target.table)} VALIDATE CONSTRAINT ${sql.identifier(target.constraint)}`,
    );
  }
}
