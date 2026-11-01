import {
  BadRequestException,
  ConflictException,
  HttpException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
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
} from '../../audit-log/audit.events';
import type { DrizzleDB } from '../../db/drizzle.types';
import {
  organisations,
  userMfa,
  userMfaRecoveryCodes,
  userOrganisationMemberships,
  users,
  type User,
} from '../../db/schema';
import { closeTestDb, initTestDb, truncateAll } from '../../test/db-harness';
import { FakeMfaRedis } from '../../test/fake-mfa-redis';
import { createTestSecretCipher, expectCheckViolation } from '../../test/secret-cipher.testing';
import { OrganisationRole } from '../../user/organisation-role.enum';
import { UserService } from '../../user/user.service';
import type { PasswordService } from '../password.service';
import { hashToken } from '../token-hash.util';
import {
  MFA_CHALLENGE_EXPIRED,
  MFA_DISABLE_FORBIDDEN,
  MFA_ENROLMENT_TTL_SECONDS,
  MFA_INVALID_CODE,
  MFA_INVALID_PASSWORD,
  MFA_LOCKED_OUT,
  MFA_SETUP_EXPIRED,
  mfaRedisKeys,
} from './mfa.constants';
import { MfaService } from './mfa.service';
import { RecoveryCodeService } from './recovery-code.service';
import { TotpService } from './totp.service';

const PASSWORD = 'correct-password';
const START = 1_700_000_000_000;
const STEP_MS = 30_000;

describe('MfaService', () => {
  let db: DrizzleDB;
  let redis: FakeMfaRedis;
  let events: { emit: jest.Mock };
  let now: number;
  let totp: TotpService;
  let service: MfaService;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    redis = new FakeMfaRedis();
    events = { emit: jest.fn() };
    now = START;
    totp = new TotpService(() => now);
    const passwords = {
      verify: jest.fn((_hash: string | null, plain: string) => Promise.resolve(plain === PASSWORD)),
    };
    service = new MfaService(
      db,
      redis as unknown as Redis,
      createTestSecretCipher(),
      totp,
      new RecoveryCodeService(db),
      passwords as unknown as PasswordService,
      new UserService(db),
      events as unknown as EventEmitter2,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function createUser(overrides: Partial<User> = {}): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: `user-${Math.random().toString(36).slice(2)}@example.com`,
        passwordHash: 'hash',
        emailVerified: true,
        ...overrides,
      })
      .returning();
    return user;
  }

  async function createOrg(requireMfa: boolean, memberId?: string): Promise<string> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC', requireMfa })
      .returning();
    if (memberId) {
      await db.insert(userOrganisationMemberships).values({
        userId: memberId,
        organisationId: org.id,
        role: OrganisationRole.Editor,
      });
    }
    return org.id;
  }

  /** The rejection is a 401 carrying the given MFA error code. */
  async function expectMfa401(promise: Promise<unknown>, code: string): Promise<void> {
    const error: unknown = await promise.then(
      () => {
        throw new Error('expected a rejection');
      },
      (rejected: unknown) => rejected,
    );
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).getResponse()).toMatchObject({
      statusCode: 401,
      code,
    });
  }

  /** Move the clock to the next TOTP step so a fresh (non-replayed) code exists. */
  function nextStep(): void {
    now += STEP_MS;
  }

  /** Enrol TOTP for the user and return the secret + recovery codes. */
  async function enrol(user: User): Promise<{ secret: string; recoveryCodes: string[] }> {
    const { secret } = await service.startEnrolment(user.id, PASSWORD);
    const { recoveryCodes } = await service.confirmEnrolment(user.id, totp.generate(secret));
    events.emit.mockClear();
    return { secret, recoveryCodes };
  }

  describe('policy', () => {
    it('always requires MFA from a super-admin', async () => {
      const admin = await createUser({ isSuperAdmin: true });
      expect(await service.isMfaRequired(admin)).toBe(true);
      expect(await service.requiredBy(admin)).toEqual({ superAdmin: true, organisationIds: [] });
    });

    it('does not require MFA from a regular user by default', async () => {
      const user = await createUser();
      await createOrg(false, user.id);
      expect(await service.isMfaRequired(user)).toBe(false);
    });

    it('requires MFA per organisation that has requireMfa', async () => {
      const user = await createUser();
      const strict = await createOrg(true, user.id);
      const relaxed = await createOrg(false, user.id);
      // An org the user is not a member of does not count.
      await createOrg(true);

      // User-bound: one strict org makes MFA mandatory for the whole account.
      expect(await service.isMfaRequired(user)).toBe(true);
      expect((await service.requiredBy(user)).organisationIds).toEqual([strict]);
      expect((await service.requiredBy(user)).organisationIds).not.toContain(relaxed);
    });

    it('flags enrolment only for a mandatory user whose session lacks MFA', async () => {
      const admin = await createUser({ isSuperAdmin: true });
      const member = await createUser();
      await createOrg(true, member.id);
      const free = await createUser();

      expect(await service.isEnrolmentRequired(admin, false)).toBe(true);
      expect(await service.isEnrolmentRequired(member, false)).toBe(true);
      expect(await service.isEnrolmentRequired(free, false)).toBe(false);

      const lookup = jest.spyOn(service, 'requiredBy');
      expect(await service.isEnrolmentRequired(member, true)).toBe(false);
      expect(lookup).not.toHaveBeenCalled();
    });
  });

  describe('status', () => {
    it('reports a user without TOTP', async () => {
      const user = await createUser();
      expect(await service.getStatus(user.id)).toEqual({
        totpEnabled: false,
        enabledAt: null,
        recoveryCodesRemaining: 0,
        requiredBy: { superAdmin: false, organisationIds: [] },
      });
    });

    it('reports an enrolled user with remaining recovery codes', async () => {
      const user = await createUser({ isSuperAdmin: true });
      await enrol(user);
      const status = await service.getStatus(user.id);
      expect(status.totpEnabled).toBe(true);
      expect(status.enabledAt).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
      expect(status.recoveryCodesRemaining).toBe(10);
      expect(status.requiredBy.superAdmin).toBe(true);
    });

    it('throws NotFound for an unknown user', async () => {
      await expect(service.getStatus('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('enrolment', () => {
    it('refuses to start with a wrong password', async () => {
      const user = await createUser();
      await expectMfa401(service.startEnrolment(user.id, 'wrong'), MFA_INVALID_PASSWORD);
      expect(redis.strings.size).toBe(0);
    });

    it('parks the pending secret encrypted, for 10 minutes', async () => {
      const user = await createUser();
      const setup = await service.startEnrolment(user.id, PASSWORD);

      const stored = redis.strings.get(mfaRedisKeys.enrolment(user.id));
      expect(stored?.startsWith('enc:v1:')).toBe(true);
      expect(stored).not.toContain(setup.secret);
      expect(redis.ttls.get(mfaRedisKeys.enrolment(user.id))).toBe(MFA_ENROLMENT_TTL_SECONDS);
      expect(setup.otpauthUri).toContain(`secret=${setup.secret}`);
      expect(setup.otpauthUri).toContain(encodeURIComponent(user.email));
      expect(setup.qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('refuses to confirm without a pending setup (e.g. expired)', async () => {
      const user = await createUser();
      const { secret } = await service.startEnrolment(user.id, PASSWORD);
      redis.expireNow(mfaRedisKeys.enrolment(user.id));

      const attempt = service.confirmEnrolment(user.id, totp.generate(secret));
      await expect(attempt).rejects.toThrow(BadRequestException);
      await expect(attempt).rejects.toMatchObject({ response: { code: MFA_SETUP_EXPIRED } });
    });

    it('refuses to confirm with a wrong code and keeps the pending setup', async () => {
      const user = await createUser();
      await service.startEnrolment(user.id, PASSWORD);

      await expectMfa401(service.confirmEnrolment(user.id, '000000'), MFA_INVALID_CODE);
      expect(redis.strings.has(mfaRedisKeys.enrolment(user.id))).toBe(true);
      expect(await service.isTotpEnabled(user.id)).toBe(false);
    });

    it('persists the encrypted secret and 10 hashed recovery codes on confirm', async () => {
      const user = await createUser();
      const { secret } = await service.startEnrolment(user.id, PASSWORD);

      const result = await service.confirmEnrolment(user.id, totp.generate(secret));

      expect(result.replaced).toBe(false);
      expect(result.recoveryCodes).toHaveLength(10);
      expect(new Set(result.recoveryCodes).size).toBe(10);
      for (const code of result.recoveryCodes) {
        expect(code).toMatch(/^[a-z2-7]{5}-[a-z2-7]{5}$/);
      }
      const [row] = await db.select().from(userMfa).where(eq(userMfa.userId, user.id));
      expect(row.totpSecretEnc.startsWith('enc:v1:')).toBe(true);
      expect(row.totpSecretEnc).not.toContain(secret);
      expect(row.totpLastUsedStep).toBe(Math.floor(START / STEP_MS));
      const codes = await db
        .select()
        .from(userMfaRecoveryCodes)
        .where(eq(userMfaRecoveryCodes.userId, user.id));
      expect(codes.map((c) => c.codeHash)).not.toContain(result.recoveryCodes[0]);
      expect(codes).toHaveLength(10);
      expect(redis.strings.has(mfaRedisKeys.enrolment(user.id))).toBe(false);

      expect(events.emit).toHaveBeenCalledWith(
        AUTH_MFA_ENABLED,
        expect.objectContaining({ email: user.email, replaced: false }),
      );
      expect(events.emit).toHaveBeenCalledWith(
        AUDIT_AUTH_MFA_ENABLED,
        expect.objectContaining({
          userId: user.id,
          details: { email: user.email, replaced: false },
        }),
      );
    });

    it('lets Postgres reject a plaintext TOTP secret', async () => {
      const user = await createUser();
      await expectCheckViolation(
        db.insert(userMfa).values({
          userId: user.id,
          totpSecretEnc: 'JBSWY3DPEHPK3PXP',
          totpEnabledAt: new Date(),
        }),
        'CHK_user_mfa_totp_secret_encrypted',
      );
    });

    it('requires a valid code of the old device to re-enrol (device change)', async () => {
      const user = await createUser();
      const { secret: oldSecret } = await enrol(user);
      nextStep();

      await expectMfa401(service.startEnrolment(user.id, PASSWORD), MFA_INVALID_CODE);
      await expectMfa401(service.startEnrolment(user.id, PASSWORD, '000000'), MFA_INVALID_CODE);

      const { secret: newSecret } = await service.startEnrolment(
        user.id,
        PASSWORD,
        totp.generate(oldSecret),
      );
      nextStep();
      const result = await service.confirmEnrolment(user.id, totp.generate(newSecret));
      expect(result.replaced).toBe(true);
      expect(events.emit).toHaveBeenCalledWith(
        AUTH_MFA_ENABLED,
        expect.objectContaining({ replaced: true }),
      );
    });
  });

  describe('disable', () => {
    it('is refused with 409 for a super-admin', async () => {
      const admin = await createUser({ isSuperAdmin: true });
      const { secret } = await enrol(admin);
      nextStep();

      const attempt = service.disable(admin.id, PASSWORD, totp.generate(secret));
      await expect(attempt).rejects.toThrow(ConflictException);
      await attempt.catch((error: ConflictException) =>
        expect(error.getResponse()).toMatchObject({ code: MFA_DISABLE_FORBIDDEN }),
      );
      expect(await service.isTotpEnabled(admin.id)).toBe(true);
    });

    it('is refused with 409 for a member of an org that requires MFA', async () => {
      const user = await createUser();
      await createOrg(true, user.id);
      const { secret } = await enrol(user);
      nextStep();

      await expect(service.disable(user.id, PASSWORD, totp.generate(secret))).rejects.toThrow(
        ConflictException,
      );
    });

    it('needs the password and a valid code', async () => {
      const user = await createUser();
      const { secret } = await enrol(user);
      nextStep();

      await expectMfa401(
        service.disable(user.id, 'wrong', totp.generate(secret)),
        MFA_INVALID_PASSWORD,
      );
      await expectMfa401(service.disable(user.id, PASSWORD, '000000'), MFA_INVALID_CODE);
      expect(await service.isTotpEnabled(user.id)).toBe(true);
    });

    it('answers 400 when TOTP is not enabled', async () => {
      const user = await createUser();
      await expect(service.disable(user.id, PASSWORD, '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('removes the factor and all recovery codes', async () => {
      const user = await createUser();
      const { secret } = await enrol(user);
      nextStep();

      await service.disable(user.id, PASSWORD, totp.generate(secret));

      expect(await service.isTotpEnabled(user.id)).toBe(false);
      const codes = await db
        .select()
        .from(userMfaRecoveryCodes)
        .where(eq(userMfaRecoveryCodes.userId, user.id));
      expect(codes).toHaveLength(0);
      expect(events.emit).toHaveBeenCalledWith(
        AUTH_MFA_DISABLED,
        expect.objectContaining({ email: user.email }),
      );
      expect(events.emit).toHaveBeenCalledWith(
        AUDIT_AUTH_MFA_DISABLED,
        expect.objectContaining({ userId: user.id }),
      );
    });
  });

  describe('recovery codes', () => {
    it('regenerates: old codes stop working, 10 new ones are issued', async () => {
      const user = await createUser();
      const { secret, recoveryCodes: oldCodes } = await enrol(user);
      nextStep();

      const fresh = await service.regenerateRecoveryCodes(user.id, PASSWORD, totp.generate(secret));

      expect(fresh).toHaveLength(10);
      expect(fresh).not.toContain(oldCodes[0]);
      const challenge = await service.createChallenge(user.id);
      await expect(
        service.verifyChallenge(challenge, { recoveryCode: oldCodes[0] }),
      ).rejects.toThrow(UnauthorizedException);
      expect(events.emit).toHaveBeenCalledWith(
        AUDIT_AUTH_MFA_RECOVERY_CODES_REGENERATED,
        expect.objectContaining({ userId: user.id }),
      );
    });

    it('refuses to regenerate with a wrong code', async () => {
      const user = await createUser();
      await enrol(user);
      await expectMfa401(
        service.regenerateRecoveryCodes(user.id, PASSWORD, '000000'),
        MFA_INVALID_CODE,
      );
    });

    it('refuses to regenerate with a wrong password', async () => {
      const user = await createUser();
      const { secret } = await enrol(user);
      nextStep();
      await expectMfa401(
        service.regenerateRecoveryCodes(user.id, 'wrong', totp.generate(secret)),
        MFA_INVALID_PASSWORD,
      );
    });
  });

  describe('management actions with a recovery code (lost device)', () => {
    function expectRecoveryCodeUsedNotice(user: User, remaining: number): void {
      expect(events.emit).toHaveBeenCalledWith(
        AUTH_MFA_RECOVERY_CODE_USED,
        expect.objectContaining({ email: user.email, remaining }),
      );
      expect(events.emit).toHaveBeenCalledWith(
        AUDIT_AUTH_MFA_RECOVERY_CODE_USED,
        expect.objectContaining({ userId: user.id, details: { email: user.email, remaining } }),
      );
    }

    it('moves the factor to a new device with a recovery code instead of the old code', async () => {
      const user = await createUser();
      const { recoveryCodes } = await enrol(user);
      nextStep();

      const { secret: newSecret } = await service.startEnrolment(
        user.id,
        PASSWORD,
        recoveryCodes[0].toUpperCase(),
      );
      expectRecoveryCodeUsedNotice(user, 9);
      nextStep();
      const result = await service.confirmEnrolment(user.id, totp.generate(newSecret));

      expect(result.replaced).toBe(true);
    });

    it('accepts each recovery code only once for a management action', async () => {
      const user = await createUser();
      const { recoveryCodes } = await enrol(user);

      await service.startEnrolment(user.id, PASSWORD, recoveryCodes[0]);
      await expectMfa401(
        service.startEnrolment(user.id, PASSWORD, recoveryCodes[0]),
        MFA_INVALID_CODE,
      );
      expect(redis.strings.get(mfaRedisKeys.failures(user.id))).toBe('1');
    });

    it('disables optional MFA with a recovery code', async () => {
      const user = await createUser();
      const { recoveryCodes } = await enrol(user);

      await service.disable(user.id, PASSWORD, recoveryCodes[1]);

      expect(await db.select().from(userMfa).where(eq(userMfa.userId, user.id))).toHaveLength(0);
      expectRecoveryCodeUsedNotice(user, 9);
    });

    it('regenerates recovery codes with a recovery code', async () => {
      const user = await createUser();
      const { recoveryCodes } = await enrol(user);

      const fresh = await service.regenerateRecoveryCodes(user.id, PASSWORD, recoveryCodes[2]);

      expect(fresh).toHaveLength(10);
      expect(fresh).not.toContain(recoveryCodes[3]);
    });

    it('does not spend a recovery code when the password is wrong', async () => {
      const user = await createUser();
      const { recoveryCodes } = await enrol(user);

      await expectMfa401(
        service.startEnrolment(user.id, 'wrong', recoveryCodes[0]),
        MFA_INVALID_PASSWORD,
      );
      await expect(
        service.startEnrolment(user.id, PASSWORD, recoveryCodes[0]),
      ).resolves.toBeDefined();
    });
  });

  describe('management actions and the lockout', () => {
    async function expectLockedOut(promise: Promise<unknown>): Promise<void> {
      const error: unknown = await promise.then(
        () => {
          throw new Error('expected a rejection');
        },
        (rejected: unknown) => rejected,
      );
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
      expect((error as HttpException).getResponse()).toMatchObject({ code: MFA_LOCKED_OUT });
    }

    it('counts wrong codes of device change, disable and regeneration against the user', async () => {
      const user = await createUser();
      await enrol(user);

      await expectMfa401(service.startEnrolment(user.id, PASSWORD), MFA_INVALID_CODE);
      await expectMfa401(service.startEnrolment(user.id, PASSWORD, '000000'), MFA_INVALID_CODE);
      await expectMfa401(service.disable(user.id, PASSWORD, '000000'), MFA_INVALID_CODE);
      await expectMfa401(
        service.regenerateRecoveryCodes(user.id, PASSWORD, '000000'),
        MFA_INVALID_CODE,
      );

      expect(redis.strings.get(mfaRedisKeys.failures(user.id))).toBe('4');
      expect(redis.ttls.get(mfaRedisKeys.failures(user.id))).toBe(900);
    });

    it('locks out after 10 wrong management codes, audited once, and blocks the login too', async () => {
      const user = await createUser();
      await enrol(user);

      for (let i = 0; i < 10; i++) {
        await expectMfa401(
          service.regenerateRecoveryCodes(user.id, PASSWORD, '000000'),
          MFA_INVALID_CODE,
        );
      }

      await expectLockedOut(service.regenerateRecoveryCodes(user.id, PASSWORD, '000000'));
      await expectLockedOut(service.createChallenge(user.id));
      const lockoutAudits = events.emit.mock.calls.filter(
        ([name]) => name === AUDIT_AUTH_MFA_LOCKOUT,
      );
      expect(lockoutAudits).toHaveLength(1);
    });

    it('refuses every management action while locked out, even with valid proof', async () => {
      const user = await createUser();
      const { secret } = await enrol(user);
      nextStep();
      await redis.set(mfaRedisKeys.failures(user.id), '10');
      const code = totp.generate(secret);

      await expectLockedOut(service.startEnrolment(user.id, PASSWORD, code));
      await expectLockedOut(service.disable(user.id, PASSWORD, code));
      await expectLockedOut(service.regenerateRecoveryCodes(user.id, PASSWORD, code));
      expect(await service.isTotpEnabled(user.id)).toBe(true);
    });

    it('does not count a wrong password as a code failure', async () => {
      const user = await createUser();
      await enrol(user);
      await expectMfa401(
        service.regenerateRecoveryCodes(user.id, 'wrong', '000000'),
        MFA_INVALID_PASSWORD,
      );
      expect(redis.strings.has(mfaRedisKeys.failures(user.id))).toBe(false);
    });

    it('keeps the window of an existing failure counter instead of extending it', async () => {
      const user = await createUser();
      await enrol(user);
      const key = mfaRedisKeys.failures(user.id);
      await redis.set(key, '3', 'EX', 120);

      await expectMfa401(service.disable(user.id, PASSWORD, '000000'), MFA_INVALID_CODE);

      expect(redis.strings.get(key)).toBe('4');
      expect(redis.ttls.get(key)).toBe(120);
    });
  });

  describe('login challenge', () => {
    it('stores only the hash of the challenge id, for 5 minutes', async () => {
      const user = await createUser();
      await enrol(user);

      const challengeId = await service.createChallenge(user.id);

      const key = mfaRedisKeys.challenge(hashToken(challengeId));
      expect(await redis.hget(key, 'userId')).toBe(user.id);
      expect(redis.ttls.get(key)).toBe(300);
      expect([...redis.hashes.keys()].some((k) => k.includes(challengeId))).toBe(false);
    });

    it('accepts a valid TOTP code once and consumes the challenge', async () => {
      const user = await createUser();
      const { secret } = await enrol(user);
      nextStep();
      const challengeId = await service.createChallenge(user.id);

      const result = await service.verifyChallenge(challengeId, { code: totp.generate(secret) });

      expect(result).toMatchObject({
        method: 'totp',
        user: expect.objectContaining({ id: user.id }),
      });
      await expect(
        service.verifyChallenge(challengeId, { code: totp.generate(secret) }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a replay of the same time step on a fresh challenge', async () => {
      const user = await createUser();
      const { secret } = await enrol(user);
      nextStep();
      const code = totp.generate(secret);
      await service.verifyChallenge(await service.createChallenge(user.id), { code });

      const second = await service.createChallenge(user.id);
      await expect(service.verifyChallenge(second, { code })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects the confirmation code itself (its step is already used)', async () => {
      const user = await createUser();
      const { secret } = await service.startEnrolment(user.id, PASSWORD);
      const code = totp.generate(secret);
      await service.confirmEnrolment(user.id, code);

      const challenge = await service.createChallenge(user.id);
      await expect(service.verifyChallenge(challenge, { code })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('accepts a recovery code exactly once and mails the remaining count', async () => {
      const user = await createUser();
      const { recoveryCodes } = await enrol(user);

      const result = await service.verifyChallenge(await service.createChallenge(user.id), {
        recoveryCode: recoveryCodes[0].toUpperCase().replace('-', ''),
      });

      expect(result.method).toBe('recovery');
      expect(events.emit).toHaveBeenCalledWith(
        AUTH_MFA_RECOVERY_CODE_USED,
        expect.objectContaining({ email: user.email, remaining: 9 }),
      );
      expect(events.emit).toHaveBeenCalledWith(
        AUDIT_AUTH_MFA_RECOVERY_CODE_USED,
        expect.objectContaining({ userId: user.id, details: { email: user.email, remaining: 9 } }),
      );
      const again = await service.createChallenge(user.id);
      await expect(
        service.verifyChallenge(again, { recoveryCode: recoveryCodes[0] }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('answers 401 for an unknown or expired challenge', async () => {
      const user = await createUser();
      const { secret } = await enrol(user);
      const challengeId = await service.createChallenge(user.id);
      redis.expireNow(mfaRedisKeys.challenge(hashToken(challengeId)));

      await expectMfa401(
        service.verifyChallenge(challengeId, { code: totp.generate(secret) }),
        MFA_CHALLENGE_EXPIRED,
      );
      await expectMfa401(
        service.verifyChallenge('made-up', { code: '123456' }),
        MFA_CHALLENGE_EXPIRED,
      );
    });

    it('drops the challenge when the factor was removed in between', async () => {
      const user = await createUser();
      await enrol(user);
      const challengeId = await service.createChallenge(user.id);
      await db.delete(userMfa).where(eq(userMfa.userId, user.id));

      await expectMfa401(
        service.verifyChallenge(challengeId, { code: '123456' }),
        MFA_CHALLENGE_EXPIRED,
      );
      expect(redis.hashes.size).toBe(0);
    });

    it('drops the challenge after 5 wrong codes', async () => {
      const user = await createUser();
      const { secret } = await enrol(user);
      nextStep();
      const challengeId = await service.createChallenge(user.id);

      for (let i = 0; i < 5; i++) {
        await expectMfa401(
          service.verifyChallenge(challengeId, { code: '000000' }),
          MFA_INVALID_CODE,
        );
      }
      // Even the right code no longer helps: the challenge is gone.
      await expect(
        service.verifyChallenge(challengeId, { code: totp.generate(secret) }),
      ).rejects.toThrow('MFA challenge expired');
    });

    it('treats a request with neither code nor recovery code as a failure', async () => {
      const user = await createUser();
      await enrol(user);
      const challengeId = await service.createChallenge(user.id);
      await expect(service.verifyChallenge(challengeId, {})).rejects.toThrow(UnauthorizedException);
    });

    it('locks the user out after 10 failures in the window (429), audited once', async () => {
      const user = await createUser();
      await enrol(user);

      for (let i = 0; i < 10; i++) {
        const challengeId = await service.createChallenge(user.id);
        await expect(service.verifyChallenge(challengeId, { code: '000000' })).rejects.toThrow(
          UnauthorizedException,
        );
      }

      const locked = service.createChallenge(user.id);
      await expect(locked).rejects.toThrow(HttpException);
      await locked.catch((error: HttpException) => {
        expect(error.getStatus()).toBe(429);
        expect(error.getResponse()).toMatchObject({ code: MFA_LOCKED_OUT });
      });
      expect(redis.ttls.get(mfaRedisKeys.failures(user.id))).toBe(900);
      const lockoutAudits = events.emit.mock.calls.filter(
        ([name]) => name === AUDIT_AUTH_MFA_LOCKOUT,
      );
      expect(lockoutAudits).toHaveLength(1);
    });

    it('refuses verification on an open challenge while locked out', async () => {
      const user = await createUser();
      const { secret } = await enrol(user);
      nextStep();
      const challengeId = await service.createChallenge(user.id);
      await redis.set(mfaRedisKeys.failures(user.id), '10');

      await expect(
        service.verifyChallenge(challengeId, { code: totp.generate(secret) }),
      ).rejects.toThrow(HttpException);
    });

    it('clears the failure counter after a successful verification', async () => {
      const user = await createUser();
      const { secret } = await enrol(user);
      nextStep();
      const challengeId = await service.createChallenge(user.id);
      await expect(service.verifyChallenge(challengeId, { code: '000000' })).rejects.toThrow();

      await service.verifyChallenge(challengeId, { code: totp.generate(secret) });

      expect(redis.strings.has(mfaRedisKeys.failures(user.id))).toBe(false);
    });

    it('drops a challenge that HINCRBY resurrected after it expired', async () => {
      const user = await createUser();
      await enrol(user);
      const challengeId = await service.createChallenge(user.id);
      const key = mfaRedisKeys.challenge(hashToken(challengeId));
      // Expire the key right after the userId lookup, before the increment.
      const hget = redis.hget.bind(redis);
      jest.spyOn(redis, 'hget').mockImplementationOnce(async (k: string, f: string) => {
        const value = await hget(k, f);
        redis.expireNow(key);
        return value;
      });

      await expect(service.verifyChallenge(challengeId, { code: '000000' })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(redis.hashes.has(key)).toBe(false);
    });
  });

  describe('no secrets in logs or events', () => {
    it('never logs or emits the TOTP secret, codes, recovery codes or the challenge id', async () => {
      const logged: unknown[] = [];
      for (const method of ['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const) {
        jest.spyOn(Logger.prototype, method).mockImplementation((...args: unknown[]) => {
          logged.push(...args);
        });
      }
      const user = await createUser();
      const sensitive: string[] = [];

      const { secret } = await service.startEnrolment(user.id, PASSWORD);
      const confirmCode = totp.generate(secret);
      const { recoveryCodes } = await service.confirmEnrolment(user.id, confirmCode);
      sensitive.push(secret, confirmCode, ...recoveryCodes);

      nextStep();
      const loginCode = totp.generate(secret);
      const challenge1 = await service.createChallenge(user.id);
      await expect(service.verifyChallenge(challenge1, { code: '999999' })).rejects.toThrow();
      await service.verifyChallenge(challenge1, { code: loginCode });
      const challenge2 = await service.createChallenge(user.id);
      await service.verifyChallenge(challenge2, { recoveryCode: recoveryCodes[1] });
      sensitive.push(loginCode, '999999', challenge1, challenge2);

      nextStep();
      const regenCode = totp.generate(secret);
      const fresh = await service.regenerateRecoveryCodes(user.id, PASSWORD, regenCode);
      nextStep();
      const disableCode = totp.generate(secret);
      await service.disable(user.id, PASSWORD, disableCode);
      sensitive.push(regenCode, disableCode, ...fresh);

      const haystack = JSON.stringify([logged, events.emit.mock.calls]);
      expect(logged.length).toBeGreaterThan(0);
      for (const value of sensitive) {
        expect(haystack).not.toContain(value);
        // Recovery codes are also accepted without the dash.
        expect(haystack).not.toContain(value.replace('-', ''));
      }
    });
  });
});
