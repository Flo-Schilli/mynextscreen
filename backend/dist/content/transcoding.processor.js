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
var TranscodingProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscodingProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const child_process_1 = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const content_entity_1 = require("./content.entity");
const content_type_enum_1 = require("./content-type.enum");
const transcoding_status_enum_1 = require("./transcoding-status.enum");
const storage_service_1 = require("../organisation/storage.service");
const content_storage_util_1 = require("./content-storage.util");
const ffmpeg_progress_util_1 = require("./ffmpeg-progress.util");
const transcoding_event_1 = require("./transcoding.event");
let TranscodingProcessor = TranscodingProcessor_1 = class TranscodingProcessor extends bullmq_1.WorkerHost {
    contentRepository;
    configService;
    eventEmitter;
    storageService;
    logger = new common_1.Logger(TranscodingProcessor_1.name);
    mediaBasePath;
    ffmpegPath;
    videoBitrate;
    constructor(contentRepository, configService, eventEmitter, storageService) {
        super();
        this.contentRepository = contentRepository;
        this.configService = configService;
        this.eventEmitter = eventEmitter;
        this.storageService = storageService;
        this.mediaBasePath = this.configService.get('MEDIA_BASE_PATH', './media');
        this.ffmpegPath = this.configService.get('FFMPEG_PATH', 'ffmpeg');
        this.videoBitrate = this.configService.get('FFMPEG_VIDEO_BITRATE', '2M');
    }
    async process(job) {
        const { contentId, organisationId, originalPath, type } = job.data;
        this.logger.log(`Processing transcoding job ${job.id} for content ${contentId}`);
        await this.updateStatus(contentId, transcoding_status_enum_1.TranscodingStatus.Processing);
        try {
            const targetExt = type === content_type_enum_1.ContentType.Video ? 'mp4' : 'webp';
            const outputPath = (0, content_storage_util_1.getTranscodedPath)(this.mediaBasePath, organisationId, contentId, targetExt);
            await fs.mkdir(path.dirname(outputPath), { recursive: true });
            if (type === content_type_enum_1.ContentType.Video) {
                await this.transcodeVideo(job, originalPath, outputPath);
            }
            else {
                await this.transcodeImage(job, originalPath, outputPath);
            }
            const stat = await fs.stat(outputPath);
            const transcodedSizeBytes = stat.size;
            try {
                await this.storageService.checkTranscodedLimit(organisationId, transcodedSizeBytes);
            }
            catch {
                await this.unlinkSafe(outputPath);
                const limitError = 'Transcoded file would exceed organisation transcoded storage limit';
                await this.contentRepository.update(contentId, {
                    transcodingStatus: transcoding_status_enum_1.TranscodingStatus.Failed,
                    transcodingError: limitError,
                });
                this.eventEmitter.emit(transcoding_event_1.TRANSCODING_FAILED, new transcoding_event_1.TranscodingFailedEvent(contentId, organisationId, limitError));
                this.logger.warn(`Transcoding for content ${contentId} exceeded transcoded storage limit`);
                return;
            }
            await this.contentRepository.update(contentId, {
                transcodedSizeBytes,
                transcodingStatus: transcoding_status_enum_1.TranscodingStatus.Completed,
                transcodingError: null,
            });
            await this.storageService.addTranscodedUsage(organisationId, transcodedSizeBytes);
            this.eventEmitter.emit(transcoding_event_1.TRANSCODING_COMPLETED, new transcoding_event_1.TranscodingCompletedEvent(contentId, organisationId, transcodedSizeBytes));
            this.logger.log(`Transcoding completed for content ${contentId} (${transcodedSizeBytes} bytes)`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Transcoding failed for content ${contentId}: ${errorMessage}`);
            await this.contentRepository.update(contentId, {
                transcodingStatus: transcoding_status_enum_1.TranscodingStatus.Failed,
                transcodingError: errorMessage,
            });
            this.eventEmitter.emit(transcoding_event_1.TRANSCODING_FAILED, new transcoding_event_1.TranscodingFailedEvent(contentId, organisationId, errorMessage));
            throw error;
        }
    }
    transcodeVideo(job, inputPath, outputPath) {
        const args = [
            '-i',
            inputPath,
            '-c:v',
            'libx264',
            '-b:v',
            this.videoBitrate,
            '-c:a',
            'aac',
            '-movflags',
            '+faststart',
            '-y',
            outputPath,
        ];
        return this.runFfmpeg(job, args);
    }
    transcodeImage(job, inputPath, outputPath) {
        const args = ['-i', inputPath, '-y', outputPath];
        return this.runFfmpeg(job, args);
    }
    runFfmpeg(job, args) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)(this.ffmpegPath, args, {
                stdio: ['ignore', 'ignore', 'pipe'],
            });
            let totalDuration = null;
            let stderrOutput = '';
            proc.stderr.on('data', (data) => {
                const chunk = data.toString();
                stderrOutput += chunk;
                if (totalDuration === null) {
                    totalDuration = (0, ffmpeg_progress_util_1.parseDuration)(chunk);
                }
                const currentTime = (0, ffmpeg_progress_util_1.parseProgressTime)(chunk);
                const progress = (0, ffmpeg_progress_util_1.calculateProgress)(currentTime, totalDuration);
                if (progress !== null) {
                    job.updateProgress(progress).catch(() => {
                    });
                    this.eventEmitter.emit(transcoding_event_1.TRANSCODING_PROGRESS, new transcoding_event_1.TranscodingProgressEvent(job.data.contentId, job.data.organisationId, progress));
                }
            });
            proc.on('error', (err) => {
                reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
            });
            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    const lines = stderrOutput.trim().split('\n');
                    const tail = lines.slice(-5).join('\n');
                    reject(new Error(`FFmpeg exited with code ${code}: ${tail}`));
                }
            });
        });
    }
    async updateStatus(contentId, status) {
        await this.contentRepository.update(contentId, {
            transcodingStatus: status,
        });
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
exports.TranscodingProcessor = TranscodingProcessor;
exports.TranscodingProcessor = TranscodingProcessor = TranscodingProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('transcoding'),
    __param(0, (0, typeorm_1.InjectRepository)(content_entity_1.Content)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService,
        event_emitter_1.EventEmitter2,
        storage_service_1.StorageService])
], TranscodingProcessor);
//# sourceMappingURL=transcoding.processor.js.map