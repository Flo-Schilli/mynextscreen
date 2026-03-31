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
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const auth_1 = require("../auth");
const media_service_1 = require("./media.service");
let MediaController = class MediaController {
    mediaService;
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    async serveMedia(req, organisationId, contentId, res) {
        if (req.organisationId !== organisationId) {
            throw new common_1.ForbiddenException('Screen does not belong to the requested organisation');
        }
        const { filePath, contentType } = await this.mediaService.getTranscodedFile(organisationId, contentId);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        res.sendFile(filePath, { root: '/' });
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Get)(':organisationId/:contentId'),
    (0, auth_1.ScreenAuth)(),
    (0, common_1.Header)('Cache-Control', 'public, max-age=86400, immutable'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('organisationId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('contentId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "serveMedia", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)('media'),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
//# sourceMappingURL=media.controller.js.map