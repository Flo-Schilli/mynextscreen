import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import { UserService } from './user.service';
import { DRIZZLE } from '../db/database.constants';
import { users, organisations, userOrganisationMemberships, type Organisation } from '../db/schema';
import { OrganisationRole } from './organisation-role.enum';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('UserService', () => {
  let service: UserService;
  let db: DrizzleDB;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: DRIZZLE, useValue: db }],
    }).compile();
    service = module.get<UserService>(UserService);
  });

  async function seedOrg(name: string): Promise<Organisation> {
    const [org] = await db.insert(organisations).values({ name, timeZone: 'UTC' }).returning();
    return org;
  }

  describe('createInvitee', () => {
    it('should return the existing user if one already exists for the email', async () => {
      const [existing] = await db.insert(users).values({ email: 'test@example.com' }).returning();

      const result = await service.createInvitee('test@example.com');

      expect(result.id).toBe(existing.id);
      const allUsers = await db.select().from(users);
      expect(allUsers).toHaveLength(1);
    });

    it('should create a new invitee with a null password hash when not found', async () => {
      const result = await service.createInvitee('new@example.com', null);

      expect(result.id).toBeDefined();
      expect(result.email).toBe('new@example.com');
      const [persisted] = await db.select().from(users).where(eq(users.id, result.id));
      expect(persisted.passwordHash).toBeNull();
    });

    it('should normalise the email to lower case', async () => {
      const result = await service.createInvitee('MixedCase@Example.COM');

      expect(result.email).toBe('mixedcase@example.com');
    });
  });

  describe('hasAnyUser', () => {
    it('returns false when no user exists', async () => {
      await expect(service.hasAnyUser()).resolves.toBe(false);
    });

    it('returns true once a user exists', async () => {
      await db.insert(users).values({ email: 'someone@example.com' });
      await expect(service.hasAnyUser()).resolves.toBe(true);
    });
  });

  describe('createFirstSuperAdmin', () => {
    it('creates the first super-admin with a hashed password and lower-cased email', async () => {
      const user = await service.createFirstSuperAdmin('Boss@Example.COM', 'hash', 'Boss');

      expect(user.email).toBe('boss@example.com');
      expect(user.name).toBe('Boss');
      expect(user.isSuperAdmin).toBe(true);
      expect(user.passwordHash).toBe('hash');
      // Provisioned directly, no verification email — must be verified so the
      // email-not-verified login gate doesn't lock them out on next login.
      expect(user.emailVerified).toBe(true);
      const all = await db.select().from(users);
      expect(all).toHaveLength(1);
    });

    it('throws ConflictException when any user already exists', async () => {
      await db.insert(users).values({ email: 'existing@example.com' });

      await expect(service.createFirstSuperAdmin('new@example.com', 'hash')).rejects.toThrow(
        ConflictException,
      );
      // No second user was created.
      const all = await db.select().from(users);
      expect(all).toHaveLength(1);
    });
  });

  describe('findById / findByEmail', () => {
    it('should find a user by id', async () => {
      const [user] = await db.insert(users).values({ email: 'byid@example.com' }).returning();

      const result = await service.findById(user.id);

      expect(result?.email).toBe('byid@example.com');
    });

    it('should return null when no user matches the id', async () => {
      const result = await service.findById('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });

    it('should find a user by email (case-insensitive)', async () => {
      await db.insert(users).values({ email: 'mail@example.com' });

      const result = await service.findByEmail('MAIL@EXAMPLE.COM');

      expect(result?.email).toBe('mail@example.com');
    });
  });

  describe('updateProfile', () => {
    it('updates the display name and returns the refreshed user', async () => {
      const [user] = await db
        .insert(users)
        .values({ email: 'name@example.com', name: 'Old Name' })
        .returning();

      const result = await service.updateProfile(user.id, { name: 'New Name' });

      expect(result.name).toBe('New Name');
      const [persisted] = await db.select().from(users).where(eq(users.id, user.id));
      expect(persisted.name).toBe('New Name');
    });

    it('trims surrounding whitespace from the name', async () => {
      const [user] = await db.insert(users).values({ email: 'trim@example.com' }).returning();

      const result = await service.updateProfile(user.id, { name: '  Spaced  ' });

      expect(result.name).toBe('Spaced');
    });

    it('clears the name to null when given a blank string', async () => {
      const [user] = await db
        .insert(users)
        .values({ email: 'clear@example.com', name: 'Has Name' })
        .returning();

      const result = await service.updateProfile(user.id, { name: '   ' });

      expect(result.name).toBeNull();
    });

    it('is a no-op that returns the user when name is undefined', async () => {
      const [user] = await db
        .insert(users)
        .values({ email: 'noop-profile@example.com', name: 'Keep Me' })
        .returning();

      const result = await service.updateProfile(user.id, {});

      expect(result.name).toBe('Keep Me');
    });

    it('throws NotFoundException when the user does not exist', async () => {
      await expect(
        service.updateProfile('00000000-0000-0000-0000-000000000000', { name: 'X' }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('password reset tokens', () => {
    it('should set and find a user by reset token', async () => {
      const [user] = await db.insert(users).values({ email: 'reset@example.com' }).returning();

      await service.setPasswordResetToken(user.id, 'token-abc', new Date(Date.now() + 60_000));

      const found = await service.findByPasswordResetToken('token-abc');
      expect(found?.id).toBe(user.id);
    });

    it('should set a password, clear the reset token, and mark the email verified', async () => {
      const [user] = await db
        .insert(users)
        .values({
          email: 'pw@example.com',
          emailVerified: false,
          passwordResetToken: 'token-xyz',
          passwordResetTokenExpiresAt: new Date(),
        })
        .returning();

      await service.setPassword(user.id, 'hashed-secret');

      const [persisted] = await db.select().from(users).where(eq(users.id, user.id));
      expect(persisted.passwordHash).toBe('hashed-secret');
      expect(persisted.passwordResetToken).toBeNull();
      expect(persisted.passwordResetTokenExpiresAt).toBeNull();
      // Invitees activating via the set-password link become verified so the
      // unverified-login gate (403 "Email not verified") no longer blocks them.
      expect(persisted.emailVerified).toBe(true);
    });
  });

  describe('getMemberships', () => {
    it('should return all memberships for a user with the organisation relation', async () => {
      const [user] = await db.insert(users).values({ email: 'member@example.com' }).returning();
      const orgA = await seedOrg('Org A');
      const orgB = await seedOrg('Org B');
      await db.insert(userOrganisationMemberships).values([
        { userId: user.id, organisationId: orgA.id, role: OrganisationRole.OrgAdmin },
        { userId: user.id, organisationId: orgB.id, role: OrganisationRole.Viewer },
      ]);

      const result = await service.getMemberships(user.id);

      expect(result).toHaveLength(2);
      const names = result.map((m) => m.organisation.name).sort();
      expect(names).toEqual(['Org A', 'Org B']);
    });

    it('should return an empty array when the user has no memberships', async () => {
      const [user] = await db.insert(users).values({ email: 'lonely@example.com' }).returning();

      const result = await service.getMemberships(user.id);

      expect(result).toEqual([]);
    });
  });

  describe('getMembership', () => {
    it('should return the membership for a specific user and org', async () => {
      const [user] = await db.insert(users).values({ email: 'one@example.com' }).returning();
      const org = await seedOrg('Org One');
      await db.insert(userOrganisationMemberships).values({
        userId: user.id,
        organisationId: org.id,
        role: OrganisationRole.Editor,
      });

      const result = await service.getMembership(user.id, org.id);

      expect(result?.role).toBe(OrganisationRole.Editor);
      expect(result?.userId).toBe(user.id);
      expect(result?.organisationId).toBe(org.id);
    });

    it('should return null when no membership exists', async () => {
      const [user] = await db.insert(users).values({ email: 'none@example.com' }).returning();
      const org = await seedOrg('Org None');

      const result = await service.getMembership(user.id, org.id);

      expect(result).toBeNull();
    });

    it('should not return a membership belonging to a different org', async () => {
      const [user] = await db.insert(users).values({ email: 'scoped@example.com' }).returning();
      const org = await seedOrg('Org Scoped');
      const otherOrg = await seedOrg('Org Other');
      await db.insert(userOrganisationMemberships).values({
        userId: user.id,
        organisationId: org.id,
        role: OrganisationRole.OrgAdmin,
      });

      const result = await service.getMembership(user.id, otherOrg.id);

      expect(result).toBeNull();
      // sanity: the membership truly exists, just not under otherOrg
      const [existing] = await db
        .select()
        .from(userOrganisationMemberships)
        .where(
          and(
            eq(userOrganisationMemberships.userId, user.id),
            eq(userOrganisationMemberships.organisationId, org.id),
          ),
        );
      expect(existing).toBeDefined();
    });
  });

  describe('createUserWithOrganisation', () => {
    const baseInput = {
      email: 'owner@example.com',
      passwordHash: 'hash',
      name: 'Owner',
      organisationName: 'Acme Venue',
      verificationToken: 'verify-tok',
      verificationTokenExpiresAt: new Date(Date.now() + 60_000),
      storageOriginalLimitBytes: 1000,
      storageTranscodedLimitBytes: 2000,
    };

    it('atomically creates an unverified user, their org, and an OrgAdmin membership', async () => {
      const user = await service.createUserWithOrganisation(baseInput);

      expect(user.emailVerified).toBe(false);
      expect(user.emailVerificationToken).toBe('verify-tok');
      expect(user.passwordHash).toBe('hash');

      const [org] = await db
        .select()
        .from(organisations)
        .where(eq(organisations.name, 'Acme Venue'));
      expect(org.storageOriginalLimitBytes).toBe(1000);
      expect(org.storageTranscodedLimitBytes).toBe(2000);
      expect(org.timeZone).toBe('UTC');

      const [membership] = await db
        .select()
        .from(userOrganisationMemberships)
        .where(eq(userOrganisationMemberships.userId, user.id));
      expect(membership.organisationId).toBe(org.id);
      expect(membership.role).toBe(OrganisationRole.OrgAdmin);
    });

    it('normalises the email to lower case', async () => {
      const user = await service.createUserWithOrganisation({
        ...baseInput,
        email: 'Owner@Example.COM',
      });
      expect(user.email).toBe('owner@example.com');
    });

    it('throws ConflictException (Email) on a duplicate email', async () => {
      await db.insert(users).values({ email: 'owner@example.com' });

      await expect(service.createUserWithOrganisation(baseInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws ConflictException (Organisation name) on a duplicate org name', async () => {
      await seedOrg('Acme Venue');

      await expect(
        service.createUserWithOrganisation({ ...baseInput, email: 'fresh@example.com' }),
      ).rejects.toThrow(/Organisation name/);
    });

    it('rolls back the user insert when the org name collides (atomicity)', async () => {
      await seedOrg('Acme Venue');

      await expect(
        service.createUserWithOrganisation({ ...baseInput, email: 'rollback@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);

      const orphan = await db.select().from(users).where(eq(users.email, 'rollback@example.com'));
      expect(orphan).toHaveLength(0);
    });
  });

  describe('email verification helpers', () => {
    it('sets, finds-by, and marks verified, clearing the token', async () => {
      const [user] = await db
        .insert(users)
        .values({ email: 'verify@example.com', emailVerified: false })
        .returning();
      const expiresAt = new Date(Date.now() + 60_000);

      await service.setEmailVerificationToken(user.id, 'tok-abc', expiresAt);
      const found = await service.findByEmailVerificationToken('tok-abc');
      expect(found?.id).toBe(user.id);

      await service.markEmailVerified(user.id);
      const [after] = await db.select().from(users).where(eq(users.id, user.id));
      expect(after.emailVerified).toBe(true);
      expect(after.emailVerificationToken).toBeNull();
      expect(after.emailVerificationTokenExpiresAt).toBeNull();
    });

    it('returns null for an unknown verification token', async () => {
      expect(await service.findByEmailVerificationToken('nope')).toBeNull();
    });
  });

  describe('email change helpers', () => {
    it('parks a pending email, finds by token, and applies the change', async () => {
      const [user] = await db
        .insert(users)
        .values({ email: 'old@example.com', emailVerified: true })
        .returning();
      const expiresAt = new Date(Date.now() + 60_000);

      await service.setPendingEmail(user.id, 'New@Example.com', 'ctok', expiresAt);
      const found = await service.findByEmailChangeToken('ctok');
      expect(found?.id).toBe(user.id);
      expect(found?.pendingEmail).toBe('new@example.com');

      await service.applyEmailChange(user.id);
      const [after] = await db.select().from(users).where(eq(users.id, user.id));
      expect(after.email).toBe('new@example.com');
      expect(after.pendingEmail).toBeNull();
      expect(after.emailChangeToken).toBeNull();
    });

    it('throws ConflictException when the pending email is already taken', async () => {
      await db.insert(users).values({ email: 'taken@example.com' });
      const [user] = await db.insert(users).values({ email: 'mover@example.com' }).returning();
      await service.setPendingEmail(
        user.id,
        'taken@example.com',
        'ctok2',
        new Date(Date.now() + 60_000),
      );

      await expect(service.applyEmailChange(user.id)).rejects.toBeInstanceOf(ConflictException);
    });

    it('is a no-op when there is no pending email', async () => {
      const [user] = await db.insert(users).values({ email: 'noop@example.com' }).returning();
      await expect(service.applyEmailChange(user.id)).resolves.toBeUndefined();
    });
  });

  describe('deleteStaleUnverifiedSignups', () => {
    it('deletes stale unverified users and their orphan org, keeps verified + recent', async () => {
      const old = new Date(Date.now() - 72 * 60 * 60 * 1000);
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

      // stale unverified signup with its own org
      const [stale] = await db
        .insert(users)
        .values({ email: 'stale@example.com', emailVerified: false, createdAt: old })
        .returning();
      const [staleOrg] = await db
        .insert(organisations)
        .values({ name: 'Stale Org', timeZone: 'UTC' })
        .returning();
      await db.insert(userOrganisationMemberships).values({
        userId: stale.id,
        organisationId: staleOrg.id,
        role: OrganisationRole.OrgAdmin,
      });

      // verified (must survive) + recent-unverified (must survive)
      const [verified] = await db
        .insert(users)
        .values({ email: 'verified@example.com', emailVerified: true, createdAt: old })
        .returning();
      const [recent] = await db
        .insert(users)
        .values({ email: 'recent@example.com', emailVerified: false })
        .returning();

      const removed = await service.deleteStaleUnverifiedSignups(cutoff);

      expect(removed).toBe(1);
      expect(await db.select().from(users).where(eq(users.id, stale.id))).toHaveLength(0);
      expect(
        await db.select().from(organisations).where(eq(organisations.id, staleOrg.id)),
      ).toHaveLength(0);
      expect(await db.select().from(users).where(eq(users.id, verified.id))).toHaveLength(1);
      expect(await db.select().from(users).where(eq(users.id, recent.id))).toHaveLength(1);
    });

    it('returns 0 when there is nothing stale', async () => {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      expect(await service.deleteStaleUnverifiedSignups(cutoff)).toBe(0);
    });
  });

  describe('deleteUser', () => {
    it('deletes the user and drops the org left with no members, returning its id', async () => {
      const [user] = await db.insert(users).values({ email: 'solo@example.com' }).returning();
      const org = await seedOrg('Solo Org');
      await db.insert(userOrganisationMemberships).values({
        userId: user.id,
        organisationId: org.id,
        role: OrganisationRole.OrgAdmin,
      });

      const orphaned = await service.deleteUser(user.id);

      expect(orphaned).toEqual([org.id]);
      expect(await db.select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
      expect(
        await db.select().from(organisations).where(eq(organisations.id, org.id)),
      ).toHaveLength(0);
    });

    it('keeps an org that still has another member and returns no orphan ids', async () => {
      const [user] = await db.insert(users).values({ email: 'leaver@example.com' }).returning();
      const [other] = await db.insert(users).values({ email: 'stayer@example.com' }).returning();
      const org = await seedOrg('Shared Org');
      await db.insert(userOrganisationMemberships).values([
        { userId: user.id, organisationId: org.id, role: OrganisationRole.OrgAdmin },
        { userId: other.id, organisationId: org.id, role: OrganisationRole.Editor },
      ]);

      const orphaned = await service.deleteUser(user.id);

      expect(orphaned).toEqual([]);
      expect(
        await db.select().from(organisations).where(eq(organisations.id, org.id)),
      ).toHaveLength(1);
    });

    describe('guardLastSuperAdmin', () => {
      it('refuses to delete the last super-admin (atomic lockout guard)', async () => {
        const [sa] = await db
          .insert(users)
          .values({ email: 'lone-sa@example.com', isSuperAdmin: true })
          .returning();

        await expect(service.deleteUser(sa.id, { guardLastSuperAdmin: true })).rejects.toThrow(
          ForbiddenException,
        );
        // Transaction rolled back — the super-admin is still present.
        expect(await db.select().from(users).where(eq(users.id, sa.id))).toHaveLength(1);
      });

      it('allows deleting a super-admin while another remains', async () => {
        const [sa1] = await db
          .insert(users)
          .values({ email: 'sa-one@example.com', isSuperAdmin: true })
          .returning();
        await db.insert(users).values({ email: 'sa-two@example.com', isSuperAdmin: true });

        await expect(service.deleteUser(sa1.id, { guardLastSuperAdmin: true })).resolves.toEqual(
          [],
        );
        expect(await db.select().from(users).where(eq(users.id, sa1.id))).toHaveLength(0);
        expect(await service.countSuperAdmins()).toBe(1);
      });

      it('does not guard a non-super-admin even when only one super-admin exists', async () => {
        await db.insert(users).values({ email: 'sole-sa@example.com', isSuperAdmin: true });
        const [plain] = await db
          .insert(users)
          .values({ email: 'plain-user@example.com' })
          .returning();

        await expect(service.deleteUser(plain.id, { guardLastSuperAdmin: true })).resolves.toEqual(
          [],
        );
        expect(await db.select().from(users).where(eq(users.id, plain.id))).toHaveLength(0);
      });

      it('serialises concurrent deletes so the last super-admin survives (TOCTOU)', async () => {
        // Two super-admins, deleted in parallel. The FOR UPDATE row lock + in-tx
        // re-count must let at most one through, leaving >= 1 super-admin. A
        // non-atomic check would let both pass and leave zero.
        const [sa1] = await db
          .insert(users)
          .values({ email: 'race-1@example.com', isSuperAdmin: true })
          .returning();
        const [sa2] = await db
          .insert(users)
          .values({ email: 'race-2@example.com', isSuperAdmin: true })
          .returning();

        const results = await Promise.allSettled([
          service.deleteUser(sa1.id, { guardLastSuperAdmin: true }),
          service.deleteUser(sa2.id, { guardLastSuperAdmin: true }),
        ]);

        const rejected = results.filter((r) => r.status === 'rejected');
        expect(rejected.length).toBeGreaterThanOrEqual(1);
        // Whatever the interleaving, the system never drops to zero super-admins.
        expect(await service.countSuperAdmins()).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('countSuperAdmins', () => {
    it('counts only super-admins', async () => {
      await db.insert(users).values([
        { email: 'sa1@example.com', isSuperAdmin: true },
        { email: 'sa2@example.com', isSuperAdmin: true },
        { email: 'plain@example.com', isSuperAdmin: false },
      ]);

      expect(await service.countSuperAdmins()).toBe(2);
    });

    it('returns 0 when there are none', async () => {
      await db.insert(users).values({ email: 'plain@example.com' });
      expect(await service.countSuperAdmins()).toBe(0);
    });
  });

  describe('listAllWithMemberships', () => {
    it('returns every user with org memberships (id + name + role) and flags', async () => {
      const [admin] = await db
        .insert(users)
        .values({ email: 'admin@example.com', name: 'Admin', isSuperAdmin: true })
        .returning();
      const [member] = await db
        .insert(users)
        .values({ email: 'member@example.com', emailVerified: false })
        .returning();
      const org = await seedOrg('Org X');
      await db.insert(userOrganisationMemberships).values({
        userId: member.id,
        organisationId: org.id,
        role: OrganisationRole.Editor,
      });

      const result = await service.listAllWithMemberships();

      const adminView = result.find((u) => u.id === admin.id);
      const memberView = result.find((u) => u.id === member.id);
      expect(adminView?.isSuperAdmin).toBe(true);
      expect(adminView?.memberships).toEqual([]);
      expect(memberView?.emailVerified).toBe(false);
      expect(memberView?.memberships).toEqual([
        { organisationId: org.id, organisationName: 'Org X', role: OrganisationRole.Editor },
      ]);
    });
  });
});
