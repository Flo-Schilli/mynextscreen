import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ContentService } from './content.service';
import { DRIZZLE } from '../db/database.constants';
import {
  contents,
  organisations,
  playlists,
  playlistItems,
  type Content,
  type Organisation,
} from '../db/schema';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { StorageService } from '../organisation/storage.service';
import {
  AUDIT_CONTENT_BULK_DELETED,
  AUDIT_CONTENT_BULK_TAGGED,
  AUDIT_CONTENT_BULK_UNTAGGED,
  AUDIT_CONTENT_BULK_ADDED_TO_PLAYLIST,
} from '../audit-log/audit.events';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe('ContentService — bulk operations', () => {
  let service: ContentService;
  let db: DrizzleDB;
  let storageService: Record<string, jest.Mock>;
  let emit: jest.Mock;

  beforeAll(async () => {
    db = await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await truncateAll();
    jest.clearAllMocks();

    storageService = {
      subtractOriginalUsage: jest.fn().mockResolvedValue(undefined),
      subtractTranscodedUsage: jest.fn().mockResolvedValue(undefined),
    };
    emit = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: DRIZZLE, useValue: db },
        { provide: StorageService, useValue: storageService },
        { provide: getQueueToken('transcoding'), useValue: { add: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, defaultValue: unknown) => defaultValue) },
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
  });

  async function seedOrg(name = `Org ${Math.random()}`): Promise<Organisation> {
    const [org] = await db.insert(organisations).values({ name, timeZone: 'UTC' }).returning();
    return org;
  }

  async function seedContent(
    organisationId: string,
    overrides: Partial<Content> = {},
  ): Promise<Content> {
    const [content] = await db
      .insert(contents)
      .values({
        organisationId,
        title: 'Content',
        tags: [],
        type: ContentType.Image,
        originalFilename: 'file.png',
        originalMimeType: 'image/png',
        originalSizeBytes: 1024,
        transcodingStatus: TranscodingStatus.Completed,
        ...overrides,
      })
      .returning();
    return content;
  }

  describe('bulkDelete', () => {
    it('should delete all found content and return count', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id);
      const c2 = await seedContent(org.id);

      const result = await service.bulkDelete(org.id, [c1.id, c2.id], 'user-1');

      expect(result.deleted).toBe(2);
      expect(result.notFound).toEqual([]);
      const rows = await db.select().from(contents).where(eq(contents.organisationId, org.id));
      expect(rows).toHaveLength(0);
    });

    it('should return notFound IDs for content that does not exist', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id);
      const missing = '770e8400-e29b-41d4-a716-446655440002';

      const result = await service.bulkDelete(org.id, [c1.id, missing], 'user-1');

      expect(result.deleted).toBe(1);
      expect(result.notFound).toEqual([missing]);
    });

    it('should throw BadRequestException when IDs belong to another org', async () => {
      const org = await seedOrg();
      const otherOrg = await seedOrg();
      const c1 = await seedContent(org.id);
      const foreign = await seedContent(otherOrg.id);

      await expect(service.bulkDelete(org.id, [c1.id, foreign.id], 'user-1')).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.bulkDelete(org.id, [c1.id, foreign.id], 'user-1');
      } catch (err: unknown) {
        expect((err as BadRequestException).getResponse()).toEqual(
          expect.objectContaining({ foreignIds: [foreign.id] }),
        );
      }
    });

    it('should emit one audit event per deleted content', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id);
      const c2 = await seedContent(org.id);

      await service.bulkDelete(org.id, [c1.id, c2.id], 'user-1');

      expect(emit).toHaveBeenCalledTimes(2);
      expect(emit).toHaveBeenCalledWith(
        AUDIT_CONTENT_BULK_DELETED,
        expect.objectContaining({
          contentId: c1.id,
          organisationId: org.id,
          userId: 'user-1',
          details: expect.objectContaining({ bulkOperationSize: 2 }),
        }),
      );
    });

    it('should subtract storage usage for each deleted content', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id, { originalSizeBytes: 1024, transcodedSizeBytes: 512 });

      await service.bulkDelete(org.id, [c1.id], 'user-1');

      expect(storageService.subtractOriginalUsage).toHaveBeenCalledWith(org.id, 1024);
      expect(storageService.subtractTranscodedUsage).toHaveBeenCalledWith(org.id, 512);
    });

    it('should handle empty found set gracefully', async () => {
      const org = await seedOrg();
      const missing = '770e8400-e29b-41d4-a716-446655440001';

      const result = await service.bulkDelete(org.id, [missing], 'user-1');

      expect(result.deleted).toBe(0);
      expect(result.notFound).toEqual([missing]);
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('bulkTag', () => {
    it('should add tags to all found content items', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id, { tags: ['existing'] });
      const c2 = await seedContent(org.id, { tags: [] });

      const result = await service.bulkTag(org.id, [c1.id, c2.id], ['new-tag'], 'user-1');

      expect(result.updated).toBe(2);
      const [row1] = await db.select().from(contents).where(eq(contents.id, c1.id));
      const [row2] = await db.select().from(contents).where(eq(contents.id, c2.id));
      expect(row1.tags).toContain('existing');
      expect(row1.tags).toContain('new-tag');
      expect(row2.tags).toContain('new-tag');
    });

    it('should not duplicate existing tags', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id, { tags: ['tag-a'] });

      await service.bulkTag(org.id, [c1.id], ['tag-a', 'tag-b'], 'user-1');

      const [row] = await db.select().from(contents).where(eq(contents.id, c1.id));
      expect(row.tags).toEqual(['tag-a', 'tag-b']);
    });

    it('should return notFound IDs', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id);
      const missing = '770e8400-e29b-41d4-a716-446655440002';

      const result = await service.bulkTag(org.id, [c1.id, missing], ['tag'], 'user-1');

      expect(result.updated).toBe(1);
      expect(result.notFound).toEqual([missing]);
    });

    it('should throw BadRequestException on foreign IDs', async () => {
      const org = await seedOrg();
      const otherOrg = await seedOrg();
      const foreign = await seedContent(otherOrg.id);

      await expect(service.bulkTag(org.id, [foreign.id], ['tag'], 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should emit one audit event per tagged content', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id);
      const c2 = await seedContent(org.id);

      await service.bulkTag(org.id, [c1.id, c2.id], ['tag-a'], 'user-1');

      expect(emit).toHaveBeenCalledTimes(2);
      expect(emit).toHaveBeenCalledWith(
        AUDIT_CONTENT_BULK_TAGGED,
        expect.objectContaining({
          contentId: c1.id,
          details: { bulkOperationSize: 2, tags: ['tag-a'] },
        }),
      );
    });
  });

  describe('bulkUntag', () => {
    it('should remove specified tags from all found content items', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id, { tags: ['keep', 'remove-me'] });
      const c2 = await seedContent(org.id, { tags: ['remove-me', 'also-keep'] });

      const result = await service.bulkUntag(org.id, [c1.id, c2.id], ['remove-me'], 'user-1');

      expect(result.updated).toBe(2);
      const [row1] = await db.select().from(contents).where(eq(contents.id, c1.id));
      const [row2] = await db.select().from(contents).where(eq(contents.id, c2.id));
      expect(row1.tags).toEqual(['keep']);
      expect(row2.tags).toEqual(['also-keep']);
    });

    it('should handle content with none of the specified tags', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id, { tags: ['unrelated'] });

      const result = await service.bulkUntag(org.id, [c1.id], ['nonexistent'], 'user-1');

      expect(result.updated).toBe(1);
      const [row] = await db.select().from(contents).where(eq(contents.id, c1.id));
      expect(row.tags).toEqual(['unrelated']);
    });

    it('should emit one audit event per untagged content', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id, { tags: ['tag-a'] });

      await service.bulkUntag(org.id, [c1.id], ['tag-a'], 'user-1');

      expect(emit).toHaveBeenCalledWith(
        AUDIT_CONTENT_BULK_UNTAGGED,
        expect.objectContaining({
          contentId: c1.id,
          details: { bulkOperationSize: 1, tags: ['tag-a'] },
        }),
      );
    });
  });

  describe('bulkAddToPlaylist', () => {
    async function seedPlaylist(organisationId: string): Promise<string> {
      const [pl] = await db.insert(playlists).values({ organisationId, name: 'PL' }).returning();
      return pl.id;
    }

    it('should add content items to the playlist', async () => {
      const org = await seedOrg();
      const playlistId = await seedPlaylist(org.id);
      const c1 = await seedContent(org.id);
      const c2 = await seedContent(org.id);

      const result = await service.bulkAddToPlaylist(org.id, [c1.id, c2.id], playlistId, 'user-1');

      expect(result.added).toBe(2);
      expect(result.alreadyPresent).toBe(0);
      expect(result.notFound).toEqual([]);
      const items = await db
        .select()
        .from(playlistItems)
        .where(eq(playlistItems.playlistId, playlistId));
      expect(items).toHaveLength(2);
    });

    it('should deduplicate items already in the playlist', async () => {
      const org = await seedOrg();
      const playlistId = await seedPlaylist(org.id);
      const c1 = await seedContent(org.id);
      const c2 = await seedContent(org.id);
      await db
        .insert(playlistItems)
        .values({ playlistId, contentId: c1.id, position: 0, durationSeconds: 10 });

      const result = await service.bulkAddToPlaylist(org.id, [c1.id, c2.id], playlistId, 'user-1');

      expect(result.added).toBe(1);
      expect(result.alreadyPresent).toBe(1);
    });

    it('should deduplicate within the same batch', async () => {
      const org = await seedOrg();
      const playlistId = await seedPlaylist(org.id);
      const c1 = await seedContent(org.id);

      const result = await service.bulkAddToPlaylist(org.id, [c1.id, c1.id], playlistId, 'user-1');

      expect(result.added).toBe(1);
      expect(result.alreadyPresent).toBe(1);
    });

    it('should throw BadRequestException for non-existent playlist', async () => {
      const org = await seedOrg();
      const c1 = await seedContent(org.id);
      const missingPlaylist = '880e8400-e29b-41d4-a716-446655440000';

      await expect(
        service.bulkAddToPlaylist(org.id, [c1.id], missingPlaylist, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return notFound for missing content IDs', async () => {
      const org = await seedOrg();
      const playlistId = await seedPlaylist(org.id);
      const c1 = await seedContent(org.id);
      const missing = '770e8400-e29b-41d4-a716-446655440002';

      const result = await service.bulkAddToPlaylist(
        org.id,
        [c1.id, missing],
        playlistId,
        'user-1',
      );

      expect(result.added).toBe(1);
      expect(result.notFound).toEqual([missing]);
    });

    it('should throw BadRequestException on foreign content IDs', async () => {
      const org = await seedOrg();
      const otherOrg = await seedOrg();
      const playlistId = await seedPlaylist(org.id);
      const foreign = await seedContent(otherOrg.id);

      await expect(
        service.bulkAddToPlaylist(org.id, [foreign.id], playlistId, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should emit one audit event per added content', async () => {
      const org = await seedOrg();
      const playlistId = await seedPlaylist(org.id);
      const c1 = await seedContent(org.id);

      await service.bulkAddToPlaylist(org.id, [c1.id], playlistId, 'user-1');

      expect(emit).toHaveBeenCalledWith(
        AUDIT_CONTENT_BULK_ADDED_TO_PLAYLIST,
        expect.objectContaining({
          contentId: c1.id,
          details: { bulkOperationSize: 1, playlistId },
        }),
      );
    });

    it('should append items after existing max position', async () => {
      const org = await seedOrg();
      const playlistId = await seedPlaylist(org.id);
      const existing = await seedContent(org.id);
      const c1 = await seedContent(org.id);
      await db
        .insert(playlistItems)
        .values({ playlistId, contentId: existing.id, position: 5, durationSeconds: 10 });

      await service.bulkAddToPlaylist(org.id, [c1.id], playlistId, 'user-1');

      const [added] = await db
        .select()
        .from(playlistItems)
        .where(eq(playlistItems.contentId, c1.id));
      expect(added.position).toBe(6);
    });
  });
});
