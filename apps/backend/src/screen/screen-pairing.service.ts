import { GoneException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt, timingSafeEqual } from 'crypto';
import { and, eq, gt, inArray, lt, or } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screenPairings, type ScreenPairing } from '../db/schema';
import { generatePairingSecret, sha256hex } from './api-key.util';

/** TTL of a freshly-created pairing (15 minutes). */
const PAIRING_TTL_MS = 15 * 60 * 1000;
/** Max attempts to find a non-colliding 6-digit code. */
const MAX_CODE_ATTEMPTS = 10;

/** Body returned to the player when it starts pairing. */
export interface StartedPairing {
  pairingId: string;
  code: string;
  expiresAt: Date;
  pairingSecret: string;
}

/** Status returned to the polling player. */
export type PairingStatusResult =
  | { status: 'pending' }
  | {
      status: 'claimed';
      apiKey: string;
      screenId: string;
      organisationId: string;
    };

@Injectable()
export class ScreenPairingService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Create a new pending pairing: a 6-digit numeric code the admin types in,
   * plus a high-entropy secret the player keeps to poll status. Only the
   * SHA-256 of the secret is persisted; the raw secret is returned once.
   */
  async startPairing(): Promise<StartedPairing> {
    const code = await this.generateUniqueCode();
    const secret = generatePairingSecret();
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);

    const [row] = await this.db
      .insert(screenPairings)
      .values({
        code,
        pairingSecretHash: sha256hex(secret),
        status: 'pending',
        expiresAt,
      })
      .returning();

    return { pairingId: row.id, code: row.code, expiresAt: row.expiresAt, pairingSecret: secret };
  }

  /**
   * Poll a pairing's status by id, authenticated by the high-entropy secret.
   * - missing row / wrong secret → 404 (no oracle for guessing ids).
   * - expired or already consumed → 410 Gone.
   * - pending → `{ status: 'pending' }`.
   * - claimed → returns the apiKey + ids once, then transitions to consumed
   *   and nulls the apiKey (single-delivery).
   */
  async getStatus(pairingId: string, secret: string | undefined): Promise<PairingStatusResult> {
    const [row] = await this.db
      .select()
      .from(screenPairings)
      .where(eq(screenPairings.id, pairingId))
      .limit(1);

    if (!row || !this.secretMatches(secret, row.pairingSecretHash)) {
      throw new NotFoundException('Pairing not found');
    }

    if (row.status === 'consumed') {
      throw new GoneException('Pairing already consumed');
    }

    if (row.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('Pairing expired');
    }

    if (row.status === 'pending') {
      return { status: 'pending' };
    }

    // status === 'claimed' — deliver the key exactly once, then consume.
    // Atomic guard: flip status to 'consumed' only if it is still 'claimed',
    // and read back the (pre-null) apiKey in the same statement. Two concurrent
    // polls can no longer both read the key: only the caller whose guarded
    // UPDATE matches `status = 'claimed'` gets a returning row; the loser's
    // WHERE matches zero rows → empty returning → 410 Gone below. The apiKey is
    // nulled in a follow-up UPDATE so it is not persisted after delivery.
    const [claimed] = await this.db
      .update(screenPairings)
      .set({ status: 'consumed' })
      .where(and(eq(screenPairings.id, row.id), eq(screenPairings.status, 'claimed')))
      .returning({
        apiKey: screenPairings.apiKey,
        screenId: screenPairings.screenId,
        organisationId: screenPairings.organisationId,
      });

    if (!claimed || !claimed.apiKey || !claimed.screenId || !claimed.organisationId) {
      // Lost the race (another poll consumed it) or a claimed row missing its
      // fields — treat as already consumed.
      throw new GoneException('Pairing already consumed');
    }

    const result: PairingStatusResult = {
      status: 'claimed',
      apiKey: claimed.apiKey,
      screenId: claimed.screenId,
      organisationId: claimed.organisationId,
    };

    // Drop the plaintext key now that it has been delivered to the one caller.
    await this.db.update(screenPairings).set({ apiKey: null }).where(eq(screenPairings.id, row.id));

    return result;
  }

  /**
   * Find a pending, non-expired pairing by its 6-digit code.
   * Returns null when none matches (caller decides the error shape).
   */
  async findClaimableByCode(code: string): Promise<ScreenPairing | null> {
    const [row] = await this.db
      .select()
      .from(screenPairings)
      .where(
        and(
          eq(screenPairings.code, code),
          eq(screenPairings.status, 'pending'),
          gt(screenPairings.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /**
   * Mark a pairing as claimed, attaching the created screen, its org, and the
   * plaintext apiKey (transient — nulled on first delivery to the player).
   */
  async markClaimed(
    pairingId: string,
    screenId: string,
    organisationId: string,
    apiKey: string,
  ): Promise<void> {
    await this.db
      .update(screenPairings)
      .set({ status: 'claimed', screenId, organisationId, apiKey })
      .where(eq(screenPairings.id, pairingId));
  }

  /**
   * Attach a freshly-regenerated plaintext apiKey to a pending pairing so a
   * re-opened display can pull the new token. Reuses the claim transition.
   */
  async attachRepairKey(
    code: string,
    screenId: string,
    organisationId: string,
    apiKey: string,
  ): Promise<ScreenPairing | null> {
    const pairing = await this.findClaimableByCode(code);
    if (!pairing) {
      return null;
    }
    await this.markClaimed(pairing.id, screenId, organisationId, apiKey);
    return pairing;
  }

  /**
   * Delete pairings that are no longer useful: expired pending rows and any
   * consumed rows. Returns the number of rows removed.
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    const deleted = await this.db
      .delete(screenPairings)
      .where(
        or(
          eq(screenPairings.status, 'consumed'),
          and(eq(screenPairings.status, 'pending'), lt(screenPairings.expiresAt, now)),
        ),
      )
      .returning({ id: screenPairings.id });
    return deleted.length;
  }

  /** Constant-time compare of the provided secret against the stored hash. */
  private secretMatches(secret: string | undefined, storedHash: string): boolean {
    if (!secret) {
      return false;
    }
    const candidate = Buffer.from(sha256hex(secret), 'hex');
    const stored = Buffer.from(storedHash, 'hex');
    if (candidate.length !== stored.length) {
      return false;
    }
    return timingSafeEqual(candidate, stored);
  }

  /** Generate a 6-digit numeric code, retrying on collision with an active row. */
  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = this.randomSixDigitCode();
      const active = await this.db
        .select({ id: screenPairings.id })
        .from(screenPairings)
        .where(
          and(
            eq(screenPairings.code, code),
            inArray(screenPairings.status, ['pending', 'claimed']),
            gt(screenPairings.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (active.length === 0) {
        return code;
      }
    }
    throw new Error('Could not allocate a unique pairing code');
  }

  private randomSixDigitCode(): string {
    // CSPRNG (crypto.randomInt) so pairing codes are not predictable.
    return randomInt(100000, 1000000).toString();
  }
}
