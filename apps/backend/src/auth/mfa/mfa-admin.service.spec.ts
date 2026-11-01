import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { eq } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import {
  AUDIT_AUTH_MFA_RESET,
  AUDIT_ORGANISATION_MFA_REQUIREMENT_CHANGED,
  AUTH_MFA_RESET,
  AUTH_ORG_MFA_REQUIRED,
  AuditMfaResetEvent,
  AuthMfaResetEvent,
  AuthOrgMfaRequiredEvent,
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
import { OrganisationRole } from '../../user/organisation-role.enum';
import { UserService } from '../../user/user.service';
import type { AuthenticatedUser } from '../jwt-auth.guard';
import type { TokenService } from '../token.service';
import { hashToken } from '../token-hash.util';
import {
  MFA_NOT_ENABLED,
  MFA_RESET_NEEDS_SUPER_ADMIN,
  MFA_RESET_NOT_MEMBER,
  MFA_RESET_SELF,
  MFA_RESET_TARGET_SUPER_ADMIN,
  MFA_SELF_REQUIRED,
  mfaRedisKeys,
} from './mfa.constants';
import { MfaAdminService } from './mfa-admin.service';
import { RecoveryCodeService } from './recovery-code.service';

describe('MfaAdminService', () => {
  let db: DrizzleDB;
  let redis: FakeMfaRedis;
  let events: { emit: jest.Mock };
  let tokens: { revokeAllForUser: jest.Mock };
  let service: MfaAdminService;

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
    tokens = { revokeAllForUser: jest.fn().mockResolvedValue(2) };
    service = new MfaAdminService(
      db,
      redis as unknown as Redis,
      new RecoveryCodeService(db),
      tokens as unknown as TokenService,
      new UserService(db),
      events as unknown as EventEmitter2,
    );
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

  async function createOrg(name = `Org ${Math.random()}`): Promise<string> {
    const [org] = await db.insert(organisations).values({ name, timeZone: 'UTC' }).returning();
    return org.id;
  }

  async function join(userId: string, organisationId: string, role: OrganisationRole) {
    await db.insert(userOrganisationMemberships).values({ userId, organisationId, role });
  }

  async function enrol(userId: string): Promise<void> {
    await db.insert(userMfa).values({
      userId,
      totpSecretEnc: 'enc:v1:test',
      totpEnabledAt: new Date(),
    });
    await db.insert(userMfaRecoveryCodes).values({ userId, codeHash: hashToken('code-1') });
  }

  function actor(user: User, mfa = true): AuthenticatedUser {
    return { userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin, mfa };
  }

  async function hasFactor(userId: string): Promise<boolean> {
    const rows = await db.select().from(userMfa).where(eq(userMfa.userId, userId));
    return rows.length > 0;
  }

  async function expectCode(promise: Promise<unknown>, type: unknown, code: string) {
    await expect(promise).rejects.toBeInstanceOf(type);
    await expect(promise).rejects.toMatchObject({ response: { code } });
  }

  function emitted<T>(name: string): T[] {
    return events.emit.mock.calls.filter(([event]) => event === name).map(([, payload]) => payload);
  }

  // ── Org requirement ───────────────────────────────────────────────────────

  describe('setOrgRequirement', () => {
    it('refuses to switch it on without an MFA-confirmed session (no self-lockout)', async () => {
      const admin = await createUser();
      const orgId = await createOrg();

      await expectCode(
        service.setOrgRequirement(orgId, true, actor(admin, false)),
        ForbiddenException,
        MFA_SELF_REQUIRED,
      );
      expect((await service.getOrgRequirement(orgId)).requireMfa).toBe(false);
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('switches it on, records since, audits and mails members without TOTP', async () => {
      const admin = await createUser();
      const withMfa = await createUser();
      const withoutMfa = await createUser();
      const invitee = await createUser({ passwordHash: null });
      const orgId = await createOrg('Venue');
      await join(admin.id, orgId, OrganisationRole.OrgAdmin);
      await join(withMfa.id, orgId, OrganisationRole.Editor);
      await join(withoutMfa.id, orgId, OrganisationRole.Viewer);
      await join(invitee.id, orgId, OrganisationRole.Viewer);
      await enrol(admin.id);
      await enrol(withMfa.id);

      const view = await service.setOrgRequirement(orgId, true, actor(admin));

      expect(view.requireMfa).toBe(true);
      expect(view.requireMfaSince).not.toBeNull();
      expect(emitted(AUDIT_ORGANISATION_MFA_REQUIREMENT_CHANGED)).toEqual([
        expect.objectContaining({
          organisationId: orgId,
          userId: admin.id,
          details: { name: 'Venue', requireMfa: true },
        }),
      ]);
      expect(emitted<AuthOrgMfaRequiredEvent>(AUTH_ORG_MFA_REQUIRED)).toEqual([
        new AuthOrgMfaRequiredEvent(withoutMfa.email, 'Venue'),
      ]);
    });

    it('switches it off without an MFA session, clears since and sends no mail', async () => {
      const admin = await createUser();
      const orgId = await createOrg();
      await db
        .update(organisations)
        .set({ requireMfa: true, requireMfaSince: new Date() })
        .where(eq(organisations.id, orgId));

      const view = await service.setOrgRequirement(orgId, false, actor(admin, false));

      expect(view).toEqual({ requireMfa: false, requireMfaSince: null });
      expect(emitted(AUDIT_ORGANISATION_MFA_REQUIREMENT_CHANGED)).toHaveLength(1);
      expect(emitted(AUTH_ORG_MFA_REQUIRED)).toHaveLength(0);
    });

    it('does nothing (no audit, no mail) when the value does not change', async () => {
      const admin = await createUser();
      const orgId = await createOrg();

      await service.setOrgRequirement(orgId, false, actor(admin));

      expect(events.emit).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown organisation', async () => {
      await expect(
        service.getOrgRequirement('00000000-0000-4000-8000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Super-admin reset ─────────────────────────────────────────────────────

  describe('resetBySuperAdmin', () => {
    it('removes factor + codes, clears Redis state, revokes sessions, audits per org, mails', async () => {
      const root = await createUser({ isSuperAdmin: true });
      const target = await createUser();
      const orgA = await createOrg();
      const orgB = await createOrg();
      await join(target.id, orgA, OrganisationRole.Editor);
      await join(target.id, orgB, OrganisationRole.Viewer);
      await enrol(target.id);
      await redis.set(mfaRedisKeys.enrolment(target.id), 'pending');
      await redis.set(mfaRedisKeys.failures(target.id), '3');

      await service.resetBySuperAdmin(target.id, actor(root));

      expect(await hasFactor(target.id)).toBe(false);
      const codes = await db
        .select()
        .from(userMfaRecoveryCodes)
        .where(eq(userMfaRecoveryCodes.userId, target.id));
      expect(codes).toHaveLength(0);
      expect(await redis.get(mfaRedisKeys.enrolment(target.id))).toBeNull();
      expect(await redis.get(mfaRedisKeys.failures(target.id))).toBeNull();
      expect(tokens.revokeAllForUser).toHaveBeenCalledWith(target.id);
      const audits = emitted<AuditMfaResetEvent>(AUDIT_AUTH_MFA_RESET);
      expect(audits.map((a) => a.organisationId).sort()).toEqual([orgA, orgB].sort());
      for (const audit of audits) {
        expect(audit).toMatchObject({
          targetUserId: target.id,
          actorId: root.id,
          details: { by: 'super_admin', actorId: root.id, email: target.email },
        });
      }
      expect(emitted(AUTH_MFA_RESET)).toEqual([new AuthMfaResetEvent(target.email, 'super_admin')]);
    });

    it('may reset another super-admin; a user without orgs is audited instance-wide', async () => {
      const root = await createUser({ isSuperAdmin: true });
      const other = await createUser({ isSuperAdmin: true });
      await enrol(other.id);

      await service.resetBySuperAdmin(other.id, actor(root));

      expect(await hasFactor(other.id)).toBe(false);
      expect(emitted<AuditMfaResetEvent>(AUDIT_AUTH_MFA_RESET)).toEqual([
        expect.objectContaining({ organisationId: null }),
      ]);
    });

    it('refuses to reset oneself', async () => {
      const root = await createUser({ isSuperAdmin: true });
      await enrol(root.id);

      await expectCode(
        service.resetBySuperAdmin(root.id, actor(root)),
        ForbiddenException,
        MFA_RESET_SELF,
      );
      expect(await hasFactor(root.id)).toBe(true);
    });

    it('answers 409 when the user has no factor (nothing revoked or mailed)', async () => {
      const root = await createUser({ isSuperAdmin: true });
      const target = await createUser();

      await expectCode(
        service.resetBySuperAdmin(target.id, actor(root)),
        ConflictException,
        MFA_NOT_ENABLED,
      );
      expect(tokens.revokeAllForUser).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown user', async () => {
      const root = await createUser({ isSuperAdmin: true });
      await expect(
        service.resetBySuperAdmin('00000000-0000-4000-8000-000000000000', actor(root)),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Org-admin reset ───────────────────────────────────────────────────────

  describe('resetByOrgAdmin', () => {
    let admin: User;
    let target: User;
    let orgId: string;

    beforeEach(async () => {
      admin = await createUser();
      target = await createUser();
      orgId = await createOrg();
      await join(admin.id, orgId, OrganisationRole.OrgAdmin);
      await join(target.id, orgId, OrganisationRole.Editor);
      await enrol(target.id);
    });

    it('resets a member whose every org the caller administers', async () => {
      const orgB = await createOrg();
      await join(admin.id, orgB, OrganisationRole.OrgAdmin);
      await join(target.id, orgB, OrganisationRole.Viewer);

      await service.resetByOrgAdmin(orgId, target.id, actor(admin));

      expect(await hasFactor(target.id)).toBe(false);
      expect(tokens.revokeAllForUser).toHaveBeenCalledWith(target.id);
      const audits = emitted<AuditMfaResetEvent>(AUDIT_AUTH_MFA_RESET);
      expect(audits.map((a) => a.organisationId).sort()).toEqual([orgId, orgB].sort());
      expect(audits[0].details).toEqual({
        by: 'org_admin',
        actorId: admin.id,
        email: target.email,
      });
      expect(emitted(AUTH_MFA_RESET)).toEqual([new AuthMfaResetEvent(target.email, 'org_admin')]);
    });

    it('rule 1: refuses without an MFA-confirmed caller session', async () => {
      await expectCode(
        service.resetByOrgAdmin(orgId, target.id, actor(admin, false)),
        ForbiddenException,
        MFA_SELF_REQUIRED,
      );
      expect(await hasFactor(target.id)).toBe(true);
    });

    it('rule 2: refuses to reset oneself', async () => {
      await enrol(admin.id);
      await expectCode(
        service.resetByOrgAdmin(orgId, admin.id, actor(admin)),
        ForbiddenException,
        MFA_RESET_SELF,
      );
      expect(await hasFactor(admin.id)).toBe(true);
    });

    it('rule 2: refuses a target that is not a member of the org', async () => {
      const outsider = await createUser();
      await enrol(outsider.id);

      await expectCode(
        service.resetByOrgAdmin(orgId, outsider.id, actor(admin)),
        NotFoundException,
        MFA_RESET_NOT_MEMBER,
      );
      expect(await hasFactor(outsider.id)).toBe(true);
    });

    it('rule 3: refuses to reset a super-admin', async () => {
      const root = await createUser({ isSuperAdmin: true });
      await join(root.id, orgId, OrganisationRole.Viewer);
      await enrol(root.id);

      await expectCode(
        service.resetByOrgAdmin(orgId, root.id, actor(admin)),
        ForbiddenException,
        MFA_RESET_TARGET_SUPER_ADMIN,
      );
      expect(await hasFactor(root.id)).toBe(true);
    });

    it('rule 4: refuses when the target is in an org the caller only edits', async () => {
      const orgB = await createOrg();
      await join(admin.id, orgB, OrganisationRole.Editor);
      await join(target.id, orgB, OrganisationRole.Viewer);

      await expectCode(
        service.resetByOrgAdmin(orgId, target.id, actor(admin)),
        ForbiddenException,
        MFA_RESET_NEEDS_SUPER_ADMIN,
      );
      expect(await hasFactor(target.id)).toBe(true);
      expect(tokens.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('rule 4: refuses when the target is in an org the caller is not part of', async () => {
      const orgB = await createOrg();
      await join(target.id, orgB, OrganisationRole.Viewer);

      await expectCode(
        service.resetByOrgAdmin(orgId, target.id, actor(admin)),
        ForbiddenException,
        MFA_RESET_NEEDS_SUPER_ADMIN,
      );
    });

    it('a super-admin on this route gets the super-admin rules (by super_admin)', async () => {
      const root = await createUser({ isSuperAdmin: true });
      const orgB = await createOrg();
      await join(target.id, orgB, OrganisationRole.Viewer);

      await service.resetByOrgAdmin(orgId, target.id, actor(root, true));

      expect(await hasFactor(target.id)).toBe(false);
      expect(emitted(AUTH_MFA_RESET)).toEqual([new AuthMfaResetEvent(target.email, 'super_admin')]);
    });

    it('a super-admin on this route still needs the target to be a member', async () => {
      const root = await createUser({ isSuperAdmin: true });
      const outsider = await createUser();

      await expectCode(
        service.resetByOrgAdmin(orgId, outsider.id, actor(root)),
        NotFoundException,
        MFA_RESET_NOT_MEMBER,
      );
    });
  });
});
