import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Playlist } from './playlist.entity';
import { PlaylistItem } from './playlist-item.entity';
import { Organisation } from '../organisation/organisation.entity';
import { Content } from '../content/content.entity';
import { ContentType } from '../content/content-type.enum';
import { Screen } from '../screen/screen.entity';
import { ScheduleEntry } from '../schedule/schedule-entry.entity';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddPlaylistItemDto } from './dto/add-playlist-item.dto';
import { UpdatePlaylistItemDto } from './dto/update-playlist-item.dto';
import { PLAYLIST_UPDATED, PlaylistUpdatedEvent } from './playlist.event';
import {
  AUDIT_PLAYLIST_CREATED,
  AUDIT_PLAYLIST_UPDATED,
  AUDIT_PLAYLIST_DELETED,
  AUDIT_PLAYLIST_BULK_DELETED,
  AUDIT_PLAYLIST_BULK_SCREEN_ASSIGNED,
  AuditPlaylistEvent,
} from '../audit-log/audit.events';

@Injectable()
export class PlaylistService {
  constructor(
    @InjectRepository(Playlist)
    private readonly playlistRepository: Repository<Playlist>,
    @InjectRepository(PlaylistItem)
    private readonly playlistItemRepository: Repository<PlaylistItem>,
    @InjectRepository(Organisation)
    private readonly organisationRepository: Repository<Organisation>,
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(Screen)
    private readonly screenRepository: Repository<Screen>,
    @InjectRepository(ScheduleEntry)
    private readonly scheduleEntryRepository: Repository<ScheduleEntry>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    organisationId: string,
    dto: CreatePlaylistDto,
  ): Promise<Playlist> {
    const playlist = this.playlistRepository.create({
      organisationId,
      name: dto.name,
    });
    const saved = await this.playlistRepository.save(playlist);
    this.emitPlaylistChanged(saved.id, organisationId);
    this.eventEmitter.emit(
      AUDIT_PLAYLIST_CREATED,
      new AuditPlaylistEvent(saved.id, organisationId, null, {
        name: dto.name,
      }),
    );
    return saved;
  }

  async findAll(organisationId: string): Promise<Playlist[]> {
    return this.playlistRepository.find({
      where: { organisationId },
      relations: ['items'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string, organisationId: string): Promise<Playlist> {
    const playlist = await this.playlistRepository.findOne({
      where: { id, organisationId },
      relations: ['items', 'items.content'],
      order: { items: { position: 'ASC' } },
    });
    if (!playlist) {
      throw new NotFoundException(
        `Playlist with id "${id}" not found in organisation "${organisationId}"`,
      );
    }
    return playlist;
  }

  async update(
    id: string,
    organisationId: string,
    dto: UpdatePlaylistDto,
  ): Promise<Playlist> {
    const playlist = await this.findOne(id, organisationId);
    playlist.name = dto.name;
    const saved = await this.playlistRepository.save(playlist);
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
    const playlist = await this.findOne(id, organisationId);

    // Verify content exists in the same organisation
    const content = await this.contentRepository.findOne({
      where: { id: dto.contentId, organisationId },
    });
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
      const maxItem = await this.playlistItemRepository
        .createQueryBuilder('item')
        .where('item.playlistId = :playlistId', { playlistId: id })
        .orderBy('item.position', 'DESC')
        .getOne();
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

    const item = this.playlistItemRepository.create({
      playlistId: playlist.id,
      contentId: dto.contentId,
      durationSeconds,
      position,
      ...(dto.transition !== undefined && { transition: dto.transition }),
      ...(dto.transitionDurationMs !== undefined && {
        transitionDurationMs: dto.transitionDurationMs,
      }),
    });
    const saved = await this.playlistItemRepository.save(item);
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

    const item = await this.playlistItemRepository.findOne({
      where: { id: itemId, playlistId },
    });
    if (!item) {
      throw new NotFoundException(
        `Playlist item with id "${itemId}" not found in playlist "${playlistId}"`,
      );
    }

    if (dto.transition !== undefined) {
      item.transition = dto.transition;
    }
    if (dto.transitionDurationMs !== undefined) {
      item.transitionDurationMs = dto.transitionDurationMs;
    }
    if (dto.durationSeconds !== undefined) {
      item.durationSeconds = dto.durationSeconds;
    }

    const saved = await this.playlistItemRepository.save(item);
    this.emitPlaylistChanged(playlistId, organisationId);
    return saved;
  }

  async removeItem(
    playlistId: string,
    itemId: string,
    organisationId: string,
  ): Promise<void> {
    // Verify playlist belongs to org
    await this.findOne(playlistId, organisationId);

    const item = await this.playlistItemRepository.findOne({
      where: { id: itemId, playlistId },
    });
    if (!item) {
      throw new NotFoundException(
        `Playlist item with id "${itemId}" not found in playlist "${playlistId}"`,
      );
    }

    await this.playlistItemRepository.remove(item);
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
    const items = await this.playlistItemRepository.find({
      where: { playlistId },
    });

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
      const item = itemMap.get(itemIds[i])!;
      item.position = i;
      updated.push(item);
    }

    const saved = await this.playlistItemRepository.save(updated);
    this.emitPlaylistChanged(playlistId, organisationId);
    return saved;
  }

  async delete(id: string, organisationId: string): Promise<void> {
    const playlist = await this.findOne(id, organisationId);

    // If this playlist is the org's default, clear the reference
    const org = await this.organisationRepository.findOneBy({
      id: organisationId,
    });
    if (org && org.defaultPlaylistId === id) {
      org.defaultPlaylistId = null;
      await this.organisationRepository.save(org);
    }

    await this.playlistRepository.remove(playlist);
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
    const playlists = await this.playlistRepository.find({
      where: { id: In(ids), organisationId },
    });

    const foundIds = new Set(playlists.map((p) => p.id));
    const notFound: string[] = [];
    const foreignIds: string[] = [];

    for (const id of ids) {
      if (!foundIds.has(id)) {
        const exists = await this.playlistRepository.findOne({
          where: { id } as FindOptionsWhere<Playlist>,
        });
        if (exists) {
          foreignIds.push(id);
        } else {
          notFound.push(id);
        }
      }
    }

    if (foreignIds.length > 0) {
      throw new BadRequestException({
        message: 'Some IDs belong to a different organisation',
        foreignIds,
      });
    }

    if (playlists.length > 0) {
      // Clear defaultPlaylistId on the org if any deleted playlist was the default
      const org = await this.organisationRepository.findOneBy({
        id: organisationId,
      });
      if (org && org.defaultPlaylistId && foundIds.has(org.defaultPlaylistId)) {
        org.defaultPlaylistId = null;
        await this.organisationRepository.save(org);
      }

      await this.playlistRepository.remove(playlists);
    }

    const bulkOperationSize = ids.length;
    for (const playlist of playlists) {
      this.eventEmitter.emit(
        AUDIT_PLAYLIST_BULK_DELETED,
        new AuditPlaylistEvent(playlist.id, organisationId, userId, {
          bulkOperationSize,
        }),
      );
    }

    return { deleted: playlists.length, notFound };
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
    const screen = await this.screenRepository.findOne({
      where: { id: screenId, organisationId },
    });
    if (!screen) {
      // Check if screen exists in another org
      const existsElsewhere = await this.screenRepository.findOne({
        where: { id: screenId } as FindOptionsWhere<Screen>,
      });
      if (existsElsewhere) {
        throw new BadRequestException({
          message: 'Screen belongs to a different organisation',
          foreignIds: [screenId],
        });
      }
      throw new NotFoundException(`Screen with id "${screenId}" not found`);
    }

    const playlists = await this.playlistRepository.find({
      where: { id: In(ids), organisationId },
    });

    const foundIds = new Set(playlists.map((p) => p.id));
    const notFound: string[] = [];
    const foreignIds: string[] = [];

    for (const id of ids) {
      if (!foundIds.has(id)) {
        const exists = await this.playlistRepository.findOne({
          where: { id } as FindOptionsWhere<Playlist>,
        });
        if (exists) {
          foreignIds.push(id);
        } else {
          notFound.push(id);
        }
      }
    }

    if (foreignIds.length > 0) {
      throw new BadRequestException({
        message: 'Some IDs belong to a different organisation',
        foreignIds,
      });
    }

    // Create schedule entries for each playlist on the screen
    const now = new Date();
    const farFuture = new Date('2099-12-31T23:59:59.000Z');
    const defaultColour = '#4A90D9';

    for (const playlist of playlists) {
      const entry = this.scheduleEntryRepository.create({
        organisationId,
        screenId,
        groupId: null,
        playlistId: playlist.id,
        startTime: now,
        endTime: farFuture,
        rrule: null,
        colour: defaultColour,
      });
      await this.scheduleEntryRepository.save(entry);
    }

    const bulkOperationSize = ids.length;
    for (const playlist of playlists) {
      this.eventEmitter.emit(
        AUDIT_PLAYLIST_BULK_SCREEN_ASSIGNED,
        new AuditPlaylistEvent(playlist.id, organisationId, userId, {
          bulkOperationSize,
          screenId,
        }),
      );
    }

    return { assigned: playlists.length, notFound };
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

  private emitPlaylistChanged(
    playlistId: string,
    organisationId: string,
  ): void {
    this.eventEmitter.emit(
      PLAYLIST_UPDATED,
      new PlaylistUpdatedEvent(playlistId, organisationId),
    );
  }
}
