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
exports.PlaylistController = void 0;
const common_1 = require("@nestjs/common");
const playlist_service_1 = require("./playlist.service");
const create_playlist_dto_1 = require("./dto/create-playlist.dto");
const update_playlist_dto_1 = require("./dto/update-playlist.dto");
const add_playlist_item_dto_1 = require("./dto/add-playlist-item.dto");
const reorder_playlist_items_dto_1 = require("./dto/reorder-playlist-items.dto");
const roles_decorator_1 = require("../auth/roles.decorator");
const current_organisation_decorator_1 = require("../organisation/current-organisation.decorator");
const organisation_role_enum_1 = require("../user/organisation-role.enum");
let PlaylistController = class PlaylistController {
    playlistService;
    constructor(playlistService) {
        this.playlistService = playlistService;
    }
    create(organisationId, dto) {
        return this.playlistService.create(organisationId, dto);
    }
    findAll(organisationId) {
        return this.playlistService.findAll(organisationId);
    }
    findOne(organisationId, id) {
        return this.playlistService.findOne(id, organisationId);
    }
    update(organisationId, id, dto) {
        return this.playlistService.update(id, organisationId, dto);
    }
    delete(organisationId, id) {
        return this.playlistService.delete(id, organisationId);
    }
    addItem(organisationId, id, dto) {
        return this.playlistService.addItem(id, organisationId, dto);
    }
    removeItem(organisationId, id, itemId) {
        return this.playlistService.removeItem(id, itemId, organisationId);
    }
    reorderItems(organisationId, id, dto) {
        return this.playlistService.reorderItems(id, organisationId, dto.itemIds);
    }
    getTotalDuration(organisationId, id) {
        return this.playlistService
            .getTotalDuration(id, organisationId)
            .then((totalDurationSeconds) => ({ totalDurationSeconds }));
    }
};
exports.PlaylistController = PlaylistController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_playlist_dto_1.CreatePlaylistDto]),
    __metadata("design:returntype", Promise)
], PlaylistController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlaylistController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlaylistController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_playlist_dto_1.UpdatePlaylistDto]),
    __metadata("design:returntype", Promise)
], PlaylistController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlaylistController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)(':id/items'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, add_playlist_item_dto_1.AddPlaylistItemDto]),
    __metadata("design:returntype", Promise)
], PlaylistController.prototype, "addItem", null);
__decorate([
    (0, common_1.Delete)(':id/items/:itemId'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PlaylistController.prototype, "removeItem", null);
__decorate([
    (0, common_1.Put)(':id/items/reorder'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, reorder_playlist_items_dto_1.ReorderPlaylistItemsDto]),
    __metadata("design:returntype", Promise)
], PlaylistController.prototype, "reorderItems", null);
__decorate([
    (0, common_1.Get)(':id/duration'),
    (0, roles_decorator_1.Roles)(organisation_role_enum_1.OrganisationRole.OrgAdmin, organisation_role_enum_1.OrganisationRole.Editor, organisation_role_enum_1.OrganisationRole.Viewer),
    __param(0, (0, current_organisation_decorator_1.CurrentOrganisation)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlaylistController.prototype, "getTotalDuration", null);
exports.PlaylistController = PlaylistController = __decorate([
    (0, common_1.Controller)('playlists'),
    __metadata("design:paramtypes", [playlist_service_1.PlaylistService])
], PlaylistController);
//# sourceMappingURL=playlist.controller.js.map