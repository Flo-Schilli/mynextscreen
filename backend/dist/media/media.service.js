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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const CONTENT_TYPE_MAP = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
};
let MediaService = class MediaService {
    configService;
    mediaBasePath;
    constructor(configService) {
        this.configService = configService;
        this.mediaBasePath = this.configService.get('MEDIA_BASE_PATH', './data/media');
    }
    async getTranscodedFile(organisationId, contentId) {
        const transcodedDir = path.join(this.mediaBasePath, organisationId, 'transcoded');
        const filePath = await this.findFile(transcodedDir, contentId);
        if (!filePath) {
            throw new common_1.NotFoundException('Content not found or transcoding not complete');
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = CONTENT_TYPE_MAP[ext] || 'application/octet-stream';
        return { filePath, contentType };
    }
    async findFile(directory, contentId) {
        try {
            const entries = await fs.promises.readdir(directory);
            const match = entries.find((entry) => {
                const name = path.parse(entry).name;
                return name === contentId;
            });
            return match ? path.join(directory, match) : null;
        }
        catch {
            return null;
        }
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MediaService);
//# sourceMappingURL=media.service.js.map