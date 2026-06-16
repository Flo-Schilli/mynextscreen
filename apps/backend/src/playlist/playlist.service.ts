import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  playlists,
  playlistItems,
  contents,
  organisations,
  screens,
  scheduleEntries,
  type Playlist,
  type PlaylistItem,
  type Content,
} from '../db/schema';
import { ContentType } from '../content/content-type.enum';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddPlaylistItemDto } from './dto/add-playlist-item.dto';
import { UpdatePlaylistItemDto } from './dto/update-playlist-item.dto';
import { PLAYLIST_UPDATED, PlaylistUpdatedEvent } from './playlist.event';
import { CONTENT_DURATION_RESOLVED, ContentDurationResolvedEvent } from '../content/content.event';
import {
  AUDIT_PLAYLIST_CREATED,
  AUDIT_PLAYLIST_UPDATED,
  AUDIT_PLAYLIST_DELETED,
  AUDIT_PLAYLIST_BULK_DELETED,
  AUDIT_PLAYLIST_BULK_SCREEN_ASSIGNED,
  AuditPlaylistEvent,
} from '../audit-log/audit.events';

type PlaylistWithItemsAndContent = Playlist & {
  items: (PlaylistItem & { content: Content })[];
};

@Injectable()
export class PlaylistService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(organisationId: string, dto: CreatePlaylistDto): Promise<Playlist> {
    const [saved] = await this.db
      .insert(playlists)
      .values({
        organisationId,
        name: dto.name,
        ...(dto.color !== undefined && { color: dto.color }),
      })
      .returning();
    this.emitPlaylistChanged(saved.id, organisationId);
    this.eventEmitter.emit(
      AUDIT_PLAYLIST_CREATED,
      new AuditPlaylistEvent(saved.id, organisationId, null, {
        name: dto.name,
      }),
    );
    return saved;
  }

  async findAll(organisationId: string): Promise<PlaylistWithItemsAndContent[]> {
    return this.db.query.playlists.findMany({
      where: eq(playlists.organisationId, organisationId),
      with: {
        items: {
          with: { content: true },
          orderBy: asc(playlistItems.position),
        },
      },
      orderBy: asc(playlists.createdAt),
    });
  }

  async findOne(id: string, organisationId: string): Promise<PlaylistWithItemsAndContent> {
    const playlist = await this.db.query.playlists.findFirst({
      where: and(eq(playlists.id, id), eq(playlists.organisationId, organisationId)),
      with: {
        items: {
          with: { content: true },
          orderBy: asc(playlistItems.position),
        },
      },
    });
    if (!playlist) {
      throw new NotFoundException(
        `Playlist with id "${id}" not found in organisation "${organisationId}"`,
      );
    }
    return playlist;
  }

  async update(id: string, organisationId: string, dto: UpdatePlaylistDto): Promise<Playlist> {
    await this.findOne(id, organisationId);
    const [saved] = await this.db
      .update(playlists)
      .set({ name: dto.name, ...(dto.color !== undefined && { color: dto.color }) })
      .where(and(eq(playlists.id, id), eq(playlists.organisationId, organisationId)))
      .returning();
    this.emitPlaylistChanged(id, organisationId);
    this.eventEmitter.emit(
      AUDIT_PLAYLIST_UPDATED,
      new AuditPlaylistEvent(id, organisationId, null, { name: dto.name }),
    );
    return saved;
  }

  async addItem(
    id: string,
    organisationId: string,
    dto: AddPlaylistItemDto,
  ): Promise<PlaylistItem> {
    await this.findOne(id, organisationId);

    // Verify content exists in the same organisation
    const [content] = await this.db
      .select()
      .from(contents)
      .where(and(eq(contents.id, dto.contentId), eq(contents.organisationId, organisationId)))
      .limit(1);
    if (!content) {
      throw new BadRequestException(
        `Content with id "${dto.contentId}" not found in organisation "${organisationId}"`,
      );
    }

    // Determine position
    let position: number;
    if (dto.position !== undefined) {
      position = dto.position;
    } else {
      // Append to end
      const [maxItem] = await this.db
        .select()
        .from(playlistItems)
        .where(eq(playlistItems.playlistId, id))
        .orderBy(desc(playlistItems.position))
        .limit(1);
      position = maxItem ? maxItem.position + 1 : 0;
    }

    // Determine duration: for videos, prefer Content.durationSeconds; for images, default to 10
    let durationSeconds: number;
    if (content.type === ContentType.Video && content.durationSeconds != null) {
      durationSeconds = content.durationSeconds;
    } else if (dto.durationSeconds != null) {
      durationSeconds = dto.durationSeconds;
    } else {
      durationSeconds = content.type === ContentType.Video ? 30 : 10;
    }

    const [saved] = await this.db
      .insert(playlistItems)
      .values({
        playlistId: id,
        contentId: dto.contentId,
        durationSeconds,
        position,
        ...(dto.transition !== undefined && { transition: dto.transition }),
        ...(dto.transitionDurationMs !== undefined && {
          transitionDurationMs: dto.transitionDurationMs,
        }),
      })
      .returning();
    this.emitPlaylistChanged(id, organisationId);
    return saved;
  }

  async updateItem(
    playlistId: string,
    itemId: string,
    organisationId: string,
    dto: UpdatePlaylistItemDto,
  ): Promise<PlaylistItem> {
    await this.findOne(playlistId, organisationId);

    const [item] = await this.db
      .select()
      .from(playlistItems)
      .where(and(eq(playlistItems.id, itemId), eq(playlistItems.playlistId, playlistId)))
      .limit(1);
    if (!item) {
      throw new NotFoundException(
        `Playlist item with id "${itemId}" not found in playlist "${playlistId}"`,
      );
    }

    const updates: Partial<PlaylistItem> = {};
    if (dto.transition !== undefined) updates.transition = dto.transition;
    if (dto.transitionDurationMs !== undefined)
      updates.transitionDurationMs = dto.transitionDurationMs;
    if (dto.durationSeconds !== undefined) updates.durationSeconds = dto.durationSeconds;

    const [saved] = await this.db
      .update(playlistItems)
      .set(updates)
      .where(eq(playlistItems.id, itemId))
      .returning();
    this.emitPlaylistChanged(playlistId, organisationId);
    return saved;
  }

  async removeItem(playlistId: string, itemId: string, organisationId: string): Promise<void> {
    // Verify playlist belongs to org
    await this.findOne(playlistId, organisationId);

    const [item] = await this.db
      .select()
      .from(playlistItems)
      .where(and(eq(playlistItems.id, itemId), eq(playlistItems.playlistId, playlistId)))
      .limit(1);
    if (!item) {
      throw new NotFoundException(
        `Playlist item with id "${itemId}" not found in playlist "${playlistId}"`,
      );
    }

    await this.db.delete(playlistItems).where(eq(playlistItems.id, itemId));
    this.emitPlaylistChanged(playlistId, organisationId);
  }

  async reorderItems(
    playlistId: string,
    organisationId: string,
    itemIds: string[],
  ): Promise<PlaylistItem[]> {
    // Verify playlist belongs to org
    await this.findOne(playlistId, organisationId);

    // Fetch all items for this playlist
    const items = await this.db
      .select()
      .from(playlistItems)
      .where(eq(playlistItems.playlistId, playlistId));

    const itemMap = new Map(items.map((item) => [item.id, item]));

    // Validate all provided IDs belong to this playlist
    for (const itemId of itemIds) {
      if (!itemMap.has(itemId)) {
        throw new BadRequestException(
          `Item with id "${itemId}" does not belong to playlist "${playlistId}"`,
        );
      }
    }

    // Validate all items are accounted for
    if (itemIds.length !== items.length) {
      throw new BadRequestException(
        `Expected ${items.length} item IDs but received ${itemIds.length}`,
      );
    }

    // Update positions
    const updated: PlaylistItem[] = [];
    for (let i = 0; i < itemIds.length; i++) {
      const [saved] = await this.db
        .update(playlistItems)
        .set({ position: i })
        .where(eq(playlistItems.id, itemIds[i]))
        .returning();
      updated.push(saved);
    }

    this.emitPlaylistChanged(playlistId, organisationId);
    return updated;
  }

  async delete(id: string, organisationId: string): Promise<void> {
    const playlist = await this.findOne(id, organisationId);

    // If this playlist is the org's default, clear the reference
    await this.db
      .update(organisations)
      .set({ defaultPlaylistId: null })
      .where(and(eq(organisations.id, organisationId), eq(organisations.defaultPlaylistId, id)));

    await this.db.delete(playlists).where(eq(playlists.id, id));
    this.emitPlaylistChanged(id, organisationId);
    this.eventEmitter.emit(
      AUDIT_PLAYLIST_DELETED,
      new AuditPlaylistEvent(id, organisationId, null, {
        name: playlist.name,
      }),
    );
  }

  /**
   * Bulk delete playlists by IDs, scoped to the given organisation.
   * Validates that all IDs belong to the organisation (400 on foreign IDs).
   * Clears defaultPlaylistId on the org if any deleted playlist was the default.
   * Emits one audit event per deleted playlist.
   */
  async bulkDelete(
    organisationId: string,
    ids: string[],
    userId: string | null,
  ): Promise<{ deleted: number; notFound: string[] }> {
    const found = await this.findScopedOrThrowForeign(organisationId, ids);
    const foundIds = new Set(found.map((p) => p.id));
    const notFound = ids.filter((id) => !foundIds.has(id));

    if (found.length > 0) {
      // Clear defaultPlaylistId on the org if any deleted playlist was the default
      const [org] = await this.db
        .select()
        .from(organisations)
        .where(eq(organisations.id, organisationId))
        .limit(1);
      if (org && org.defaultPlaylistId && foundIds.has(org.defaultPlaylistId)) {
        await this.db
          .update(organisations)
          .set({ defaultPlaylistId: null })
          .where(eq(organisations.id, organisationId));
      }

      await this.db.delete(playlists).where(
        inArray(
          playlists.id,
          found.map((p) => p.id),
        ),
      );
    }

    const bulkOperationSize = ids.length;
    for (const playlist of found) {
      this.eventEmitter.emit(
        AUDIT_PLAYLIST_BULK_DELETED,
        new AuditPlaylistEvent(playlist.id, organisationId, userId, {
          bulkOperationSize,
        }),
      );
    }

    return { deleted: found.length, notFound };
  }

  /**
   * Bulk assign playlists to a screen by creating schedule entries.
   * Validates that all playlist IDs and the screen belong to the organisation.
   * Creates one schedule entry per playlist for the given screen.
   * Emits one audit event per assigned playlist.
   */
  async bulkAssignScreen(
    organisationId: string,
    ids: string[],
    screenId: string,
    userId: string | null,
  ): Promise<{ assigned: number; notFound: string[] }> {
    // Validate the screen belongs to the organisation
    const [screen] = await this.db
      .select()
      .from(screens)
      .where(and(eq(screens.id, screenId), eq(screens.organisationId, organisationId)))
      .limit(1);
    if (!screen) {
      // Check if screen exists in another org
      const [existsElsewhere] = await this.db
        .select()
        .from(screens)
        .where(eq(screens.id, screenId))
        .limit(1);
      if (existsElsewhere) {
        throw new BadRequestException({
          message: 'Screen belongs to a different organisation',
          foreignIds: [screenId],
        });
      }
      throw new NotFoundException(`Screen with id "${screenId}" not found`);
    }

    const found = await this.findScopedOrThrowForeign(organisationId, ids);
    const notFound = ids.filter((id) => !found.some((p) => p.id === id));

    // Create schedule entries for each playlist on the screen
    const now = new Date();
    const farFuture = new Date('2099-12-31T23:59:59.000Z');
    const defaultColour = '#4A90D9';

    for (const playlist of found) {
      await this.db.insert(scheduleEntries).values({
        organisationId,
        screenId,
        groupId: null,
        playlistId: playlist.id,
        startTime: now,
        endTime: farFuture,
        rrule: null,
        colour: defaultColour,
      });
    }

    const bulkOperationSize = ids.length;
    for (const playlist of found) {
      this.eventEmitter.emit(
        AUDIT_PLAYLIST_BULK_SCREEN_ASSIGNED,
        new AuditPlaylistEvent(playlist.id, organisationId, userId, {
          bulkOperationSize,
          screenId,
        }),
      );
    }

    return { assigned: found.length, notFound };
  }

  async getTotalDuration(id: string, organisationId: string): Promise<number> {
    const playlist = await this.findOne(id, organisationId);
    let total = 0;

    for (const item of playlist.items) {
      if (
        item.content &&
        item.content.type === ContentType.Video &&
        item.content.durationSeconds != null
      ) {
        total += item.content.durationSeconds;
      } else {
        total += item.durationSeconds;
      }
    }

    return total;
  }

  @OnEvent(CONTENT_DURATION_RESOLVED, { async: true })
  async onContentDurationResolved(event: ContentDurationResolvedEvent): Promise<void> {
    await this.db
      .update(playlistItems)
      .set({ durationSeconds: event.durationSeconds })
      .where(
        and(
          eq(playlistItems.contentId, event.contentId),
          ne(playlistItems.durationSeconds, event.durationSeconds),
        ),
      );
  }

  /**
   * Load the scoped playlists for the given ids; throws 400 if any id exists in a
   * different organisation. Returns the rows found within this organisation.
   */
  private async findScopedOrThrowForeign(
    organisationId: string,
    ids: string[],
  ): Promise<Playlist[]> {
    const found = await this.db
      .select()
      .from(playlists)
      .where(and(inArray(playlists.id, ids), eq(playlists.organisationId, organisationId)));

    const foundIds = new Set(found.map((p) => p.id));
    const foreignIds: string[] = [];

    for (const id of ids) {
      if (!foundIds.has(id)) {
        const [exists] = await this.db
          .select()
          .from(playlists)
          .where(eq(playlists.id, id))
          .limit(1);
        if (exists) {
          foreignIds.push(id);
        }
      }
    }

    if (foreignIds.length > 0) {
      throw new BadRequestException({
        message: 'Some IDs belong to a different organisation',
        foreignIds,
      });
    }

    return found;
  }

  private emitPlaylistChanged(playlistId: string, organisationId: string): void {
    this.eventEmitter.emit(PLAYLIST_UPDATED, new PlaylistUpdatedEvent(playlistId, organisationId));
  }
}
