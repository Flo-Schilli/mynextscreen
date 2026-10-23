import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
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
import { NewPlaylistItemDto } from './dto/add-playlist-items.dto';
import { UpdateAllPlaylistItemsDto } from './dto/update-all-playlist-items.dto';
import { toPlaylistRule } from './dto/playlist-rule.dto';
import { PlaylistKind } from './playlist-kind.enum';
import { assertStaticPlaylist } from './assert-static-playlist';
import type { TransitionType } from './transition-type.enum';
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
import {
  SCHEDULE_ENTRIES_EDITED,
  SCHEDULE_ENTRY_CHANGED,
  ScheduleEntriesEditedEvent,
  ScheduleEntryChangedEvent,
} from '../schedule/schedule.event';

/** Fallback item durations when neither the video nor the request has one. */
const DEFAULT_VIDEO_DURATION_SECONDS = 30;
const DEFAULT_IMAGE_DURATION_SECONDS = 10;

/** A video with a known length always plays it; otherwise the request wins, then the default. */
/**
 * Slides of a content source belong in dynamic playlists only. The source
 * owns their lifecycle: in a static playlist a slide would outlive its event.
 */
function assertLibraryContent(found: Pick<Content, 'id' | 'managedBySourceId'>[]): void {
  const managedIds = found.filter((content) => content.managedBySourceId !== null).map((c) => c.id);
  if (managedIds.length > 0) {
    throw new ConflictException({
      message: 'Content managed by a content source cannot be added to a static playlist',
      managedIds,
    });
  }
}

function resolveItemDuration(content: Content, requestedSeconds?: number): number {
  if (content.type === ContentType.Video && content.durationSeconds != null) {
    return content.durationSeconds;
  }
  if (requestedSeconds != null) {
    return requestedSeconds;
  }
  return content.type === ContentType.Video
    ? DEFAULT_VIDEO_DURATION_SECONDS
    : DEFAULT_IMAGE_DURATION_SECONDS;
}

type PlaylistWithItemsAndContent = Playlist & {
  items: (PlaylistItem & { content: Content })[];
};

/** One materialised item of a dynamic playlist, in playback order. */
export interface ReplacementPlaylistItem {
  contentId: string;
  durationSeconds: number;
  transition: TransitionType;
  transitionDurationMs: number;
}

type ComparableItem = Pick<
  PlaylistItem,
  'contentId' | 'durationSeconds' | 'transition' | 'transitionDurationMs'
>;

function sameItems(current: ComparableItem[], next: ComparableItem[]): boolean {
  return (
    current.length === next.length &&
    current.every(
      (item, index) =>
        item.contentId === next[index].contentId &&
        item.durationSeconds === next[index].durationSeconds &&
        item.transition === next[index].transition &&
        item.transitionDurationMs === next[index].transitionDurationMs,
    )
  );
}

@Injectable()
export class PlaylistService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(organisationId: string, dto: CreatePlaylistDto): Promise<Playlist> {
    const kind = dto.kind ?? PlaylistKind.Static;
    if (kind === PlaylistKind.Dynamic && !dto.rule) {
      throw new BadRequestException('A dynamic playlist needs a rule');
    }
    if (kind === PlaylistKind.Static && dto.rule) {
      throw new BadRequestException('A static playlist cannot have a rule');
    }
    const [saved] = await this.db
      .insert(playlists)
      .values({
        organisationId,
        name: dto.name,
        ...(dto.color !== undefined && { color: dto.color }),
        kind,
        // Null `nextResolveAt` marks a dynamic playlist as due for its first resolve.
        rule: dto.rule ? toPlaylistRule(dto.rule) : null,
      })
      .returning();
    this.emitPlaylistChanged(saved.id, organisationId);
    this.eventEmitter.emit(
      AUDIT_PLAYLIST_CREATED,
      new AuditPlaylistEvent(saved.id, organisationId, null, {
        name: dto.name,
        ...(kind === PlaylistKind.Dynamic && { kind }),
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
    assertStaticPlaylist(await this.findOne(id, organisationId));

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
    assertLibraryContent([content]);

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

    const durationSeconds = resolveItemDuration(content, dto.durationSeconds);

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

  /**
   * Appends several items in request order behind the current last item, in
   * one transaction. The playlist row is locked so two concurrent bulk adds
   * cannot read the same last position. All content must belong to the
   * organisation; otherwise nothing is inserted.
   */
  async addItems(
    id: string,
    organisationId: string,
    items: NewPlaylistItemDto[],
  ): Promise<PlaylistItem[]> {
    assertStaticPlaylist(await this.findOne(id, organisationId));

    const contentIds = [...new Set(items.map((item) => item.contentId))];
    const found = await this.db
      .select()
      .from(contents)
      .where(and(inArray(contents.id, contentIds), eq(contents.organisationId, organisationId)));
    const contentById = new Map(found.map((content) => [content.id, content]));
    const missingIds = contentIds.filter((contentId) => !contentById.has(contentId));
    if (missingIds.length > 0) {
      throw new BadRequestException({
        message: `Content not found in organisation "${organisationId}"`,
        missingIds,
      });
    }
    assertLibraryContent(found);

    const saved = await this.db.transaction(async (tx) => {
      await tx
        .select({ id: playlists.id })
        .from(playlists)
        .where(eq(playlists.id, id))
        .for('update');
      const [last] = await tx
        .select({ position: playlistItems.position })
        .from(playlistItems)
        .where(eq(playlistItems.playlistId, id))
        .orderBy(desc(playlistItems.position))
        .limit(1);
      const firstPosition = last ? last.position + 1 : 0;

      return tx
        .insert(playlistItems)
        .values(
          items.map((item, index) => ({
            playlistId: id,
            contentId: item.contentId,
            durationSeconds: resolveItemDuration(
              contentById.get(item.contentId)!,
              item.durationSeconds,
            ),
            position: firstPosition + index,
            ...(item.transition !== undefined && { transition: item.transition }),
            ...(item.transitionDurationMs !== undefined && {
              transitionDurationMs: item.transitionDurationMs,
            }),
          })),
        )
        .returning();
    });

    this.emitPlaylistChanged(id, organisationId);
    return saved.sort((a, b) => a.position - b.position);
  }

  /**
   * Applies one patch to every item of a playlist in one transaction.
   * Transition fields reach all items; `durationSeconds` reaches image items
   * only, because a video always plays its own length.
   */
  async updateAllItems(
    id: string,
    organisationId: string,
    dto: UpdateAllPlaylistItemsDto,
  ): Promise<{ updated: number }> {
    const transitionUpdates: Partial<PlaylistItem> = {
      ...(dto.transition !== undefined && { transition: dto.transition }),
      ...(dto.transitionDurationMs !== undefined && {
        transitionDurationMs: dto.transitionDurationMs,
      }),
    };
    const hasTransitionUpdates = Object.keys(transitionUpdates).length > 0;
    if (!hasTransitionUpdates && dto.durationSeconds === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    assertStaticPlaylist(await this.findOne(id, organisationId));

    const updatedIds = await this.db.transaction(async (tx) => {
      const touched = new Set<string>();
      if (hasTransitionUpdates) {
        const rows = await tx
          .update(playlistItems)
          .set(transitionUpdates)
          .where(eq(playlistItems.playlistId, id))
          .returning({ id: playlistItems.id });
        rows.forEach((row) => touched.add(row.id));
      }
      if (dto.durationSeconds !== undefined) {
        const imageContentIds = tx
          .select({ id: contents.id })
          .from(contents)
          .where(
            and(eq(contents.organisationId, organisationId), eq(contents.type, ContentType.Image)),
          );
        const rows = await tx
          .update(playlistItems)
          .set({ durationSeconds: dto.durationSeconds })
          .where(
            and(
              eq(playlistItems.playlistId, id),
              inArray(playlistItems.contentId, imageContentIds),
            ),
          )
          .returning({ id: playlistItems.id });
        rows.forEach((row) => touched.add(row.id));
      }
      return touched;
    });

    this.emitPlaylistChanged(id, organisationId);
    return { updated: updatedIds.size };
  }

  async updateItem(
    playlistId: string,
    itemId: string,
    organisationId: string,
    dto: UpdatePlaylistItemDto,
  ): Promise<PlaylistItem> {
    assertStaticPlaylist(await this.findOne(playlistId, organisationId));

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
    assertStaticPlaylist(await this.findOne(playlistId, organisationId));

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
    assertStaticPlaylist(await this.findOne(playlistId, organisationId));

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

  /**
   * Replaces all items of a playlist with `items`, in order, in one transaction.
   * The playlist row is locked like in {@link addItems}, so two resolves of the
   * same playlist serialise. When the result equals the current items nothing
   * is written and no update is pushed to the screens.
   *
   * With `expectedRule`, the items are only written while the stored rule
   * still equals it; otherwise nothing is written and null is returned, so a
   * resolve that read an outdated rule cannot overwrite the new rule's items.
   */
  async replaceItems(
    id: string,
    organisationId: string,
    items: ReplacementPlaylistItem[],
    expectedRule?: Playlist['rule'],
  ): Promise<{ changed: boolean; items: PlaylistItem[] } | null> {
    const contentIds = [...new Set(items.map((item) => item.contentId))];
    const found =
      contentIds.length === 0
        ? []
        : await this.db
            .select()
            .from(contents)
            .where(
              and(inArray(contents.id, contentIds), eq(contents.organisationId, organisationId)),
            );
    const contentById = new Map(found.map((content) => [content.id, content]));
    const missingIds = contentIds.filter((contentId) => !contentById.has(contentId));
    if (missingIds.length > 0) {
      throw new BadRequestException({
        message: `Content not found in organisation "${organisationId}"`,
        missingIds,
      });
    }
    const next = items.map((item) => ({
      ...item,
      durationSeconds: resolveItemDuration(contentById.get(item.contentId)!, item.durationSeconds),
    }));

    const result = await this.db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ id: playlists.id, rule: playlists.rule })
        .from(playlists)
        .where(and(eq(playlists.id, id), eq(playlists.organisationId, organisationId)))
        .for('update');
      if (!locked) {
        throw new NotFoundException(
          `Playlist with id "${id}" not found in organisation "${organisationId}"`,
        );
      }
      if (
        expectedRule !== undefined &&
        JSON.stringify(locked.rule) !== JSON.stringify(expectedRule)
      ) {
        return null;
      }
      const current = await tx
        .select()
        .from(playlistItems)
        .where(eq(playlistItems.playlistId, id))
        .orderBy(asc(playlistItems.position));
      if (sameItems(current, next)) {
        return { changed: false, items: current };
      }
      await tx.delete(playlistItems).where(eq(playlistItems.playlistId, id));
      const inserted =
        next.length === 0
          ? []
          : await tx
              .insert(playlistItems)
              .values(next.map((item, position) => ({ ...item, playlistId: id, position })))
              .returning();
      return { changed: true, items: inserted.sort((a, b) => a.position - b.position) };
    });

    if (result?.changed) {
      this.emitPlaylistChanged(id, organisationId);
    }
    return result;
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

    if (found.length > 0) {
      // Push the new entries to the screen and let event schedule rules step aside.
      this.eventEmitter.emit(
        SCHEDULE_ENTRY_CHANGED,
        new ScheduleEntryChangedEvent(screenId, organisationId),
      );
      this.eventEmitter.emit(
        SCHEDULE_ENTRIES_EDITED,
        new ScheduleEntriesEditedEvent(organisationId, screenId, null),
      );
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
