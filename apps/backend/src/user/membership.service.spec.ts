import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { and, eq } from 'drizzle-orm';
import { MembershipService } from './membership.service';
import { UserService } from './user.service';
import { hashToken } from '../auth/token-hash.util';
import { DRIZZLE } from '../db/database.constants';
import { users, organisations, userOrganisationMemberships, type Organisation } from '../db/schema';
import { OrganisationRole } from './organisation-role.enum';
import { AUTH_USER_INVITED } from '../audit-log/audit.events';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('MembershipService', () => {
  let service: MembershipService;
  let userService: UserService;
  let db: DrizzleDB;
  let emit: jest.Mock;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    emit = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        UserService,
        { provide: DRIZZLE, useValue: db },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();
    service = module.get<MembershipService>(MembershipService);
    userService = module.get<UserService>(UserService);
  });

  async function seedOrg(name = `Org ${Math.random()}`): Promise<Organisation> {
    const [org] = await db.insert(organisations).values({ name, timeZone: 'UTC' }).returning();
    return org;
  }

  async function seedUser(email: string): Promise<string> {
    const [user] = await db.insert(users).values({ email }).returning();
    return user.id;
  }

  async function seedMember(
    organisationId: string,
    email: string,
    role: OrganisationRole,
  ): Promise<string> {
    const userId = await seedUser(email);
    await db.insert(userOrganisationMemberships).values({ userId, organisationId, role });
    return userId;
  }

  describe('listMembers', () => {
    it('should return all memberships for an organisation with the user relation', async () => {
      const org = await seedOrg();
      await seedMember(org.id, 'admin@example.com', OrganisationRole.OrgAdmin);
      await seedMember(org.id, 'editor@example.com', OrganisationRole.Editor);

      const result = await service.listMembers(org.id);

      expect(result).toHaveLength(2);
      const emails = result.map((m) => m.user.email).sort();
      expect(emails).toEqual(['admin@example.com', 'editor@example.com']);
    });
  });

  describe('addMember', () => {
    it('should add an existing user as a member', async () => {
      const org = await seedOrg();
      const userId = await seedUser('test@example.com');

      const result = await service.addMember(org.id, 'test@example.com', OrganisationRole.Editor);

      expect(result.role).toBe(OrganisationRole.Editor);
      expect(result.user.id).toBe(userId);
      const memberships = await db
        .select()
        .from(userOrganisationMemberships)
        .where(eq(userOrganisationMemberships.organisationId, org.id));
      expect(memberships).toHaveLength(1);
      // Existing users are not freshly invited.
      expect(emit).not.toHaveBeenCalledWith(AUTH_USER_INVITED, expect.anything());
    });

    it('should create a placeholder invitee if the user does not exist', async () => {
      const org = await seedOrg();

      const result = await service.addMember(org.id, 'new@example.com', OrganisationRole.Viewer);

      expect(result.user.email).toBe('new@example.com');
      expect(result.user.passwordHash).toBeNull();
      const [createdUser] = await db.select().from(users).where(eq(users.email, 'new@example.com'));
      expect(createdUser).toBeDefined();
      // A fresh invitee gets a set-password token and the invite event.
      expect(createdUser.passwordResetToken).not.toBeNull();
      expect(emit).toHaveBeenCalledWith(AUTH_USER_INVITED, expect.anything());
    });

    it('should store the invite token hashed so the emailed raw token redeems', async () => {
      const org = await seedOrg();

      await service.addMember(org.id, 'invitee@example.com', OrganisationRole.Viewer);

      const [, event] = emit.mock.calls.find(([name]) => name === AUTH_USER_INVITED) ?? [];
      const rawToken: string = event.activationToken;
      const [createdUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, 'invitee@example.com'));
      // The mailed token must never sit in the row in plaintext...
      expect(createdUser.passwordResetToken).toBe(hashToken(rawToken));
      expect(createdUser.passwordResetToken).not.toBe(rawToken);
      // ...and the raw token from the email must resolve the invitee, which is
      // what /auth/set-password does before accepting the new password.
      const found = await userService.findByPasswordResetToken(rawToken);
      expect(found?.id).toBe(createdUser.id);
      expect(createdUser.passwordResetTokenExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it('should throw ConflictException if user is already a member', async () => {
      const org = await seedOrg();
      await seedMember(org.id, 'test@example.com', OrganisationRole.Viewer);

      await expect(
        service.addMember(org.id, 'test@example.com', OrganisationRole.Editor),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateRole', () => {
    it('should update the role of a member', async () => {
      const org = await seedOrg();
      // Need a second admin so demotion is not blocked by the last-admin guard.
      await seedMember(org.id, 'admin@example.com', OrganisationRole.OrgAdmin);
      const userId = await seedMember(org.id, 'member@example.com', OrganisationRole.Viewer);

      const result = await service.updateRole(org.id, userId, OrganisationRole.Editor);

      expect(result.role).toBe(OrganisationRole.Editor);
      const [persisted] = await db
        .select()
        .from(userOrganisationMemberships)
        .where(
          and(
            eq(userOrganisationMemberships.userId, userId),
            eq(userOrganisationMemberships.organisationId, org.id),
          ),
        );
      expect(persisted.role).toBe(OrganisationRole.Editor);
    });

    it('should throw NotFoundException if membership does not exist', async () => {
      const org = await seedOrg();

      await expect(
        service.updateRole(org.id, '00000000-0000-0000-0000-000000000000', OrganisationRole.Editor),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when demoting the last Org Admin', async () => {
      const org = await seedOrg();
      const userId = await seedMember(org.id, 'soleadmin@example.com', OrganisationRole.OrgAdmin);

      await expect(service.updateRole(org.id, userId, OrganisationRole.Editor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow demoting an Org Admin when there are other admins', async () => {
      const org = await seedOrg();
      const userId = await seedMember(org.id, 'admin1@example.com', OrganisationRole.OrgAdmin);
      await seedMember(org.id, 'admin2@example.com', OrganisationRole.OrgAdmin);

      const result = await service.updateRole(org.id, userId, OrganisationRole.Editor);

      expect(result.role).toBe(OrganisationRole.Editor);
    });

    it('should allow updating an Org Admin to the same role', async () => {
      const org = await seedOrg();
      const userId = await seedMember(org.id, 'soleadmin@example.com', OrganisationRole.OrgAdmin);

      const result = await service.updateRole(org.id, userId, OrganisationRole.OrgAdmin);

      expect(result.role).toBe(OrganisationRole.OrgAdmin);
    });
  });

  describe('removeMember', () => {
    it('should remove a non-admin member', async () => {
      const org = await seedOrg();
      const userId = await seedMember(org.id, 'editor@example.com', OrganisationRole.Editor);

      await service.removeMember(org.id, userId);

      const memberships = await db
        .select()
        .from(userOrganisationMemberships)
        .where(eq(userOrganisationMemberships.organisationId, org.id));
      expect(memberships).toHaveLength(0);
    });

    it('should throw NotFoundException if membership does not exist', async () => {
      const org = await seedOrg();

      await expect(
        service.removeMember(org.id, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when removing the last Org Admin', async () => {
      const org = await seedOrg();
      const userId = await seedMember(org.id, 'soleadmin@example.com', OrganisationRole.OrgAdmin);

      await expect(service.removeMember(org.id, userId)).rejects.toThrow(BadRequestException);
    });

    it('should allow removing an Org Admin when there are other admins', async () => {
      const org = await seedOrg();
      const userId = await seedMember(org.id, 'admin1@example.com', OrganisationRole.OrgAdmin);
      await seedMember(org.id, 'admin2@example.com', OrganisationRole.OrgAdmin);

      await service.removeMember(org.id, userId);

      const remaining = await db
        .select()
        .from(userOrganisationMemberships)
        .where(eq(userOrganisationMemberships.organisationId, org.id));
      expect(remaining).toHaveLength(1);
    });
  });
});
