import { randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { screenSessions } from '../db/schema';
import { hashToken } from '../auth/token-hash.util';
import { TokenService } from '../auth/token.service';
import type { IssuedAccessToken } from '../auth/token.types';

/**
 * Screen sessions: a short-lived access token plus a rotating refresh token,
 * so the screen API key is only ever used once, to enrol.
 *
 * Two decisions here are load-bearing and were made against specific failure
 * modes, not for elegance:
 *
 * - **Refresh tokens live in Postgres.** In Redis, a lost snapshot window would
 *   leave every screen that rotated inside it holding a token the server has
 *   never seen — and once the API key is gone from the device, recovery is a
 *   visit per display.
 * - **A concurrent refresh is not an attack.** A player has five independent
 *   consumers (state, heartbeat, SSE, HLS, media) that all hit 401 at the same
 *   moment. Whoever comes second presents an already-consumed token. Within
 *   {@link GRACE_WINDOW_MS} that mints another successor in the same family;
 *   only outside it is the presentation treated as a replay — and even then the
 *   family is *not* revoked, because a replay buys read access to one playlist
 *   while a revocation buys a service call.
 */
const GRACE_WINDOW_MS = 60_000;

/**
 * 180 days, sliding. An offline screen cannot be revoked anyway, so a short
 * expiry buys little and costs re-pairing for anything seasonal.
 */
const REFRESH_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export interface ScreenSessionTokens {
  accessToken: IssuedAccessToken;
  refreshToken: string;
  /** Seconds, never an absolute instant: a TV clock may be days off. */
  expiresIn: number;
}

export type ScreenRefreshResult =
  | { status: 'ok'; tokens: ScreenSessionTokens; screenId: string }
  | { status: 'replayed'; screenId: string; familyId: string }
  | { status: 'unknown' };

@Injectable()
export class ScreenSessionService {
  private readonly logger = new Logger(ScreenSessionService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly tokens: TokenService,
  ) {}

  /** Exchanges an enrolment credential for a fresh session (new family). */
  async createSession(screenId: string, organisationId: string): Promise<ScreenSessionTokens> {
    return this.issue(screenId, organisationId, randomUUID());
  }

  /**
   * Rotates a refresh token. The row is never updated in place: it is marked
   * consumed and a successor is inserted, so the consumed row remains as the
   * tombstone that tells a replay from a race.
   */
  async refresh(rawToken: string): Promise<ScreenRefreshResult> {
    const tokenHash = hashToken(rawToken);

    const [consumed] = await this.db
      .update(screenSessions)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(screenSessions.tokenHash, tokenHash),
          isNull(screenSessions.consumedAt),
          sql`${screenSessions.expiresAt} > now()`,
        ),
      )
      .returning({
        screenId: screenSessions.screenId,
        organisationId: screenSessions.organisationId,
        familyId: screenSessions.familyId,
      });

    if (consumed) {
      return {
        status: 'ok',
        screenId: consumed.screenId,
        tokens: await this.issue(consumed.screenId, consumed.organisationId, consumed.familyId),
      };
    }

    // Nothing was rotated: either the token is unknown/expired, or it was
    // already consumed — which is the normal outcome of parallel refreshes.
    const [existing] = await this.db
      .select({
        screenId: screenSessions.screenId,
        organisationId: screenSessions.organisationId,
        familyId: screenSessions.familyId,
        consumedAt: screenSessions.consumedAt,
        expiresAt: screenSessions.expiresAt,
      })
      .from(screenSessions)
      .where(eq(screenSessions.tokenHash, tokenHash))
      .limit(1);

    if (!existing || !existing.consumedAt || existing.expiresAt.getTime() <= Date.now()) {
      return { status: 'unknown' };
    }

    const consumedAgoMs = Date.now() - existing.consumedAt.getTime();
    if (consumedAgoMs <= GRACE_WINDOW_MS) {
      return {
        status: 'ok',
        screenId: existing.screenId,
        tokens: await this.issue(existing.screenId, existing.organisationId, existing.familyId),
      };
    }

    this.logger.warn(
      `Replayed screen refresh token for screen ${existing.screenId} (consumed ${Math.round(
        consumedAgoMs / 1000,
      )}s ago) — refused, family left intact`,
    );
    return { status: 'replayed', screenId: existing.screenId, familyId: existing.familyId };
  }

  /**
   * Ends every session of a screen. Called when its API key is regenerated;
   * deleting the screen itself is handled by the foreign key.
   */
  async revokeForScreen(screenId: string): Promise<number> {
    const revoked = await this.db
      .delete(screenSessions)
      .where(eq(screenSessions.screenId, screenId))
      .returning({ id: screenSessions.id });
    if (revoked.length > 0) {
      this.logger.log(`Revoked ${revoked.length} session(s) for screen ${screenId}`);
    }
    return revoked.length;
  }

  /** Drops consumed and expired rows; they only exist to detect replays. */
  async cleanupExpired(): Promise<number> {
    const removed = await this.db
      .delete(screenSessions)
      .where(sql`${screenSessions.expiresAt} < now() - interval '1 day'`)
      .returning({ id: screenSessions.id });
    return removed.length;
  }

  private async issue(
    screenId: string,
    organisationId: string,
    familyId: string,
  ): Promise<ScreenSessionTokens> {
    const refreshToken = randomBytes(32).toString('base64url');
    await this.db.insert(screenSessions).values({
      screenId,
      organisationId,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    const accessToken = await this.tokens.issueScreenAccessToken(screenId, organisationId);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokens.accessTokenTtlSeconds,
    };
  }
}
