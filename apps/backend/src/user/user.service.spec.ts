import { ConflictException } from '@nestjs/common';
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

  describe('password reset tokens', () => {
    it('should set and find a user by reset token', async () => {
      const [user] = await db.insert(users).values({ email: 'reset@example.com' }).returning();

      await service.setPasswordResetToken(user.id, 'token-abc', new Date(Date.now() + 60_000));

      const found = await service.findByPasswordResetToken('token-abc');
      expect(found?.id).toBe(user.id);
    });

    it('should set a password and clear any outstanding reset token', async () => {
      const [user] = await db
        .insert(users)
        .values({
          email: 'pw@example.com',
          passwordResetToken: 'token-xyz',
          passwordResetTokenExpiresAt: new Date(),
        })
        .returning();

      await service.setPassword(user.id, 'hashed-secret');

      const [persisted] = await db.select().from(users).where(eq(users.id, user.id));
      expect(persisted.passwordHash).toBe('hashed-secret');
      expect(persisted.passwordResetToken).toBeNull();
      expect(persisted.passwordResetTokenExpiresAt).toBeNull();
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
});
