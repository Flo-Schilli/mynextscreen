import { randomBytes } from 'node:crypto';
import { GoneException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { siteAgentEnrolments } from '../db/schema';
import { hashToken } from '../auth/token-hash.util';
import { SiteAgentSessionService, type SiteAgentSessionTokens } from './site-agent-session.service';

/**
 * How long a freshly issued setup code stays usable by default.
 *
 * Short on purpose: the code is created in a live dashboard session and carried
 * straight to the venue machine, so fifteen minutes is enough to type it in
 * while being too short for one forgotten in a chat log to be a standing
 * invitation. Overridable with `SITE_AGENT_ENROLMENT_TTL_MS` for deployments
 * where the walk to the machine is longer.
 */
export const DEFAULT_ENROLMENT_TTL_MS = 15 * 60 * 1000;

/** Lower bound: a code that cannot survive the walk to the machine is useless. */
const MIN_ENROLMENT_TTL_MS = 60 * 1000;

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
  private readonly ttlMs: number;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly sessions: SiteAgentSessionService,
    config: ConfigService,
  ) {
    this.ttlMs = SiteAgentEnrolmentService.resolveTtlMs(
      config.get<string>('SITE_AGENT_ENROLMENT_TTL_MS'),
    );
  }

  /**
   * Parses the configured TTL, falling back to the default on anything that is
   * not a usable positive number. A typo must not silently produce a zero-TTL
   * code that is expired the instant it is issued.
   */
  private static resolveTtlMs(raw: string | undefined): number {
    if (raw === undefined || raw === '') {
      return DEFAULT_ENROLMENT_TTL_MS;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < MIN_ENROLMENT_TTL_MS) {
      return DEFAULT_ENROLMENT_TTL_MS;
    }
    return Math.floor(parsed);
  }

  /**
   * Issues a setup code for an agent, invalidating any earlier unredeemed one.
   *
   * Superseding rather than accumulating: two valid codes for one agent means
   * the operator cannot tell which of them is the live one, and revoking the
   * wrong one feels like it worked.
   */
  async issue(agentId: string, organisationId: string): Promise<IssuedEnrolmentToken> {
    await this.db
      .delete(siteAgentEnrolments)
      .where(and(eq(siteAgentEnrolments.agentId, agentId), isNull(siteAgentEnrolments.consumedAt)));

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);

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

  /**
   * Confirms a fresh setup code exists for the given organisation without
   * consuming it.
   *
   * Used to gate a sensitive post-enrolment action (an agent-side reset) on a
   * fresh code from the dashboard, which keeps anyone on the venue LAN from
   * resetting a running agent. The code is *not* consumed: the operator still
   * needs it to re-enrol afterwards, and consuming it here would force a second
   * trip to the dashboard for every reset.
   *
   * The code must be unconsumed, unexpired and scoped to this organisation; a
   * valid code for a different tenant does not open this one.
   *
   * - unknown or wrong-org code → 401, with no hint which
   * - already consumed → 410
   */
  async verifyFresh(rawToken: string, organisationId: string): Promise<void> {
    const tokenHash = hashToken(rawToken);

    const [row] = await this.db
      .select({
        organisationId: siteAgentEnrolments.organisationId,
        consumedAt: siteAgentEnrolments.consumedAt,
        expiresAt: siteAgentEnrolments.expiresAt,
      })
      .from(siteAgentEnrolments)
      .where(eq(siteAgentEnrolments.tokenHash, tokenHash))
      .limit(1);

    if (row && row.organisationId === organisationId) {
      if (row.consumedAt) {
        throw new GoneException('Setup code has already been used');
      }
      if (row.expiresAt.getTime() > Date.now()) {
        return;
      }
    }

    throw new UnauthorizedException('Invalid or expired setup code');
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
