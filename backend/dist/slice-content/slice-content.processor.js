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
var SliceContentProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SliceContentProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const child_process_1 = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const sliced_rendition_entity_1 = require("./sliced-rendition.entity");
const screen_group_entity_1 = require("../screen-group/screen-group.entity");
const screen_entity_1 = require("../screen/screen.entity");
const playlist_entity_1 = require("../playlist/playlist.entity");
const content_entity_1 = require("../content/content.entity");
const content_type_enum_1 = require("../content/content-type.enum");
const crop_computation_util_1 = require("./crop-computation.util");
const content_storage_util_1 = require("../content/content-storage.util");
let SliceContentProcessor = SliceContentProcessor_1 = class SliceContentProcessor extends bullmq_1.WorkerHost {
    renditionRepository;
    groupRepository;
    screenRepository;
    playlistRepository;
    contentRepository;
    configService;
    logger = new common_1.Logger(SliceContentProcessor_1.name);
    mediaBasePath;
    ffmpegPath;
    constructor(renditionRepository, groupRepository, screenRepository, playlistRepository, contentRepository, configService) {
        super();
        this.renditionRepository = renditionRepository;
        this.groupRepository = groupRepository;
        this.screenRepository = screenRepository;
        this.playlistRepository = playlistRepository;
        this.contentRepository = contentRepository;
        this.configService = configService;
        this.mediaBasePath = this.configService.get('MEDIA_BASE_PATH', './media');
        this.ffmpegPath = this.configService.get('FFMPEG_PATH', 'ffmpeg');
    }
    async process(job) {
        const { groupId, playlistId, organisationId } = job.data;
        this.logger.log(`Processing slice-content job ${job.id} for group ${groupId}, playlist ${playlistId}`);
        const group = await this.groupRepository.findOne({
            where: { id: groupId, organisationId },
        });
        if (!group || !group.gridColumns || !group.gridRows) {
            throw new Error(`Group ${groupId} not found or missing grid configuration`);
        }
        const screens = await this.screenRepository.find({
            where: { groupId, organisationId },
        });
        if (screens.length === 0) {
            this.logger.warn(`No screens in group ${groupId}, skipping slicing`);
            return;
        }
        const playlist = await this.playlistRepository.findOne({
            where: { id: playlistId, organisationId },
            relations: ['items', 'items.content'],
        });
        if (!playlist || !playlist.items || playlist.items.length === 0) {
            this.logger.warn(`Playlist ${playlistId} not found or empty, skipping slicing`);
            return;
        }
        const totalWork = playlist.items.length * screens.length;
        let completed = 0;
        for (const item of playlist.items) {
            const content = item.content;
            if (!content) {
                this.logger.warn(`Content not found for playlist item ${item.id}, skipping`);
                completed += screens.length;
                await job.updateProgress(Math.round((completed / totalWork) * 100));
                continue;
            }
            const sourceExt = content.type === content_type_enum_1.ContentType.Video ? 'mp4' : 'webp';
            const sourcePath = (0, content_storage_util_1.getTranscodedPath)(this.mediaBasePath, organisationId, content.id, sourceExt);
            const sourceHash = await this.computeFileHash(sourcePath);
            const resolution = await this.probeResolution(sourcePath);
            if (!resolution) {
                this.logger.warn(`Could not determine resolution for content ${content.id}, skipping`);
                completed += screens.length;
                await job.updateProgress(Math.round((completed / totalWork) * 100));
                continue;
            }
            for (const screen of screens) {
                if (screen.gridRow === null || screen.gridColumn === null) {
                    this.logger.warn(`Screen ${screen.id} has no grid position, skipping`);
                    completed++;
                    await job.updateProgress(Math.round((completed / totalWork) * 100));
                    continue;
                }
                const existing = await this.renditionRepository.findOne({
                    where: {
                        groupId,
                        screenId: screen.id,
                        contentItemId: content.id,
                        organisationId,
                    },
                });
                if (existing && existing.sourceHash === sourceHash) {
                    this.logger.log(`Rendition for content ${content.id} / screen ${screen.id} already up-to-date, skipping`);
                    completed++;
                    await job.updateProgress(Math.round((completed / totalWork) * 100));
                    continue;
                }
                const cropParams = (0, crop_computation_util_1.computeCropParams)(resolution.width, resolution.height, group.gridColumns, group.gridRows, screen.gridColumn, screen.gridRow);
                const outputExt = content.type === content_type_enum_1.ContentType.Video ? 'mp4' : 'webp';
                const outputPath = path.join(this.mediaBasePath, 'slices', groupId, screen.id, `${content.id}.${outputExt}`);
                await fs.mkdir(path.dirname(outputPath), { recursive: true });
                const cropFilter = (0, crop_computation_util_1.buildCropFilter)(cropParams);
                await this.runFfmpegCrop(sourcePath, outputPath, cropFilter, content.type);
                if (existing) {
                    existing.filePath = outputPath;
                    existing.sourceHash = sourceHash;
                    await this.renditionRepository.save(existing);
                }
                else {
                    const rendition = this.renditionRepository.create({
                        organisationId,
                        groupId,
                        screenId: screen.id,
                        contentItemId: content.id,
                        filePath: outputPath,
                        sourceHash,
                    });
                    await this.renditionRepository.save(rendition);
                }
                completed++;
                await job.updateProgress(Math.round((completed / totalWork) * 100));
            }
        }
        this.logger.log(`Slice-content job ${job.id} completed: ${completed} slices processed`);
    }
    runFfmpegCrop(inputPath, outputPath, cropFilter, contentType) {
        const args = contentType === content_type_enum_1.ContentType.Video
            ? [
                '-i',
                inputPath,
                '-vf',
                cropFilter,
                '-c:v',
                'libx264',
                '-c:a',
                'copy',
                '-y',
                outputPath,
            ]
            : ['-i', inputPath, '-vf', cropFilter, '-y', outputPath];
        return this.runFfmpeg(args);
    }
    runFfmpeg(args) {
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)(this.ffmpegPath, args, {
                stdio: ['ignore', 'ignore', 'pipe'],
            });
            let stderrOutput = '';
            proc.stderr.on('data', (data) => {
                stderrOutput += data.toString();
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
    async probeResolution(filePath) {
        return new Promise((resolve) => {
            const args = [
                '-v',
                'error',
                '-select_streams',
                'v:0',
                '-show_entries',
                'stream=width,height',
                '-of',
                'csv=s=x:p=0',
                filePath,
            ];
            const ffprobePath = this.ffmpegPath.replace(/ffmpeg$/, 'ffprobe');
            const proc = (0, child_process_1.spawn)(ffprobePath, args, {
                stdio: ['ignore', 'pipe', 'ignore'],
            });
            let stdout = '';
            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            proc.on('error', () => {
                resolve(null);
            });
            proc.on('close', (code) => {
                if (code !== 0) {
                    resolve(null);
                    return;
                }
                const parts = stdout.trim().split('x');
                if (parts.length === 2) {
                    const width = parseInt(parts[0], 10);
                    const height = parseInt(parts[1], 10);
                    if (!isNaN(width) && !isNaN(height)) {
                        resolve({ width, height });
                        return;
                    }
                }
                resolve(null);
            });
        });
    }
    async computeFileHash(filePath) {
        try {
            const content = await fs.readFile(filePath);
            return crypto.createHash('sha256').update(content).digest('hex');
        }
        catch {
            return '';
        }
    }
};
exports.SliceContentProcessor = SliceContentProcessor;
exports.SliceContentProcessor = SliceContentProcessor = SliceContentProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('slice-content'),
    __param(0, (0, typeorm_1.InjectRepository)(sliced_rendition_entity_1.SlicedRendition)),
    __param(1, (0, typeorm_1.InjectRepository)(screen_group_entity_1.ScreenGroup)),
    __param(2, (0, typeorm_1.InjectRepository)(screen_entity_1.Screen)),
    __param(3, (0, typeorm_1.InjectRepository)(playlist_entity_1.Playlist)),
    __param(4, (0, typeorm_1.InjectRepository)(content_entity_1.Content)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        config_1.ConfigService])
], SliceContentProcessor);
//# sourceMappingURL=slice-content.processor.js.map