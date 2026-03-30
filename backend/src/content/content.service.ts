import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';
import { Repository, FindOptionsWhere } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Content } from './content.entity';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
import { getOriginalPath, getTranscodedPath } from './content-storage.util';
import { StorageService } from '../organisation/storage.service';
import { UploadContentDto } from './dto/upload-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import {
  AUDIT_CONTENT_UPLOADED,
  AUDIT_CONTENT_DELETED,
  AUDIT_CONTENT_REUPLOADED,
  AuditContentEvent,
} from '../audit-log/audit.events';

const IMAGE_MIME_PREFIX = 'image/';
const VIDEO_MIME_PREFIX = 'video/';

@Injectable()
export class ContentService {
  private readonly mediaBasePath: string;
  private readonly maxFileSizeBytes: number;

  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectQueue('transcoding')
    private readonly transcodingQueue: Queue,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.mediaBasePath = this.configService.get<string>(
      'MEDIA_BASE_PATH',
      './media',
    );
    this.maxFileSizeBytes = this.configService.get<number>(
      'MAX_FILE_SIZE_BYTES',
      104857600, // 100 MB default
    );
  }

  async upload(
    organisationId: string,
    file: Express.Multer.File,
    dto: UploadContentDto,
  ): Promise<Content> {
    this.validateFile(file);

    // Check storage limit
    await this.storageService.checkOriginalLimit(organisationId, file.size);

    const type = file.mimetype.startsWith(IMAGE_MIME_PREFIX)
      ? ContentType.Image
      : ContentType.Video;
    const ext = path.extname(file.originalname).replace('.', '') || 'bin';

    // Create content record first to get the ID
    const content = this.contentRepository.create({
      organisationId,
      title: dto.title,
      description: dto.description ?? null,
      tags: dto.tags ?? [],
      type,
      originalFilename: file.originalname,
      originalMimeType: file.mimetype,
      originalSizeBytes: file.size,
      transcodedSizeBytes: null,
      transcodingStatus: TranscodingStatus.Pending,
      transcodingError: null,
    });
    const saved = await this.contentRepository.save(content);

    // Save file to filesystem
    const filePath = getOriginalPath(
      this.mediaBasePath,
      organisationId,
      saved.id,
      ext,
    );
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    // Update org storage counter
    await this.storageService.addOriginalUsage(organisationId, file.size);

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
    const where: FindOptionsWhere<Content> = { organisationId };
    if (filters?.type) {
      where.type = filters.type;
    }

    const contents = await this.contentRepository.find({ where });

    if (filters?.tags && filters.tags.length > 0) {
      return contents.filter((c) =>
        filters.tags!.some((tag) => c.tags.includes(tag)),
      );
    }

    return contents;
  }

  async findOne(organisationId: string, id: string): Promise<Content> {
    const content = await this.contentRepository.findOne({
      where: { id, organisationId },
    });
    if (!content) {
      throw new BadRequestException(
        `Content with id "${id}" not found in organisation "${organisationId}"`,
      );
    }
    return content;
  }

  async updateMetadata(
    organisationId: string,
    id: string,
    dto: UpdateContentDto,
  ): Promise<Content> {
    const content = await this.findOne(organisationId, id);
    if (dto.title !== undefined) content.title = dto.title;
    if (dto.description !== undefined) content.description = dto.description;
    if (dto.tags !== undefined) content.tags = dto.tags;
    return this.contentRepository.save(content);
  }

  async delete(organisationId: string, id: string): Promise<void> {
    const content = await this.findOne(organisationId, id);
    const ext =
      path.extname(content.originalFilename).replace('.', '') || 'bin';

    // Remove original file
    const originalPath = getOriginalPath(
      this.mediaBasePath,
      organisationId,
      id,
      ext,
    );
    await this.unlinkSafe(originalPath);

    // Remove transcoded file (try common extensions)
    const transcodedExt = content.type === ContentType.Video ? 'mp4' : 'webp';
    const transcodedPath = getTranscodedPath(
      this.mediaBasePath,
      organisationId,
      id,
      transcodedExt,
    );
    await this.unlinkSafe(transcodedPath);

    // Update org storage counters
    await this.storageService.subtractOriginalUsage(
      organisationId,
      Number(content.originalSizeBytes),
    );
    if (content.transcodedSizeBytes) {
      await this.storageService.subtractTranscodedUsage(
        organisationId,
        Number(content.transcodedSizeBytes),
      );
    }

    await this.contentRepository.remove(content);

    this.eventEmitter.emit(
      AUDIT_CONTENT_DELETED,
      new AuditContentEvent(id, organisationId, null, {
        filename: content.originalFilename,
      }),
    );
  }

  async reUpload(
    organisationId: string,
    id: string,
    file: Express.Multer.File,
  ): Promise<Content> {
    this.validateFile(file);

    const content = await this.findOne(organisationId, id);

    // Calculate storage delta (new size - old size) and check limit
    const sizeDelta = file.size - Number(content.originalSizeBytes);
    if (sizeDelta > 0) {
      await this.storageService.checkOriginalLimit(organisationId, sizeDelta);
    }

    const oldExt =
      path.extname(content.originalFilename).replace('.', '') || 'bin';
    const newExt = path.extname(file.originalname).replace('.', '') || 'bin';

    // Remove old original if extension changed
    if (oldExt !== newExt) {
      const oldPath = getOriginalPath(
        this.mediaBasePath,
        organisationId,
        id,
        oldExt,
      );
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

    // Subtract old transcoded size from counter
    if (content.transcodedSizeBytes) {
      await this.storageService.subtractTranscodedUsage(
        organisationId,
        Number(content.transcodedSizeBytes),
      );
    }

    // Write new file
    const filePath = getOriginalPath(
      this.mediaBasePath,
      organisationId,
      id,
      newExt,
    );
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    // Update storage counter: subtract old, add new
    if (sizeDelta > 0) {
      await this.storageService.addOriginalUsage(organisationId, sizeDelta);
    } else if (sizeDelta < 0) {
      await this.storageService.subtractOriginalUsage(
        organisationId,
        Math.abs(sizeDelta),
      );
    }

    // Update content record
    const type = file.mimetype.startsWith(IMAGE_MIME_PREFIX)
      ? ContentType.Image
      : ContentType.Video;
    content.originalFilename = file.originalname;
    content.originalMimeType = file.mimetype;
    content.originalSizeBytes = file.size;
    content.type = type;
    content.transcodedSizeBytes = null;
    content.transcodingStatus = TranscodingStatus.Pending;
    content.transcodingError = null;
    const saved = await this.contentRepository.save(content);

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

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new PayloadTooLargeException(
        `File size ${file.size} exceeds maximum allowed size of ${this.maxFileSizeBytes} bytes`,
      );
    }

    if (
      !file.mimetype.startsWith(IMAGE_MIME_PREFIX) &&
      !file.mimetype.startsWith(VIDEO_MIME_PREFIX)
    ) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Only image/* and video/* MIME types are allowed`,
      );
    }
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
