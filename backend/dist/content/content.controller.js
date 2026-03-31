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
exports.ContentController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const content_service_1 = require("./content.service");
const upload_content_dto_1 = require("./dto/upload-content.dto");
const update_content_dto_1 = require("./dto/update-content.dto");
const roles_decorator_1 = require("../auth/roles.decorator");
const current_organisation_decorator_1 = require("../organisation/current-organisation.decorator");
const organisation_role_enum_1 = require("../user/organisation-role.enum");
const content_type_enum_1 = require("./content-type.enum");
const content_storage_util_1 = require("./content-storage.util");
let ContentController = class ContentController {
    contentService;
    configService;
    mediaBasePath;
    constructor(contentService, configService) {
        this.contentService = contentService;
        this.configService = configService;
        this.mediaBasePath = this.configService.get('MEDIA_BASE_PATH', './media');
    }
    upload(organisationId, file, dto) {
        return this.contentService.upload(organisationId, file, dto);
    }
    findAll(organisationId, type, tags) {
        const parsedTags = tags ? tags.split(',').map((t) => t.trim()) : undefined;
        return this.contentService.findAll(organisationId, {
            type,
            tags: parsedTags,
        });
    }
    findOne(organisationId, id) {
        return this.contentService.findOne(organisationId, id);
    }
    updateMetadata(organisationId, id, dto) {
        return this.contentService.updateMetadata(organisationId, id, dto);
    }
    delete(organisationId, id) {
        return this.contentService.delete(organisationId, id);
    }
    reUpload(organisationId, id, file) {
        return this.contentService.reUpload(organisationId, id, file);
    }
    async serveOriginal(organisationId, id, res) {
        const content = await this.contentService.findOne(organisationId, id);
        const ext = path.extname(content.originalFilename).replace('.', '') || 'bin';
        const filePath = (0, content_storage_util_1.getOriginalPath)(this.mediaBasePath, organisationId, id, ext);
        const absPath = path.resolve(filePath);
        if (!fs.existsSync(absPath)) {
            throw new common_1.NotFoundException('Original file not found');
        }
        res.setHeader('Content-Type', content.originalMimeType);
        res.sendFile(absPath);
    }
    async serveTranscoded(organisationId, id, res) {
        const content = await this.contentService.findOne(organisationId, id);
        const transcodedExt = content.type === content_type_enum_1.ContentType.Video ? 'mp4' : 'webp';
        const filePath = (0, content_storage_util_1.getTranscodedPath)(this.mediaBasePath, organisationId, id, transcodedExt);
        const absPath = path.resolve(filePath);
        if (!fs.existsSync(absPath)) {
            throw new common_1.NotFoundException('Transcoded file not found');
        }
        const mimeMap = {
            mp4: 'video/mp4',
            webp: 'image/webp',
        };
        res.setHeader('Content-Type', mimeMap[transcodedExt] || 'application/octet-stream');
        res.sendFile(absPath);
    }
};
exports.ContentController = ContentController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, upload_content_dto_1.UploadContentDto]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('tags')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_content_dto_1.UpdateContentDto]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "updateMetadata", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/reupload'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "reUpload", null);
__decorate([
    (0, common_1.Get)(':id/file/original'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "serveOriginal", null);
__decorate([
    (0, common_1.Get)(':id/file/transcoded'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "serveTranscoded", null);
exports.ContentController = ContentController = __decorate([
    (0, common_1.Controller)('content'),
    __metadata("design:paramtypes", [content_service_1.ContentService,
        config_1.ConfigService])
], ContentController);
//# sourceMappingURL=content.controller.js.map