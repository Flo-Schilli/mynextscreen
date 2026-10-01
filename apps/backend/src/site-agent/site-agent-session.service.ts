import { randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { siteAgentSessions } from '../db/schema';
import { hashToken } from '../auth/token-hash.util';
import { TokenService } from '../auth/token.service';
import type { IssuedAccessToken } from '../auth/token.types';

/**
 * Site-agent sessions: a short-lived access token plus a rotating refresh
 * token, so the one-time enrolment token is only ever used once.
 *
 * Deliberately the same shape as {@link ScreenSessionService}, for the same two
 * reasons:
 *
 * - **Refresh tokens live in Postgres.** Redis runs without `appendonly` here,
 *   and a lost snapshot window would leave an agent holding a token the server
 *   has never seen. Recovering that means someone driving to the venue.
 * - **A concurrent refresh is not an attack.** The agent has several
 *   independent consumers (config pull, SSE stream, heartbeat, report upload)
 *   that all hit 401 at the same moment. Whoever comes second presents an
 *   already-consumed token; inside {@link GRACE_WINDOW_MS} that mints another
 *   successor in the same family rather than being treated as a replay.
 *
 * The two services are not shared code yet on purpose: the screen variant is
 * the most security-sensitive path in the repo, and refactoring it while
 * introducing a second caller would risk both at once. Extracting a common
 * base is tracked as follow-up work once this one is green too.
 */
const GRACE_WINDOW_MS = 60_000;

/**
 * 180 days, sliding. An agent that has been off for longer than that has almost
 * certainly been replaced, and re-enrolling it is a two-minute job at the
 * machine — unlike a screen, where it would be a visit per display.
 */
const REFRESH_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export interface SiteAgentSessionTokens {
  accessToken: IssuedAccessToken;
  refreshToken: string;
  /** Seconds, never an absolute instant: the venue machine's clock may be off. */
  expiresIn: number;
}

export type SiteAgentRefreshResult =
  | { status: 'ok'; tokens: SiteAgentSessionTokens; agentId: string }
  | { status: 'replayed'; agentId: string; familyId: string }
  | { status: 'unknown' };

@Injectable()
export class SiteAgentSessionService {
  private readonly logger = new Logger(SiteAgentSessionService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly tokens: TokenService,
  ) {}

  /** Exchanges an enrolment token for a fresh session (new family). */
  async createSession(agentId: string, organisationId: string): Promise<SiteAgentSessionTokens> {
    return this.issue(agentId, organisationId, randomUUID());
  }

  /**
   * Rotates a refresh token. The row is never updated in place: it is marked
   * consumed and a successor inserted, so the consumed row remains as the
   * tombstone that tells a replay from a race.
   */
  async refresh(rawToken: string): Promise<SiteAgentRefreshResult> {
    const tokenHash = hashToken(rawToken);

    const [consumed] = await this.db
      .update(siteAgentSessions)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(siteAgentSessions.tokenHash, tokenHash),
          isNull(siteAgentSessions.consumedAt),
          sql`${siteAgentSessions.expiresAt} > now()`,
        ),
      )
      .returning({
        agentId: siteAgentSessions.agentId,
        organisationId: siteAgentSessions.organisationId,
        familyId: siteAgentSessions.familyId,
      });

    if (consumed) {
      return {
        status: 'ok',
        agentId: consumed.agentId,
        tokens: await this.issue(consumed.agentId, consumed.organisationId, consumed.familyId),
      };
    }

    // Nothing was rotated: either the token is unknown/expired, or it was
    // already consumed — which is the normal outcome of parallel refreshes.
    const [existing] = await this.db
      .select({
        agentId: siteAgentSessions.agentId,
        organisationId: siteAgentSessions.organisationId,
        familyId: siteAgentSessions.familyId,
        consumedAt: siteAgentSessions.consumedAt,
        expiresAt: siteAgentSessions.expiresAt,
      })
      .from(siteAgentSessions)
      .where(eq(siteAgentSessions.tokenHash, tokenHash))
      .limit(1);

    if (!existing || !existing.consumedAt || existing.expiresAt.getTime() <= Date.now()) {
      return { status: 'unknown' };
    }

    const consumedAgoMs = Date.now() - existing.consumedAt.getTime();
    if (consumedAgoMs <= GRACE_WINDOW_MS) {
      return {
        status: 'ok',
        agentId: existing.agentId,
        tokens: await this.issue(existing.agentId, existing.organisationId, existing.familyId),
      };
    }

    // As with screens, the family is not revoked: a replay buys read access to
    // one venue's device list, while a revocation buys an unattended agent that
    // stops starting the displays until someone drives out to re-enrol it.
    this.logger.warn(
      `Replayed refresh token for site agent ${existing.agentId} (consumed ${Math.round(
        consumedAgoMs / 1000,
      )}s ago) — refused, family left intact`,
    );
    return { status: 'replayed', agentId: existing.agentId, familyId: existing.familyId };
  }

  /** Ends every session of an agent. Called when an admin revokes its access. */
  async revokeForAgent(agentId: string): Promise<number> {
    const revoked = await this.db
      .delete(siteAgentSessions)
      .where(eq(siteAgentSessions.agentId, agentId))
      .returning({ id: siteAgentSessions.id });
    if (revoked.length > 0) {
      this.logger.log(`Revoked ${revoked.length} session(s) for site agent ${agentId}`);
    }
    return revoked.length;
  }

  /** Drops consumed and expired rows; they only exist to detect replays. */
  async cleanupExpired(): Promise<number> {
    const removed = await this.db
      .delete(siteAgentSessions)
      .where(sql`${siteAgentSessions.expiresAt} < now() - interval '1 day'`)
      .returning({ id: siteAgentSessions.id });
    return removed.length;
  }

  private async issue(
    agentId: string,
    organisationId: string,
    familyId: string,
  ): Promise<SiteAgentSessionTokens> {
    const refreshToken = randomBytes(32).toString('base64url');
    await this.db.insert(siteAgentSessions).values({
      agentId,
      organisationId,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });

    const accessToken = await this.tokens.issueAgentAccessToken(agentId, organisationId);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokens.accessTokenTtlSeconds,
    };
  }
}
