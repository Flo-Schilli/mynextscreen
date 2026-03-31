"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const event_emitter_1 = require("@nestjs/event-emitter");
const bullmq_2 = require("bullmq");
const typeorm_2 = require("typeorm");
const fs = require("fs/promises");
const path = require("path");
const content_entity_1 = require("./content.entity");
const content_type_enum_1 = require("./content-type.enum");
const transcoding_status_enum_1 = require("./transcoding-status.enum");
const content_storage_util_1 = require("./content-storage.util");
const storage_service_1 = require("../organisation/storage.service");
const audit_events_1 = require("../audit-log/audit.events");
const IMAGE_MIME_PREFIX = 'image/';
const VIDEO_MIME_PREFIX = 'video/';
let ContentService = class ContentService {
    contentRepository;
    transcodingQueue;
    configService;
    storageService;
    eventEmitter;
    mediaBasePath;
    maxFileSizeBytes;
    constructor(contentRepository, transcodingQueue, configService, storageService, eventEmitter) {
        this.contentRepository = contentRepository;
        this.transcodingQueue = transcodingQueue;
        this.configService = configService;
        this.storageService = storageService;
        this.eventEmitter = eventEmitter;
        this.mediaBasePath = this.configService.get('MEDIA_BASE_PATH', './media');
        this.maxFileSizeBytes = this.configService.get('MAX_FILE_SIZE_BYTES', 104857600);
    }
    async upload(organisationId, file, dto) {
        this.validateFile(file);
        await this.storageService.checkOriginalLimit(organisationId, file.size);
        const type = file.mimetype.startsWith(IMAGE_MIME_PREFIX)
            ? content_type_enum_1.ContentType.Image
            : content_type_enum_1.ContentType.Video;
        const ext = path.extname(file.originalname).replace('.', '') || 'bin';
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
            transcodingStatus: transcoding_status_enum_1.TranscodingStatus.Pending,
            transcodingError: null,
        });
        const saved = await this.contentRepository.save(content);
        const filePath = (0, content_storage_util_1.getOriginalPath)(this.mediaBasePath, organisationId, saved.id, ext);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.buffer);
        await this.storageService.addOriginalUsage(organisationId, file.size);
        await this.transcodingQueue.add('transcode', {
            contentId: saved.id,
            organisationId,
            originalPath: filePath,
            mimeType: file.mimetype,
            type,
        });
        this.eventEmitter.emit(audit_events_1.AUDIT_CONTENT_UPLOADED, new audit_events_1.AuditContentEvent(saved.id, organisationId, null, {
            filename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
        }));
        return saved;
    }
    async findAll(organisationId, filters) {
        const where = { organisationId };
        if (filters?.type) {
            where.type = filters.type;
        }
        const contents = await this.contentRepository.find({ where });
        if (filters?.tags && filters.tags.length > 0) {
            return contents.filter((c) => filters.tags.some((tag) => c.tags.includes(tag)));
        }
        return contents;
    }
    async findOne(organisationId, id) {
        const content = await this.contentRepository.findOne({
            where: { id, organisationId },
        });
        if (!content) {
            throw new common_1.BadRequestException(`Content with id "${id}" not found in organisation "${organisationId}"`);
        }
        return content;
    }
    async updateMetadata(organisationId, id, dto) {
        const content = await this.findOne(organisationId, id);
        if (dto.title !== undefined)
            content.title = dto.title;
        if (dto.description !== undefined)
            content.description = dto.description;
        if (dto.tags !== undefined)
            content.tags = dto.tags;
        return this.contentRepository.save(content);
    }
    async delete(organisationId, id) {
        const content = await this.findOne(organisationId, id);
        const ext = path.extname(content.originalFilename).replace('.', '') || 'bin';
        const originalPath = (0, content_storage_util_1.getOriginalPath)(this.mediaBasePath, organisationId, id, ext);
        await this.unlinkSafe(originalPath);
        const transcodedExt = content.type === content_type_enum_1.ContentType.Video ? 'mp4' : 'webp';
        const transcodedPath = (0, content_storage_util_1.getTranscodedPath)(this.mediaBasePath, organisationId, id, transcodedExt);
        await this.unlinkSafe(transcodedPath);
        await this.storageService.subtractOriginalUsage(organisationId, Number(content.originalSizeBytes));
        if (content.transcodedSizeBytes) {
            await this.storageService.subtractTranscodedUsage(organisationId, Number(content.transcodedSizeBytes));
        }
        await this.contentRepository.remove(content);
        this.eventEmitter.emit(audit_events_1.AUDIT_CONTENT_DELETED, new audit_events_1.AuditContentEvent(id, organisationId, null, {
            filename: content.originalFilename,
        }));
    }
    async reUpload(organisationId, id, file) {
        this.validateFile(file);
        const content = await this.findOne(organisationId, id);
        const sizeDelta = file.size - Number(content.originalSizeBytes);
        if (sizeDelta > 0) {
            await this.storageService.checkOriginalLimit(organisationId, sizeDelta);
        }
        const oldExt = path.extname(content.originalFilename).replace('.', '') || 'bin';
        const newExt = path.extname(file.originalname).replace('.', '') || 'bin';
        if (oldExt !== newExt) {
            const oldPath = (0, content_storage_util_1.getOriginalPath)(this.mediaBasePath, organisationId, id, oldExt);
            await this.unlinkSafe(oldPath);
        }
        const transcodedExt = content.type === content_type_enum_1.ContentType.Video ? 'mp4' : 'webp';
        const oldTranscodedPath = (0, content_storage_util_1.getTranscodedPath)(this.mediaBasePath, organisationId, id, transcodedExt);
        await this.unlinkSafe(oldTranscodedPath);
        if (content.transcodedSizeBytes) {
            await this.storageService.subtractTranscodedUsage(organisationId, Number(content.transcodedSizeBytes));
        }
        const filePath = (0, content_storage_util_1.getOriginalPath)(this.mediaBasePath, organisationId, id, newExt);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.buffer);
        if (sizeDelta > 0) {
            await this.storageService.addOriginalUsage(organisationId, sizeDelta);
        }
        else if (sizeDelta < 0) {
            await this.storageService.subtractOriginalUsage(organisationId, Math.abs(sizeDelta));
        }
        const type = file.mimetype.startsWith(IMAGE_MIME_PREFIX)
            ? content_type_enum_1.ContentType.Image
            : content_type_enum_1.ContentType.Video;
        content.originalFilename = file.originalname;
        content.originalMimeType = file.mimetype;
        content.originalSizeBytes = file.size;
        content.type = type;
        content.transcodedSizeBytes = null;
        content.transcodingStatus = transcoding_status_enum_1.TranscodingStatus.Pending;
        content.transcodingError = null;
        const saved = await this.contentRepository.save(content);
        await this.transcodingQueue.add('transcode', {
            contentId: id,
            organisationId,
            originalPath: filePath,
            mimeType: file.mimetype,
            type,
        });
        this.eventEmitter.emit(audit_events_1.AUDIT_CONTENT_REUPLOADED, new audit_events_1.AuditContentEvent(id, organisationId, null, {
            filename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
        }));
        return saved;
    }
    validateFile(file) {
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        if (file.size > this.maxFileSizeBytes) {
            throw new common_1.PayloadTooLargeException(`File size ${file.size} exceeds maximum allowed size of ${this.maxFileSizeBytes} bytes`);
        }
        if (!file.mimetype.startsWith(IMAGE_MIME_PREFIX) &&
            !file.mimetype.startsWith(VIDEO_MIME_PREFIX)) {
            throw new common_1.BadRequestException(`Unsupported file type "${file.mimetype}". Only image/* and video/* MIME types are allowed`);
        }
    }
    async unlinkSafe(filePath) {
        try {
            await fs.unlink(filePath);
        }
        catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }
};
exports.ContentService = ContentService;
exports.ContentService = ContentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(content_entity_1.Content)),
    __param(1, (0, bullmq_1.InjectQueue)('transcoding')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        bullmq_2.Queue,
        config_1.ConfigService,
        storage_service_1.StorageService,
        event_emitter_1.EventEmitter2])
], ContentService);
//# sourceMappingURL=content.service.js.map