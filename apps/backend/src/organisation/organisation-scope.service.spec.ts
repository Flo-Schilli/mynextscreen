import { NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { OrganisationScopedService, OrganisationScoped } from './organisation-scope.service';
import { organisations, playlists } from '../db/schema';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

/**
 * The base service is exercised against the real `playlists` table — it has the
 * `id` + `organisationId` columns every tenant-scoped table exposes plus a free
 * `name` column to mutate, so the generic CRUD/scoping behaviour is fully covered.
 */
interface PlaylistRow extends OrganisationScoped {
  id: string;
  organisationId: string;
  name: string;
}

describe('OrganisationScopedService', () => {
  let service: OrganisationScopedService<PlaylistRow>;
  let db: DrizzleDB;
  let orgId: string;
  let otherOrgId: string;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    const [org] = await db
      .insert(organisations)
      .values({ name: 'Primary', timeZone: 'UTC' })
      .returning();
    const [other] = await db
      .insert(organisations)
      .values({ name: 'Other', timeZone: 'UTC' })
      .returning();
    orgId = org.id;
    otherOrgId = other.id;

    service = new OrganisationScopedService<PlaylistRow>(db, playlists, 'Playlist');
  });

  async function seedPlaylist(organisationId: string, name: string): Promise<PlaylistRow> {
    const [row] = await db.insert(playlists).values({ organisationId, name }).returning();
    return row as PlaylistRow;
  }

  describe('findAll', () => {
    it('should scope queries by organisationId', async () => {
      await seedPlaylist(orgId, 'Mine');
      await seedPlaylist(otherOrgId, 'Theirs');

      const result = await service.findAll(orgId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Mine');
    });

    it('should return empty array for organisation with no entities', async () => {
      const result = await service.findAll(otherOrgId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should scope single-entity query by organisationId and id', async () => {
      const entity = await seedPlaylist(orgId, 'Target');

      const result = await service.findOne(orgId, entity.id);

      expect(result.id).toBe(entity.id);
      expect(result.name).toBe('Target');
    });

    it('should throw NotFoundException when entity belongs to another organisation', async () => {
      const entity = await seedPlaylist(orgId, 'Target');

      await expect(service.findOne(otherOrgId, entity.id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(otherOrgId, entity.id)).rejects.toThrow(
        `Playlist with id "${entity.id}" not found in organisation "${otherOrgId}"`,
      );
    });
  });

  describe('create', () => {
    it('should set organisationId on the created entity', async () => {
      const result = await service.create(orgId, { name: 'New Entity' });

      expect(result.organisationId).toBe(orgId);
      expect(result.name).toBe('New Entity');
      const [persisted] = await db.select().from(playlists).where(eq(playlists.id, result.id));
      expect(persisted.organisationId).toBe(orgId);
    });
  });

  describe('update', () => {
    it('should update an entity scoped to the organisation', async () => {
      const entity = await seedPlaylist(orgId, 'Before');

      const result = await service.update(orgId, entity.id, { name: 'Updated' });

      expect(result.name).toBe('Updated');
      const [persisted] = await db.select().from(playlists).where(eq(playlists.id, entity.id));
      expect(persisted.name).toBe('Updated');
    });

    it('should throw NotFoundException when entity belongs to another organisation', async () => {
      const entity = await seedPlaylist(orgId, 'Before');

      await expect(service.update(otherOrgId, entity.id, { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
      // unchanged in the real org
      const [persisted] = await db.select().from(playlists).where(eq(playlists.id, entity.id));
      expect(persisted.name).toBe('Before');
    });
  });

  describe('remove', () => {
    it('should remove an entity scoped to the organisation', async () => {
      const entity = await seedPlaylist(orgId, 'Doomed');

      await service.remove(orgId, entity.id);

      const rows = await db.select().from(playlists).where(eq(playlists.id, entity.id));
      expect(rows).toHaveLength(0);
    });

    it('should throw NotFoundException when entity belongs to another organisation', async () => {
      const entity = await seedPlaylist(orgId, 'Doomed');

      await expect(service.remove(otherOrgId, entity.id)).rejects.toThrow(NotFoundException);
      const rows = await db.select().from(playlists).where(eq(playlists.id, entity.id));
      expect(rows).toHaveLength(1);
    });
  });
});
