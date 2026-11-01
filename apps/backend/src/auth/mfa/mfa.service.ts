import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import {
  AUDIT_AUTH_MFA_DISABLED,
  AUDIT_AUTH_MFA_ENABLED,
  AUDIT_AUTH_MFA_LOCKOUT,
  AUDIT_AUTH_MFA_RECOVERY_CODES_REGENERATED,
  AUDIT_AUTH_MFA_RECOVERY_CODE_USED,
  AUTH_MFA_DISABLED,
  AUTH_MFA_ENABLED,
  AUTH_MFA_RECOVERY_CODE_USED,
  AuditAuthEvent,
  AuthMfaDisabledEvent,
  AuthMfaEnabledEvent,
  AuthMfaRecoveryCodeUsedEvent,
} from '../../audit-log/audit.events';
import { SecretCipher } from '../../common/secret-cipher.service';
import { DRIZZLE } from '../../db/database.constants';
import type { DrizzleDB } from '../../db/drizzle.types';
import {
  organisations,
  userMfa,
  userOrganisationMemberships,
  type User,
  type UserMfa,
} from '../../db/schema';
import { REDIS_CLIENT } from '../../redis';
import { UserService } from '../../user/user.service';
import { PasswordService } from '../password.service';
import { hashToken } from '../token-hash.util';
import {
  MFA_CHALLENGE_MAX_ATTEMPTS,
  MFA_CHALLENGE_TTL_SECONDS,
  MFA_DISABLE_FORBIDDEN,
  MFA_ENROLMENT_TTL_SECONDS,
  MFA_LOCKED_OUT,
  MFA_LOCKOUT_THRESHOLD,
  MFA_LOCKOUT_WINDOW_SECONDS,
  type MfaMethod,
  mfaRedisKeys,
} from './mfa.constants';
import {
  mfaChallengeExpired,
  mfaInvalidCode,
  mfaInvalidPassword,
  mfaSetupExpired,
} from './mfa.errors';
import { RecoveryCodeService } from './recovery-code.service';
import { TotpService } from './totp.service';

const CHALLENGE_BYTES = 32;

/**
 * Why MFA is mandatory for a user (mirrored in `libs/shared-types`). MFA is
 * bound to the USER: mandatory as soon as they are a super-admin or a member
 * of at least one org with `requireMfa` — and then for every org of theirs.
 */
export interface MfaRequiredBy {
  superAdmin: boolean;
  /** Orgs of the user that have `requireMfa` switched on. */
  organisationIds: string[];
}

/** True when {@link MfaRequiredBy} makes MFA mandatory. */
export function isMfaMandatory(requiredBy: MfaRequiredBy): boolean {
  return requiredBy.superAdmin || requiredBy.organisationIds.length > 0;
}

export interface MfaStatus {
  totpEnabled: boolean;
  enabledAt: string | null;
  recoveryCodesRemaining: number;
  requiredBy: MfaRequiredBy;
}

export interface TotpSetup {
  otpauthUri: string;
  qrDataUrl: string;
  secret: string;
}

export interface TotpConfirmation {
  user: User;
  recoveryCodes: string[];
  /** An existing factor was replaced (device change). */
  replaced: boolean;
}

/** Exactly one of the two is used; `code` wins if both are sent. */
export interface SecondFactorInput {
  code?: string;
  recoveryCode?: string;
}

export interface ChallengeVerification {
  user: User;
  method: MfaMethod;
}

/**
 * TOTP-based second factor: enrolment (pending secret in Redis → confirmed row
 * in `user_mfa` + recovery codes), disable, recovery-code regeneration, the
 * login challenge between password and code, and the policy question "is MFA
 * mandatory for this user".
 *
 * Secrets never leave this service in the clear except in the one setup
 * response the user scans; codes, recovery codes and challenge ids are never
 * logged or put into events — log lines carry the user id and the outcome only.
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly cipher: SecretCipher,
    private readonly totp: TotpService,
    private readonly recoveryCodes: RecoveryCodeService,
    private readonly passwords: PasswordService,
    private readonly users: UserService,
    private readonly events: EventEmitter2,
  ) {}

  // ── Policy + status ───────────────────────────────────────────────────────

  async isTotpEnabled(userId: string): Promise<boolean> {
    return (await this.findFactor(userId)) !== null;
  }

  /** Why MFA is mandatory for this user, if it is. Evaluated live, never cached. */
  async requiredBy(user: Pick<User, 'id' | 'isSuperAdmin'>): Promise<MfaRequiredBy> {
    const rows = await this.db
      .select({ organisationId: userOrganisationMemberships.organisationId })
      .from(userOrganisationMemberships)
      .innerJoin(organisations, eq(organisations.id, userOrganisationMemberships.organisationId))
      .where(
        and(eq(userOrganisationMemberships.userId, user.id), eq(organisations.requireMfa, true)),
      );
    return {
      superAdmin: user.isSuperAdmin,
      organisationIds: rows.map((row) => row.organisationId),
    };
  }

  /**
   * True when the user may not go without MFA: super-admins (no DB lookup) and
   * members of at least one organisation that requires it. User-level — it
   * then applies to every org of the user, there is no per-org exemption.
   */
  async isMfaRequired(user: Pick<User, 'id' | 'isSuperAdmin'>): Promise<boolean> {
    if (user.isSuperAdmin) {
      return true;
    }
    return isMfaMandatory(await this.requiredBy(user));
  }

  /**
   * `mfaEnrolmentRequired` of a session: not MFA-confirmed but MFA is
   * mandatory. An MFA-confirmed session never touches the DB.
   */
  async isEnrolmentRequired(
    user: Pick<User, 'id' | 'isSuperAdmin'>,
    sessionMfa: boolean,
  ): Promise<boolean> {
    return !sessionMfa && (await this.isMfaRequired(user));
  }

  async getStatus(userId: string): Promise<MfaStatus> {
    const user = await this.requireUser(userId);
    const factor = await this.findFactor(userId);
    return {
      totpEnabled: factor !== null,
      enabledAt: factor ? factor.totpEnabledAt.toISOString() : null,
      recoveryCodesRemaining: factor ? await this.recoveryCodes.countRemaining(userId) : 0,
      requiredBy: await this.requiredBy(user),
    };
  }

  // ── Enrolment / management ────────────────────────────────────────────────

  /**
   * Start (or restart) TOTP enrolment. Needs the current password; when a
   * factor already exists — a device change — also a valid code from it, so a
   * hijacked session alone cannot move the factor to an attacker's phone.
   */
  async startEnrolment(userId: string, currentPassword: string, code?: string): Promise<TotpSetup> {
    const user = await this.requireUser(userId);
    await this.assertNotLockedOut(userId);
    await this.requirePassword(user, currentPassword);
    const existing = await this.findFactor(userId);
    if (existing) {
      await this.requireManagementCode(
        user,
        existing,
        code,
        'MFA re-enrolment refused',
        'A valid code from your current authenticator is required',
      );
    }

    const secret = this.totp.generateSecret();
    await this.redis.set(
      mfaRedisKeys.enrolment(userId),
      this.cipher.encrypt(secret),
      'EX',
      MFA_ENROLMENT_TTL_SECONDS,
    );
    const otpauthUri = this.totp.buildUri(secret, user.email);
    const qrDataUrl = await this.totp.toQrDataUrl(otpauthUri);
    this.logger.log(`MFA enrolment started userId=${userId} replacing=${existing !== null}`);
    return { otpauthUri, qrDataUrl, secret };
  }

  /**
   * Confirm the pending secret with a first code: persist it, issue 10 fresh
   * recovery codes (returned once). The caller revokes the user's sessions and
   * issues a new MFA-confirmed one.
   */
  async confirmEnrolment(userId: string, code: string): Promise<TotpConfirmation> {
    const user = await this.requireUser(userId);
    const pending = await this.redis.get(mfaRedisKeys.enrolment(userId));
    if (!pending) {
      throw mfaSetupExpired();
    }
    const secret = this.cipher.decrypt(pending);
    const step = this.totp.validate(secret, code);
    if (step === null) {
      this.logger.warn(`MFA enrolment confirm failed: invalid code userId=${userId}`);
      throw mfaInvalidCode();
    }

    const recoveryCodes = this.recoveryCodes.generate();
    const secretEnc = this.cipher.encrypt(secret);
    const now = new Date();
    const replaced = await this.db.transaction(async (tx) => {
      const [previous] = await tx
        .select({ userId: userMfa.userId })
        .from(userMfa)
        .where(eq(userMfa.userId, userId));
      await tx
        .insert(userMfa)
        .values({ userId, totpSecretEnc: secretEnc, totpEnabledAt: now, totpLastUsedStep: step })
        .onConflictDoUpdate({
          target: userMfa.userId,
          set: { totpSecretEnc: secretEnc, totpEnabledAt: now, totpLastUsedStep: step },
        });
      await this.recoveryCodes.replaceAll(userId, recoveryCodes, tx);
      return previous !== undefined;
    });
    await this.redis.del(mfaRedisKeys.enrolment(userId));

    this.logger.log(`MFA enabled userId=${userId} replaced=${replaced}`);
    this.events.emit(AUTH_MFA_ENABLED, new AuthMfaEnabledEvent(user.email, replaced));
    this.events.emit(
      AUDIT_AUTH_MFA_ENABLED,
      new AuditAuthEvent(userId, null, { email: user.email, replaced }),
    );
    return { user, recoveryCodes, replaced };
  }

  /**
   * Turn TOTP off. Refused with 409 while MFA is mandatory for the user
   * (super-admin, or member of an org that requires it) — such a user changes
   * devices by re-enrolling instead.
   */
  async disable(userId: string, currentPassword: string, code: string): Promise<User> {
    const user = await this.requireUser(userId);
    await this.assertNotLockedOut(userId);
    if (await this.isMfaRequired(user)) {
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        code: MFA_DISABLE_FORBIDDEN,
        message: 'Multi-factor authentication is mandatory for this account',
      });
    }
    await this.requirePassword(user, currentPassword);
    const factor = await this.requireFactor(userId);
    await this.requireManagementCode(user, factor, code, 'MFA disable failed');

    await this.db.transaction(async (tx) => {
      await tx.delete(userMfa).where(eq(userMfa.userId, userId));
      await this.recoveryCodes.deleteAll(userId, tx);
    });
    this.logger.log(`MFA disabled userId=${userId}`);
    this.events.emit(AUTH_MFA_DISABLED, new AuthMfaDisabledEvent(user.email));
    this.events.emit(
      AUDIT_AUTH_MFA_DISABLED,
      new AuditAuthEvent(userId, null, { email: user.email }),
    );
    return user;
  }

  /**
   * Invalidate every recovery code and return 10 new ones (shown once). Needs
   * the current password and a valid code, like every other factor change.
   */
  async regenerateRecoveryCodes(
    userId: string,
    currentPassword: string,
    code: string,
  ): Promise<string[]> {
    const user = await this.requireUser(userId);
    await this.assertNotLockedOut(userId);
    await this.requirePassword(user, currentPassword);
    const factor = await this.requireFactor(userId);
    await this.requireManagementCode(user, factor, code, 'MFA recovery-code regeneration failed');
    const codes = this.recoveryCodes.generate();
    await this.recoveryCodes.replaceAll(userId, codes);
    this.logger.log(`MFA recovery codes regenerated userId=${userId}`);
    this.events.emit(
      AUDIT_AUTH_MFA_RECOVERY_CODES_REGENERATED,
      new AuditAuthEvent(userId, null, { email: user.email }),
    );
    return codes;
  }

  // ── Login challenge ───────────────────────────────────────────────────────

  /**
   * After a correct password for a user with TOTP: park `{ userId, attempts }`
   * under the SHA-256 of a random id and hand the raw id back (it travels in an
   * httpOnly cookie). Answers 429 while the user is locked out.
   */
  async createChallenge(userId: string): Promise<string> {
    await this.assertNotLockedOut(userId);
    const challengeId = randomBytes(CHALLENGE_BYTES).toString('base64url');
    const key = mfaRedisKeys.challenge(hashToken(challengeId));
    await this.redis
      .multi()
      .hset(key, 'userId', userId, 'attempts', '0')
      .expire(key, MFA_CHALLENGE_TTL_SECONDS)
      .exec();
    this.logger.log(`MFA challenge issued userId=${userId}`);
    return challengeId;
  }

  /**
   * Second login step. A wrong code counts against the challenge (dropped after
   * {@link MFA_CHALLENGE_MAX_ATTEMPTS}) and against the user (lockout after
   * {@link MFA_LOCKOUT_THRESHOLD} within the window). Success consumes the
   * challenge and clears the user's failure counter.
   */
  async verifyChallenge(
    challengeId: string,
    input: SecondFactorInput,
  ): Promise<ChallengeVerification> {
    const key = mfaRedisKeys.challenge(hashToken(challengeId));
    const userId = await this.redis.hget(key, 'userId');
    if (!userId) {
      throw mfaChallengeExpired();
    }
    await this.assertNotLockedOut(userId);
    const user = await this.users.findById(userId);
    const factor = await this.findFactor(userId);
    if (!user || !factor) {
      // Deleted or reset between both steps: the challenge is worthless.
      await this.redis.del(key);
      throw mfaChallengeExpired();
    }

    const method: MfaMethod = input.code !== undefined ? 'totp' : 'recovery';
    const accepted = await this.checkSecondFactor(factor, input);
    if (!accepted) {
      await this.registerFailure(key, user);
      this.logger.warn(`MFA login failed userId=${userId} method=${method}`);
      throw mfaInvalidCode();
    }
    // Single use: only the request that actually deletes the challenge wins.
    if ((await this.redis.del(key)) === 0) {
      throw mfaChallengeExpired();
    }
    await this.redis.del(mfaRedisKeys.failures(userId));

    if (method === 'recovery') {
      const remaining = await this.recoveryCodes.countRemaining(userId);
      this.events.emit(
        AUTH_MFA_RECOVERY_CODE_USED,
        new AuthMfaRecoveryCodeUsedEvent(user.email, remaining),
      );
      this.events.emit(
        AUDIT_AUTH_MFA_RECOVERY_CODE_USED,
        new AuditAuthEvent(userId, null, { email: user.email, remaining }),
      );
    }
    this.logger.log(`MFA login success userId=${userId} method=${method}`);
    return { user, method };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async checkSecondFactor(factor: UserMfa, input: SecondFactorInput): Promise<boolean> {
    if (input.code !== undefined) {
      return this.acceptTotp(factor, input.code);
    }
    if (input.recoveryCode !== undefined) {
      return this.recoveryCodes.consume(factor.userId, input.recoveryCode);
    }
    return false;
  }

  /**
   * Valid code AND its time step is newer than the last accepted one. The
   * step is claimed with one conditional UPDATE, so the same code cannot be
   * used twice — not even by two concurrent requests.
   */
  private async acceptTotp(factor: UserMfa, code: string): Promise<boolean> {
    const step = this.totp.validate(this.cipher.decrypt(factor.totpSecretEnc), code);
    if (step === null) {
      return false;
    }
    const claimed = await this.db
      .update(userMfa)
      .set({ totpLastUsedStep: step })
      .where(
        and(
          eq(userMfa.userId, factor.userId),
          or(isNull(userMfa.totpLastUsedStep), lt(userMfa.totpLastUsedStep, step)),
        ),
      )
      .returning({ userId: userMfa.userId });
    return claimed.length > 0;
  }

  private async registerFailure(challengeKey: string, user: User): Promise<void> {
    const results = await this.redis
      .multi()
      .hincrby(challengeKey, 'attempts', 1)
      .ttl(challengeKey)
      .exec();
    const attempts = Number(results?.[0]?.[1] ?? MFA_CHALLENGE_MAX_ATTEMPTS);
    const ttl = Number(results?.[1]?.[1] ?? -1);
    // ttl -1: the challenge expired between read and increment and HINCRBY
    // recreated it without expiry — drop that ghost as well.
    if (attempts >= MFA_CHALLENGE_MAX_ATTEMPTS || ttl < 0) {
      await this.redis.del(challengeKey);
    }
    await this.countUserFailure(user);
  }

  /**
   * A management action (device change, disable, regeneration) with a code
   * that is missing or wrong counts against the same per-user lockout as a
   * failed login — otherwise a hijacked session could brute-force the code.
   */
  private async requireManagementCode(
    user: User,
    factor: UserMfa,
    code: string | undefined,
    logContext: string,
    message?: string,
  ): Promise<void> {
    if (code !== undefined && (await this.acceptTotp(factor, code))) {
      return;
    }
    await this.countUserFailure(user);
    this.logger.warn(`${logContext}: invalid code userId=${user.id}`);
    throw mfaInvalidCode(message);
  }

  /**
   * Counts a failed second-factor attempt for the user; the 10th within the
   * window locks them out (audited once). The window is set together with the
   * first increment in one MULTI (`SET NX EX` + `INCR`), so the counter can
   * never be left without a TTL — that would be a permanent lockout.
   */
  private async countUserFailure(user: User): Promise<void> {
    const failuresKey = mfaRedisKeys.failures(user.id);
    const results = await this.redis
      .multi()
      .set(failuresKey, '0', 'EX', MFA_LOCKOUT_WINDOW_SECONDS, 'NX')
      .incr(failuresKey)
      .exec();
    const failures = Number(results?.[1]?.[1] ?? 0);
    if (failures === MFA_LOCKOUT_THRESHOLD) {
      this.logger.warn(`MFA lockout userId=${user.id}`);
      this.events.emit(
        AUDIT_AUTH_MFA_LOCKOUT,
        new AuditAuthEvent(user.id, null, { email: user.email, failures }),
      );
    }
  }

  private async assertNotLockedOut(userId: string): Promise<void> {
    const failures = Number((await this.redis.get(mfaRedisKeys.failures(userId))) ?? 0);
    if (failures >= MFA_LOCKOUT_THRESHOLD) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: MFA_LOCKED_OUT,
          message: 'Too many failed verification attempts — try again later',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async findFactor(userId: string): Promise<UserMfa | null> {
    const [row] = await this.db.select().from(userMfa).where(eq(userMfa.userId, userId));
    return row ?? null;
  }

  private async requireFactor(userId: string): Promise<UserMfa> {
    const factor = await this.findFactor(userId);
    if (!factor) {
      throw new BadRequestException('Multi-factor authentication is not enabled');
    }
    return factor;
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async requirePassword(user: User, currentPassword: string): Promise<void> {
    if (!(await this.passwords.verify(user.passwordHash, currentPassword))) {
      this.logger.warn(`MFA action refused: bad password userId=${user.id}`);
      throw mfaInvalidPassword();
    }
  }
}
