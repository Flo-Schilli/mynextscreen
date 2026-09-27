import { Injectable, BadRequestException, PayloadTooLargeException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { and, eq, inArray } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { contents, playlists, playlistItems, type Content } from '../db/schema';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { getOriginalPath, getTranscodedPath, getThumbnailPath } from './content-storage.util';
import { StorageService } from '../organisation/storage.service';
import { ffprobeDuration } from './ffprobe-duration.util';
import { UploadContentDto } from './dto/upload-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import {
  AUDIT_CONTENT_UPLOADED,
  AUDIT_CONTENT_DELETED,
  AUDIT_CONTENT_REUPLOADED,
  AUDIT_CONTENT_BULK_DELETED,
  AUDIT_CONTENT_BULK_TAGGED,
  AUDIT_CONTENT_BULK_UNTAGGED,
  AUDIT_CONTENT_BULK_ADDED_TO_PLAYLIST,
  AuditContentEvent,
} from '../audit-log/audit.events';
import { CONTENT_DURATION_RESOLVED, ContentDurationResolvedEvent } from './content.event';
import { DetectedMediaType, SUPPORTED_MEDIA_TYPES, detectMediaType } from './media-type.util';

/** 100 MB. Shared with the Multer limit so both layers cut off at the same size. */
export const DEFAULT_MAX_FILE_SIZE_BYTES = 104_857_600;

@Injectable()
export class ContentService {
  private readonly mediaBasePath: string;
  private readonly maxFileSizeBytes: number;
  private readonly ffprobePath: string;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @InjectQueue('transcoding')
    private readonly transcodingQueue: Queue,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.mediaBasePath = this.configService.get<string>('MEDIA_BASE_PATH', './media');
    this.maxFileSizeBytes = this.configService.get<number>(
      'MAX_FILE_SIZE_BYTES',
      DEFAULT_MAX_FILE_SIZE_BYTES,
    );
    const ffmpegPath = this.configService.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.ffprobePath = ffmpegPath.replace(/ffmpeg/, 'ffprobe');
  }

  async upload(
    organisationId: string,
    file: Express.Multer.File,
    dto: UploadContentDto,
  ): Promise<Content> {
    const detectedType = this.validateFile(file);

    // Reserve quota up front, atomically: the counter is only released again if
    // the upload fails below, so two parallel uploads cannot both fit into the
    // same remaining space.
    await this.storageService.reserveOriginalUsage(organisationId, file.size);

    const type = detectedType.kind === 'image' ? ContentType.Image : ContentType.Video;
    const ext = path.extname(file.originalname).replace('.', '') || 'bin';

    // Create content record first to get the ID
    let saved: Content;
    let filePath: string;
    try {
      [saved] = await this.db
        .insert(contents)
        .values({
          organisationId,
          title: dto.title,
          description: dto.description ?? null,
          tags: dto.tags ?? [],
          type,
          originalFilename: file.originalname,
          originalMimeType: detectedType.mime,
          originalSizeBytes: file.size,
          transcodedSizeBytes: null,
          transcodingStatus: TranscodingStatus.Pending,
          transcodingError: null,
        })
        .returning();

      // Save file to filesystem
      filePath = getOriginalPath(this.mediaBasePath, organisationId, saved.id, ext);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.buffer);
    } catch (error) {
      // Release the reservation, otherwise a failed upload permanently consumes
      // quota that no file occupies.
      await this.storageService.subtractOriginalUsage(organisationId, file.size);
      throw error;
    }

    // Enqueue transcoding job
    await this.transcodingQueue.add('transcode', {
      contentId: saved.id,
      organisationId,
      originalPath: filePath,
      mimeType: file.mimetype,
      type,
    });

    this.eventEmitter.emit(
      AUDIT_CONTENT_UPLOADED,
      new AuditContentEvent(saved.id, organisationId, null, {
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      }),
    );

    return saved;
  }

  async findAll(
    organisationId: string,
    filters?: { type?: ContentType; tags?: string[] },
  ): Promise<Content[]> {
    const conditions = [eq(contents.organisationId, organisationId)];
    if (filters?.type) {
      conditions.push(eq(contents.type, filters.type));
    }

    const rows = await this.db
      .select()
      .from(contents)
      .where(and(...conditions));

    if (filters?.tags && filters.tags.length > 0) {
      return rows.filter((c) => filters.tags!.some((tag) => c.tags.includes(tag)));
    }

    return rows;
  }

  async findOne(organisationId: string, id: string): Promise<Content> {
    const [content] = await this.db
      .select()
      .from(contents)
      .where(and(eq(contents.id, id), eq(contents.organisationId, organisationId)))
      .limit(1);
    if (!content) {
      throw new BadRequestException(
        `Content with id "${id}" not found in organisation "${organisationId}"`,
      );
    }
    return content;
  }

  async ensureDuration(content: Content): Promise<number | null> {
    if (content.type !== ContentType.Video) {
      return null;
    }

    if (content.durationSeconds != null) {
      return content.durationSeconds;
    }

    const transcodedPath = getTranscodedPath(
      this.mediaBasePath,
      content.organisationId,
      content.id,
      'mp4',
    );

    try {
      const duration = await ffprobeDuration(transcodedPath, this.ffprobePath);
      await this.db
        .update(contents)
        .set({ durationSeconds: duration })
        .where(eq(contents.id, content.id));
      this.eventEmitter.emit(
        CONTENT_DURATION_RESOLVED,
        new ContentDurationResolvedEvent(content.id, duration),
      );
      return duration;
    } catch {
      return null;
    }
  }

  async updateMetadata(
    organisationId: string,
    id: string,
    dto: UpdateContentDto,
  ): Promise<Content> {
    await this.findOne(organisationId, id);
    const updates: Partial<Content> = {};
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.tags !== undefined) updates.tags = dto.tags;
    const [saved] = await this.db
      .update(contents)
      .set(updates)
      .where(and(eq(contents.id, id), eq(contents.organisationId, organisationId)))
      .returning();
    return saved;
  }

  async delete(organisationId: string, id: string): Promise<void> {
    const content = await this.findOne(organisationId, id);
    const ext = path.extname(content.originalFilename).replace('.', '') || 'bin';

    // Remove original file
    const originalPath = getOriginalPath(this.mediaBasePath, organisationId, id, ext);
    await this.unlinkSafe(originalPath);

    // Remove transcoded file (try common extensions)
    const transcodedExt = content.type === ContentType.Video ? 'mp4' : 'webp';
    const transcodedPath = getTranscodedPath(this.mediaBasePath, organisationId, id, transcodedExt);
    await this.unlinkSafe(transcodedPath);

    // Remove thumbnail
    await this.unlinkSafe(getThumbnailPath(this.mediaBasePath, organisationId, id));

    // Update org storage counters
    await this.storageService.subtractOriginalUsage(
      organisationId,
      Number(content.originalSizeBytes),
    );
    const reclaimedTranscoded =
      Number(content.transcodedSizeBytes ?? 0) + Number(content.thumbnailSizeBytes ?? 0);
    if (reclaimedTranscoded > 0) {
      await this.storageService.subtractTranscodedUsage(organisationId, reclaimedTranscoded);
    }

    await this.db
      .delete(contents)
      .where(and(eq(contents.id, id), eq(contents.organisationId, organisationId)));

    this.eventEmitter.emit(
      AUDIT_CONTENT_DELETED,
      new AuditContentEvent(id, organisationId, null, {
        filename: content.originalFilename,
      }),
    );
  }

  async reUpload(organisationId: string, id: string, file: Express.Multer.File): Promise<Content> {
    const detectedType = this.validateFile(file);

    const content = await this.findOne(organisationId, id);

    // Reserve the growth atomically before touching any file, same reasoning as
    // in upload(); a shrink is booked after the write.
    const sizeDelta = file.size - Number(content.originalSizeBytes);
    if (sizeDelta > 0) {
      await this.storageService.reserveOriginalUsage(organisationId, sizeDelta);
    }

    const oldExt = path.extname(content.originalFilename).replace('.', '') || 'bin';
    const newExt = path.extname(file.originalname).replace('.', '') || 'bin';

    // Remove old original if extension changed
    if (oldExt !== newExt) {
      const oldPath = getOriginalPath(this.mediaBasePath, organisationId, id, oldExt);
      await this.unlinkSafe(oldPath);
    }

    // Remove old transcoded file
    const transcodedExt = content.type === ContentType.Video ? 'mp4' : 'webp';
    const oldTranscodedPath = getTranscodedPath(
      this.mediaBasePath,
      organisationId,
      id,
      transcodedExt,
    );
    await this.unlinkSafe(oldTranscodedPath);

    // Remove old thumbnail (a fresh one is generated by the new transcode job)
    await this.unlinkSafe(getThumbnailPath(this.mediaBasePath, organisationId, id));

    // Subtract old transcoded + thumbnail size from counter
    const reclaimedTranscoded =
      Number(content.transcodedSizeBytes ?? 0) + Number(content.thumbnailSizeBytes ?? 0);
    if (reclaimedTranscoded > 0) {
      await this.storageService.subtractTranscodedUsage(organisationId, reclaimedTranscoded);
    }

    // Write new file
    const filePath = getOriginalPath(this.mediaBasePath, organisationId, id, newExt);
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.buffer);
    } catch (error) {
      if (sizeDelta > 0) {
        await this.storageService.subtractOriginalUsage(organisationId, sizeDelta);
      }
      throw error;
    }

    // The growth was already reserved; only a shrink still has to be booked.
    if (sizeDelta < 0) {
      await this.storageService.subtractOriginalUsage(organisationId, Math.abs(sizeDelta));
    }

    // Update content record
    const type = detectedType.kind === 'image' ? ContentType.Image : ContentType.Video;
    const [saved] = await this.db
      .update(contents)
      .set({
        originalFilename: file.originalname,
        originalMimeType: detectedType.mime,
        originalSizeBytes: file.size,
        type,
        transcodedSizeBytes: null,
        thumbnailSizeBytes: null,
        durationSeconds: null,
        transcodingStatus: TranscodingStatus.Pending,
        transcodingError: null,
      })
      .where(and(eq(contents.id, id), eq(contents.organisationId, organisationId)))
      .returning();

    // Enqueue new transcoding job
    await this.transcodingQueue.add('transcode', {
      contentId: id,
      organisationId,
      originalPath: filePath,
      mimeType: file.mimetype,
      type,
    });

    this.eventEmitter.emit(
      AUDIT_CONTENT_REUPLOADED,
      new AuditContentEvent(id, organisationId, null, {
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      }),
    );

    return saved;
  }

  async bulkDelete(
    organisationId: string,
    ids: string[],
    userId: string | null,
  ): Promise<{ deleted: number; notFound: string[] }> {
    const found = await this.findScopedOrThrowForeign(organisationId, ids);
    const notFound = ids.filter((id) => !found.some((c) => c.id === id));

    for (const content of found) {
      const ext = path.extname(content.originalFilename).replace('.', '') || 'bin';
      const originalPath = getOriginalPath(this.mediaBasePath, organisationId, content.id, ext);
      await this.unlinkSafe(originalPath);

      const transcodedExt = content.type === ContentType.Video ? 'mp4' : 'webp';
      const transcodedPath = getTranscodedPath(
        this.mediaBasePath,
        organisationId,
        content.id,
        transcodedExt,
      );
      await this.unlinkSafe(transcodedPath);
      await this.unlinkSafe(getThumbnailPath(this.mediaBasePath, organisationId, content.id));

      await this.storageService.subtractOriginalUsage(
        organisationId,
        Number(content.originalSizeBytes),
      );
      const reclaimedTranscoded =
        Number(content.transcodedSizeBytes ?? 0) + Number(content.thumbnailSizeBytes ?? 0);
      if (reclaimedTranscoded > 0) {
        await this.storageService.subtractTranscodedUsage(organisationId, reclaimedTranscoded);
      }
    }

    if (found.length > 0) {
      await this.db.delete(contents).where(
        inArray(
          contents.id,
          found.map((c) => c.id),
        ),
      );
    }

    const bulkOperationSize = ids.length;
    for (const content of found) {
      this.eventEmitter.emit(
        AUDIT_CONTENT_BULK_DELETED,
        new AuditContentEvent(content.id, organisationId, userId, {
          bulkOperationSize,
          filename: content.originalFilename,
        }),
      );
    }

    return { deleted: found.length, notFound };
  }

  async bulkTag(
    organisationId: string,
    ids: string[],
    tags: string[],
    userId: string | null,
  ): Promise<{ updated: number; notFound: string[] }> {
    const found = await this.findScopedOrThrowForeign(organisationId, ids);
    const notFound = ids.filter((id) => !found.some((c) => c.id === id));

    for (const content of found) {
      const existingTags = new Set(content.tags);
      for (const tag of tags) {
        existingTags.add(tag);
      }
      await this.db
        .update(contents)
        .set({ tags: [...existingTags] })
        .where(eq(contents.id, content.id));
    }

    const bulkOperationSize = ids.length;
    for (const content of found) {
      this.eventEmitter.emit(
        AUDIT_CONTENT_BULK_TAGGED,
        new AuditContentEvent(content.id, organisationId, userId, {
          bulkOperationSize,
          tags,
        }),
      );
    }

    return { updated: found.length, notFound };
  }

  async bulkUntag(
    organisationId: string,
    ids: string[],
    tags: string[],
    userId: string | null,
  ): Promise<{ updated: number; notFound: string[] }> {
    const found = await this.findScopedOrThrowForeign(organisationId, ids);
    const notFound = ids.filter((id) => !found.some((c) => c.id === id));

    const tagsToRemove = new Set(tags);
    for (const content of found) {
      await this.db
        .update(contents)
        .set({ tags: content.tags.filter((t) => !tagsToRemove.has(t)) })
        .where(eq(contents.id, content.id));
    }

    const bulkOperationSize = ids.length;
    for (const content of found) {
      this.eventEmitter.emit(
        AUDIT_CONTENT_BULK_UNTAGGED,
        new AuditContentEvent(content.id, organisationId, userId, {
          bulkOperationSize,
          tags,
        }),
      );
    }

    return { updated: found.length, notFound };
  }

  async bulkAddToPlaylist(
    organisationId: string,
    ids: string[],
    playlistId: string,
    userId: string | null,
  ): Promise<{ added: number; alreadyPresent: number; notFound: string[] }> {
    // Verify playlist exists and belongs to org
    const [playlist] = await this.db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.organisationId, organisationId)))
      .limit(1);
    if (!playlist) {
      throw new BadRequestException(
        `Playlist with id "${playlistId}" not found in organisation "${organisationId}"`,
      );
    }

    const found = await this.findScopedOrThrowForeign(organisationId, ids);
    const foundIds = new Set(found.map((c) => c.id));
    const notFound = ids.filter((id) => !foundIds.has(id));

    // Get existing playlist items to deduplicate
    const existingItems = await this.db
      .select()
      .from(playlistItems)
      .where(eq(playlistItems.playlistId, playlistId));
    const existingContentIds = new Set(existingItems.map((i) => i.contentId));

    // Find max position
    let maxPosition = -1;
    for (const item of existingItems) {
      if (item.position > maxPosition) {
        maxPosition = item.position;
      }
    }

    let added = 0;
    let alreadyPresent = 0;
    const bulkOperationSize = ids.length;

    // Iterate in the order of the ids array to preserve selection order
    for (const id of ids) {
      if (!foundIds.has(id)) continue;

      if (existingContentIds.has(id)) {
        alreadyPresent++;
        continue;
      }

      // Avoid adding the same content twice within this batch
      existingContentIds.add(id);
      maxPosition++;

      await this.db.insert(playlistItems).values({
        playlistId,
        contentId: id,
        position: maxPosition,
        durationSeconds: 10, // default duration
      });
      added++;

      this.eventEmitter.emit(
        AUDIT_CONTENT_BULK_ADDED_TO_PLAYLIST,
        new AuditContentEvent(id, organisationId, userId, {
          bulkOperationSize,
          playlistId,
        }),
      );
    }

    return { added, alreadyPresent, notFound };
  }

  /**
   * Load the scoped contents for the given ids; throws 400 if any id exists in a
   * different organisation. Returns the rows found within this organisation.
   */
  private async findScopedOrThrowForeign(
    organisationId: string,
    ids: string[],
  ): Promise<Content[]> {
    const found = await this.db
      .select()
      .from(contents)
      .where(and(inArray(contents.id, ids), eq(contents.organisationId, organisationId)));

    const foundIds = new Set(found.map((c) => c.id));
    const foreignIds: string[] = [];

    for (const id of ids) {
      if (!foundIds.has(id)) {
        const [exists] = await this.db.select().from(contents).where(eq(contents.id, id)).limit(1);
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

  /**
   * Validates an upload and returns the type derived from its bytes. The
   * client-supplied MIME type is never trusted: it used to be stored and echoed
   * back on download, which made `image/svg+xml` a stored-XSS vector.
   */
  private validateFile(file: Express.Multer.File): DetectedMediaType {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new PayloadTooLargeException(
        `File size ${file.size} exceeds maximum allowed size of ${this.maxFileSizeBytes} bytes`,
      );
    }

    const detected = file.buffer ? detectMediaType(file.buffer) : null;
    if (!detected) {
      throw new BadRequestException(
        `Unsupported file type. Allowed formats: ${SUPPORTED_MEDIA_TYPES.join(', ')}`,
      );
    }
    return detected;
  }

  private async unlinkSafe(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
}
