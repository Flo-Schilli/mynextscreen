import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { OrganisationService } from './organisation.service';
import { DRIZZLE } from '../db/database.constants';
import {
  contents,
  organisations,
  playlists,
  users,
  userOrganisationMemberships,
  type Organisation,
} from '../db/schema';
import { OrganisationRole } from '../user/organisation-role.enum';
import { ContentType } from '../content/content-type.enum';
import { removeOrganisationMedia } from '../content/content-storage.util';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

jest.mock('../content/content-storage.util', () => ({
  removeOrganisationMedia: jest.fn().mockResolvedValue(undefined),
}));

const removeOrganisationMediaMock = removeOrganisationMedia as jest.MockedFunction<
  typeof removeOrganisationMedia
>;

const CREATOR_ID = '11111111-1111-1111-1111-111111111111';

describe('OrganisationService', () => {
  let service: OrganisationService;
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
    removeOrganisationMediaMock.mockClear();
    removeOrganisationMediaMock.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganisationService,
        { provide: DRIZZLE, useValue: db },
        { provide: EventEmitter2, useValue: { emit } },
        { provide: ConfigService, useValue: { get: jest.fn(() => '/tmp/media') } },
      ],
    }).compile();
    service = module.get<OrganisationService>(OrganisationService);
  });

  async function seedOrg(overrides: Partial<Organisation> = {}): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'Europe/Vienna', ...overrides })
      .returning();
    return org;
  }

  describe('create', () => {
    it('creates and persists an organisation', async () => {
      const result = await service.create({
        name: 'Acme',
        timeZone: 'Europe/Vienna',
        storageOriginalLimitBytes: 0,
        storageTranscodedLimitBytes: 0,
      });

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Acme');
      const rows = await db.select().from(organisations);
      expect(rows).toHaveLength(1);
      expect(emit).toHaveBeenCalled();
    });

    it('auto-adds the creator as OrgAdmin (creating the user)', async () => {
      const result = await service.create(
        {
          name: 'WithCreator',
          timeZone: 'UTC',
          storageOriginalLimitBytes: 0,
          storageTranscodedLimitBytes: 0,
        },
        { userId: CREATOR_ID, email: 'admin@example.com', isSuperAdmin: false },
      );

      const [user] = await db.select().from(users).where(eq(users.id, CREATOR_ID));
      expect(user.email).toBe('admin@example.com');
      const memberships = await db
        .select()
        .from(userOrganisationMemberships)
        .where(eq(userOrganisationMemberships.organisationId, result.id));
      expect(memberships).toHaveLength(1);
      expect(memberships[0].role).toBe(OrganisationRole.OrgAdmin);
    });

    it('reuses an existing user when the creator already exists', async () => {
      await db.insert(users).values({ id: CREATOR_ID, email: 'old@example.com' });

      const result = await service.create(
        {
          name: 'Reuse',
          timeZone: 'UTC',
          storageOriginalLimitBytes: 0,
          storageTranscodedLimitBytes: 0,
        },
        { userId: CREATOR_ID, email: 'old@example.com', isSuperAdmin: false },
      );

      const allUsers = await db.select().from(users);
      expect(allUsers).toHaveLength(1);
      const memberships = await db
        .select()
        .from(userOrganisationMemberships)
        .where(eq(userOrganisationMemberships.organisationId, result.id));
      expect(memberships).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('returns all organisations', async () => {
      await seedOrg({ name: 'A' });
      await seedOrg({ name: 'B' });
      const result = await service.findAll();
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('returns an organisation by id', async () => {
      const org = await seedOrg();
      const result = await service.findOne(org.id);
      expect(result.id).toBe(org.id);
    });

    it('throws NotFoundException when missing', async () => {
      await expect(service.findOne('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates and returns the organisation', async () => {
      const org = await seedOrg({ name: 'Before' });
      const result = await service.update(org.id, { name: 'After' });
      expect(result.name).toBe('After');
      expect(emit).toHaveBeenCalled();
    });

    it('throws NotFoundException when missing', async () => {
      await expect(
        service.update('00000000-0000-0000-0000-000000000000', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    async function seedUser(email: string, isSuperAdmin = false): Promise<string> {
      const [user] = await db.insert(users).values({ email, isSuperAdmin }).returning();
      return user.id;
    }
    async function addMembership(userId: string, organisationId: string): Promise<void> {
      await db.insert(userOrganisationMemberships).values({
        userId,
        organisationId,
        role: OrganisationRole.OrgAdmin,
      });
    }

    it('throws NotFoundException when the org does not exist', async () => {
      await expect(service.remove('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('cascade-deletes the org and its content', async () => {
      const org = await seedOrg();
      await db.insert(contents).values({
        organisationId: org.id,
        title: 'Clip',
        type: ContentType.Video,
        originalFilename: 'c.mp4',
        originalMimeType: 'video/mp4',
        originalSizeBytes: 1,
      });

      await service.remove(org.id);

      expect(
        await db.select().from(organisations).where(eq(organisations.id, org.id)),
      ).toHaveLength(0);
      expect(
        await db.select().from(contents).where(eq(contents.organisationId, org.id)),
      ).toHaveLength(0);
    });

    it('deletes a member who is left with no other org', async () => {
      const org = await seedOrg();
      const userId = await seedUser('orphan@example.com');
      await addMembership(userId, org.id);

      await service.remove(org.id);

      expect(await db.select().from(users).where(eq(users.id, userId))).toHaveLength(0);
    });

    it('keeps a member who still belongs to another org', async () => {
      const orgA = await seedOrg();
      const orgB = await seedOrg();
      const userId = await seedUser('multi@example.com');
      await addMembership(userId, orgA.id);
      await addMembership(userId, orgB.id);

      await service.remove(orgA.id);

      expect(await db.select().from(users).where(eq(users.id, userId))).toHaveLength(1);
    });

    it('keeps a super-admin member even when left with no other org', async () => {
      const org = await seedOrg();
      const userId = await seedUser('super@example.com', true);
      await addMembership(userId, org.id);

      await service.remove(org.id);

      expect(await db.select().from(users).where(eq(users.id, userId))).toHaveLength(1);
    });

    it('wipes the org media directory', async () => {
      const org = await seedOrg();

      await service.remove(org.id);

      // The third argument carries slice files stored outside {base}/{orgId}
      // by the pre-org-scoped path scheme.
      expect(removeOrganisationMediaMock).toHaveBeenCalledWith('/tmp/media', org.id, []);
    });

    it('still commits the deletion when media cleanup fails', async () => {
      const org = await seedOrg();
      removeOrganisationMediaMock.mockRejectedValue(new Error('fs boom'));

      await expect(service.remove(org.id)).resolves.toBeUndefined();
      expect(
        await db.select().from(organisations).where(eq(organisations.id, org.id)),
      ).toHaveLength(0);
    });
  });

  describe('setDefaultPlaylist', () => {
    it('sets the default playlist', async () => {
      const org = await seedOrg();
      const [playlist] = await db
        .insert(playlists)
        .values({ organisationId: org.id, name: 'PL' })
        .returning();

      const result = await service.setDefaultPlaylist(org.id, playlist.id);
      expect(result.defaultPlaylistId).toBe(playlist.id);
    });

    it('clears the default playlist when playlistId is null', async () => {
      const org = await seedOrg();
      const [playlist] = await db
        .insert(playlists)
        .values({ organisationId: org.id, name: 'PL' })
        .returning();
      await db
        .update(organisations)
        .set({ defaultPlaylistId: playlist.id })
        .where(eq(organisations.id, org.id));

      const result = await service.setDefaultPlaylist(org.id, null);
      expect(result.defaultPlaylistId).toBeNull();
    });

    it('throws NotFoundException if the playlist does not exist', async () => {
      const org = await seedOrg();
      await expect(
        service.setDefaultPlaylist(org.id, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if the playlist belongs to another org', async () => {
      const org = await seedOrg();
      const other = await seedOrg();
      const [playlist] = await db
        .insert(playlists)
        .values({ organisationId: other.id, name: 'Foreign' })
        .returning();

      await expect(service.setDefaultPlaylist(org.id, playlist.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException if the organisation does not exist', async () => {
      await expect(
        service.setDefaultPlaylist('00000000-0000-0000-0000-000000000000', null),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
