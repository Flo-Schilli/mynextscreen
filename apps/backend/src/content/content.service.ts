import {
  Injectable,
  BadRequestException,
  ConflictException,
  PayloadTooLargeException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DRIZZLE } from '../db/database.constants';
import type { DrizzleDB } from '../db/drizzle.types';
import { contents, playlists, playlistItems, type Content } from '../db/schema';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import {
  getOriginalPath,
  getTranscodedPath,
  getThumbnailPath,
  removeStagingFiles,
} from './content-storage.util';
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
import { getNumberConfig } from '../config/numeric-config.util';
import { byNaturalTitle } from '../common/natural-sort.util';
import { assertStaticPlaylist } from '../playlist/assert-static-playlist';

/** The parts of an uploaded file the service reads; managed slides build it from a buffer. */
type IncomingFile = Pick<Express.Multer.File, 'buffer' | 'originalname' | 'size' | 'mimetype'>;

const MANAGED_SLIDE_MIME = 'image/jpeg';

function managedFile(buffer: Buffer, filename: string): IncomingFile {
  return { buffer, originalname: filename, size: buffer.length, mimetype: MANAGED_SLIDE_MIME };
}

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
    this.maxFileSizeBytes = getNumberConfig(
      this.configService,
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
    const saved = await this.storeNew(organisationId, file, dto, null);

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

  /**
   * Stores a file a content source rendered. Same quota, type check and
   * transcoding as an upload, but the row is hidden from the library and not
   * audited one by one: the source audits a whole sync run instead.
   */
  async createManaged(
    organisationId: string,
    sourceId: string,
    buffer: Buffer,
    filename: string,
    title: string,
    tags: string[],
  ): Promise<Content> {
    return this.storeNew(organisationId, managedFile(buffer, filename), { title, tags }, sourceId);
  }

  /**
   * Swaps the file of a source-owned content row. The id stays the same, so
   * playlist items pointing at it keep working and pick up the new slide.
   */
  async replaceManagedFile(
    organisationId: string,
    sourceId: string,
    contentId: string,
    buffer: Buffer,
    filename: string,
  ): Promise<Content> {
    const file = managedFile(buffer, filename);
    const detectedType = this.validateFile(file);
    const content = await this.findOne(organisationId, contentId);
    if (content.managedBySourceId !== sourceId) {
      throw new BadRequestException(
        `Content "${contentId}" is not managed by content source "${sourceId}"`,
      );
    }
    return this.replaceFile(content, file, detectedType);
  }

  private async storeNew(
    organisationId: string,
    file: IncomingFile,
    meta: { title: string; description?: string; tags?: string[] },
    managedBySourceId: string | null,
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
          title: meta.title,
          description: meta.description ?? null,
          tags: meta.tags ?? [],
          type,
          originalFilename: file.originalname,
          originalMimeType: detectedType.mime,
          originalSizeBytes: file.size,
          transcodedSizeBytes: null,
          transcodingStatus: TranscodingStatus.Pending,
          transcodingError: null,
          managedBySourceId,
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

    return saved;
  }

  /** Lists the organisation's content, sorted naturally by title ("Bild 2" before "Bild 10"). */
  async findAll(
    organisationId: string,
    filters?: { type?: ContentType; tags?: string[] },
  ): Promise<Content[]> {
    // Slides a content source renders are owned by that source, not the library.
    const conditions = [
      eq(contents.organisationId, organisationId),
      isNull(contents.managedBySourceId),
    ];
    if (filters?.type) {
      conditions.push(eq(contents.type, filters.type));
    }

    const rows = await this.db
      .select()
      .from(contents)
      .where(and(...conditions));
    rows.sort(byNaturalTitle);

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

  /** Like {@link findOne}, but refuses slides: their content source owns them. */
  private async findLibraryContent(organisationId: string, id: string): Promise<Content> {
    const content = await this.findOne(organisationId, id);
    if (content.managedBySourceId !== null) {
      throw new ConflictException(
        `Content "${id}" is managed by a content source and cannot be changed here`,
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
    await this.findLibraryContent(organisationId, id);
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
    await this.remove(await this.findLibraryContent(organisationId, id));
  }

  /**
   * Deletes a slide on behalf of its content source (source removal, cleanup,
   * a slide row that could not be stored). Files and quota go as in
   * {@link delete}; library content is refused.
   */
  async deleteManaged(organisationId: string, id: string): Promise<void> {
    const content = await this.findOne(organisationId, id);
    if (content.managedBySourceId === null) {
      throw new BadRequestException(`Content "${id}" is not managed by a content source`);
    }
    await this.remove(content);
  }

  private async remove(content: Content): Promise<void> {
    const { organisationId, id } = content;
    const ext = path.extname(content.originalFilename).replace('.', '') || 'bin';

    // Remove original file
    const originalPath = getOriginalPath(this.mediaBasePath, organisationId, id, ext);
    await this.unlinkSafe(originalPath);

    // Remove transcoded file (try common extensions)
    const transcodedExt = content.type === ContentType.Video ? 'mp4' : 'webp';
    const transcodedPath = getTranscodedPath(this.mediaBasePath, organisationId, id, transcodedExt);
    await this.unlinkSafe(transcodedPath);

    // Remove thumbnail and whatever a running transcode job has staged
    await this.unlinkSafe(getThumbnailPath(this.mediaBasePath, organisationId, id));
    await removeStagingFiles(this.mediaBasePath, organisationId, id);

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
    const content = await this.findLibraryContent(organisationId, id);
    const saved = await this.replaceFile(content, file, detectedType);

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

  private async replaceFile(
    content: Content,
    file: IncomingFile,
    detectedType: DetectedMediaType,
  ): Promise<Content> {
    const { organisationId, id } = content;
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

    // The transcoded file, thumbnail and their quota stay as they are: screens
    // keep getting the previous rendition until the transcode job swaps in the
    // new one (see TranscodingProcessor), so nothing skips the item meanwhile.

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
      // type, sizes and duration describe the live rendition; the transcode job
      // updates them together with the swap.
      .set({
        originalFilename: file.originalname,
        originalMimeType: detectedType.mime,
        originalSizeBytes: file.size,
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
      await removeStagingFiles(this.mediaBasePath, organisationId, content.id);

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
    assertStaticPlaylist(playlist);

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

    const managedIds = found.filter((c) => c.managedBySourceId !== null).map((c) => c.id);
    if (managedIds.length > 0) {
      throw new BadRequestException({
        message: 'Some IDs are managed by a content source',
        managedIds,
      });
    }

    return found;
  }

  /**
   * Validates an upload and returns the type derived from its bytes. The
   * client-supplied MIME type is never trusted: it used to be stored and echoed
   * back on download, which made `image/svg+xml` a stored-XSS vector.
   */
  private validateFile(file: IncomingFile): DetectedMediaType {
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
