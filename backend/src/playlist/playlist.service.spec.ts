import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { PlaylistService } from './playlist.service';
import { DRIZZLE } from '../db/database.constants';
import {
  organisations,
  playlists,
  playlistItems,
  contents,
  type Organisation,
  type Playlist,
  type Content,
} from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { TranscodingStatus } from '../content/transcoding-status.enum';
import { TransitionType } from './transition-type.enum';
import { PLAYLIST_UPDATED } from './playlist.event';
import { ContentDurationResolvedEvent } from '../content/content.event';
import { initTestDb, truncateAll, closeTestDb } from '../test/db-harness';
import type { DrizzleDB } from '../db/drizzle.types';

describe('PlaylistService', () => {
  let service: PlaylistService;
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
        PlaylistService,
        { provide: DRIZZLE, useValue: db },
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();
    service = module.get<PlaylistService>(PlaylistService);
  });

  async function seedOrg(overrides: Partial<Organisation> = {}): Promise<Organisation> {
    const [org] = await db
      .insert(organisations)
      .values({ name: `Org ${Math.random()}`, timeZone: 'UTC', ...overrides })
      .returning();
    return org;
  }

  async function seedPlaylist(organisationId: string, name = 'PL'): Promise<Playlist> {
    const [playlist] = await db.insert(playlists).values({ organisationId, name }).returning();
    return playlist;
  }

  async function seedContent(
    organisationId: string,
    overrides: Partial<Content> = {},
  ): Promise<Content> {
    const [content] = await db
      .insert(contents)
      .values({
        organisationId,
        title: 'Clip',
        type: ContentType.Image,
        originalFilename: 'clip.png',
        originalMimeType: 'image/png',
        originalSizeBytes: 100,
        transcodingStatus: TranscodingStatus.Completed,
        ...overrides,
      })
      .returning();
    return content;
  }

  describe('create', () => {
    it('should create a playlist and emit event', async () => {
      const org = await seedOrg();

      const result = await service.create(org.id, { name: 'My Playlist' });

      expect(result.name).toBe('My Playlist');
      expect(result.organisationId).toBe(org.id);
      const rows = await db.select().from(playlists).where(eq(playlists.organisationId, org.id));
      expect(rows).toHaveLength(1);
      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: result.id, organisationId: org.id }),
      );
    });
  });

  describe('findAll', () => {
    it('should return playlists for an organisation', async () => {
      const org = await seedOrg();
      await seedPlaylist(org.id, 'A');
      await seedPlaylist(org.id, 'B');
      // A playlist in another org must not leak in.
      const other = await seedOrg();
      await seedPlaylist(other.id, 'C');

      const result = await service.findAll(org.id);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.name).sort()).toEqual(['A', 'B']);
      expect(result.every((p) => Array.isArray(p.items))).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a playlist with items', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id, 'Test');

      const result = await service.findOne(playlist.id, org.id);
      expect(result.id).toBe(playlist.id);
      expect(result.items).toEqual([]);
    });

    it('should throw NotFoundException when playlist not found', async () => {
      const org = await seedOrg();
      await expect(service.findOne('00000000-0000-0000-0000-000000000000', org.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update playlist name and emit event', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id, 'Old Name');

      const result = await service.update(playlist.id, org.id, { name: 'New Name' });

      expect(result.name).toBe('New Name');
      const [row] = await db.select().from(playlists).where(eq(playlists.id, playlist.id));
      expect(row.name).toBe('New Name');
      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: playlist.id }),
      );
    });
  });

  describe('addItem', () => {
    it('should add an image item with DTO duration', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });

      const saved = await service.addItem(playlist.id, org.id, {
        contentId: content.id,
        durationSeconds: 10,
      });

      expect(saved.contentId).toBe(content.id);
      expect(saved.durationSeconds).toBe(10);
      expect(saved.position).toBe(0);
      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: playlist.id }),
      );
    });

    it('should use Content.durationSeconds for video when available', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, {
        type: ContentType.Video,
        durationSeconds: 58,
      });

      const saved = await service.addItem(playlist.id, org.id, {
        contentId: content.id,
        durationSeconds: 30,
      });

      expect(saved.durationSeconds).toBe(58);
    });

    it('should fall back to DTO duration for video when Content.durationSeconds is null', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, {
        type: ContentType.Video,
        durationSeconds: null,
      });

      const saved = await service.addItem(playlist.id, org.id, {
        contentId: content.id,
        durationSeconds: 25,
      });

      expect(saved.durationSeconds).toBe(25);
    });

    it('should default to 10 for images when durationSeconds omitted from DTO', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });

      const saved = await service.addItem(playlist.id, org.id, {
        contentId: content.id,
      });

      expect(saved.durationSeconds).toBe(10);
    });

    it('should default to 30 for videos when durationSeconds omitted and Content has no duration', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, {
        type: ContentType.Video,
        durationSeconds: null,
      });

      const saved = await service.addItem(playlist.id, org.id, {
        contentId: content.id,
      });

      expect(saved.durationSeconds).toBe(30);
    });

    it('should append after existing items when no position given', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });
      await db.insert(playlistItems).values({
        playlistId: playlist.id,
        contentId: content.id,
        position: 5,
        durationSeconds: 10,
      });

      const saved = await service.addItem(playlist.id, org.id, {
        contentId: content.id,
        durationSeconds: 15,
      });

      expect(saved.position).toBe(6);
    });

    it('should use explicit position when provided', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });

      const saved = await service.addItem(playlist.id, org.id, {
        contentId: content.id,
        durationSeconds: 10,
        position: 3,
      });

      expect(saved.position).toBe(3);
    });

    it('should add an item with transition fields', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });

      const saved = await service.addItem(playlist.id, org.id, {
        contentId: content.id,
        durationSeconds: 10,
        transition: TransitionType.SlideLeft,
        transitionDurationMs: 1000,
      });

      expect(saved.transition).toBe(TransitionType.SlideLeft);
      expect(saved.transitionDurationMs).toBe(1000);
    });

    it('should default transition fields when omitted', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });

      const saved = await service.addItem(playlist.id, org.id, {
        contentId: content.id,
        durationSeconds: 10,
      });

      expect(saved.transition).toBe(TransitionType.Fade);
      expect(saved.transitionDurationMs).toBe(500);
    });

    it('should throw when content not found in org', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);

      await expect(
        service.addItem(playlist.id, org.id, {
          contentId: '00000000-0000-0000-0000-000000000000',
          durationSeconds: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateItem', () => {
    it('should update transition fields on an item', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });
      const [item] = await db
        .insert(playlistItems)
        .values({
          playlistId: playlist.id,
          contentId: content.id,
          position: 0,
          durationSeconds: 10,
          transition: TransitionType.Fade,
          transitionDurationMs: 500,
        })
        .returning();

      const saved = await service.updateItem(playlist.id, item.id, org.id, {
        transition: TransitionType.ZoomIn,
        transitionDurationMs: 2000,
      });

      expect(saved.transition).toBe(TransitionType.ZoomIn);
      expect(saved.transitionDurationMs).toBe(2000);
      expect(saved.durationSeconds).toBe(10);
      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: playlist.id }),
      );
    });

    it('should update only provided fields', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });
      const [item] = await db
        .insert(playlistItems)
        .values({
          playlistId: playlist.id,
          contentId: content.id,
          position: 0,
          durationSeconds: 10,
          transition: TransitionType.Fade,
          transitionDurationMs: 500,
        })
        .returning();

      const saved = await service.updateItem(playlist.id, item.id, org.id, {
        transition: TransitionType.Cut,
      });

      expect(saved.transition).toBe(TransitionType.Cut);
      expect(saved.transitionDurationMs).toBe(500);
    });

    it('should throw when item not found', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);

      await expect(
        service.updateItem(playlist.id, '00000000-0000-0000-0000-000000000000', org.id, {
          transition: TransitionType.Fade,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('should remove an item from the playlist', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });
      const [item] = await db
        .insert(playlistItems)
        .values({
          playlistId: playlist.id,
          contentId: content.id,
          position: 0,
          durationSeconds: 10,
        })
        .returning();

      await service.removeItem(playlist.id, item.id, org.id);

      const rows = await db.select().from(playlistItems).where(eq(playlistItems.id, item.id));
      expect(rows).toHaveLength(0);
      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: playlist.id }),
      );
    });

    it('should throw when item not found', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);

      await expect(
        service.removeItem(playlist.id, '00000000-0000-0000-0000-000000000000', org.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorderItems', () => {
    it('should update positions based on provided order', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });
      const inserted = await db
        .insert(playlistItems)
        .values([
          { playlistId: playlist.id, contentId: content.id, position: 0, durationSeconds: 10 },
          { playlistId: playlist.id, contentId: content.id, position: 1, durationSeconds: 10 },
          { playlistId: playlist.id, contentId: content.id, position: 2, durationSeconds: 10 },
        ])
        .returning();
      const [a, b, c] = inserted;

      await service.reorderItems(playlist.id, org.id, [c.id, a.id, b.id]);

      const rows = await db
        .select()
        .from(playlistItems)
        .where(eq(playlistItems.playlistId, playlist.id))
        .orderBy(asc(playlistItems.position));
      expect(rows.map((r) => r.id)).toEqual([c.id, a.id, b.id]);
      expect(rows.map((r) => r.position)).toEqual([0, 1, 2]);
      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: playlist.id }),
      );
    });

    it('should throw when item ID does not belong to playlist', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });
      const [a] = await db
        .insert(playlistItems)
        .values({
          playlistId: playlist.id,
          contentId: content.id,
          position: 0,
          durationSeconds: 10,
        })
        .returning();

      await expect(
        service.reorderItems(playlist.id, org.id, [a.id, '00000000-0000-0000-0000-000000000000']),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when item count does not match', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Image });
      const inserted = await db
        .insert(playlistItems)
        .values([
          { playlistId: playlist.id, contentId: content.id, position: 0, durationSeconds: 10 },
          { playlistId: playlist.id, contentId: content.id, position: 1, durationSeconds: 10 },
        ])
        .returning();

      await expect(service.reorderItems(playlist.id, org.id, [inserted[0].id])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a playlist and emit event', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id, 'Test');

      await service.delete(playlist.id, org.id);

      const rows = await db.select().from(playlists).where(eq(playlists.id, playlist.id));
      expect(rows).toHaveLength(0);
      expect(emit).toHaveBeenCalledWith(
        PLAYLIST_UPDATED,
        expect.objectContaining({ playlistId: playlist.id }),
      );
    });

    it('should clear defaultPlaylistId when deleting the default playlist', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id, 'Default');
      await db
        .update(organisations)
        .set({ defaultPlaylistId: playlist.id })
        .where(eq(organisations.id, org.id));

      await service.delete(playlist.id, org.id);

      const [updatedOrg] = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, org.id));
      expect(updatedOrg.defaultPlaylistId).toBeNull();
      const rows = await db.select().from(playlists).where(eq(playlists.id, playlist.id));
      expect(rows).toHaveLength(0);
    });

    it('should not modify org default when deleting a non-default playlist', async () => {
      const org = await seedOrg();
      const other = await seedPlaylist(org.id, 'Default');
      const toDelete = await seedPlaylist(org.id, 'Other');
      await db
        .update(organisations)
        .set({ defaultPlaylistId: other.id })
        .where(eq(organisations.id, org.id));

      await service.delete(toDelete.id, org.id);

      const [updatedOrg] = await db
        .select()
        .from(organisations)
        .where(eq(organisations.id, org.id));
      expect(updatedOrg.defaultPlaylistId).toBe(other.id);
    });
  });

  describe('onContentDurationResolved', () => {
    it('should bulk-update playlist items with new duration', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Video });
      const inserted = await db
        .insert(playlistItems)
        .values([
          { playlistId: playlist.id, contentId: content.id, position: 0, durationSeconds: 30 },
          { playlistId: playlist.id, contentId: content.id, position: 1, durationSeconds: 30 },
        ])
        .returning();

      await service.onContentDurationResolved(new ContentDurationResolvedEvent(content.id, 58));

      const rows = await db
        .select()
        .from(playlistItems)
        .where(eq(playlistItems.contentId, content.id));
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.durationSeconds === 58)).toBe(true);
      expect(inserted).toHaveLength(2);
    });

    it('should skip items already at the resolved duration', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const content = await seedContent(org.id, { type: ContentType.Video });
      const [already] = await db
        .insert(playlistItems)
        .values({
          playlistId: playlist.id,
          contentId: content.id,
          position: 0,
          durationSeconds: 42,
        })
        .returning();
      const [stale] = await db
        .insert(playlistItems)
        .values({
          playlistId: playlist.id,
          contentId: content.id,
          position: 1,
          durationSeconds: 10,
        })
        .returning();

      await service.onContentDurationResolved(new ContentDurationResolvedEvent(content.id, 42));

      const [alreadyRow] = await db
        .select()
        .from(playlistItems)
        .where(eq(playlistItems.id, already.id));
      const [staleRow] = await db
        .select()
        .from(playlistItems)
        .where(eq(playlistItems.id, stale.id));
      expect(alreadyRow.durationSeconds).toBe(42);
      expect(staleRow.durationSeconds).toBe(42);
    });
  });

  describe('getTotalDuration', () => {
    async function seedItem(
      playlistId: string,
      contentId: string,
      position: number,
      durationSeconds: number,
    ): Promise<void> {
      await db.insert(playlistItems).values({ playlistId, contentId, position, durationSeconds });
    }

    it('should sum durations of all items', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const image = await seedContent(org.id, { type: ContentType.Image });
      const video = await seedContent(org.id, { type: ContentType.Video, durationSeconds: null });
      await seedItem(playlist.id, image.id, 0, 10);
      await seedItem(playlist.id, video.id, 1, 30);
      await seedItem(playlist.id, image.id, 2, 15);

      const total = await service.getTotalDuration(playlist.id, org.id);
      expect(total).toBe(55);
    });

    it('should prefer Content.durationSeconds for videos', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const image = await seedContent(org.id, { type: ContentType.Image });
      const video = await seedContent(org.id, { type: ContentType.Video, durationSeconds: 58 });
      await seedItem(playlist.id, image.id, 0, 10);
      await seedItem(playlist.id, video.id, 1, 30);

      const total = await service.getTotalDuration(playlist.id, org.id);
      expect(total).toBe(68); // 10 (image) + 58 (video real duration)
    });

    it('should fall back to item.durationSeconds when video Content.durationSeconds is null', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id);
      const video = await seedContent(org.id, { type: ContentType.Video, durationSeconds: null });
      await seedItem(playlist.id, video.id, 0, 30);

      const total = await service.getTotalDuration(playlist.id, org.id);
      expect(total).toBe(30);
    });

    it('should return 0 for empty playlist', async () => {
      const org = await seedOrg();
      const playlist = await seedPlaylist(org.id, 'Empty');

      const total = await service.getTotalDuration(playlist.id, org.id);
      expect(total).toBe(0);
    });
  });
});
