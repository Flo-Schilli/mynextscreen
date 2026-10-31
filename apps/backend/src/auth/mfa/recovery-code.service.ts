import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../../db/database.constants';
import type { DrizzleDB } from '../../db/drizzle.types';
import { userMfaRecoveryCodes } from '../../db/schema';
import { hashToken } from '../token-hash.util';
import { RECOVERY_CODE_COUNT } from './mfa.constants';

/** Runs on the root client or inside `db.transaction(tx => …)`. */
type DrizzleExecutor = Pick<DrizzleDB, 'insert' | 'delete' | 'update' | 'select'>;

/** RFC 4648 Base32 alphabet, lower case: no 0/1/8/9 to confuse with O/I/B/g. */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';
const HALF_LENGTH = 5;
/** Accepts `xxxxx-xxxxx`, with or without dash, any case, surrounding blanks. */
export const RECOVERY_CODE_PATTERN = /^\s*[a-z2-7]{5}-?[a-z2-7]{5}\s*$/i;

/**
 * One-time recovery codes: 10 × 10 Base32 characters (50 bits each), shown in
 * plaintext exactly once and stored only as SHA-256. SHA-256 rather than
 * bcrypt for the same reason as the mailed tokens: the input is CSPRNG output,
 * there is nothing to brute-force, and redemption must be an indexed equality.
 */
@Injectable()
export class RecoveryCodeService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /** Fresh plaintext codes in display format (`xxxxx-xxxxx`). */
  generate(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => generateCode());
  }

  /** Replace every code of the user (used and unused) with `codes`. */
  async replaceAll(
    userId: string,
    codes: readonly string[],
    executor: DrizzleExecutor = this.db,
  ): Promise<void> {
    await executor.delete(userMfaRecoveryCodes).where(eq(userMfaRecoveryCodes.userId, userId));
    await executor
      .insert(userMfaRecoveryCodes)
      .values(codes.map((code) => ({ userId, codeHash: hashRecoveryCode(code) })));
  }

  async deleteAll(userId: string, executor: DrizzleExecutor = this.db): Promise<void> {
    await executor.delete(userMfaRecoveryCodes).where(eq(userMfaRecoveryCodes.userId, userId));
  }

  /**
   * Redeem a code. Atomic: the `used_at IS NULL` predicate inside the UPDATE
   * means two concurrent redemptions of the same code cannot both succeed.
   */
  async consume(userId: string, code: string): Promise<boolean> {
    if (!RECOVERY_CODE_PATTERN.test(code)) {
      return false;
    }
    const rows = await this.db
      .update(userMfaRecoveryCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(userMfaRecoveryCodes.userId, userId),
          eq(userMfaRecoveryCodes.codeHash, hashRecoveryCode(code)),
          isNull(userMfaRecoveryCodes.usedAt),
        ),
      )
      .returning({ id: userMfaRecoveryCodes.id });
    return rows.length > 0;
  }

  async countRemaining(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ remaining: count() })
      .from(userMfaRecoveryCodes)
      .where(and(eq(userMfaRecoveryCodes.userId, userId), isNull(userMfaRecoveryCodes.usedAt)));
    return row?.remaining ?? 0;
  }
}

/** Canonical form (lower case, no dash/blanks) so formatting never matters. */
export function hashRecoveryCode(code: string): string {
  return hashToken(code.replace(/[\s-]/g, '').toLowerCase());
}

function generateCode(): string {
  // 32 symbols = 5 bits, so `byte & 31` is unbiased.
  const chars = Array.from(randomBytes(HALF_LENGTH * 2), (byte) => ALPHABET[byte & 31]);
  return `${chars.slice(0, HALF_LENGTH).join('')}-${chars.slice(HALF_LENGTH).join('')}`;
}
