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
exports.DefaultPlaylistController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../auth/roles.decorator");
const organisation_role_enum_1 = require("../user/organisation-role.enum");
const organisation_service_1 = require("./organisation.service");
const dto_1 = require("./dto");
let DefaultPlaylistController = class DefaultPlaylistController {
    organisationService;
    constructor(organisationService) {
        this.organisationService = organisationService;
    }
    setDefaultPlaylist(orgId, dto) {
        return this.organisationService.setDefaultPlaylist(orgId, dto.playlistId);
    }
};
exports.DefaultPlaylistController = DefaultPlaylistController;
__decorate([
    (0, common_1.Patch)(),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin),
    __param(0, (0, common_1.Param)('orgId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.SetDefaultPlaylistDto]),
    __metadata("design:returntype", Promise)
], DefaultPlaylistController.prototype, "setDefaultPlaylist", null);
exports.DefaultPlaylistController = DefaultPlaylistController = __decorate([
    (0, common_1.Controller)('organisations/:orgId/default-playlist'),
    __metadata("design:paramtypes", [organisation_service_1.OrganisationService])
], DefaultPlaylistController);
//# sourceMappingURL=default-playlist.controller.js.map