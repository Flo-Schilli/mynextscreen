import { randomBytes } from 'node:crypto';
import { GoneException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { siteAgentEnrolments } from '../db/schema';
import { hashToken } from '../auth/token-hash.util';
import { SiteAgentSessionService, type SiteAgentSessionTokens } from './site-agent-session.service';

/**
 * How long a freshly issued enrolment token stays usable. Long enough to carry
 * it to the venue machine, short enough that one forgotten in a chat log is not
 * a standing invitation.
 */
export const ENROLMENT_TTL_MS = 24 * 60 * 60 * 1000;

export interface IssuedEnrolmentToken {
  /** Raw token — returned to the dashboard once and never stored. */
  token: string;
  expiresAt: Date;
}

export interface EnroledAgent {
  agentId: string;
  organisationId: string;
  tokens: SiteAgentSessionTokens;
}

/**
 * One-time enrolment of a site agent.
 *
 * Admin-initiated, which is the one structural difference from screen pairing:
 * the operator creates the agent in the dashboard and carries the token to the
 * machine, rather than the device announcing itself with a code on screen. An
 * agent has no display to show a code on.
 *
 * A token that leaks before redemption buys an agent in that organisation — but
 * no TV access, because everything the agent needs to reach a set (the key
 * server on port 9991, SSAP, SSH) is only reachable from inside the venue. That
 * is exactly why the private keys are not kept server-side.
 */
@Injectable()
export class SiteAgentEnrolmentService {
  private readonly logger = new Logger(SiteAgentEnrolmentService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly sessions: SiteAgentSessionService,
  ) {}

  /**
   * Issues a token for an agent, invalidating any earlier unredeemed one.
   *
   * Superseding rather than accumulating: two valid tokens for one agent means
   * the operator cannot tell which of them is the live one, and revoking the
   * wrong one feels like it worked.
   */
  async issue(agentId: string, organisationId: string): Promise<IssuedEnrolmentToken> {
    await this.db
      .delete(siteAgentEnrolments)
      .where(and(eq(siteAgentEnrolments.agentId, agentId), isNull(siteAgentEnrolments.consumedAt)));

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + ENROLMENT_TTL_MS);

    await this.db.insert(siteAgentEnrolments).values({
      agentId,
      organisationId,
      tokenHash: hashToken(token),
      expiresAt,
    });

    return { token, expiresAt };
  }

  /**
   * Redeems a token for a session. Single-delivery: the row is claimed with a
   * guarded UPDATE, so two agents racing on the same token produce exactly one
   * winner rather than two live sessions.
   *
   * - unknown token → 401, with no hint whether it never existed or expired
   * - already redeemed → 410, which tells an honest operator what happened
   */
  async redeem(rawToken: string): Promise<EnroledAgent> {
    const tokenHash = hashToken(rawToken);

    const [claimed] = await this.db
      .update(siteAgentEnrolments)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(siteAgentEnrolments.tokenHash, tokenHash),
          isNull(siteAgentEnrolments.consumedAt),
          sql`${siteAgentEnrolments.expiresAt} > now()`,
        ),
      )
      .returning({
        agentId: siteAgentEnrolments.agentId,
        organisationId: siteAgentEnrolments.organisationId,
      });

    if (claimed) {
      this.logger.log(`Site agent ${claimed.agentId} enrolled`);
      return {
        agentId: claimed.agentId,
        organisationId: claimed.organisationId,
        tokens: await this.sessions.createSession(claimed.agentId, claimed.organisationId),
      };
    }

    const [existing] = await this.db
      .select({
        agentId: siteAgentEnrolments.agentId,
        consumedAt: siteAgentEnrolments.consumedAt,
      })
      .from(siteAgentEnrolments)
      .where(eq(siteAgentEnrolments.tokenHash, tokenHash))
      .limit(1);

    if (existing?.consumedAt) {
      throw new GoneException('Enrolment token has already been used');
    }

    throw new UnauthorizedException('Invalid or expired enrolment token');
  }

  /** Drops spent and expired rows. */
  async cleanupExpired(): Promise<number> {
    const removed = await this.db
      .delete(siteAgentEnrolments)
      .where(sql`${siteAgentEnrolments.expiresAt} < now() - interval '1 day'`)
      .returning({ id: siteAgentEnrolments.id });
    return removed.length;
  }
}
